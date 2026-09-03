from datetime import timedelta

from app.domain.models import AcademicItem, PlanningConflict


def detect_conflicts(items: list[AcademicItem]) -> list[PlanningConflict]:
    dated = sorted((item for item in items if item.due_at), key=lambda item: item.due_at)
    if len(dated) < 3:
        return []
    first_due = dated[0].due_at
    assert first_due is not None
    cluster = [
        item
        for item in dated
        if item.due_at is not None and item.due_at - first_due <= timedelta(hours=48)
    ]
    if len(cluster) < 3:
        return []
    return [
        PlanningConflict(
            kind="deadline_cluster",
            title=f"{len(cluster)} deadlines are clustered",
            explanation=(
                f"{len(cluster)} confirmed deadlines fall within 48 hours. "
                "Study sessions are front-loaded to preserve protected time."
            ),
            item_count=len(cluster),
            item_ids=[item.id for item in cluster],
        )
    ]
