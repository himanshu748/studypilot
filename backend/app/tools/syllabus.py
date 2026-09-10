import hashlib
import json
import re
from collections import Counter
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
        if due_at is not None and due_at.tzinfo is not None:
            raise ValueError("Use local deadline times without timezone offsets")
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
    # Preserve existing identities for unique tasks. Repeated labels need a
    # deadline and occurrence identity so advisory lookup and calendar upserts
    # cannot collapse separate coursework into one item.
    counts = Counter(item.id for item in items)
    occurrences: Counter[tuple[str, str, str | None]] = Counter()
    for index, item in enumerate(items):
        if counts[item.id] == 1:
            continue
        identity = (item.course, item.title, item.due_at.isoformat() if item.due_at else None)
        occurrence = occurrences[identity]
        occurrences[identity] += 1
        encoded = json.dumps([*identity, occurrence], ensure_ascii=False, separators=(",", ":"))
        digest = hashlib.sha256(encoded.encode()).hexdigest()[:12]
        items[index] = item.model_copy(update={"id": f"item-{digest}"})
    return SyllabusExtraction(items=items)
