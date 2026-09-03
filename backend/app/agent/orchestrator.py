import uuid
from typing import Literal, Protocol

from app.domain.models import PlanEvent, PlanningAdvice, PlanRequest, StudyPlan
from app.planning.conflicts import detect_conflicts
from app.planning.replanner import replan_session
from app.planning.scheduler import build_schedule
from app.storage.sqlite import SQLiteStore
from app.tools.syllabus import extract_syllabus

CALENDAR_APPROVAL_ID = "write-calendar-events"


class PlanningAdvisor(Protocol):
    def advise(self, syllabus: str, windows: list[dict[str, str]]) -> PlanningAdvice: ...


class FixturePlanningAdvisor:
    def advise(self, syllabus: str, windows: list[dict[str, str]]) -> PlanningAdvice:
        del windows
        items = [item for item in extract_syllabus(syllabus).items if item.due_at]
        ordered = sorted(items, key=lambda item: (item.due_at, -item.weight_percent))
        return PlanningAdvice(
            priority_item_ids=[item.id for item in ordered],
            rationale="Confirmed deadlines are ordered by due time and grading weight.",
        )


class PlanningWorkflow:
    def __init__(self, *, store: SQLiteStore, advisor: PlanningAdvisor | None = None) -> None:
        self.store = store
        self.advisor = advisor or FixturePlanningAdvisor()

    def create(self, request: PlanRequest) -> StudyPlan:
        extraction = extract_syllabus(request.syllabus)
        confirmed = [item for item in extraction.items if item.due_at]
        advice = self.advisor.advise(
            request.syllabus,
            [window.model_dump(mode="json") for window in request.availability],
        )
        by_id = {item.id: item for item in confirmed}
        ordered = [by_id[item_id] for item_id in advice.priority_item_ids if item_id in by_id]
        ordered.extend(item for item in confirmed if item.id not in {entry.id for entry in ordered})
        sessions = build_schedule(ordered, request.availability, request.protected)
        plan = StudyPlan(
            id=f"plan-{uuid.uuid4().hex[:14]}",
            status="waiting_for_approval",
            approval_id=CALENDAR_APPROVAL_ID,
            request=request,
            items=extraction.items,
            sessions=sessions,
            conflicts=detect_conflicts(confirmed),
            events=[
                PlanEvent(
                    kind="syllabus_extracted",
                    summary=f"Extracted {len(extraction.items)} items",
                ),
                PlanEvent(kind="priorities_advised", summary=advice.rationale),
                PlanEvent(kind="schedule_staged", summary=f"Staged {len(sessions)} study sessions"),
                PlanEvent(kind="approval_required", summary="Calendar write requires approval"),
            ],
        )
        self.store.save_plan(plan)
        return plan

    def decide(
        self,
        plan_id: str,
        *,
        approval_id: str,
        choice: Literal["approved", "rejected"],
    ) -> StudyPlan:
        plan = self.store.get_plan(plan_id)
        if plan is None:
            raise KeyError(plan_id)
        if plan.status != "waiting_for_approval":
            raise ValueError("plan is not waiting for approval")
        if approval_id != CALENDAR_APPROVAL_ID:
            raise ValueError("approval id does not match the calendar gate")
        if choice == "rejected":
            revised = plan.model_copy(
                update={
                    "status": "rejected",
                    "events": [
                        *plan.events,
                        PlanEvent(kind="plan_rejected", summary="Calendar write rejected"),
                    ],
                }
            )
            self.store.save_plan(revised)
            return revised
        sessions = [session.model_copy(update={"status": "calendar"}) for session in plan.sessions]
        revised = plan.model_copy(
            update={
                "status": "approved",
                "sessions": sessions,
                "events": [
                    *plan.events,
                    PlanEvent(
                        kind="calendar_written",
                        summary=f"Added {len(sessions)} sessions",
                    ),
                ],
            }
        )
        self.store.save_plan(revised)
        self.store.write_calendar(revised)
        return revised

    def mark_missed(self, plan_id: str, session_id: str) -> StudyPlan:
        plan = self.store.get_plan(plan_id)
        if plan is None:
            raise KeyError(plan_id)
        if plan.status != "approved":
            raise ValueError("only approved plans can be replanned")
        sessions = replan_session(plan.request, plan.sessions, session_id)
        revised = plan.model_copy(
            update={
                "sessions": sessions,
                "events": [
                    *plan.events,
                    PlanEvent(kind="session_replanned", summary="Moved one missed session"),
                ],
            }
        )
        self.store.save_plan(revised)
        self.store.write_calendar(revised)
        return revised
