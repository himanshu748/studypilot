from datetime import datetime

from app.domain.models import (
    AcademicItem,
    AvailabilityWindow,
    PlanRequest,
    ProtectedWindow,
    StudySession,
)
from app.planning.replanner import replan_session
from app.planning.scheduler import _pack_item, build_schedule


def dt(time):
    return datetime.fromisoformat(f"2027-10-07T{time}")


def item(effort=90, deadline="21:00"):
    return AcademicItem(
        id="essay",
        course="Writing",
        title="Essay",
        due_at=dt(deadline),
        effort_minutes=effort,
        weight_percent=10,
        source_line=1,
        source_text="Essay",
    )


def test_short_windows_are_used_when_no_full_length_session_fits():
    windows = [
        AvailabilityWindow(start=dt("18:00"), end=dt("18:45")),
        AvailabilityWindow(start=dt("19:00"), end=dt("19:45")),
    ]
    sessions = build_schedule([item()], windows, [])
    assert [session.duration_minutes for session in sessions] == [45, 45]
    assert sum(session.duration_minutes for session in sessions) == 90


def test_short_window_does_not_leave_a_tiny_remaining_session():
    windows = [
        AvailabilityWindow(start=dt("18:00"), end=dt("18:45")),
        AvailabilityWindow(start=dt("19:00"), end=dt("19:30")),
    ]
    sessions = build_schedule([item(effort=60)], windows, [])
    assert [session.duration_minutes for session in sessions] == [30, 30]


def test_deadline_truncates_a_long_available_window():
    windows = [
        AvailabilityWindow(start=dt("18:00"), end=dt("18:45")),
        AvailabilityWindow(start=dt("19:00"), end=dt("21:00")),
    ]
    sessions = build_schedule([item(deadline="19:45")], windows, [])
    assert sessions[-1].end == dt("19:45")


def test_replanning_starts_at_exact_gap_not_a_thirty_minute_grid():
    request = PlanRequest(
        syllabus="## Writing\n- Essay assignment",
        availability=[AvailabilityWindow(start=dt("18:00"), end=dt("20:15"))],
    )
    target = StudySession(
        id="target",
        academic_item_id="essay",
        course="Writing",
        title="Essay",
        start=dt("18:00"),
        end=dt("19:00"),
    )
    occupied = target.model_copy(update={"id": "other", "start": dt("19:00"), "end": dt("19:15")})
    result = replan_session(request, [target, occupied], "target", deadline=dt("20:15"))
    moved = next(session for session in result if session.id == "target")
    assert moved.start == dt("19:15")
    assert moved.end == dt("20:15")


def test_packing_uses_the_full_hundred_minute_window_without_stranding_ten():
    windows = [
        AvailabilityWindow(start=dt("18:00"), end=dt("19:40")),
        AvailabilityWindow(start=dt("20:00"), end=dt("21:20")),
    ]
    task = item(effort=180, deadline="21:20")
    sessions = build_schedule([task], windows, [])
    assert [session.duration_minutes for session in sessions] == [70, 30, 80]
    assert sum(session.duration_minutes for session in sessions) == 180
    assert sessions[1].end == dt("19:40")
    assert sessions[2].end == task.due_at
    assert all(30 <= session.duration_minutes <= 90 for session in sessions)
    assert all(
        any(window.start <= session.start < session.end <= window.end for window in windows)
        for session in sessions
    )
    assert all(
        first.end <= second.start
        for first, second in zip(sessions, sessions[1:], strict=False)
    )
    assert len({session.id for session in sessions}) == len(sessions)


def test_packing_preserves_protection_and_previously_scheduled_work():
    windows = [AvailabilityWindow(start=dt("17:00"), end=dt("21:20"))]
    protected = [ProtectedWindow(start=dt("19:40"), end=dt("20:00"), label="Dinner")]
    first = item(effort=60, deadline="18:00").model_copy(update={"id": "earlier"})
    task = item(effort=180, deadline="21:20")
    sessions = build_schedule([task, first], windows, protected)
    assert sessions[0].academic_item_id == "earlier"
    assert sessions[0].start == dt("17:00") and sessions[0].end == dt("18:00")
    assert sum(session.duration_minutes for session in sessions) == 240
    assert all(session.end <= dt("19:40") or session.start >= dt("20:00") for session in sessions)


def test_packing_handles_multiple_small_windows_without_tiny_final_session():
    windows = [
        AvailabilityWindow(start=dt("18:00"), end=dt("18:45")),
        AvailabilityWindow(start=dt("19:00"), end=dt("19:45")),
        AvailabilityWindow(start=dt("20:00"), end=dt("20:30")),
    ]
    sessions = build_schedule([item(effort=100)], windows, [])
    assert sum(session.duration_minutes for session in sessions) == 100
    assert all(30 <= session.duration_minutes <= 90 for session in sessions)


def test_bounded_packing_honors_a_narrow_configured_session_limit():
    packed = _pack_item(item(), [(dt("18:00"), dt("19:30"))], [dt("18:00")], 31)
    assert packed == [(0, 30), (0, 30), (0, 30)]
