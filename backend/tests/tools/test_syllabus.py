from pathlib import Path


def test_seeded_syllabus_extracts_cited_items_and_flags_ambiguous_dates() -> None:
    from app.tools.syllabus import extract_syllabus

    fixture = Path(__file__).parents[3] / "fixtures" / "syllabi" / "overloaded-semester.md"
    extraction = extract_syllabus(fixture.read_text())

    assert len(extraction.items) == 5
    confirmed = [item for item in extraction.items if item.due_at is not None]
    assert len(confirmed) == 4
    assert all(item.source_line > 0 for item in extraction.items)
    ambiguous = extraction.items[-1]
    assert ambiguous.requires_confirmation is True
    assert ambiguous.due_at is None
    assert "TBA" in ambiguous.source_text
