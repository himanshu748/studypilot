import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

const demoRequest = {
  syllabus: "# Semester\n## Cognitive Science 201\n- Research Brief | due 2026-09-11T17:00 | effort 180m | weight 25%",
  availability: [{ start: "2026-09-07T18:00:00", end: "2026-09-07T21:00:00" }],
  protected: [],
};

const sessions = Array.from({ length: 8 }, (_, index) => ({
  id: `session-${index}`,
  academic_item_id: `item-${index % 4}`,
  course: ["Academic Writing 102", "Cognitive Science 201", "Data Literacy 150", "Modern Europe 210"][index % 4],
  title: ["Argument Essay Draft", "Research Brief", "Lab 5 Report", "Document Analysis Essay"][index % 4],
  start: `2026-09-${String(7 + (index % 6)).padStart(2, "0")}T18:00:00`,
  end: `2026-09-${String(7 + (index % 6)).padStart(2, "0")}T19:30:00`,
  status: "staged",
}));

const plan = {
  id: "plan-test",
  status: "waiting_for_approval",
  approval_id: "write-calendar-events",
  request: demoRequest,
  items: [
    { id: "item-1", course: "Cognitive Science 201", title: "Research Brief", due_at: "2026-09-11T17:00:00", effort_minutes: 180, weight_percent: 25, source_line: 4, source_text: "Research Brief", requires_confirmation: false },
    { id: "item-2", course: "Cognitive Science 201", title: "Reading response", due_at: null, effort_minutes: 60, weight_percent: 5, source_line: 16, source_text: "due TBA after seminar", requires_confirmation: true },
  ],
  sessions,
  conflicts: [{ kind: "deadline_cluster", title: "4 deadlines are clustered", explanation: "4 confirmed deadlines fall within 48 hours. Study sessions are front-loaded to preserve protected time.", item_count: 4, item_ids: [] }],
  events: [
    { kind: "syllabus_extracted", summary: "Extracted 5 items", created_at: "2026-09-02T10:00:00Z" },
    { kind: "schedule_staged", summary: "Staged 8 study sessions", created_at: "2026-09-02T10:00:01Z" },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
});

describe("StudyPilot", () => {
  it("starts with a specific empty state and labeled planning inputs", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "StudyPilot" })).toBeInTheDocument();
    expect(screen.getByLabelText("Syllabus source")).toBeInTheDocument();
    expect(screen.getByLabelText("Weekly availability")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Build this week" })).toBeEnabled();
  });

  it("turns the syllabus into a cited week and pauses before calendar writes", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(demoRequest), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(plan), { status: 201 })));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Build this week" }));

    expect(await screen.findByText("4 deadlines are clustered")).toBeInTheDocument();
    expect(screen.getByText("8 sessions staged")).toBeInTheDocument();
    expect(screen.getByText("Needs date confirmation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add 8 sessions to calendar" })).toBeEnabled();
  });

  it("writes only after exact approval and replans a missed session in place", async () => {
    const approved = { ...plan, status: "approved", sessions: sessions.map((session) => ({ ...session, status: "calendar" })) };
    const replanned = { ...approved, sessions: approved.sessions.map((session, index) => index === 0 ? { ...session, status: "rescheduled", start: "2026-09-12T10:30:00", end: "2026-09-12T12:00:00" } : session) };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(demoRequest), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(plan), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(approved), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(replanned), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Build this week" }));
    await screen.findByText("8 sessions staged");

    fireEvent.click(screen.getByRole("button", { name: "Add 8 sessions to calendar" }));

    expect(await screen.findByText("8 calendar events added")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/plans/plan-test/decision", expect.objectContaining({ body: JSON.stringify({ approval_id: "write-calendar-events", choice: "approved" }) }));

    fireEvent.click(screen.getByRole("button", { name: "I missed the first session" }));
    expect(await screen.findByText("1 session rebalanced")).toBeInTheDocument();
    expect(screen.getByText("Rescheduled", { exact: true })).toBeInTheDocument();
  });
});
