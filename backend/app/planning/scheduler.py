import hashlib
from datetime import datetime, timedelta

from app.domain.models import AcademicItem, AvailabilityWindow, ProtectedWindow, StudySession


def _subtract_protected(
    availability: list[AvailabilityWindow], protected: list[ProtectedWindow]
) -> list[tuple[datetime, datetime]]:
    segments: list[tuple[datetime, datetime]] = []
    for window in sorted(availability, key=lambda item: item.start):
        current = [(window.start, window.end)]
        for blocked in protected:
            next_segments: list[tuple[datetime, datetime]] = []
            for start, end in current:
                if blocked.end <= start or blocked.start >= end:
                    next_segments.append((start, end))
                    continue
                if start < blocked.start:
                    next_segments.append((start, blocked.start))
                if blocked.end < end:
                    next_segments.append((blocked.end, end))
            current = next_segments
        segments.extend((start, end) for start, end in current if end > start)
    return segments


def _session_id(item_id: str, sequence: int) -> str:
    return "session-" + hashlib.sha256(f"{item_id}:{sequence}".encode()).hexdigest()[:12]


def build_schedule(
    items: list[AcademicItem],
    availability: list[AvailabilityWindow],
    protected: list[ProtectedWindow],
    *,
    maximum_session_minutes: int = 90,
) -> list[StudySession]:
    if maximum_session_minutes < 30 or maximum_session_minutes > 120:
        raise ValueError("maximum session length must be between 30 and 120 minutes")
    segments = _subtract_protected(availability, protected)
    cursors = [start for start, _ in segments]
    sessions: list[StudySession] = []
    ordered = sorted(items, key=lambda item: (item.due_at or datetime.max, -item.weight_percent))
    for item in ordered:
        remaining = item.effort_minutes
        sequence = 0
        while remaining > 0:
            duration = min(maximum_session_minutes, remaining)
            selected_index = None
            for index, ((_, segment_end), cursor) in enumerate(zip(segments, cursors, strict=True)):
                candidate_end = cursor + timedelta(minutes=duration)
                before_deadline = item.due_at is None or candidate_end <= item.due_at
                if candidate_end <= segment_end and before_deadline:
                    selected_index = index
                    break
            if selected_index is None:
                raise ValueError(f"insufficient available time before {item.title}")
            start = cursors[selected_index]
            end = start + timedelta(minutes=duration)
            sessions.append(
                StudySession(
                    id=_session_id(item.id, sequence),
                    academic_item_id=item.id,
                    course=item.course,
                    title=item.title,
                    start=start,
                    end=end,
                )
            )
            cursors[selected_index] = end
            remaining -= duration
            sequence += 1
    return sessions
