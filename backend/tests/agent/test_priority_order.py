from collections import Counter
from datetime import datetime

import pytest

from app.agent.orchestrator import PlanningWorkflow
from app.domain.models import AvailabilityWindow, PlanningAdvice, PlanRequest, ProtectedWindow
from app.main import seeded_request
from app.planning.scheduler import ScheduleCapacityError, build_schedule
from app.storage.sqlite import SQLiteStore
from app.tools.syllabus import extract_syllabus


def dt(time: str) -> datetime:
    return datetime.fromisoformat(f"2026-09-08T{time}")


def request(*, early_due="21:00", end="20:30") -> PlanRequest:
    return PlanRequest(
        syllabus=(
            f"## History\n- Early essay | due 2026-09-08T{early_due} | effort 60m | weight 20%\n"
            "- Later essay | due 2026-09-09T20:00 | effort 60m | weight 10%\n"
            "- Unconfirmed essay | due TBA | effort 60m | weight 10%"
        ),
        availability=[AvailabilityWindow(start=dt("18:00"), end=dt(end))],
        protected=[ProtectedWindow(start=dt("19:00"), end=dt("19:30"), label="Dinner")],
    )


class FixedAdvisor:
    def __init__(self, ids: list[str]):
        self.ids = ids

    def advise(self, syllabus, windows):
        return PlanningAdvice(priority_item_ids=self.ids, rationale="A test advisory ranking.")


class RecordingStore(SQLiteStore):
    def __init__(self, path):
        super().__init__(path)
        self.saves = []

    def save_plan(self, plan, **kwargs):
        self.saves.append(plan)
        return super().save_plan(plan, **kwargs)


def confirmed_items(plan_request):
    return [item for item in extract_syllabus(plan_request.syllabus).items if item.due_at]


def order_event(plan):
    events = [event for event in plan.events if event.kind == "schedule_order_selected"]
    assert len(events) == 1
    return events[0]


def assert_constraints(plan):
    confirmed = {item.id: item for item in plan.items if item.due_at}
    minutes = Counter()
    for session in plan.sessions:
        minutes[session.academic_item_id] += session.duration_minutes
        assert 30 <= session.duration_minutes <= 90
        assert session.end <= confirmed[session.academic_item_id].due_at
        assert any(
            window.start <= session.start < session.end <= window.end
            for window in plan.request.availability
        )
        assert all(
            session.end <= blocked.start or session.start >= blocked.end
            for blocked in plan.request.protected
        )
    chronological = sorted(plan.sessions, key=lambda session: session.start)
    assert all(
        first.end <= second.start
        for first, second in zip(chronological, chronological[1:], strict=False)
    )
    assert minutes == {item_id: item.effort_minutes for item_id, item in confirmed.items()}
    assert len({session.id for session in plan.sessions}) == len(plan.sessions)


def test_reversing_valid_advisory_order_changes_schedule_when_both_fit(tmp_path):
    plan_request = request()
    ids = [item.id for item in confirmed_items(plan_request)]
    store = RecordingStore(tmp_path / "priorities.sqlite3")
    first = PlanningWorkflow(store=store, advisor=FixedAdvisor(ids)).create(plan_request)
    reversed_plan = PlanningWorkflow(store=store, advisor=FixedAdvisor(ids[::-1])).create(
        plan_request
    )
    assert [session.academic_item_id for session in first.sessions] == ids
    assert [session.academic_item_id for session in reversed_plan.sessions] == ids[::-1]
    assert first.sessions[0].start == reversed_plan.sessions[0].start == dt("18:00")
    for plan in [first, reversed_plan]:
        assert_constraints(plan)
        assert "Used validated advisory order" in order_event(plan).summary
        assert "overridden" not in order_event(plan).summary
        assert store.calendar_events(plan.id) == []
        assert store.get_plan(plan.id).events == plan.events


def test_unknown_and_duplicate_advice_cannot_add_or_drop_confirmed_tasks(tmp_path):
    plan_request = request()
    items = extract_syllabus(plan_request.syllabus).items
    early, later, unconfirmed = items
    priorities = ["invented-task", later.id, later.id, unconfirmed.id]
    plan = PlanningWorkflow(
        store=SQLiteStore(tmp_path / "validated.sqlite3"), advisor=FixedAdvisor(priorities)
    ).create(plan_request)
    assert [session.academic_item_id for session in plan.sessions] == [later.id, early.id]
    assert unconfirmed in plan.items and unconfirmed.requires_confirmation
    assert_constraints(plan)
    assert "unranked confirmed tasks follow deadline/weight order" in order_event(plan).summary


def test_infeasible_advisory_order_falls_back_before_deadlines_without_calendar_writes(tmp_path):
    plan_request = request(early_due="19:00")
    items = confirmed_items(plan_request)
    with pytest.raises(ScheduleCapacityError, match="Early essay"):
        build_schedule(
            items[::-1],
            plan_request.availability,
            plan_request.protected,
            preserve_item_order=True,
        )
    store = RecordingStore(tmp_path / "fallback.sqlite3")
    plan = PlanningWorkflow(
        store=store, advisor=FixedAdvisor([item.id for item in items[::-1]])
    ).create(plan_request)
    assert [session.academic_item_id for session in plan.sessions] == [item.id for item in items]
    assert_constraints(plan)
    assert "Advisory order was overridden" in order_event(plan).summary
    assert "Used deadline/weight order" in order_event(plan).summary
    assert plan.status == "waiting_for_approval"
    assert store.calendar_events(plan.id) == []
    assert store.saves == [plan]
    assert store.get_plan(plan.id) == plan


@pytest.mark.parametrize("reverse", [False, True])
def test_failure_of_available_orders_does_not_save_a_partial_plan(tmp_path, reverse):
    plan_request = request(early_due="19:00", end="19:00")
    ids = [item.id for item in confirmed_items(plan_request)]
    store = RecordingStore(tmp_path / "impossible.sqlite3")
    workflow = PlanningWorkflow(store=store, advisor=FixedAdvisor(ids[::-1] if reverse else ids))
    with pytest.raises(ScheduleCapacityError, match="only 60 are available") as raised:
        workflow.create(plan_request)
    assert "No model advice was requested" in str(raised.value)
    assert store.saves == [] and store.list_plans() == []
    assert store._connection.execute("SELECT COUNT(*) FROM calendar_events").fetchone()[0] == 0


def test_no_valid_priorities_records_the_deadline_weight_default(tmp_path):
    plan = PlanningWorkflow(
        store=SQLiteStore(tmp_path / "no-priorities.sqlite3"), advisor=FixedAdvisor(["unknown"])
    ).create(request())
    assert "No valid advisory priorities were supplied; used deadline/weight order" in (
        order_event(plan).summary
    )
    assert_constraints(plan)


def test_default_scheduler_and_fixture_schedule_remain_stable(tmp_path):
    plan_request = seeded_request()
    items = confirmed_items(plan_request)
    baseline = build_schedule(items, plan_request.availability, plan_request.protected)
    default_reversed = build_schedule(
        items[::-1], plan_request.availability, plan_request.protected
    )
    assert default_reversed == baseline
    plan = PlanningWorkflow(store=SQLiteStore(tmp_path / "fixture.sqlite3")).create(plan_request)
    assert plan.sessions == baseline
    assert len(plan.sessions) == 8
    assert "Used validated advisory order" in order_event(plan).summary
