import type { PlanEvent } from "../../api/types";

export function ActivityTimeline({ events }: { events: PlanEvent[] }) {
  return (
    <ol className="activity-timeline" aria-label="Agent activity">
      {events.map((event, index) => <li key={`${event.kind}-${index}`}><span>{index + 1}</span><strong>{event.summary}</strong></li>)}
    </ol>
  );
}
