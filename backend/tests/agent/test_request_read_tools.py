import pytest

from app.agent.model import request_read_tools
from app.main import seeded_request


def test_request_tools_need_no_model_generated_document_arguments():
    request = seeded_request()
    windows = [window.model_dump(mode="json") for window in request.availability]
    syllabus_tool, availability_tool = request_read_tools(request.syllabus, windows)
    assert syllabus_tool()["items"]
    assert availability_tool()["window_count"] == len(windows)
    assert syllabus_tool.tool_spec["inputSchema"]["json"].get("properties", {}) == {}
    assert availability_tool.tool_spec["inputSchema"]["json"].get("properties", {}) == {}


def test_bound_tools_do_not_mix_concurrent_requests():
    request = seeded_request()
    windows = [{"start": "2026-09-09T18:00:00", "end": "2026-09-09T19:00:00"}]
    first = request_read_tools(request.syllabus, windows)
    second = request_read_tools("Unstructured syllabus with no confirmed deadlines.", [])
    windows[0]["start"] = "mutated-after-binding"
    assert first[0]()["items"]
    with pytest.raises(ValueError, match="no academic items"):
        second[0]()
    assert first[1]()["windows"][0]["start"] == "2026-09-09T18:00:00"
    assert second[1]()["window_count"] == 0
