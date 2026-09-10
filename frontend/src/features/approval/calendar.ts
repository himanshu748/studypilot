import type { StudyPlan } from "../../api/types";
const escapeText = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
const stamp = (date: string) => date.replace(/[-:]/g, "").replace(/\.\d+/, "");
export function calendarFile(plan: StudyPlan) {
  if (plan.status !== "approved") throw new Error("Approve the plan before exporting.");
  const now = stamp(new Date().toISOString());
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//StudyPilot//Study plan//EN", ...plan.sessions.flatMap(s => ["BEGIN:VEVENT", `UID:${plan.id}-${s.id}@studypilot.local`, `DTSTAMP:${now}`, `DTSTART:${stamp(s.start)}`, `DTEND:${stamp(s.end)}`, `SUMMARY:${escapeText(s.course + ": " + s.title)}`, "END:VEVENT"]), "END:VCALENDAR"];
  return lines.map(line => {
    const chunks: string[] = []; let part = ""; let size = 0;
    for (const char of line) { const bytes = new TextEncoder().encode(char).length; if (size + bytes > 73) { chunks.push(part); part = " "; size = 1; } part += char; size += bytes; }
    chunks.push(part); return chunks.join("\r\n");
  }).join("\r\n") + "\r\n";
}
export function downloadCalendar(plan: StudyPlan) {
  const url = URL.createObjectURL(new Blob([calendarFile(plan)], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = "studypilot-calendar.ics"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
