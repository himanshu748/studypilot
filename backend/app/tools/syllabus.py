import hashlib
import re
from datetime import datetime

from app.domain.models import AcademicItem, SyllabusExtraction

ITEM_PATTERN = re.compile(
    r"^- (?P<title>.+?) \| due (?P<due>.+?) \| effort (?P<effort>\d+)m \| weight (?P<weight>\d+)%$"
)


def _item_id(course: str, title: str) -> str:
    digest = hashlib.sha256(f"{course}:{title}".encode()).hexdigest()[:12]
    return f"item-{digest}"


def extract_syllabus(content: str) -> SyllabusExtraction:
    course = "Unassigned course"
    items: list[AcademicItem] = []
    for line_number, raw_line in enumerate(content.splitlines(), start=1):
        line = raw_line.strip()
        if line.startswith("## "):
            course = line[3:].strip()
            continue
        match = ITEM_PATTERN.match(line)
        if not match:
            continue
        due_text = match.group("due").strip()
        try:
            due_at = datetime.fromisoformat(due_text)
        except ValueError:
            due_at = None
        items.append(
            AcademicItem(
                id=_item_id(course, match.group("title")),
                course=course,
                title=match.group("title").strip(),
                due_at=due_at,
                effort_minutes=int(match.group("effort")),
                weight_percent=int(match.group("weight")),
                source_line=line_number,
                source_text=line,
                requires_confirmation=due_at is None,
            )
        )
    if not items:
        raise ValueError("no academic items were found in the syllabus")
    return SyllabusExtraction(items=items)
