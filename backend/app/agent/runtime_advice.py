import os

from pydantic import BaseModel, Field

from app.agent.model import StrandsPlanningAdvisor, create_strands_agent
from app.agent.orchestrator import FixturePlanningAdvisor
from app.agent.runtime_evidence import evidence
from app.domain.models import AvailabilityWindow


class AdviceInput(BaseModel):
    syllabus: str = Field(min_length=20, max_length=30000)
    windows: list[AvailabilityWindow] = Field(min_length=1, max_length=40)


def advise(payload: dict, *, fixture: bool = False):
    request = AdviceInput.model_validate(payload)
    windows = [window.model_dump(mode="json") for window in request.windows]
    if fixture:
        result = FixturePlanningAdvisor().advise(request.syllabus, windows)
        return {
            "engine": "strands-fixture",
            "advice": result.model_dump(mode="json"),
            "tool_calls": ["fixture_plan", "PlanningAdvice"],
            "usage": {},
        }
    agent = create_strands_agent(
        model_id=os.environ["BEDROCK_MODEL_ID"],
        region_name=os.getenv("AWS_REGION", "us-east-1"),
    )
    advisor = StrandsPlanningAdvisor(agent)
    result = advisor.advise(request.syllabus, windows)
    return evidence(advisor.last_run_agent, result)
