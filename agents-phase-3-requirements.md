TASK: IMPLEMENT_OBJECTIVE_DRIVEN_TRAINING_FEATURE

READ FIRST  
Review and understand the following documents before starting:
- agents-phase-1-stakeholder-inputs.md
- agents-phase-2-requirements.md

IMPORTANT CONTEXT  
The application is already implemented up to Phase 2.  
All base data models, AI integration, authentication, dashboard, and training flows already exist.  
DO NOT redesign existing architecture.  
DO NOT modify existing AI logic unless explicitly required.  
All data structures already exist — extend only what is strictly necessary.

This task adds an incremental feature that must integrate with the current architecture and AI workflow.

--------------------------------------------------
FEATURE SUMMARY
Objective-Driven Training Assistance

Users can define a personal training objective that the AI will use as a persistent context to guide every future training interaction and evolve the training state after each user input.

This feature EXTENDS the existing AI recommendation loop.

--------------------------------------------------
PRODUCT INTENT

Currently the AI generates recommendations based on:
- Last trainings
- User profile goal
- Last AI suggestion

We now introduce a higher-level, user-defined OBJECTIVE that becomes the primary long-term guidance layer for the AI.

Examples:
- “Run 5km without stopping”
- “Increase squat to 120kg”
- “Train consistently 3x per week”
- “Lose 5kg in 3 months”

The AI must continuously steer the training process toward this objective.

--------------------------------------------------
SCOPE RULES

Do NOT rebuild existing flows.  
Do NOT refactor unrelated modules.  
Only APPEND what is required in:
- Backend
- Frontend
- AI context assembly
- QA, Infra, Security considerations

PM must distribute tasks to:
QA / Infrastructure / Security / Backend / Frontend.

--------------------------------------------------
FUNCTIONAL REQUIREMENTS

1) OBJECTIVE MANAGEMENT

Users must be able to:
- Add an objective
- Edit the objective
- Persist the objective across sessions

The objective must be displayed at the TOP of the dashboard, before all other dashboard blocks.

The objective is a short free-text field.

This does NOT replace the existing “user goal” (hipertrofia/fuerza/etc).
This is a new layer called TRAINING OBJECTIVE.

--------------------------------------------------
2) DASHBOARD CHANGES (EXTENSION OF PHASE 2)

Add a new block ABOVE the HEADER content stack (inside DashboardContainer):

OBJECTIVE BLOCK

Must include:
- Title: “Objetivo actual”
- Objective text
- Edit button
- Empty state CTA: “Agregar objetivo”

UX rules:
- Mobile first
- Simple card component
- No heavy UI design
- Must not disrupt existing dashboard structure

--------------------------------------------------
3) AI CONTEXT EXTENSION (CRITICAL)

This is the core of the feature.

After EVERY training user interaction, the AI context builder must append:

NEW CONTEXT BUNDLE:
- Current Training Objective
- Previous Training State
- Previous Training Session / Interaction

This context MUST be injected automatically before generating the next AI output.

This does NOT replace existing inputs.  
This EXTENDS the AI input payload.

--------------------------------------------------
4) TRAINING STATE EVOLUTION

We introduce a persistent entity:

TRAINING_STATE

Purpose:
Represent the evolving coaching state of the user toward their objective.

After each AI generation:
AI must produce a NEW TRAINING STATE.

The state should include:
- Progress toward objective
- Observations
- Focus for next sessions
- Coaching direction

This state becomes the “previous state” for the next interaction.

This creates a continuous coaching loop.

--------------------------------------------------
5) AI LOOP (NEW FLOW)

For every training interaction:

User submits training →  
Backend gathers context →  
Context sent to AI includes:
- Last N trainings
- Last AI suggestion
- User profile goal
- NEW: Training Objective
- NEW: Previous Training State
- NEW: Previous Interaction

AI returns:
- Updated guidance
- NEW TRAINING STATE

Persist:
- New AI output
- New training state

--------------------------------------------------
BACKEND TASKS

1) Extend data model (minimal change)

Add new entity:
trainingObjective
- id
- userId
- content
- updatedAt

Add new entity:
trainingState
- id
- userId
- content
- createdAt

No breaking schema changes.

2) Extend AI context builder
Append objective + previous state + previous interaction.

3) Persist new training state after each AI generation.

4) Add CRUD endpoint:
GET/UPSERT user objective.

--------------------------------------------------
FRONTEND TASKS

1) Create ObjectiveCard component
2) Add to top of dashboard
3) Add Add/Edit modal
4) Connect to API
5) Ensure mobile UX consistency.

--------------------------------------------------
SECURITY TASKS

- Validate and sanitize objective input.
- Apply same rate limiting rules as AI endpoints.
- Prevent prompt injection through objective text.

--------------------------------------------------
INFRASTRUCTURE TASKS

- Include objective + state in AI caching strategy.
- Ensure Redis cache keys include objective hash.

--------------------------------------------------
QA TASKS

Test scenarios:
- Add objective
- Edit objective
- Objective persists across sessions
- AI responses change after objective is added
- Training state evolves after multiple interactions.

--------------------------------------------------
SUCCESS CRITERIA

The assistant becomes a continuous coaching system that:
- Remembers the user objective
- Evolves a training state
- Uses both in every AI interaction.