from datetime import datetime
from pathlib import Path


def _inputs():
    from app.domain.models import AvailabilityWindow, ProtectedWindow
    from app.tools.syllabus import extract_syllabus

    fixture = Path(__file__).parents[3] / "fixtures" / "syllabi" / "overloaded-semester.md"
    items = [item for item in extract_syllabus(fixture.read_text()).items if item.due_at]
    availability = [
        AvailabilityWindow(start=datetime.fromisoformat(start), end=datetime.fromisoformat(end))
        for start, end in [
            ("2026-09-07T18:00", "2026-09-07T21:00"),
            ("2026-09-08T18:00", "2026-09-08T21:00"),
            ("2026-09-09T18:00", "2026-09-09T21:00"),
            ("2026-09-10T18:00", "2026-09-10T21:00"),
            ("2026-09-11T18:00", "2026-09-11T20:00"),
            ("2026-09-12T09:00", "2026-09-12T12:00"),
        ]
    ]
    protected = [
        ProtectedWindow(
            start=datetime.fromisoformat("2026-09-09T19:00"),
            end=datetime.fromisoformat("2026-09-09T21:00"),
            label="Family dinner",
        )
    ]
    return items, availability, protected


def test_scheduler_respects_availability_protected_time_and_session_limit() -> None:
    from app.planning.scheduler import build_schedule

    items, availability, protected = _inputs()
    sessions = build_schedule(items, availability, protected, maximum_session_minutes=90)

    assert len(sessions) == 8
    assert all(session.duration_minutes <= 90 for session in sessions)
    assert all(
        any(window.start <= session.start < session.end <= window.end for window in availability)
        for session in sessions
    )
    assert all(
        session.end <= blocked.start or session.start >= blocked.end
        for session in sessions
        for blocked in protected
    )
    assert len({session.id for session in sessions}) == len(sessions)


def test_deadline_cluster_is_explained_without_grade_prediction() -> None:
    from app.planning.conflicts import detect_conflicts

    items, _, _ = _inputs()
    conflicts = detect_conflicts(items)

    assert conflicts[0].kind == "deadline_cluster"
    assert conflicts[0].item_count == 4
    assert "48 hours" in conflicts[0].explanation
    assert "grade" not in conflicts[0].explanation.lower()
