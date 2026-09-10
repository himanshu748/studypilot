import sqlite3

import pytest

from app.agent.orchestrator import CALENDAR_APPROVAL_ID, PlanningWorkflow
from app.main import seeded_request
from app.storage.sqlite import SQLiteStore


def test_calendar_failure_rolls_back_approval(tmp_path, monkeypatch):
    store = SQLiteStore(tmp_path / "study.db")
    workflow = PlanningWorkflow(store=store)
    plan = workflow.create(seeded_request())

    def fail(_plan):
        raise sqlite3.OperationalError("simulated disk failure")

    monkeypatch.setattr(store, "_write_calendar", fail)
    with pytest.raises(sqlite3.OperationalError):
        workflow.decide(plan.id, approval_id=CALENDAR_APPROVAL_ID, choice="approved")
    assert store.get_plan(plan.id) == plan
    assert store.calendar_events(plan.id) == []


def test_stale_plan_write_cannot_overwrite_new_decision(tmp_path):
    store = SQLiteStore(tmp_path / "study.db")
    workflow = PlanningWorkflow(store=store)
    plan = workflow.create(seeded_request())
    approved = workflow.decide(plan.id, approval_id=CALENDAR_APPROVAL_ID, choice="approved")
    with pytest.raises(ValueError, match="plan changed"):
        store.save_plan(plan.model_copy(update={"status": "rejected"}), previous=plan)
    assert store.get_plan(plan.id) == approved


def test_retried_approval_is_idempotent_after_a_lost_response(tmp_path):
    store = SQLiteStore(tmp_path / "study.db")
    workflow = PlanningWorkflow(store=store)
    plan = workflow.create(seeded_request())
    approved = workflow.decide(plan.id, approval_id=CALENDAR_APPROVAL_ID, choice="approved")
    repeated = workflow.decide(plan.id, approval_id=CALENDAR_APPROVAL_ID, choice="approved")
    assert repeated == approved
    assert len(store.calendar_events(plan.id)) == len(approved.sessions)
    with pytest.raises(ValueError, match="approval id"):
        workflow.decide(plan.id, approval_id="wrong", choice="approved")


def test_retried_missed_session_does_not_move_a_second_time(tmp_path):
    store = SQLiteStore(tmp_path / "study.db")
    workflow = PlanningWorkflow(store=store)
    plan = workflow.create(seeded_request())
    approved = workflow.decide(plan.id, approval_id=CALENDAR_APPROVAL_ID, choice="approved")
    target = next(session for session in approved.sessions if session.duration_minutes == 30)
    moved = workflow.mark_missed(plan.id, target.id, expected_start=target.start)
    repeated = workflow.mark_missed(plan.id, target.id, expected_start=target.start)
    assert repeated == moved
    assert sum(event.kind == "session_replanned" for event in repeated.events) == 1
    for session in approved.sessions:
        if session.id != target.id:
            assert next(item for item in moved.sessions if item.id == session.id) == session
    with pytest.raises(KeyError):
        workflow.mark_missed(plan.id, "not-a-session", expected_start=target.start)
