from copy import deepcopy

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_custom_plan_persists_and_reopens(tmp_path):
    client = TestClient(create_app(Settings(database_path=tmp_path / "plans.db")))
    request = {
        "syllabus": (
            "## Statistics\n- Regression worksheet | due 2027-10-09T17:00 | effort 60m | weight 10%"
        ),
        "availability": [{"start": "2027-10-07T18:00", "end": "2027-10-07T20:00"}],
        "protected": [{"start": "2027-10-07T18:00", "end": "2027-10-07T18:30", "label": "Dinner"}],
    }
    result = client.post("/api/plans", json=request)
    assert result.status_code == 201, result.text
    plan = result.json()
    assert plan["sessions"][0]["start"] == "2027-10-07T18:30:00"
    assert client.get("/api/plans").json()[0]["id"] == plan["id"]
    assert client.get("/api/plans/" + plan["id"]).json()["request"] == plan["request"]
    reopened = TestClient(create_app(Settings(database_path=tmp_path / "plans.db")))
    assert reopened.get("/api/plans").json()[0]["id"] == plan["id"]
    request["availability"].append(request["availability"][0])
    assert client.post("/api/plans", json=request).status_code == 422


def test_mixed_timezone_window_returns_validation_error_not_server_error(tmp_path):
    client = TestClient(create_app(Settings(database_path=tmp_path / "plans.db")))
    response = client.post(
        "/api/plans",
        json={
            "syllabus": (
                "## Statistics\n- Worksheet | due 2027-10-09T17:00 | effort 60m | weight 10%"
            ),
            "availability": [{"start": "2027-10-07T18:00Z", "end": "2027-10-07T20:00"}],
        },
    )
    assert response.status_code == 422


def test_revised_copy_has_own_approval_and_leaves_original_calendar_unchanged(tmp_path):
    client = TestClient(
        create_app(Settings(fixture_mode=True, database_path=tmp_path / "plans.db"))
    )
    request = client.get("/api/demo-request").json()
    original = client.post("/api/plans", json=request).json()
    decision = client.post(
        f"/api/plans/{original['id']}/decision",
        json={"approval_id": original["approval_id"], "choice": "approved"},
    )
    assert decision.status_code == 200
    original = decision.json()
    calendar_path = f"/api/plans/{original['id']}/calendar"
    original_calendar = client.get(calendar_path).json()
    assert original_calendar["count"] > 0

    draft = deepcopy(original["request"])
    draft["syllabus"] = draft["syllabus"].replace("effort 180m", "effort 150m", 1)
    response = client.post("/api/plans", json=draft)
    assert response.status_code == 201, response.text
    revised = response.json()
    assert revised["id"] != original["id"]
    assert revised["status"] == "waiting_for_approval"
    assert client.get(f"/api/plans/{revised['id']}/calendar").json()["count"] == 0
    unresolved = next(item for item in revised["items"] if item["title"] == "Reading response")
    assert unresolved["requires_confirmation"] is True
    assert "TBA after seminar" in unresolved["source_text"]
    assert client.get(f"/api/plans/{original['id']}").json() == original
    assert client.get(calendar_path).json() == original_calendar

    approved = client.post(
        f"/api/plans/{revised['id']}/decision",
        json={"approval_id": revised["approval_id"], "choice": "approved"},
    )
    assert approved.status_code == 200
    assert client.get(f"/api/plans/{revised['id']}/calendar").json()["count"] > 0
    assert client.get(f"/api/plans/{original['id']}").json() == original
    assert client.get(calendar_path).json() == original_calendar
    assert {plan["id"] for plan in client.get("/api/plans").json()} == {
        original["id"], revised["id"]
    }
