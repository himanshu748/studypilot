from datetime import datetime, timedelta

from app.domain.models import PlanRequest, ProtectedWindow, StudySession
from app.planning.scheduler import _subtract_protected


def replan_session(
    request: PlanRequest,
    sessions: list[StudySession],
    session_id: str,
    *,
    deadline: datetime,
) -> list[StudySession]:
    target = next((session for session in sessions if session.id == session_id), None)
    if target is None:
        raise KeyError(session_id)
    occupied = [session for session in sessions if session.id != session_id]
    duration = timedelta(minutes=target.duration_minutes)
    blocked = [
        *request.protected,
        *[
            ProtectedWindow(start=item.start, end=item.end, label="Scheduled session")
            for item in occupied
        ],
    ]
    for start, end in _subtract_protected(request.availability, blocked):
        cursor = max(start, target.end)
        if cursor + duration <= min(end, deadline):
            revised = target.model_copy(
                update={"start": cursor, "end": cursor + duration, "status": "rescheduled"}
            )
            return sorted(
                [revised if session.id == session_id else session for session in sessions],
                key=lambda session: session.start,
            )
    raise ValueError(
        "no open window is available before the assignment deadline; add availability to replan"
    )
