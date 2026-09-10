from datetime import datetime
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.agent.model import AgentCorePlanningAdvisor, StrandsPlanningAdvisor, create_strands_agent
from app.agent.orchestrator import PlanningWorkflow
from app.agent.provider import create_provider_model, validate_provider_configuration
from app.config import Settings
from app.domain.models import AvailabilityWindow, PlanRequest, ProtectedWindow, StudyPlan
from app.http_contract import LOCAL_ORIGIN_PATTERN, install_http_contract, runtime_metadata
from app.storage.sqlite import SQLiteStore


class DecisionRequest(BaseModel):
    approval_id: str
    choice: Literal["approved", "rejected"]


def seeded_request() -> PlanRequest:
    fixture = Path(__file__).parents[2] / "fixtures" / "syllabi" / "overloaded-semester.md"
    return PlanRequest(
        syllabus=fixture.read_text(encoding="utf-8"),
        availability=[
            AvailabilityWindow(start=datetime.fromisoformat(start), end=datetime.fromisoformat(end))
            for start, end in [
                ("2026-09-07T18:00", "2026-09-07T21:00"),
                ("2026-09-08T18:00", "2026-09-08T21:00"),
                ("2026-09-09T18:00", "2026-09-09T21:00"),
                ("2026-09-10T18:00", "2026-09-10T21:00"),
                ("2026-09-11T18:00", "2026-09-11T20:00"),
                ("2026-09-12T09:00", "2026-09-12T12:00"),
            ]
        ],
        protected=[
            ProtectedWindow(
                start=datetime.fromisoformat("2026-09-09T19:00"),
                end=datetime.fromisoformat("2026-09-09T21:00"),
                label="Family dinner",
            )
        ],
    )


def create_app(
    settings: Settings | None = None,
    *,
    store: SQLiteStore | None = None,
    workflow: PlanningWorkflow | None = None,
) -> FastAPI:
    active_settings = settings or Settings()
    validate_provider_configuration(active_settings)
    application = FastAPI(title="StudyPilot", version="0.1.0")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_origin_regex=LOCAL_ORIGIN_PATTERN,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
        expose_headers=["X-Request-ID"],
    )
    install_http_contract(application)
    active_store = store or SQLiteStore(active_settings.database_path)
    active_workflow = workflow
    if active_workflow is None:
        advisor = None
        if not active_settings.fixture_mode:
            if active_settings.agentcore_runtime_arn:
                advisor = AgentCorePlanningAdvisor(
                    active_settings.agentcore_runtime_arn, active_settings.aws_region
                )
            elif active_settings.selected_model_id is None:
                raise ValueError("BEDROCK_MODEL_ID is required when fixture mode is disabled")
            else:
                agent = create_strands_agent(
                    model_id=active_settings.selected_model_id,
                    provider_model=create_provider_model(active_settings),
                    region_name=active_settings.aws_region,
                )
                advisor = StrandsPlanningAdvisor(agent)
        active_workflow = PlanningWorkflow(store=active_store, advisor=advisor)

    application.state.settings = active_settings
    application.state.store = active_store
    application.state.workflow = active_workflow

    @application.get("/api/health")
    async def health() -> dict[str, str | bool | int]:
        return {
            "service": "studypilot",
            "status": "ok",
            "fixture_mode": active_settings.fixture_mode,
            "model_configured": bool(active_settings.selected_model_id),
            **runtime_metadata(
                fixture_mode=active_settings.fixture_mode,
                runtime_arn=active_settings.agentcore_runtime_arn,
                provider=active_settings.llm_provider,
            ),
        }

    @application.get("/api/demo-request", response_model=PlanRequest)
    async def demo_request() -> PlanRequest:
        return seeded_request()

    @application.post("/api/plans", response_model=StudyPlan, status_code=201)
    def create_plan(request: PlanRequest) -> StudyPlan:
        try:
            return active_workflow.create(request)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error

    @application.get("/api/plans", response_model=list[StudyPlan])
    def list_plans() -> list[StudyPlan]:
        return active_store.list_plans()

    @application.get("/api/plans/{plan_id}", response_model=StudyPlan)
    def get_plan(plan_id: str) -> StudyPlan:
        plan = active_store.get_plan(plan_id)
        if plan is None:
            raise HTTPException(status_code=404, detail="plan not found")
        return plan

    @application.post("/api/plans/{plan_id}/decision", response_model=StudyPlan)
    def decide(plan_id: str, decision: DecisionRequest) -> StudyPlan:
        try:
            return active_workflow.decide(
                plan_id,
                approval_id=decision.approval_id,
                choice=decision.choice,
            )
        except KeyError as error:
            raise HTTPException(status_code=404, detail="plan not found") from error
        except ValueError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error

    @application.post("/api/plans/{plan_id}/sessions/{session_id}/missed", response_model=StudyPlan)
    def mark_missed(
        plan_id: str, session_id: str, expected_start: datetime | None = None
    ) -> StudyPlan:
        try:
            if expected_start is not None:
                return active_workflow.mark_missed(
                    plan_id, session_id, expected_start=expected_start
                )
            return active_workflow.mark_missed(plan_id, session_id)
        except KeyError as error:
            raise HTTPException(status_code=404, detail="plan or session not found") from error
        except ValueError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error

    @application.get("/api/plans/{plan_id}/calendar")
    def calendar(plan_id: str) -> dict[str, object]:
        events = active_store.calendar_events(plan_id)
        return {"count": len(events), "events": [item.model_dump(mode="json") for item in events]}

    if active_settings.serve_frontend:
        from pathlib import Path

        from app.web import mount_demo_ui

        mount_demo_ui(
            application,
            fixture_mode=active_settings.fixture_mode,
            directory=Path(__file__).resolve().parents[2] / "frontend" / "dist",
            local_live_ui=active_settings.local_live_ui,
        )

    return application


app = create_app()
