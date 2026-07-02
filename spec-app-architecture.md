# ADR-001: Interior Design Specification App

**Status:** Proposed  
**Date:** 2026-06-29  
**Author:** Aiman  

---

## Context

The `/ai-specification-documentation-assistant` Claude skill handles the full specification and documentation workflow in chat — project setup, AI research, designer approval, and schedule generation. The goal is to lift this workflow into a proper, persistent web application so that larger design teams can use it with a professional UI rather than a chat interface.

The app must feel like dedicated interior design software: clean, structured, dark-themed, and deliberate. Claude handles research and documentation generation; the designer retains all creative and approval authority.

---

## Decision

Build a **Vite + React + TypeScript** single-page application hosted on **Vercel**, with Claude API calls handled via Vercel serverless functions. State is session-only (Zustand, no database). Export is handled server-side using `xlsx` and `docx` libraries.

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend framework | Vite + React + TypeScript | Fast dev experience, strong typing for complex data models |
| Styling | Tailwind CSS (dark mode) | Utility-first, dark theme first-class, no CSS-in-JS overhead |
| State management | Zustand | Lightweight, session-scoped, no persistence boilerplate |
| Routing | React Router v6 | File-based route structure maps cleanly to the screen model |
| AI integration | Anthropic Claude API via Vercel Functions | API key stays server-side; structured JSON responses |
| Excel export | `xlsx` (SheetJS) | De-facto standard for .xlsx generation in Node |
| Word export | `docx` (docx.js) | Programmatic .docx with full table and heading support |
| Hosting | Vercel | Serverless functions co-located with frontend, zero-config deploy |

---

## Screens and Routes

```
/                          → Project Hub
/project/new               → Project Setup (2-phase form)
/project/:id               → Project Dashboard
/project/:id/materials     → Materials Assistant
/project/:id/lighting      → Lighting Assistant
/project/:id/furniture     → Furniture Assistant
/project/:id/schedules     → Schedule Preview & Export
```

### Screen 1 — Project Hub `/`

The entry point. Lists all projects in the current session with a creation date, project type badge, and approved item counts. Two primary actions: **New project** and **Open project**.

Since storage is session-only, projects are lost on page refresh. Include a persistent banner: "Projects are session-only. Export your schedule to save your work." Consider a secondary "Export project as JSON" option so designers can re-import work manually in a future session.

### Screen 2 — Project Setup `/project/new`

A 2-phase adaptive form that mirrors the skill's setup step exactly.

**Phase 1 — Project type:** Clickable tiles for Residential, Commercial, Hospitality, Healthcare, Workplace, Retail, Education, Mixed Use. Mixed Use reveals a multi-select sub-step.

**Phase 2 — Adaptive form:** Universal fields (project name, client, style, budget, location, colour palette, materials to avoid, compliance, supply chain) plus type-specific fields (e.g., durability ratings for Hospitality, infection control for Healthcare). Every field has **Skip** and **N/A** micro-buttons. A field state model tracks Filled / Skipped / N/A / Empty and is passed to Claude on every API call.

**Form field state model:**

```typescript
type FieldState = 'filled' | 'skipped' | 'na' | 'empty'

interface ProjectField<T> {
  value: T
  state: FieldState
}
```

On confirmation, the project is written to Zustand and the user is redirected to the dashboard.

### Screen 3 — Project Dashboard `/project/:id`

A persistent header shows: Project name · Client · Location · Style · Budget range · Active badge.

Three metric cards show approved item counts for Materials, Lighting, and Furniture (updated live as designers work through the assistants).

Five action buttons: Materials · Lighting · Furniture · Generate documentation · Project summary. Each navigates to the relevant route.

### Screen 4 — Specification Assistants `/project/:id/materials` etc.

All three assistants (Materials, Lighting, Furniture) follow the same four-phase UI pattern:

**Phase 1 — Scope panel (left sidebar or top form):** A short form collecting the assistant-specific scope. Materials: room, surface type, area (m²), traffic level. Lighting: room, function, ceiling height, natural light level. Furniture: room, item type, quantity. The scope form is pre-populated if the designer is re-entering an assistant for the same project.

**Phase 2 — Research (loading state):** On submit, a POST is made to `/api/research`. A loading state shows "Claude is researching options…" with a skeleton card layout. The API call passes the full project context plus the scope and returns a structured array of recommendation objects.

**Phase 3 — Recommendation cards:** The response renders as a scrollable card grid. Each card shows: item code (MAT-001 etc.), product name, manufacturer, finish/colour, 3 spec pills, a rationale panel, compliance indicators, pros/cons, and source links. Each card has an Approve / Reject toggle. A sticky status bar shows the running tally and a **Submit selections** button.

**Phase 4 — Post-submission:** Approved items are written to Zustand under the project's `materials.approved` (or `lighting` / `furniture`) array. The user is returned to the dashboard with updated counts. Rejected items are discarded. Undecided items remain available for review.

### Screen 5 — Schedule Preview & Export `/project/:id/schedules`

A tabbed in-browser preview of all three schedules (Materials · Lighting · Furniture), rendered as HTML tables. Only approved items appear. The designer can make final edits inline (product name, notes, quantity) before exporting.

Two export buttons trigger the relevant Vercel function:

- **Export Excel** → `/api/export/xlsx` returns a `.xlsx` download
- **Export Word** → `/api/export/docx` returns a `.docx` download

---

## Data Model (Zustand, session-only)

```typescript
interface Project {
  id: string                        // uuid
  createdAt: string                 // ISO timestamp
  info: ProjectInfo                 // all form fields with FieldState
  materials: DisciplineState
  lighting: DisciplineState
  furniture: DisciplineState
}

interface DisciplineState {
  scope: ScopeForm | null           // last scope inputs
  recommendations: RecommendationItem[]  // raw API response
  approved: ApprovedItem[]          // submitted approved items
  itemCounter: number               // for sequential codes (MAT-001…)
  schedule: ScheduleRow[] | null    // generated from approved items
}

interface RecommendationItem {
  code: string                      // e.g. MAT-003
  name: string
  manufacturer: string
  finish: string
  specs: Record<string, string>     // 3 key specs
  rationale: string
  compliance: ComplianceCheck[]
  pros: string[]
  cons: string[]
  sources: { label: string; url: string }[]
  status: 'pending' | 'approved' | 'rejected'
}
```

---

## API Design (Vercel Serverless Functions)

### `POST /api/research`

**Request:**
```json
{
  "discipline": "materials",
  "projectInfo": { ... },          // full ProjectInfo with field states
  "scope": { ... },                // discipline-specific scope
  "existingCodes": ["MAT-001"]     // to continue sequential numbering
}
```

**Response:**
```json
{
  "items": [ RecommendationItem, ... ]
}
```

**Implementation:** The function constructs a structured prompt from the project info and scope (applying the same filtering and research logic defined in the skill's SKILL.md), calls `anthropic.messages.create()` with `tool_use` for structured output, and returns the parsed result.

Claude is instructed to use web search for real products only, never fabricate manufacturers or specs, and to return a minimum of 3 options spread across the budget range.

### `POST /api/export/xlsx`

**Request:** `{ projectId, disciplines: ['materials', 'lighting', 'furniture'], items: ApprovedItem[] }`

**Response:** Binary `.xlsx` file with one tab per discipline. Each tab uses the schedule column definitions from the skill: Material Code, Material Name, Manufacturer, Finish, Colour, Advantages, Disadvantages, Estimated Cost, Fire Rating, Sustainability Cert, Source URL.

### `POST /api/export/docx`

**Request:** Same as xlsx.

**Response:** Binary `.docx` file. Professional schedule layout with project header, client name, date, and one section per discipline with a formatted table.

---

## UI Design Principles

**Dark pro theme:** Background `#0f0f11`, surface `#1a1a1f`, card `#242429`, border `#2e2e36`. Accent: a cool blue `#5b8af5`. Typography: Inter or Geist, weights 400/500 only.

**Layout:** Persistent top navigation bar (logo + project name + breadcrumb). Left sidebar on assistant screens for scope form. Main area for cards/tables. Sticky footer for action buttons (Submit, Export).

**Interaction patterns:**
- Approve/reject cards: toggle buttons with green/red border accent and dimming on reject. No confirmation dialogs — fast, gesture-like.
- Skip/N/A fields: inline micro-buttons, field dims visually when set. A "Clear" link restores it.
- Loading: skeleton card grid, not a spinner. Shows the layout before content arrives.
- Toast notifications for: project saved, selections submitted, export started.

---

## Key Architecture Decisions

### 1. Session-only storage vs. a database

**Chosen:** Session-only (Zustand, no persistence).

**Rationale:** A database adds authentication, schema migrations, and hosting cost. The primary use case is a single working session: a designer opens the app, works through a project, exports the schedule, and the session ends. The skill this extends also has no persistence.

**Trade-off:** Work is lost on page refresh. Mitigated by: (a) prominent session warning banner, (b) "Export as JSON" escape hatch so designers can save project state to disk, (c) JSON import on the hub screen to re-load a saved session.

**Revisit when:** Team collaboration across sessions (multiple designers on one project), or client feedback rounds requiring the designer to reopen a project days later.

### 2. Vercel Functions vs. a dedicated backend

**Chosen:** Vercel Functions (serverless).

**Rationale:** No infra to manage, co-located with the frontend, zero-config deploy, and scales to zero. The API surface is small (3 endpoints). Cold start latency is acceptable for AI research tasks that take several seconds anyway.

**Trade-off:** Functions have a 10s default timeout on the Hobby plan (60s on Pro). Claude API research calls may approach this. Use Vercel Pro and set `maxDuration = 60` on the research function.

### 3. Structured output vs. streaming

**Chosen:** Structured JSON output (tool_use / response_format).

**Rationale:** The recommendation cards are React components. Structured JSON means the response can be parsed and rendered as proper UI rather than markdown streamed into a div. This gives full control over card layout, approve/reject state, and inline editing.

**Trade-off:** No visible streaming progress for the designer. Mitigated by the skeleton loading state and a "Claude is researching…" status message.

---

## Consequences

**What becomes easier:**
- The designer has a persistent sidebar with project context visible throughout the session — no need to re-state requirements for each research request.
- Inline approve/reject with a live tally replaces the chat-based batch submission pattern.
- Export is one click rather than a multi-turn conversation.
- Multiple designers on the same computer can work on different projects in different browser tabs (different Zustand instances).

**What becomes harder:**
- Keeping the Claude prompt logic in sync with the SKILL.md source. When the skill is updated, the Vercel function prompts must be updated too. Consider extracting shared prompt constants into a `/lib/prompts/` module imported by both.
- Without a database, there is no audit trail of who approved what. For firm-level accountability, a future v2 should add user identity and a simple approval log.

---

## Action Items

1. [ ] Scaffold Vite + React + TypeScript project with Tailwind dark mode config
2. [ ] Set up Zustand store with the data model above
3. [ ] Build Project Hub screen (static, session list from Zustand)
4. [ ] Build Phase 1 + Phase 2 project setup form with field state model
5. [ ] Build Project Dashboard with metric cards and navigation
6. [ ] Build shared Specification Assistant layout (scope panel + card grid + status bar)
7. [ ] Wire Materials, Lighting, Furniture routes to the shared layout with discipline-specific scope forms
8. [ ] Implement `/api/research` Vercel function with structured Claude output
9. [ ] Build approve/reject card component with live tally
10. [ ] Build Schedule Preview screen with inline editing
11. [ ] Implement `/api/export/xlsx` and `/api/export/docx` Vercel functions
12. [ ] Add session warning banner and JSON export/import on hub screen
13. [ ] Dark theme polish pass (typography, spacing, hover states)
14. [ ] Deploy to Vercel and verify function timeouts and API key env vars

---

## Open Questions (to decide before coding)

**Q1 — Item code continuity across sessions:**  
If a designer exports a JSON session, re-imports it, and runs the materials assistant again, should codes continue from where they left off (MAT-007) or restart (MAT-001)? Recommendation: continue from last code in the imported session.

**Q2 — Multi-room runs:**  
The skill supports running the materials assistant multiple times for different rooms (living room floor, then bathroom wall). Should each run be a separate "request" tracked inside the discipline state, or a flat list? Recommendation: flat list with a `room` field on each item, filterable in the schedule view.

**Q3 — Inline editing scope:**  
On the Schedule Preview screen, which fields should be editable inline? Recommendation: product name, notes/comments, and quantity. Manufacturer, specs, and source links should remain read-only to preserve research integrity.
