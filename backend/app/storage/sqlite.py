import sqlite3
import threading
from pathlib import Path

from app.domain.models import CalendarEvent, StudyPlan


class SQLiteStore:
    def __init__(self, path: Path | str) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._connection = sqlite3.connect(self.path, check_same_thread=False)
        self._connection.row_factory = sqlite3.Row
        self.initialize()

    def initialize(self) -> None:
        with self._lock, self._connection:
            self._connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS plans (
                    id TEXT PRIMARY KEY,
                    document TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS calendar_events (
                    plan_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    document TEXT NOT NULL,
                    PRIMARY KEY (plan_id, session_id)
                );
                """
            )

    def save_plan(self, plan: StudyPlan) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                "INSERT INTO plans(id, document) VALUES (?, ?) "
                "ON CONFLICT(id) DO UPDATE SET document = excluded.document",
                (plan.id, plan.model_dump_json()),
            )

    def get_plan(self, plan_id: str) -> StudyPlan | None:
        with self._lock:
            row = self._connection.execute(
                "SELECT document FROM plans WHERE id = ?", (plan_id,)
            ).fetchone()
        return StudyPlan.model_validate_json(row["document"]) if row else None

    def write_calendar(self, plan: StudyPlan) -> None:
        with self._lock, self._connection:
            for session in plan.sessions:
                event = CalendarEvent(
                    plan_id=plan.id,
                    session_id=session.id,
                    course=session.course,
                    title=session.title,
                    start=session.start,
                    end=session.end,
                    status="rescheduled" if session.status == "rescheduled" else "calendar",
                )
                self._connection.execute(
                    "INSERT INTO calendar_events(plan_id, session_id, document) VALUES (?, ?, ?) "
                    "ON CONFLICT(plan_id, session_id) DO UPDATE SET document = excluded.document",
                    (plan.id, session.id, event.model_dump_json()),
                )

    def calendar_events(self, plan_id: str) -> list[CalendarEvent]:
        with self._lock:
            rows = self._connection.execute(
                "SELECT document FROM calendar_events WHERE plan_id = ? ORDER BY session_id",
                (plan_id,),
            ).fetchall()
        return [CalendarEvent.model_validate_json(row["document"]) for row in rows]
