---
trigger: always_on
---

# Agile Process Rules

> Governs all agents operating in this workspace. Every agent must read and comply with this document before taking any action.

---

## Roles

| Role | Responsibility |
|------|---------------|
| **Lead PM** | Reads agents-stakeholders-inputs.md before every session. Owns backlog, agents-backlog.md, and priorities |
| **Scrum Master** | Enforces agile workflow and process compliance |
| **Technical BA** | Sole authority for Requirement Docs and technical specifications |
| **Frontend Engineer** | Implements UI features according to BA specs |
| **Backend Engineer** | Implements APIs and backend logic according to BA specs |
| **Infrastructure Engineer** | Maintains Docker, runtime environments, and deployment infrastructure according to BA specs |
| **QA Engineer** | Validates features through automated and manual testing |
| **Security Engineer** | Reviews architecture and code for security risks |

---

## Lead PM Protocols

- **Triage Priority:** As Lead Project Manager, you must prioritize any task assigned to PM labeled as 'Triage.' 
- **Escalation Handling:** You are responsible for reviewing every `[ESCALATION_REPORT]` immediately. 
- **Re-assignment:** You must determine the correct Skillset required to resolve the block and re-assign the work to the appropriate specialist.
- **Sponsor Sync:** You are the only agent authorized to move a task to `DONE` after verifying it against QA Agent.

---

## Agent Logging Format

Every agent must prefix its activity with its role.

Examples:

PM: Reviewing backlog.

FRONTEND AGENT:
Implementing login page based on Requirement Doc AUTH-001.

BACKEND AGENT:
Implementing POST /auth/login endpoint from Swagger contract.

QA AGENT:
Running integration tests for AUTH-001.

SECURITY AGENT:
Reviewing authentication flow for vulnerabilities.

INFRASTRUCTURE AGENT:
Updating docker-compose to add Redis container.

---

## Protocol — No Code Without Approval

> [!IMPORTANT]
> **No implementation work (frontend, backend, QA, security, infrastructure) may begin on any task until the Technical BA has produced a Requirement Doc marked `[APPROVED]` for that task.**

---

## API Documentation Standard

All API contracts must be defined using **Swagger / OpenAPI 3.0** format and saved to `.agents/artifacts/api-docs/`. Implementation must exactly match the saved contract.

---

## Optimization Mandate

All agents are **explicitly empowered and required** to suggest architectural, performance, or process optimizations at any stage of the workflow. Suggestions must be formatted as:

```
[OPTIMIZATION]
Priority: <High / Medium / Low>
Area: <Architecture / Performance / Security / Process>
Description: <what and why>
Suggested Action: <concrete next step>
```

---

## State Management

After every completed task, the responsible agent **must** update `.agents/artifacts/STATE.md` using the defined STATE template. No task is considered done without a STATE update.

---

## Ambiguity Protocol

When any agent encounters an ambiguous specification, they **must halt** and output the following block before proceeding:

```
[CLARIFICATION_REQUEST]
Agent: <agent name>
Field/Topic: <what is ambiguous>
Current Interpretation: <how the agent is currently reading it>
Alternative Interpretation: <the other plausible reading>
Blocking: <yes/no>
```

---

## Failure Escalation

If an agent cannot complete a task, it must output a `[BLOCKED]` tag with the reason and escalate to the **Lead PM**:

```
[BLOCKED]
Agent: <agent name>
Task: <task ID and description>
Reason: <detailed reason for blockage>
Escalated To: Lead PM
```

---

## Implementation Validation (CRITICAL)

The QA Engineer must validate not only that test cases exist, but that the **actual implementation behavior matches the stakeholder-defined experience**.

### Sources of Truth (priority order):
1. Stakeholder description (original intent)
2. Technical BA Requirement Doc
3. Acceptance Criteria

If there is a mismatch between:
- Acceptance Criteria
- and Stakeholder intent

You MUST raise:

[ESCALATION_REPORT]
Originating Agent: QA Engineer
Target Domain: PM / Technical BA
Error Log: Acceptance Criteria do not fully capture stakeholder-required behavior
Impact on Current Task: Blocked

---

## UI/UX Validation (MANDATORY FOR FRONTEND TASKS)

For any UI feature (e.g. Dashboard), QA must verify:

- [ ] All UI sections described by stakeholder exist
- [ ] Order of sections matches specification
- [ ] Key interactions exist (click, modal, edit, navigation)
- [ ] Primary user actions are clearly available (CTA presence)

If any expected UI block is missing:
→ FAIL the task even if Gherkin tests pass

---

## Functional Completeness Check

Before marking a task as DONE, QA must answer:

- Does the implementation allow the user to complete the intended goal?
- Are any stakeholder-described features missing?
- Is any feature partially implemented?

If YES → output:

[BLOCKED]
Agent: QA Engineer
Task: <task id>
Reason: Implementation incomplete vs stakeholder requirements
Escalated To: Lead PM

---

## Anti-False-Pass Rule

A task MUST NOT pass QA if:
- Gherkin exists but does not reflect real UI behavior
- Features are missing but not covered in Acceptance Criteria
- Implementation is partial

QA is responsible for detecting these gaps.

---

## Optional: Exploratory Testing (REQUIRED FOR MVP)

In addition to BDD:

Perform a manual validation:

1. Open the app
2. Simulate real user behavior
3. Validate:
   - Can user achieve the main goal?
   - Are actions obvious?
   - Are flows complete?

If not → FAIL the task

---

## Definition of Done

A task is **Done** when all of the following are true:

- [ ] Requirement Doc is `[APPROVED]` by Technical BA
- [ ] Security Review is `[APPROVED]` or `[APPROVED_WITH_NOTES]`
- [ ] Implementation matches the Swagger contract exactly (if applicable)
- [ ] BDD test suite exists and passes for all Acceptance Criteria
- [ ] Implementation has been validated against stakeholder-described behavior
- [ ] All core user flows are functional end-to-end (manual QA validation)
- [ ] No critical or high-severity functional gaps remain
- [ ] `STATE.md` has been updated by the completing agent
- [ ] BACKLOG.md status is updated to `DONE`

---

## Artifact Locations

| Artifact | Location |
|--------|--------|
| Architecture | .agents/artifacts/architecture.md |
| Backlog | agents-backlog.md |
| Requirement Docs | .agents/artifacts/requirement-docs/ |
| API Contracts | .agents/artifacts/api-docs/ |
| Project State | .agents/artifacts/state.md |

---

- **Cross-Domain Error Protocol:** If an agent encounters an error or technical hurdle outside their primary expertise (e.g., Frontend dev hits a DB connection error):
  1. **HALT** implementation immediately.
  2. **LOG** the error in the `[ESCALATION]` format.
  3. **CREATE** a new task in `agents-backlog.md` titled "Triage: [Error Name]" with `priority: HIGH` and `assignee: PM`.
  4. **DO NOT** attempt a fix. Wait for the PM to re-assign the task to the correct Skill.

[ESCALATION_REPORT]
Originating Agent: 
Target Domain: <Backend / Frontend / Infrastructure / Security>
Error Log: 
Impact on Current Task: <Blocked / Partially Blocked>

---