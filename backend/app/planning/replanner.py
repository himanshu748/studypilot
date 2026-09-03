from datetime import timedelta

from app.domain.models import PlanRequest, StudySession


def replan_session(
    request: PlanRequest,
    sessions: list[StudySession],
    session_id: str,
) -> list[StudySession]:
    target = next((session for session in sessions if session.id == session_id), None)
    if target is None:
        raise KeyError(session_id)
    occupied = [session for session in sessions if session.id != session_id]
    duration = timedelta(minutes=target.duration_minutes)
    for window in sorted(request.availability, key=lambda item: item.start):
        cursor = max(window.start, target.end)
        while cursor + duration <= window.end:
            end = cursor + duration
            blocked = any(
                not (end <= item.start or cursor >= item.end) for item in request.protected
            )
            collision = any(not (end <= item.start or cursor >= item.end) for item in occupied)
            if not blocked and not collision:
                revised = target.model_copy(
                    update={"start": cursor, "end": end, "status": "rescheduled"}
                )
                return [revised if session.id == session_id else session for session in sessions]
            cursor += timedelta(minutes=30)
    raise ValueError("no open window is available for the missed session")
