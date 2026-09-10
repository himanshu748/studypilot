"""Explicit deployment steps for the three judge applications. No model secrets."""

import argparse
import hashlib
import json
import re
import time
import zipfile
from pathlib import Path

import boto3

ROOT = Path(__file__).resolve().parents[1]
REPOS = [ROOT.parent / name for name in ("studypilot", "scamshield", "dependency-sentinel")]
STATE = ROOT / ".agentcore/hosting.json"
REGION = "us-east-1"
STACK = "AgentsForHumansJudgeHost"


def runtimes():
    return {r.name: json.loads((r / ".agentcore/deployment.json").read_text()) for r in REPOS}


def save(value):
    STATE.parent.mkdir(exist_ok=True)
    STATE.write_text(json.dumps(value, indent=2))


def check_replacement(state, account, stack_status):
    """Only replace an unexecuted plan belonging to this account and stack."""
    if state.get("account") != account or state.get("stack") != STACK:
        raise SystemExit("Existing plan does not match the authenticated account and stack")
    if not state.get("change_set") or stack_status != "REVIEW_IN_PROGRESS":
        raise SystemExit("Only an unexecuted REVIEW_IN_PROGRESS plan can be replaced")


def revised_state(state, account, change_set, image, subnet):
    result = dict(state)
    history = list(result.get("superseded_change_sets", []))
    if result.get("change_set"):
        history.append(result["change_set"])
    result.update(
        stack=STACK,
        account=account,
        change_set=change_set,
        image=image,
        subnet=subnet,
        instance_type="t4g.small",
        architecture="arm64",
        superseded_change_sets=history,
    )
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "command", choices=["plan", "status", "bundle", "install", "install-status"]
    )
    parser.add_argument("--allow-paid", action="store_true")
    parser.add_argument("--replace-plan", action="store_true")
    args = parser.parse_args()
    if args.replace_plan and args.command != "plan":
        parser.error("--replace-plan is only valid with plan")
    aws = boto3.Session(region_name=REGION)
    account = aws.client("sts").get_caller_identity()["Account"]
    runtime = runtimes()
    if any(
        not v["arn"].startswith(f"arn:aws:bedrock-agentcore:{REGION}:{account}:")
        for v in runtime.values()
    ):
        raise SystemExit("Runtime account does not match the authenticated account")
    cfn = aws.client("cloudformation")
    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    if args.command == "plan":
        if state:
            if not args.replace_plan:
                raise SystemExit("Hosting state exists; inspect it before using --replace-plan")
            stack_status = cfn.describe_stacks(StackName=STACK)["Stacks"][0]["StackStatus"]
            check_replacement(state, account, stack_status)
        elif args.replace_plan:
            raise SystemExit("No existing plan to replace")
        ec2 = aws.client("ec2")
        vpcs = ec2.describe_vpcs(Filters=[{"Name": "is-default", "Values": ["true"]}])["Vpcs"]
        if len(vpcs) != 1:
            raise SystemExit("An unambiguous default VPC is required")
        vpc = vpcs[0]["VpcId"]
        subnets = ec2.describe_subnets(Filters=[{"Name": "vpc-id", "Values": [vpc]}])["Subnets"]
        offerings = ec2.describe_instance_type_offerings(
            LocationType="availability-zone",
            Filters=[{"Name": "instance-type", "Values": ["t4g.small"]}],
        )["InstanceTypeOfferings"]
        zones = {o["Location"] for o in offerings}
        subnet = next(
            (
                s["SubnetId"]
                for s in subnets
                if s["MapPublicIpOnLaunch"] and s["AvailabilityZone"] in zones
            ),
            None,
        )
        if subnet is None:
            raise SystemExit("No public subnet with t4g.small availability")
        image = aws.client("ssm").get_parameter(
            Name="/aws/service/canonical/ubuntu/server/24.04/stable/current/arm64/hvm/ebs-gp3/ami-id"
        )["Parameter"]["Value"]
        image_info = ec2.describe_images(ImageIds=[image])["Images"]
        if len(image_info) != 1 or any(
            image_info[0].get(k) != v
            for k, v in {
                "Architecture": "arm64",
                "State": "available",
                "RootDeviceName": "/dev/sda1",
            }.items()
        ):
            raise SystemExit("AMI is not an available ARM64 image with the expected root device")
        arns = [
            arn
            for v in runtime.values()
            for arn in (v["arn"], v["arn"] + "/runtime-endpoint/DEFAULT")
        ]
        values = {
            "VpcId": vpc,
            "SubnetId": subnet,
            "ImageId": image,
            "RuntimeArns": ",".join(arns),
            "ArtifactBucket": runtime["studypilot"]["bucket"],
        }
        response = cfn.create_change_set(
            StackName=STACK,
            ChangeSetName=f"judge-host-arm-{time.time_ns()}",
            ChangeSetType="CREATE",
            TemplateBody=(ROOT / "infra/hosting.yaml").read_text(),
            Capabilities=["CAPABILITY_IAM"],
            Parameters=[{"ParameterKey": k, "ParameterValue": v} for k, v in values.items()],
            Tags=[{"Key": "Event", "Value": "AgentsForHumans"}],
        )
        state = revised_state(state, account, response["Id"], image, subnet)
        save(state)
        print(json.dumps(state))
    elif args.command == "status":
        result = cfn.describe_stacks(StackName=STACK)["Stacks"][0]
        print(json.dumps({"status": result["StackStatus"], "outputs": result.get("Outputs", [])}))
        if result["StackStatus"] == "REVIEW_IN_PROGRESS":
            change = cfn.describe_change_set(ChangeSetName=state["change_set"])
            print(
                json.dumps(
                    {
                        "change_status": change["Status"],
                        "reason": change.get("StatusReason"),
                        "resources": [
                            c["ResourceChange"]["ResourceType"] for c in change.get("Changes", [])
                        ],
                    }
                )
            )
    elif args.command == "bundle":
        if not args.allow_paid:
            parser.error("Uploading the bundle requires --allow-paid")
        temporary = ROOT / ".agentcore/hosting-build.zip"
        with zipfile.ZipFile(temporary, "w", zipfile.ZIP_DEFLATED) as archive:
            for repo in REPOS:
                for folder in ("backend/app", "backend/fixtures", "frontend/dist", "fixtures"):
                    directory = repo / folder
                    if not directory.exists():
                        continue
                    for file in sorted(directory.rglob("*")):
                        if (
                            not file.is_file()
                            or file.is_symlink()
                            or any(
                                p.startswith(".") or p == "__pycache__"
                                for p in file.relative_to(repo).parts
                            )
                        ):
                            continue
                        data = file.read_bytes()
                        if re.search(rb"\bgsk_[A-Za-z0-9]{40,}", data):
                            raise SystemExit("Credential pattern found; archive not uploaded")
                        archive.writestr(str(Path(repo.name) / file.relative_to(repo)), data)
                for name in ("pyproject.toml", "uv.lock"):
                    archive.write(repo / "backend" / name, f"{repo.name}/backend/{name}")
            archive.write(ROOT / "infra/host_bootstrap.py", "host_bootstrap.py")
            archive.writestr(
                "runtime-config.json", json.dumps({k: v["arn"] for k, v in runtime.items()})
            )
        digest = hashlib.sha256(temporary.read_bytes()).hexdigest()
        bucket = runtime["studypilot"]["bucket"]
        key = f"hosting/{digest}.zip"
        aws.client("s3").upload_file(
            str(temporary), bucket, key, ExtraArgs={"ServerSideEncryption": "AES256"}
        )
        state.update(bucket=bucket, key=key, sha256=digest)
        save(state)
        print(json.dumps({"sha256": digest, "bytes": temporary.stat().st_size, "uploaded": True}))
    elif args.command == "install":
        if not args.allow_paid:
            parser.error("Host installation requires --allow-paid")
        stack = cfn.describe_stacks(StackName=STACK)["Stacks"][0]
        if stack["StackStatus"] != "CREATE_COMPLETE":
            raise SystemExit("Host stack is not CREATE_COMPLETE")
        outputs = {o["OutputKey"]: o["OutputValue"] for o in stack["Outputs"]}
        digest = state["sha256"]
        directory = f"/opt/afh/releases/{digest}"
        code = (
            "import boto3,hashlib,zipfile,pathlib; "
            f"p=pathlib.Path('/tmp/afh-{digest}.zip'); "
            f"boto3.client('s3',region_name='{REGION}').download_file("
            f"{state['bucket']!r},{state['key']!r},str(p)); "
            f"assert hashlib.sha256(p.read_bytes()).hexdigest()=={digest!r}; "
            f"zipfile.ZipFile(p).extractall({directory!r})"
        )
        import shlex

        commands = [
            "cloud-init status --wait",
            "python3 -c " + shlex.quote(code),
            f"python3 {directory}/host_bootstrap.py --ip {outputs['PublicIp']}",
        ]
        result = aws.client("ssm").send_command(
            InstanceIds=[outputs["InstanceId"]],
            DocumentName="AWS-RunShellScript",
            Parameters={"commands": commands, "executionTimeout": ["1200"]},
            Comment="Install isolated judge apps with Groq AgentCore; no provider keys on host",
        )
        state.update(
            instance=outputs["InstanceId"],
            ip=outputs["PublicIp"],
            command=result["Command"]["CommandId"],
        )
        save(state)
        print(json.dumps({"installation_started": True, "command": state["command"]}))
    else:
        result = aws.client("ssm").get_command_invocation(
            CommandId=state["command"], InstanceId=state["instance"]
        )
        print(
            json.dumps(
                {
                    "status": result["Status"],
                    "code": result["ResponseCode"],
                    "output": result.get("StandardOutputContent", "")[-2500:],
                    "error": result.get("StandardErrorContent", "")[-1500:],
                }
            )
        )


if __name__ == "__main__":
    main()
