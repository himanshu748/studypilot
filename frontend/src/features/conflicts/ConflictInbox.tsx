import type { PlanningConflict } from "../../api/types";
import { AlertIcon } from "../../ui/Icons";

export function ConflictInbox({ conflicts }: { conflicts: PlanningConflict[] }) {
  const hasConflicts = conflicts.length > 0;
  return (
    <section className="conflict-inbox" aria-label="Planning conflicts">
      <header><AlertIcon /><h2>{hasConflicts ? "Conflict detected" : "No conflicts detected"}</h2></header>
      {!hasConflicts && <p className="conflict-empty">The staged sessions fit the current availability and protected time.</p>}
      {conflicts.map((conflict) => (
        <article key={conflict.title}>
          <span>{conflict.item_count} deadlines</span>
          <h3>{conflict.title}</h3>
          <p>{conflict.explanation}</p>
        </article>
      ))}
    </section>
  );
}
