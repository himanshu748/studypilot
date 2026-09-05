from datetime import datetime
from pathlib import Path


def _request():
    from app.domain.models import AvailabilityWindow, PlanRequest, ProtectedWindow

    fixture = Path(__file__).parents[3] / "fixtures" / "syllabi" / "overloaded-semester.md"
    return PlanRequest(
        syllabus=fixture.read_text(),
        availability=[
            AvailabilityWindow(start=datetime.fromisoformat(start), end=datetime.fromisoformat(end))
            for start, end in [
                ("2026-09-07T18:00", "2026-09-07T21:00"),
                ("2026-09-08T18:00", "2026-09-08T21:00"),
                ("2026-09-09T18:00", "2026-09-09T21:00"),
                ("2026-09-10T18:00", "2026-09-10T21:00"),
                ("2026-09-11T18:00", "2026-09-11T20:00"),
                ("2026-09-12T09:00", "2026-09-12T12:00"),
            ]
        ],
        protected=[
            ProtectedWindow(
                start=datetime.fromisoformat("2026-09-09T19:00"),
                end=datetime.fromisoformat("2026-09-09T21:00"),
                label="Family dinner",
            )
        ],
    )


def test_plan_pauses_before_calendar_write_and_approval_is_exact(tmp_path) -> None:
    from app.agent.orchestrator import CALENDAR_APPROVAL_ID, PlanningWorkflow
    from app.storage.sqlite import SQLiteStore

    store = SQLiteStore(tmp_path / "study.sqlite3")
    workflow = PlanningWorkflow(store=store)

    plan = workflow.create(_request())

    assert plan.status == "waiting_for_approval"
    assert plan.approval_id == CALENDAR_APPROVAL_ID
    assert len(plan.sessions) == 8
    assert store.calendar_events(plan.id) == []

    approved = workflow.decide(
        plan.id,
        approval_id=CALENDAR_APPROVAL_ID,
        choice="approved",
    )

    assert approved.status == "approved"
    assert len(store.calendar_events(plan.id)) == 8


def test_missed_session_replans_in_place_without_duplicate_calendar_event(tmp_path) -> None:
    from app.agent.orchestrator import CALENDAR_APPROVAL_ID, PlanningWorkflow
    from app.storage.sqlite import SQLiteStore

    store = SQLiteStore(tmp_path / "study.sqlite3")
    workflow = PlanningWorkflow(store=store)
    plan = workflow.create(_request())
    workflow.decide(plan.id, approval_id=CALENDAR_APPROVAL_ID, choice="approved")
    missed = next(session for session in plan.sessions if session.duration_minutes == 30)
    before_ids = {event.session_id for event in store.calendar_events(plan.id)}

    revised = workflow.mark_missed(plan.id, missed.id)
    after = store.calendar_events(plan.id)

    assert len(after) == 8
    assert {event.session_id for event in after} == before_ids
    moved = next(session for session in revised.sessions if session.id == missed.id)
    assert moved.status == "rescheduled"
    assert moved.start > missed.start
    deadline = next(item.due_at for item in plan.items if item.id == moved.academic_item_id)
    assert moved.end <= deadline


def test_no_pre_deadline_slot_leaves_plan_and_calendar_unchanged(tmp_path) -> None:
    import pytest

    from app.agent.orchestrator import CALENDAR_APPROVAL_ID, PlanningWorkflow
    from app.storage.sqlite import SQLiteStore

    store = SQLiteStore(tmp_path / "study.sqlite3")
    workflow = PlanningWorkflow(store=store)
    plan = workflow.create(_request())
    approved = workflow.decide(plan.id, approval_id=CALENDAR_APPROVAL_ID, choice="approved")
    before = store.calendar_events(plan.id)
    with pytest.raises(ValueError, match="before the assignment deadline"):
        workflow.mark_missed(plan.id, plan.sessions[0].id)
    assert store.get_plan(plan.id) == approved
    assert store.calendar_events(plan.id) == before
