import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanRequest, StudyPlan } from "../api/types";
import { App } from "./App";

const request: PlanRequest = {
  syllabus: "## Statistics\n- Regression worksheet | due 2027-10-09T17:00 | effort 60m | weight 10%",
  availability: [{ start: "2027-10-07T18:00:00", end: "2027-10-07T20:00:00" }],
  protected: [{ start: "2027-10-07T18:00:00", end: "2027-10-07T18:30:00", label: "Dinner" }],
};

const approved: StudyPlan = {
  id: "plan-original",
  status: "approved",
  approval_id: "write-calendar-events",
  request,
  items: [{ id: "item-1", course: "Statistics", title: "Regression worksheet", due_at: "2027-10-09T17:00:00", effort_minutes: 60, weight_percent: 10, source_line: 2, source_text: "Regression worksheet", requires_confirmation: false }],
  sessions: [{ id: "session-original", academic_item_id: "item-1", course: "Statistics", title: "Regression worksheet", start: "2027-10-07T18:30:00", end: "2027-10-07T19:30:00", status: "calendar" }],
  conflicts: [],
  events: [{ kind: "plan_created", summary: "Created original", created_at: "2027-10-06T10:00:00Z" }],
};

const revised: StudyPlan = {
  ...approved,
  id: "plan-revised",
  status: "waiting_for_approval",
  approval_id: "write-calendar-events",
  sessions: approved.sessions.map(session => ({ ...session, id: "session-revised", status: "staged" })),
};

beforeEach(() => { window.location.hash = ""; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function reopen() {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Saved plans" }));
  fireEvent.click(await screen.findByRole("button", { name: /Statistics.*In local calendar/ }));
  expect(screen.getByRole("heading", { name: "1 calendar events added" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Revise inputs" }));
}

describe("revising a saved plan", () => {
  it("prefills an approved plan and creates a distinct proposal requiring its own approval", async () => {
    const snapshot = JSON.stringify(approved);
    const fetcher = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify([approved])))
      .mockResolvedValueOnce(new Response(JSON.stringify(revised), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...revised, status: "approved" })));
    await reopen();

    expect(screen.getByLabelText("Course", { exact: true })).toHaveValue("Statistics");
    expect(screen.getByLabelText("Task", { exact: true })).toHaveValue("Regression worksheet");
    expect(screen.getByLabelText("Available from")).toHaveValue("2027-10-07T18:00");
    expect(screen.getByLabelText("Commitment")).toHaveValue("Dinner");
    expect(screen.getByText(/Your original plan and local calendar remain unchanged/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Build this week" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Study minutes"), { target: { value: "90" } });
    fireEvent.click(screen.getByRole("button", { name: "Create revised plan" }));

    const approve = await screen.findByRole("button", { name: "Add 1 sessions to calendar" });
    expect(within(screen.getByRole("region", { name: "Revised plan" })).getByText(/adds separate events/)).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(2);
    const posted = JSON.parse(fetcher.mock.calls[1][1]!.body as string);
    expect(fetcher.mock.calls[1][0]).toBe("/api/plans");
    expect(posted.syllabus).toContain("effort 90m");
    expect(posted.protected).toEqual(request.protected);
    expect(JSON.stringify(approved)).toBe(snapshot);

    fireEvent.click(approve);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
    expect(fetcher.mock.calls[2][0]).toBe("/api/plans/plan-revised/decision");
    expect(JSON.parse(fetcher.mock.calls[2][1]!.body as string)).toEqual({ approval_id: "write-calendar-events", choice: "approved" });
    await screen.findByText(/This copy added separate local calendar events/);
  });

  it("cancels back to the original approved plan without sending a POST", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify([approved])));
    await reopen();
    fireEvent.change(screen.getByLabelText("Task", { exact: true }), { target: { value: "Discarded draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel revision" }));
    expect(screen.getByRole("heading", { name: "1 calendar events added" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download calendar" })).toBeEnabled();
    expect(fetcher).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Revise inputs" }));
    expect(screen.getByLabelText("Task", { exact: true })).toHaveValue("Regression worksheet");
  });

  it("retains the failed draft and retries the current edited inputs", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify([approved])))
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: "Planner temporarily unavailable" }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(revised), { status: 201 }));
    await reopen();
    fireEvent.change(screen.getByLabelText("Task", { exact: true }), { target: { value: "Updated worksheet" } });
    fireEvent.click(screen.getByRole("button", { name: "Create revised plan" }));
    const retry = await screen.findByRole("button", { name: "Retry revised plan" });
    expect(screen.getByLabelText("Task", { exact: true })).toHaveValue("Updated worksheet");
    expect(screen.getByRole("button", { name: "Cancel revision" })).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Study minutes"), { target: { value: "90" } });
    fireEvent.click(retry);
    await screen.findByRole("button", { name: "Add 1 sessions to calendar" });
    const retried = JSON.parse(fetcher.mock.calls[2][1]!.body as string);
    expect(retried.syllabus).toContain("Updated worksheet");
    expect(retried.syllabus).toContain("effort 90m");
    expect(fetcher.mock.calls.map(call => [call[0], call[1]?.method || "GET"]))
      .toEqual([["/api/plans", "GET"], ["/api/plans", "POST"], ["/api/plans", "POST"]]);
  });
});
