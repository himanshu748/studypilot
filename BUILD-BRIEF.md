# Real-input product increment

Approved direction: a local-first academic planning workspace for students using their own coursework. Keep the existing visual system; put editable inputs before sample data. No AWS deployment or bank-funded usage.

Workflow: enter coursework, deadlines and effort; set available and protected time; inspect the generated week; approve local calendar records; download an ICS file. Saved plans reopen from SQLite. The current strict syllabus parser is not a general PDF or natural-language importer. Editable coursework is the dependable input path for this increment.

Proof: custom input API and browser tests, source-linked tasks, persisted reopening, calendar export after approval, invalid-input recovery. Excludes OAuth calendar sync, public multi-user hosting, and claims of live model execution. First risk: date/time consistency and overlapping availability.
