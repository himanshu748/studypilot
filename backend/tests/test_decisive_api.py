from fastapi.testclient import TestClient


def test_decisive_api_requires_approval_then_replans_without_duplication(tmp_path) -> None:
    from app.main import create_app
    from app.storage.sqlite import SQLiteStore

    client = TestClient(create_app(store=SQLiteStore(tmp_path / "api.sqlite3")))
    demo = client.get("/api/demo-request").json()

    created = client.post("/api/plans", json=demo)
    assert created.status_code == 201
    plan = created.json()
    assert plan["status"] == "waiting_for_approval"
    assert client.get(f"/api/plans/{plan['id']}/calendar").json()["count"] == 0

    approved = client.post(
        f"/api/plans/{plan['id']}/decision",
        json={"approval_id": plan["approval_id"], "choice": "approved"},
    )
    assert approved.status_code == 200
    assert client.get(f"/api/plans/{plan['id']}/calendar").json()["count"] == 8

    session_id = approved.json()["sessions"][0]["id"]
    replanned = client.post(f"/api/plans/{plan['id']}/sessions/{session_id}/missed")
    assert replanned.status_code == 200
    assert client.get(f"/api/plans/{plan['id']}/calendar").json()["count"] == 8
