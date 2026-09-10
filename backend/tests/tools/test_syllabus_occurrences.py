import hashlib
from collections import Counter
from datetime import datetime
from pathlib import Path

import pytest

from app.agent.orchestrator import CALENDAR_APPROVAL_ID, PlanningWorkflow
from app.domain.models import AvailabilityWindow, PlanningAdvice, PlanRequest, ProtectedWindow
from app.main import seeded_request
from app.storage.sqlite import SQLiteStore
from app.tools.syllabus import extract_syllabus

EARLY = "- Reading | due 2026-09-09T20:00 | effort 60m | weight 10%"
LATER = "- Reading | due 2026-09-10T20:00 | effort 60m | weight 10%"
SYLLABUS = f"## History\n{EARLY}\n{LATER}\n{LATER}"


def request(syllabus=SYLLABUS):
    return PlanRequest(
        syllabus=syllabus,
        availability=[
            AvailabilityWindow(start=datetime(2026, 9, 8, 18), end=datetime(2026, 9, 8, 23))
        ],
        protected=[
            ProtectedWindow(
                start=datetime(2026, 9, 8, 20), end=datetime(2026, 9, 8, 20, 30), label="Dinner"
            )
        ],
    )


def test_repeated_deadlines_and_identical_occurrences_have_stable_distinct_ids_and_citations():
    items = extract_syllabus(SYLLABUS).items
    assert len(items) == len({item.id for item in items}) == 3
    assert extract_syllabus(SYLLABUS).items == items
    assert [item.source_line for item in items] == [2, 3, 4]
    assert [item.source_text for item in items] == [EARLY, LATER, LATER]
    reordered = extract_syllabus(f"## History\n{LATER}\n{EARLY}\n{LATER}").items
    assert [item.id for item in reordered] == [items[1].id, items[0].id, items[2].id]
    prefixed = extract_syllabus("Unrelated syllabus introduction\n\n" + SYLLABUS).items
    assert [item.id for item in prefixed] == [item.id for item in items]
    assert [item.source_line for item in prefixed] == [4, 5, 6]


class Advisor:
    def __init__(self, reverse):
        self.reverse = reverse

    def advise(self, syllabus, windows):
        ids = [item.id for item in extract_syllabus(syllabus).items]
        return PlanningAdvice(
            priority_item_ids=ids[::-1] if self.reverse else ["unknown-priority"],
            rationale="Controlled fixture ordering",
        )


@pytest.mark.parametrize("mode", ["fixture", "reverse", "unranked"])
def test_recurring_tasks_keep_full_effort_and_distinct_calendar_sessions(tmp_path, mode):
    store = SQLiteStore(tmp_path / "occurrences.sqlite3")
    advisor = None if mode == "fixture" else Advisor(reverse=mode == "reverse")
    workflow = PlanningWorkflow(store=store, advisor=advisor)
    plan = workflow.create(request())
    assert len(plan.items) == len(plan.sessions) == 3
    assert len({item.id for item in plan.items}) == len({s.id for s in plan.sessions}) == 3
    minutes = Counter()
    for session in plan.sessions:
        minutes[session.academic_item_id] += session.duration_minutes
        item = next(item for item in plan.items if item.id == session.academic_item_id)
        assert session.end <= item.due_at
        assert all(session.end <= w.start or session.start >= w.end for w in plan.request.protected)
    assert minutes == {item.id: 60 for item in plan.items}
    assert store.calendar_events(plan.id) == []
    workflow.decide(plan.id, approval_id=CALENDAR_APPROVAL_ID, choice="approved")
    assert len(store.calendar_events(plan.id)) == 3


def test_revision_adds_an_occurrence_without_dropping_tasks_or_changing_saved_plan(tmp_path):
    store = SQLiteStore(tmp_path / "revisions.sqlite3")
    workflow = PlanningWorkflow(store=store)
    original = workflow.create(request())
    original = workflow.decide(original.id, approval_id=CALENDAR_APPROVAL_ID, choice="approved")
    calendar = store.calendar_events(original.id)
    revised = workflow.create(request(SYLLABUS + "\n" + LATER))
    assert len(revised.items) == len(revised.sessions) == 4
    assert len({session.id for session in revised.sessions}) == 4
    assert [item.id for item in revised.items[:3]] == [item.id for item in original.items]
    assert store.calendar_events(revised.id) == []
    assert store.get_plan(original.id) == original
    assert store.calendar_events(original.id) == calendar


def test_unique_fixture_ids_and_original_eight_session_schedule_are_preserved(tmp_path):
    fixture = Path(__file__).parents[3] / "fixtures/syllabi/overloaded-semester.md"
    items = extract_syllabus(fixture.read_text()).items
    assert all(
        item.id == "item-" + hashlib.sha256(f"{item.course}:{item.title}".encode()).hexdigest()[:12]
        for item in items
    )
    store = SQLiteStore(tmp_path / "fixture.sqlite3")
    plan = PlanningWorkflow(store=store).create(seeded_request())
    assert len(plan.sessions) == 8
    assert len({session.id for session in plan.sessions}) == 8
    assert store.calendar_events(plan.id) == []
