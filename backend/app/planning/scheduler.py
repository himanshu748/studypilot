import hashlib
from datetime import datetime, timedelta

from app.domain.models import AcademicItem, AvailabilityWindow, ProtectedWindow, StudySession


class ScheduleCapacityError(ValueError):
    """The attempted task order did not fit the available time before deadlines."""


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


def _pack_item(
    item: AcademicItem,
    segments: list[tuple[datetime, datetime]],
    cursors: list[datetime],
    maximum: int,
) -> list[tuple[int, int]] | None:
    """Pack one task without stranding short remainders in usable windows.

    Each DP layer is one available segment; states are total allocated minutes.
    The effort bound (1200 minutes) and input window bounds keep this finite.
    Reachability ranges avoid trying every possible pair of minute totals.
    """
    target = item.effort_minutes
    reachable = [False] * (target + 1)
    reachable[0] = True
    choices: list[list[int]] = []
    for (_, end), cursor in zip(segments, cursors, strict=True):
        end = min(end, item.due_at or end)
        capacity = min(target, max(0, int((end - cursor).total_seconds() // 60)))
        ranges: list[tuple[int, int]] = []
        for count in range(1, capacity // 30 + 1):
            low, high = count * 30, min(count * maximum, capacity)
            if ranges and low <= ranges[-1][1] + 1:
                ranges[-1] = (ranges[-1][0], high)
            else:
                ranges.append((low, high))
        latest: list[int] = []
        last = -1
        for minutes, possible in enumerate(reachable):
            if possible:
                last = minutes
            latest.append(last)
        taken = [-1] * (target + 1)
        for total in range(target + 1):
            if reachable[total]:
                taken[total] = 0
                continue
            for low, high in ranges:
                if low > total:
                    break
                previous = latest[total - low]
                if previous >= max(0, total - high):
                    taken[total] = total - previous
                    break
        choices.append(taken)
        reachable = [amount >= 0 for amount in taken]
        if reachable[target]:
            break
    if not reachable[target]:
        return None
    allocations: list[tuple[int, int]] = []
    remaining = target
    for index in range(len(choices) - 1, -1, -1):
        amount = choices[index][remaining]
        if amount:
            allocations.append((index, amount))
        remaining -= amount
    packed: list[tuple[int, int]] = []
    for index, amount in reversed(allocations):
        count = (amount + maximum - 1) // maximum
        while amount:
            duration = min(maximum, amount - 30 * (count - 1))
            packed.append((index, duration))
            amount -= duration
            count -= 1
    return packed


def build_schedule(
    items: list[AcademicItem],
    availability: list[AvailabilityWindow],
    protected: list[ProtectedWindow],
    *,
    maximum_session_minutes: int = 90,
    preserve_item_order: bool = False,
) -> list[StudySession]:
    """Pack tasks sequentially; callers may explicitly preserve a validated task order.

    The default remains deadline/weight order. This bounded planner does not search
    all possible task orders or promise an optimal schedule.
    """
    if maximum_session_minutes < 30 or maximum_session_minutes > 120:
        raise ValueError("maximum session length must be between 30 and 120 minutes")
    segments = _subtract_protected(availability, protected)
    cursors = [start for start, _ in segments]
    sessions: list[StudySession] = []
    ordered = (
        items
        if preserve_item_order
        else sorted(items, key=lambda item: (item.due_at or datetime.max, -item.weight_percent))
    )
    for item in ordered:
        initial_cursors = cursors.copy()
        previous_session_count = len(sessions)
        remaining = item.effort_minutes
        sequence = 0
        while remaining > 0:
            duration = min(maximum_session_minutes, remaining)
            selected_index = None
            # Prefer a full session, but do not discard shorter usable windows.
            # A 90-minute task can fit into two 45-minute study windows.
            for index, ((_, segment_end), cursor) in enumerate(zip(segments, cursors, strict=True)):
                candidate_end = cursor + timedelta(minutes=duration)
                before_deadline = item.due_at is None or candidate_end <= item.due_at
                if candidate_end <= segment_end and before_deadline:
                    selected_index = index
                    break
            if selected_index is None:
                for index, ((_, segment_end), cursor) in enumerate(
                    zip(segments, cursors, strict=True)
                ):
                    usable_end = min(segment_end, item.due_at or segment_end)
                    available_minutes = int((usable_end - cursor).total_seconds() // 60)
                    candidate = min(maximum_session_minutes, remaining, available_minutes)
                    # Keep a remaining fragment large enough to be a useful session.
                    if 0 < remaining - candidate < 30:
                        candidate = remaining - 30
                    if candidate >= 30:
                        selected_index, duration = index, candidate
                        break
            if selected_index is None:
                packed = _pack_item(item, segments, initial_cursors, maximum_session_minutes)
                if packed is None:
                    raise ScheduleCapacityError(
                        f"insufficient available time before {item.title} "
                        "in the attempted task order"
                    )
                # Replace only this task's unsuccessful partial schedule.
                sessions = sessions[:previous_session_count]
                cursors = initial_cursors
                for sequence, (index, packed_duration) in enumerate(packed):
                    start = cursors[index]
                    end = start + timedelta(minutes=packed_duration)
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
                    cursors[index] = end
                break
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
