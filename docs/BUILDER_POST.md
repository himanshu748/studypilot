# Agents for Humans: building StudyPilot with Strands and an explicit calendar boundary

A student can understand each assignment and still have an impossible week. Deadlines are scattered through syllabi, several courses compete for the same evening, and ordinary commitments disappear when a planner treats every free-looking hour as available.

StudyPilot starts with that scheduling problem. Its first audience is a student managing their own academic workload. The local demonstration reads a fictional semester syllabus, keeps every extracted item tied to a source line, and stages a weekly plan around the student's availability and protected time.

## What the agent decides

The implementation uses the Strands Agents SDK. In the Bedrock path, the agent has read-only syllabus and availability tools and returns a typed PlanningAdvice object. Its contribution is priority advice. Python code then validates the confirmed deadlines and places study sessions.

That separation matters. An uncertain date remains unresolved. A model-provided identifier cannot create a new assignment. Repeated identifiers are removed before scheduling. The calendar change set is visible before the user approves it.

The seeded workflow stages eight sessions. Before approval there are zero calendar entries. After the exact approval, the local SQLite calendar contains eight entries. A missed session is moved in place rather than duplicated. SQLite is the demonstration calendar; this project does not claim to connect to Google Calendar or a university system.

## Making the free demo exercise the real framework

An earlier version used a deterministic Python advisor directly in fixture mode. That made the workflow reproducible, but it did not demonstrate Strands running.

The revised offline mode implements the Strands Model interface with an explicitly scripted provider. A real Agent dispatches a read-only evidence tool and processes the structured-output tool. This lets the tests verify SDK orchestration without buying model inference. The provider remains scripted, and the documentation says so.

The live provider is Amazon Bedrock Nova Micro. Each response is capped at 512 tokens, and an invocation cannot continue beyond eight model calls. Each independent request uses fresh conversation state.

## The AgentCore path

The repository now contains an HTTP advisory service for Amazon Bedrock AgentCore Runtime. It accepts bounded syllabus and availability input, calls the same Strands planning advisor, and returns validated advice plus tool-call and usage evidence. The local application keeps scheduling, approval and persistence.

The package uses locked Linux ARM64 Python dependencies. The deployment script provisions private S3 code storage and a separate IAM execution role scoped to the selected model and runtime logs. The client signs requests through the AWS SDK and stops each session after the result or an error.

This integration is prepared and tested locally, but it is not a deployed-service claim. During the deployment attempt, AWS rejected S3 with NotSignedUp. A minimal Nova access check also hit a daily token limit. Valid AWS credentials did not mean the account was ready for every service.

## What I would demonstrate

The useful demonstration is the whole loop: inspect the cited syllabus, build the week, show protected time, review the pending calendar changes, approve, then replan a missed session. The important result is the controlled transition from advice to an approved action.

The project was built with Codex and Claude assisting implementation and review. The fixtures are fictional. The source, tests, architecture attachment, deployment instructions and current verification limits are public.

Source: https://github.com/himanshu748/studypilot
