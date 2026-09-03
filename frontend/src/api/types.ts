export interface AcademicItem {
  id: string;
  course: string;
  title: string;
  due_at: string | null;
  effort_minutes: number;
  weight_percent: number;
  source_line: number;
  source_text: string;
  requires_confirmation: boolean;
}

export interface StudySession {
  id: string;
  academic_item_id: string;
  course: string;
  title: string;
  start: string;
  end: string;
  status: "staged" | "calendar" | "rescheduled";
}

export interface PlanningConflict {
  kind: "deadline_cluster" | "insufficient_time";
  title: string;
  explanation: string;
  item_count: number;
  item_ids: string[];
}

export interface PlanEvent {
  kind: string;
  summary: string;
  created_at: string;
}

export interface PlanRequest {
  syllabus: string;
  availability: { start: string; end: string }[];
  protected: { start: string; end: string; label: string }[];
}

export interface StudyPlan {
  id: string;
  status: "waiting_for_approval" | "approved" | "rejected";
  approval_id: string;
  request: PlanRequest;
  items: AcademicItem[];
  sessions: StudySession[];
  conflicts: PlanningConflict[];
  events: PlanEvent[];
}
