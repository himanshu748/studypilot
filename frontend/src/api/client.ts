import type { PlanRequest, StudyPlan } from "./types";

async function responseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function getDemoRequest(): Promise<PlanRequest> {
  return responseJson(await fetch("/api/demo-request"));
}

export async function createPlan(request: PlanRequest): Promise<StudyPlan> {
  return responseJson(
    await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }),
  );
}

export async function decidePlan(
  plan: StudyPlan,
  choice: "approved" | "rejected",
): Promise<StudyPlan> {
  return responseJson(
    await fetch(`/api/plans/${plan.id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approval_id: plan.approval_id, choice }),
    }),
  );
}

export async function markMissed(plan: StudyPlan, sessionId: string): Promise<StudyPlan> {
  return responseJson(
    await fetch(`/api/plans/${plan.id}/sessions/${sessionId}/missed`, { method: "POST" }),
  );
}
