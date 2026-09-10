"""Paid end-to-end smoke check using fictional input and a temporary database."""

import argparse
import json
import os
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--allow-paid-requests", action="store_true")
    if not parser.parse_args().allow_paid_requests:
        parser.error("Real inference requires --allow-paid-requests")
    from app.agent.provider import validate_provider_configuration
    from app.config import Settings

    settings = Settings()
    validate_provider_configuration(settings)
    if settings.fixture_mode or settings.llm_provider != "openai-compatible":
        parser.error("Requires the external model, not fixture mode")
    service = ROOT.name
    prefix = "STUDYPILOT" if service == "studypilot" else "SCAMSHIELD"
    with TemporaryDirectory(prefix=service + "-live-smoke-") as temp:
        os.environ[prefix + "_DATABASE_PATH"] = str(Path(temp) / "smoke.sqlite3")
        os.environ[prefix + "_SERVE_FRONTEND"] = "false"
        from app.main import create_app
        from fastapi.testclient import TestClient

        application = create_app()
        with TestClient(application) as client:
            health = client.get("/api/health").json()
            assert health["runtime_mode"] == "openai-compatible"
            assert health["fixture_mode"] is False
            if service == "studypilot":
                from app.main import seeded_request

                payload = seeded_request().model_dump(mode="json")
                route = "/api/plans"
                terminal = "approved"
            else:
                from app.main import demo_messages

                payload = demo_messages()["high-risk"].model_dump(mode="json")
                route = "/api/cases"
                terminal = "report_generated"
            response = client.post(route, json=payload)
            assert response.status_code == 201, f"Workflow HTTP {response.status_code}"
            result = response.json()
            assert result["status"] == "waiting_for_approval"
            if service == "scamshield":
                assert result["assessment"]["level"] == "high_risk"
                assert result["report"] is None
                assert (
                    client.get(route + "/" + result["id"] + "/report-count").json()[
                        "count"
                    ]
                    == 0
                )
            else:
                assert (
                    client.get(route + "/" + result["id"] + "/calendar").json()["count"]
                    == 0
                )
            agent = application.state.workflow.advisor.last_run_agent
            names = [
                block["toolUse"]["name"]
                for message in agent.messages
                for block in message.get("content", [])
                if "toolUse" in block
            ]
            expected_tools = (
                {"inspect_syllabus", "inspect_availability"}
                if service == "studypilot"
                else {"inspect_message", "run_local_checks"}
            )
            assert expected_tools.issubset(names), (
                "Required read-only tool use was not recorded"
            )
            decision = client.post(
                route + "/" + result["id"] + "/decision",
                json={"approval_id": result["approval_id"], "choice": "approved"},
            )
            assert decision.status_code == 200
            assert decision.json()["status"] == terminal
            if service == "scamshield":
                assert (
                    client.get(route + "/" + result["id"] + "/report-count").json()[
                        "count"
                    ]
                    == 1
                )
            else:
                assert (
                    client.get(route + "/" + result["id"] + "/calendar").json()["count"]
                    > 0
                )
            print(
                json.dumps(
                    {
                        "service": service,
                        "model": settings.llm_model_id,
                        "runtime": "real-external-model",
                        "input": "fictional",
                        "tool_names": names,
                        "approval_gate_verified": True,
                        "terminal_status": terminal,
                        "database": "temporary",
                    }
                )
            )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # noqa: BLE001 - never expose provider bodies or credentials
        print(
            json.dumps({"workflow_verified": False, "error_type": type(error).__name__})
        )
        raise SystemExit(1) from None
