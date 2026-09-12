from unittest.mock import Mock

import pytest

from app.agent.orchestrator import PlanningWorkflow
from app.domain.models import PlanRequest
from app.planning.capacity import check_deadline_capacity
from app.planning.scheduler import ScheduleCapacityError
from app.storage.sqlite import SQLiteStore
from app.tools.syllabus import extract_syllabus


def request():
    return PlanRequest.model_validate(
        {
            "syllabus": "## Math\n- Quiz | due 2027-10-07T20:00 | effort 90m | weight 10%",
            "availability": [
                {"start": "2027-10-07T19:00", "end": "2027-10-07T21:00"},
                {"start": "2027-10-08T18:00", "end": "2027-10-08T22:00"},
            ],
            "protected": [],
        }
    )


def test_obvious_deadline_deficit_does_not_call_advisor_or_persist(tmp_path):
    advisor = Mock()
    store = SQLiteStore(tmp_path / "capacity.db")
    with pytest.raises(ScheduleCapacityError, match="Add 30 minutes before that deadline"):
        PlanningWorkflow(store=store, advisor=advisor).create(request())
    advisor.advise.assert_not_called()
    assert store.list_plans() == []


def test_equal_capacity_and_unconfirmed_tasks_do_not_trigger_a_false_deficit():
    plan = request()
    plan.syllabus += "\n- Unknown | due TBA | effort 600m | weight 0%"
    plan.availability[0].start = plan.availability[0].start.replace(hour=18, minute=30)
    check_deadline_capacity(extract_syllabus(plan.syllabus).items, plan)


def test_simultaneous_tasks_share_capacity_and_overlapping_protection_is_not_double_counted():
    plan = request()
    plan.syllabus += "\n- Essay | due 2027-10-07T20:00 | effort 60m | weight 0%"
    plan.availability[0].start = plan.availability[0].start.replace(hour=17)
    data = plan.model_dump()
    data["protected"] = [
        {"start": "2027-10-07T18:00", "end": "2027-10-07T19:00", "label": "Work"},
        {"start": "2027-10-07T18:30", "end": "2027-10-07T19:30", "label": "Travel"},
    ]
    plan = PlanRequest.model_validate(data)
    with pytest.raises(ScheduleCapacityError, match="only 90 are available"):
        check_deadline_capacity(extract_syllabus(plan.syllabus).items, plan)
