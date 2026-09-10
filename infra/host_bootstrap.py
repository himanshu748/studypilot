"""Run on the new SSM-managed host after verifying the release archive digest."""

import argparse
import ipaddress
import json
import pwd
import shutil
import subprocess
from pathlib import Path


def run(*command):
    subprocess.run(command, check=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ip", required=True)
    args = parser.parse_args()
    ip = str(ipaddress.IPv4Address(args.ip))
    root = Path(__file__).resolve().parent
    runtimes = json.loads((root / "runtime-config.json").read_text())
    tools = Path("/opt/afh-tools")
    if not (tools / "bin/uv").exists():
        run("python3", "-m", "venv", str(tools))
        run(str(tools / "bin/pip"), "install", "uv==0.8.2")
    caddy = []
    Path("/etc/afh").mkdir(mode=0o750, exist_ok=True)
    urls = {}
    for index, (name, arn) in enumerate(runtimes.items()):
        if name not in {"studypilot", "scamshield", "dependency-sentinel"}:
            raise ValueError("Unknown application")
        user = "afh-" + name
        try:
            pwd.getpwnam(user)
        except KeyError:
            run("useradd", "--system", "--no-create-home", "--shell", "/usr/sbin/nologin", user)
        data = Path("/srv/afh/data") / name
        data.mkdir(parents=True, mode=0o700, exist_ok=True)
        run("chown", user + ":" + user, str(data))
        project = root / name
        backend = project / "backend"
        run(str(tools / "bin/uv"), "sync", "--frozen", "--no-dev", "--project", str(backend))
        prefix = name.upper().replace("-", "_")
        domain = name + "." + ip.replace(".", "-") + ".sslip.io"
        port = 8401 + index
        env = {
            "AWS_DEFAULT_REGION": "us-east-1",
            "AWS_REGION": "us-east-1",
            "LLM_PROVIDER": "openai-compatible",
            "LLM_MODEL_ID": "openai/gpt-oss-20b",
            "LLM_BASE_URL": "https://api.groq.com/openai/v1",
            prefix + "_FIXTURE_MODE": "false",
            prefix + "_AGENTCORE_RUNTIME_ARN": arn,
            prefix + "_DATABASE_PATH": str(data / "bootstrap.sqlite3"),
            "AFH_DATA_ROOT": str(data / "sessions"),
            "AFH_PUBLIC_ORIGIN": "https://" + domain,
            "UV_CACHE_DIR": str(data / "uv-cache"),
            "UV_PYTHON_INSTALL_DIR": str(data / "uv-python"),
            "UV_PYTHON_PREFERENCE": "only-system",
            "XDG_DATA_HOME": str(data / "xdg-data"),
            "XDG_CACHE_HOME": str(data / "xdg-cache"),
            "PYTHONDONTWRITEBYTECODE": "1",
            "PATH": "/opt/afh-tools/bin:/usr/local/bin:/usr/bin:/bin",
        }
        writable = str(data)
        if name == "dependency-sentinel":
            owned = Path("/srv/afh/owned/sentinel")
            if not (owned / ".git").exists():
                owned.mkdir(parents=True, exist_ok=True)
                (owned / "tests").mkdir(exist_ok=True)
                for filename in ("pyproject.toml", "uv.lock"):
                    shutil.copyfile(
                        project / "fixtures/live-validation" / filename, owned / filename
                    )
                shutil.copyfile(
                    project / "fixtures/live-validation/test_installed_package.py",
                    owned / "tests/test_installed_package.py",
                )
                run("chown", "-R", user + ":" + user, str(owned))
                for command in (
                    ("init", "-q"),
                    ("config", "user.email", "judge@example.test"),
                    ("config", "user.name", "Hosted review fixture"),
                    ("add", "."),
                    ("commit", "-qm", "Owned judge validation fixture"),
                ):
                    run("runuser", "-u", user, "--", "git", "-C", str(owned), *command)
            env.update(
                {
                    "AFH_OWNED_REPOSITORY": str(owned),
                    prefix + "_REPOSITORY_ROOT": str(owned.parent),
                    prefix + "_WORKSPACE_ROOT": str(data / "bootstrap-workspaces"),
                    prefix + "_EVIDENCE_MODE": "live",
                }
            )
            writable += " " + str(owned)
        envfile = Path("/etc/afh") / (name + ".env")
        envfile.write_text("\n".join(k + "=" + v for k, v in env.items()) + "\n")
        envfile.chmod(0o600)
        launch = (
            f"{backend}/.venv/bin/uvicorn app.hosted:create_hosted_app --factory "
            f"--host 127.0.0.1 --port {port} --workers 1 --proxy-headers "
            "--forwarded-allow-ips 127.0.0.1 --no-access-log --limit-concurrency 24"
        )
        unit = f"""[Unit]
Description={name} private-session judge application
After=network-online.target
Wants=network-online.target
[Service]
User={user}
Group={user}
WorkingDirectory={backend}
EnvironmentFile={envfile}
ExecStart={launch}
Restart=on-failure
RestartSec=5
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths={writable}
MemoryMax=550M
TasksMax=64
[Install]
WantedBy=multi-user.target
"""
        Path("/etc/systemd/system/" + name + ".service").write_text(unit)
        caddy.append(f"""{domain} {{
    request_body {{
        max_size 64KB
    }}
    reverse_proxy 127.0.0.1:{port} {{
        transport http {{
            response_header_timeout 300s
        }}
    }}
}}
""")
        urls[name] = "https://" + domain
    config = Path("/etc/caddy/Caddyfile")
    if config.exists() and not Path("/etc/caddy/Caddyfile.before-afh").exists():
        shutil.copyfile(config, "/etc/caddy/Caddyfile.before-afh")
    config.write_text("\n".join(caddy))
    run("caddy", "validate", "--config", str(config), "--adapter", "caddyfile")
    run("systemctl", "daemon-reload")
    for name in runtimes:
        run("systemctl", "enable", "--now", name)
        run("systemctl", "restart", name)
    run("systemctl", "reload", "caddy")
    print(json.dumps({"installed": True, "urls": urls}))


if __name__ == "__main__":
    main()
