# Spec Studio — Interior Design Specification App

A dark, professional web app that lifts the interior-design specification &
documentation workflow into a persistent UI. Claude researches **real** products
(via web search); the designer keeps all approval authority. Built from
[`spec-app-architecture.md`](./spec-app-architecture.md) (architecture) and
[`DESIGN.md`](./DESIGN.md) (design language — dark app shell + Airtable-inspired
spacing/type discipline).

## Stack

Vite + React + TypeScript · Tailwind (dark theme) · Zustand (+ localStorage
autosave) · React Router · Anthropic Claude API (`claude-opus-4-8` + web search)
via Vercel serverless functions · `xlsx` / `docx` exports · Mapbox location
picker.

## Prerequisites

- Node 18+
- An Anthropic API key (for live research)
- A Mapbox **public** token (for the location picker — optional; the picker
  falls back to a plain text field without one)

## Environment

Copy `.env.example` → `.env.local` and fill in:

```bash
# Server-side ONLY — used by /api/research. Never prefix with VITE_.
ANTHROPIC_API_KEY=sk-ant-...

# Client-side (public). Safe to expose to the browser.
VITE_MAPBOX_TOKEN=pk....
```

- `ANTHROPIC_API_KEY` stays server-side: it is read only inside
  `api/research.ts` and never reaches the browser bundle.
- `VITE_MAPBOX_TOKEN` is exposed to the client by Vite (the `VITE_` prefix) —
  this is expected and correct for a Mapbox **public** token.

## Run locally

The frontend talks to serverless functions under `/api`. Two options:

**Full app (frontend + live research/export)** — requires the Vercel CLI:

```bash
npm install
npm install -g vercel        # once
vercel dev                   # serves the frontend AND /api/* together
```

**Frontend only (no live API)** — fast UI iteration; `/api/*` calls will 404,
but the **demo project** path works fully (no key needed):

```bash
npm install
npm run dev                  # http://localhost:5173
```

> Tip: from the Hub, **Load demo project** seeds a fully specified project so you
> can explore the dashboard, schedules, and exports without any API key.
> (Exports still POST to `/api/export/*`, so they need `vercel dev`.)

## Scripts

- `npm run dev` — Vite dev server (frontend only)
- `npm run build` — typecheck (`tsc -b`) + production build
- `npm run preview` — preview the production build

## Deploy (Vercel)

1. Push to a Git repo and import into Vercel.
2. Set `ANTHROPIC_API_KEY` and `VITE_MAPBOX_TOKEN` in the project's Environment
   Variables.
3. The research function is configured for `maxDuration: 60` (see `vercel.json`)
   — this needs the **Pro** plan. On Hobby (10s cap) a research call with web
   search may time out.

## How it works

- **Hub** (`/`) — session list, demo loader, JSON import/export. Projects are
  autosaved to `localStorage` (no backend DB).
- **Setup** (`/project/new`) — 2-phase adaptive form; every field has Skip / N/A;
  location uses the Mapbox picker.
- **Dashboard** (`/project/:id`) — live approved-item counts + navigation.
- **Assistants** (`/project/:id/{materials,lighting,furniture}`) — scope form →
  `POST /api/research` → recommendation cards with approve/reject → submit.
- **Schedules** (`/project/:id/schedules`) — tabbed preview, inline edits, then
  `POST /api/export/{xlsx,docx}` for downloads.

Shared Claude prompt logic lives in `api/_lib/prompts.ts` — keep it in sync with
the `/ai-specification-documentation-assistant` skill's `SKILL.md` if that
source changes.
