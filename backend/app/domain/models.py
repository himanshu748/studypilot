from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class AcademicItem(BaseModel):
    id: str
    course: str
    title: str
    due_at: datetime | None = None
    effort_minutes: int = Field(ge=30, le=1200)
    weight_percent: int = Field(ge=0, le=100)
    source_line: int = Field(gt=0)
    source_text: str
    requires_confirmation: bool = False


class SyllabusExtraction(BaseModel):
    items: list[AcademicItem]


class AvailabilityWindow(BaseModel):
    start: datetime
    end: datetime

    @model_validator(mode="after")
    def validate_order(self):
        if self.end <= self.start:
            raise ValueError("availability end must be after start")
        return self


class ProtectedWindow(AvailabilityWindow):
    label: str = Field(min_length=1, max_length=120)


class PlanRequest(BaseModel):
    syllabus: str = Field(min_length=20, max_length=100_000)
    availability: list[AvailabilityWindow] = Field(min_length=1, max_length=40)
    protected: list[ProtectedWindow] = Field(default_factory=list, max_length=40)


class StudySession(BaseModel):
    id: str
    academic_item_id: str
    course: str
    title: str
    start: datetime
    end: datetime
    status: Literal["staged", "calendar", "rescheduled"] = "staged"

    @property
    def duration_minutes(self) -> int:
        return int((self.end - self.start).total_seconds() // 60)


class PlanningConflict(BaseModel):
    kind: Literal["deadline_cluster", "insufficient_time"]
    title: str
    explanation: str
    item_count: int = Field(ge=1)
    item_ids: list[str]


class PlanEvent(BaseModel):
    kind: str
    summary: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class StudyPlan(BaseModel):
    id: str
    status: Literal["waiting_for_approval", "approved", "rejected"]
    approval_id: str
    request: PlanRequest
    items: list[AcademicItem]
    sessions: list[StudySession]
    conflicts: list[PlanningConflict]
    events: list[PlanEvent]


class CalendarEvent(BaseModel):
    plan_id: str
    session_id: str
    course: str
    title: str
    start: datetime
    end: datetime
    status: Literal["calendar", "rescheduled"]


class PlanningAdvice(BaseModel):
    priority_item_ids: list[str]
    rationale: str
