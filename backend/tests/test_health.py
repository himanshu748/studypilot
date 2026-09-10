from fastapi.testclient import TestClient


def test_health_reports_fixture_mode_without_secrets() -> None:
    from app.main import create_app

    response = TestClient(create_app()).get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "service": "studypilot",
        "status": "ok",
        "fixture_mode": True,
        "model_configured": False,
        "runtime_mode": "local",
        "model_access": "disabled",
        "storage_mode": "local_sqlite",
        "aws_calls_enabled": False,
        "max_request_bytes": 262144,
    }
