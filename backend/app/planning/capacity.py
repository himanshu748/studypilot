"""Necessary deadline-capacity checks before asking an advisor for an ordering."""

from app.domain.models import AcademicItem, PlanRequest
from app.planning.scheduler import ScheduleCapacityError, _subtract_protected


def check_deadline_capacity(items: list[AcademicItem], request: PlanRequest) -> None:
    """Reject proven deficits, not a failed heuristic task ordering.

    Count all usable minutes, including short fragments. Passing is an upper-bound
    check only; the scheduler still verifies session sizes and the selected order.
    """
    segments = _subtract_protected(request.availability, request.protected)
    confirmed = [item for item in items if item.due_at is not None]
    for deadline in sorted({item.due_at for item in confirmed}):
        needed = sum(item.effort_minutes for item in confirmed if item.due_at <= deadline)
        available = sum(
            max(0, int((min(end, deadline) - start).total_seconds() // 60))
            for start, end in segments
        )
        if needed > available:
            raise ScheduleCapacityError(
                f"Coursework needs {needed} minutes before {deadline:%b %d, %H:%M}, "
                f"but only {available} are available after protected time. "
                f"Add {needed - available} minutes before that deadline or revise the inputs. "
                "No model advice was requested and no plan was saved."
            )
