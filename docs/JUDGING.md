# Judging evidence for StudyPilot

Checked September 10, 2026 using the live Devpost criteria and rules. The five criteria are equally weighted on a 1–5 scale. This is our evidence map, not a prediction of the judges' score. [Official rules](https://agentsforhumans.devpost.com/rules)

## Audience and job

Students whose coursework competes with work shifts, classes and protected personal time.

A list of deadlines does not show whether the work fits into the hours a student has. Rescheduling after a missed session adds another planning task.

The intended workflow: Enter structured coursework and availability, inspect a cited proposal, approve exact sessions, then export an ICS calendar. Revise a copy without silently overwriting the original.

## Evidence by criterion

| Criterion | Evidence to show | Remaining proof |
| --- | --- | --- |
| Technological Implementation | Strands reads coursework and availability and returns typed planning advice. The scheduler enforces time windows and deadlines. Calendar writes require approval. | Fresh real-model execution and free working judge access. AgentCore and a live URL can strengthen this score but are optional. |
| Design | Editable intake, unresolved-date notices, conflict explanations, saved plans and calendar export form a complete local workflow. | Record intake through final artifact, including an error or uncertain state. |
| Potential Impact | Demonstrate a schedule that respects protected time and explicitly leaves an unknown deadline unresolved. No measured improvement in grades or hours saved is claimed. | User feedback or observed task timings would strengthen the claim; neither has been measured here. |
| Creativity & Originality | The product handles uncertainty and revision as part of planning. The useful distinction is the approved change set and preserved source plan, not calendar generation alone. | Explain the domain tradeoff with a concrete difficult example. |
| Presentation | A timed script in DEMO_SCRIPT.md connects audience, problem, decisions and output. | Public YouTube/Vimeo video no longer than five minutes. |

Track: **Everyday Agents**. Structured coursework input only; no PDF parser, background LMS monitoring, or external calendar synchronization.

## Difficult case and useful output

Use one TBA deadline and insufficient available time. Show the unresolved item and shortfall instead of inventing dates or scheduling outside availability.

Open the exported ICS file and reopen the original plan after approving a separate revised copy.

## Current verification

- Automated checks: 101 backend + 37 frontend tests, with the frontend production build passing.
- The workspace's Connection details panel makes only a local health request. It distinguishes scripted responses from configured external/Bedrock/AgentCore inference; it never claims that configuration proves access.
- Unknown runtime configurations and failed health requests are labeled, not interpreted as success.
- Real Qwen evidence is dated September 9 in QWEN-VERIFICATION.md. The owner subsequently stopped the endpoint. No new inference is established by offline tests.
- RELEASE-CHECKLIST.md tracks architecture, public repository, video, Builder ID, eligibility, judge access and final submission separately.

## Bonus plan and release boundary

Optional public builder.aws posts can add 0.2 points each, up to 0.6. Drafts are not bonus proof. Describe the actual Strands implementation and provider boundary; do not claim AWS hosting or AgentCore deployment.

Before submission, provide the public video and free working access through judging, confirm the entrant's Builder ID and eligibility, review the official rules, and verify the Devpost receipt. Do not replace those steps with a test count.
