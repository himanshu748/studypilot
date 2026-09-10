import type { AcademicItem } from "../../api/types";
import { AlertIcon, CheckIcon } from "../../ui/Icons";

export function SyllabusMargin({ items }: { items: AcademicItem[] }) {
  const courses = Array.from(new Set(items.map((item) => item.course)));
  return (
    <aside className="syllabus-margin" aria-label="Extracted syllabus and deadlines">
      <header><h2>Syllabus &amp; deadlines</h2><span>{courses.length} {courses.length === 1 ? "source" : "sources"}</span></header>
      {courses.map((course) => (
        <section className="course-source" key={course}>
          <h3>{course}</h3>
          {items.filter((item) => item.course === course).map((item) => (
            <article className={item.requires_confirmation ? "source-row uncertain" : "source-row"} key={item.id}>
              <span className="line-number">{item.source_line}</span>
              <div>
                <strong>{item.title}</strong>
                <small>{item.due_at ? `Due ${new Date(item.due_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : "Needs date confirmation"}</small>
              </div>
              {item.requires_confirmation ? <AlertIcon /> : <CheckIcon />}
            </article>
          ))}
        </section>
      ))}
    </aside>
  );
}
