from typing import Any

from strands import Agent, tool
from strands.models import BedrockModel

from app.agent.budget import ModelCallBudget, isolated_agent
from app.agent.runtime_client import RuntimeClient
from app.domain.models import PlanningAdvice
from app.tools.syllabus import extract_syllabus

SYSTEM_PROMPT = """You are StudyPilot, a planning agent for academic workload.
Use the registered read-only tools to inspect syllabus items and availability. Prioritize confirmed
deadlines without predicting grades. Ambiguous dates must remain unresolved. Return structured
priority IDs and a concise explanation. Calendar writes are outside your authority.
"""


@tool
def inspect_syllabus(content: str) -> dict[str, Any]:
    """Extract cited academic items from syllabus text."""
    return extract_syllabus(content).model_dump(mode="json")


@tool
def inspect_availability(windows: list[dict[str, str]]) -> dict[str, Any]:
    """Summarize student-provided study windows without changing a calendar."""
    return {"window_count": len(windows), "windows": windows}


def create_strands_agent(*, model_id: str, region_name: str) -> Agent:
    return Agent(
        name="studypilot_planner",
        description="Prioritizes confirmed academic work for a constraint-aware scheduler",
        model=BedrockModel(
            model_id=model_id,
            region_name=region_name,
            temperature=0.0,
            max_tokens=512,
        ),
        tools=[inspect_syllabus, inspect_availability],
        system_prompt=SYSTEM_PROMPT,
        callback_handler=None,
        hooks=[ModelCallBudget()],
    )


class StrandsPlanningAdvisor:
    def __init__(self, agent: Agent) -> None:
        self.agent = agent

    def advise(self, syllabus: str, windows: list[dict[str, str]]) -> PlanningAdvice:
        agent = isolated_agent(self.agent)
        self.last_run_agent = agent
        result = agent(
            "Inspect the syllabus and availability, then return confirmed item IDs "
            "in priority order.\n"
            f"Syllabus:\n{syllabus}\nAvailability:\n{windows}",
            structured_output_model=PlanningAdvice,
        )
        if not isinstance(result.structured_output, PlanningAdvice):
            raise ValueError("Strands agent did not return planning advice")
        return result.structured_output


class AgentCorePlanningAdvisor:
    def __init__(self, arn: str, region: str):
        self.runtime = RuntimeClient(arn, region)

    def advise(self, syllabus: str, windows: list[dict[str, str]]) -> PlanningAdvice:
        return PlanningAdvice.model_validate(
            self.runtime.invoke({"syllabus": syllabus, "windows": windows})
        )
