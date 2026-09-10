# Groq verification — September 10, 2026

Provider: Groq, through Strands' OpenAI-compatible model adapter.
Model: `openai/gpt-oss-20b`.
Inputs: fictional fixtures. Storage: temporary local SQLite.
Model calls: real inference, not recorded or scripted completions.

## Verified

The live Strands agent called inspect_syllabus and inspect_availability, returned PlanningAdvice, and produced a plan. The calendar remained empty before approval and contained sessions after approval. Terminal state: approved.

A separate synthetic Strands probe verified actual read-only tool execution and
a typed structured result. The provider catalog and authentication check returned
HTTP 200. Provider credentials and raw provider error bodies were not included in
the evidence output.

## AgentCore cloud workflow

The same application workflow also passed through an IAM-authenticated AgentCore
runtime in `us-east-1`, running Strands with Groq's `openai/gpt-oss-20b`.
The runtime and its DEFAULT endpoint reported READY. The application retained
the approval gate and temporary local database; only advice ran in the cloud.

Each runtime has its own execution role and project-scoped Secrets Manager
reference. CloudWatch log encryption and seven-day retention were verified.
The client attempts StopRuntimeSession in a finally block; this test did not
independently measure the time until the session stopped.

## Public hosting follow-up

The full public application subsequently passed HTTPS, real AI workflow, approval
and browser-session isolation checks on September 10, 2026. See [hosted access](HOSTED.md)
for current URLs, testing scope and limits. The local checks above remain separate evidence.

## Not established by these checks

- Persistent hosted user accounts or account recovery; hosting uses browser sessions.
- Free access throughout the judging period or a billing hard cap.
- Model quality across a representative evaluation dataset.
- Real user adoption or any third-party system mutation.

The public demo must identify the actual hosting and model state. Do not substitute
a fixture recording for this real-model path. The authorized key must remain
server-side; rotate any credential exposed in conversation before public use.
