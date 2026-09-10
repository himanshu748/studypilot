import type { PlanRequest, StudyPlan } from "./types";

async function responseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = payload.detail;
    const message = typeof detail === "string" ? detail : Array.isArray(detail)
      ? detail.map((entry: { loc?: (string | number)[]; msg?: string }) => `${entry.loc?.slice(1).join(" · ") || "Input"}: ${entry.msg || "Check this value"}`).join(". ")
      : `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function listPlans(): Promise<StudyPlan[]> {
  return responseJson(await fetch("/api/plans"));
}

export interface RuntimeStatus {
  runtime_mode: "local" | "bedrock" | "agentcore" | "openai-compatible";
  model_access: "disabled" | "not_verified";
  storage_mode: "local_sqlite";
  aws_calls_enabled: boolean;
}

export async function getRuntimeStatus(): Promise<RuntimeStatus> {
  return responseJson(await fetch("/api/health"));
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
  const target = plan.sessions.find(session => session.id === sessionId);
  if (!target) throw new Error("This session is no longer in the plan. Reopen the saved plan.");
  const query = new URLSearchParams({ expected_start: target.start });
  return responseJson(
    await fetch(`/api/plans/${plan.id}/sessions/${sessionId}/missed?${query}`, { method: "POST" }),
  );
}
