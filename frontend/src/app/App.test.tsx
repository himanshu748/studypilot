import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

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

beforeEach(() => { window.location.hash = "#overview"; });

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.removeItem("studypilot-theme");
  delete document.documentElement.dataset.theme;
});

function openDemo() {
  render(<App />);
  fireEvent.click(screen.getAllByRole("button", { name: "Open planner" })[0]);
  fireEvent.click(screen.getByText("Explore with sample coursework"));
}

describe("StudyPilot landing", () => {
  it("opens on the landing page with navigation and a primary call to action", () => {
    render(<App />);

    expect(screen.getByRole("heading", { level: 1, name: "StudyPilot" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Your week, within reach/ })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Section navigation" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "How it works" })[0]).toHaveAttribute("href", "#how-it-works");
    expect(screen.getAllByRole("button", { name: "Open planner" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Your coursework")).not.toBeInTheDocument();
  });

  it("explains the product without hackathon or implementation copy", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Add your coursework" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "You get the final say." })).toBeInTheDocument();
    expect(screen.getByText(/Not automatically. Approved events/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/hackathon|Bedrock|Strands|fixture|FastAPI|SQLite/i);
  });

  it("moves between the landing page and the demo without losing either surface", () => {
    openDemo();
    expect(screen.getByText("Your coursework")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to overview" }));
    expect(screen.getByRole("heading", { name: /Your week, within reach/ })).toBeInTheDocument();
  });
});

describe("StudyPilot", () => {
  it("identifies external inference without claiming Bedrock access or offline processing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      runtime_mode: "openai-compatible", fixture_mode: false,
      aws_calls_enabled: false, model_access: "not_verified",
    }), { status: 200 })));
    openDemo();
    fireEvent.click(screen.getByRole("button", { name: "Connection details" }));
    expect(await screen.findByText("External model configured · inference not verified")).toBeInTheDocument();
    expect(screen.getByText(/Model requests go to your configured endpoint/)).toBeInTheDocument();
    expect(screen.queryByText(/Your plans are processed on this machine/)).not.toBeInTheDocument();
  });

  it("starts with a specific empty state and labeled planning inputs", () => {
    openDemo();

    expect(screen.getByRole("heading", { name: "StudyPilot" })).toBeInTheDocument();
    expect(screen.getByText("Your coursework")).toBeInTheDocument();
    expect(screen.getByText(/Seeded overloaded semester/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Build this week" })).toBeEnabled();
  });

  it("renders week labels from the returned session dates", async () => {
    const shifted = { ...plan, sessions: sessions.map((session) => ({ ...session, start: session.start.replace("2026-09", "2027-10"), end: session.end.replace("2026-09", "2027-10") })) };
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(demoRequest), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(shifted), { status: 201 })));
    openDemo();
    fireEvent.click(screen.getByRole("button", { name: "Build this week" }));
    expect(await screen.findByRole("heading", { name: "Oct 7–12, 2027" })).toBeInTheDocument();
    expect(screen.queryByText("Sep 7–12, 2026")).not.toBeInTheDocument();
  });

  it("turns the syllabus into a cited week and pauses before calendar writes", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(demoRequest), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(plan), { status: 201 })));
    openDemo();

    fireEvent.click(screen.getByRole("button", { name: "Build this week" }));

    expect(await screen.findByText("4 deadlines are clustered")).toBeInTheDocument();
    expect(screen.getByText("8 sessions staged")).toBeInTheDocument();
    expect(screen.getByText("Needs date confirmation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add 8 sessions to calendar" })).toBeEnabled();
    const activity = screen.getByText("Plan activity").closest("details")!;
    const approval = screen.getByRole("button", { name: "Add 8 sessions to calendar" });
    expect(activity).not.toHaveAttribute("open");
    expect(approval.compareDocumentPosition(activity) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getByText("Plan activity"));
    expect(activity).toHaveAttribute("open");
    expect(screen.getByRole("list", { name: "Agent activity" })).toBeVisible();
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
    openDemo();
    fireEvent.click(screen.getByRole("button", { name: "Build this week" }));
    await screen.findByText("8 sessions staged");

    fireEvent.click(screen.getByRole("button", { name: "Add 8 sessions to calendar" }));

    expect(await screen.findByText("8 calendar events added")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/plans/plan-test/decision", expect.objectContaining({ body: JSON.stringify({ approval_id: "write-calendar-events", choice: "approved" }) }));

    fireEvent.change(screen.getByLabelText("Missed a study session?"), { target: { value: "session-0" } });
    fireEvent.click(screen.getByRole("button", { name: "Move selected session" }));
    expect(await screen.findByText("1 session rebalanced")).toBeInTheDocument();
    expect(screen.getByText("Rescheduled", { exact: true })).toBeInTheDocument();
  });

  it("retries a failed decision without rebuilding the plan", async () => {
    const approved = { ...plan, status: "approved", sessions: sessions.map((session) => ({ ...session, status: "calendar" })) };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(demoRequest), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(plan), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: "Decision unavailable" }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(approved), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    openDemo();
    fireEvent.click(screen.getByRole("button", { name: "Build this week" }));
    await screen.findByText("8 sessions staged");
    fireEvent.click(screen.getByRole("button", { name: "Add 8 sessions to calendar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Retry decision" }));
    expect(await screen.findByText("8 calendar events added")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/plans/plan-test/decision", expect.any(Object));
  });
});
