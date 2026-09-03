import type { PlanningConflict } from "../../api/types";
import { AlertIcon } from "../../ui/Icons";

export function ConflictInbox({ conflicts }: { conflicts: PlanningConflict[] }) {
  return (
    <section className="conflict-inbox" aria-label="Planning conflicts">
      <header><AlertIcon /><h2>Conflict detected</h2></header>
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
