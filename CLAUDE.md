# CLAUDE.md — markdown-to-action-plan

## What this is
**markdown-to-action-plan** converts uploaded Markdown (plus PDF/YouTube input) into a structured, tactical "Master Implementation Playbook" via multiple LLM providers (OpenAI, Perplexity, Gemini, OpenRouter), with export to Markdown/Word/Google Docs. Next.js 16 (App Router) + React 19 + TypeScript, with an optional standalone MCP server exposing the same generation logic and an optional Pinecone-backed Knowledge Base query mode.

## Architecture map
```
src/
  app/api/generate/route.ts       # main generate endpoint — prompt overrides → generateActionPlan()
  app/api/parse-pdf/route.ts      # PDF upload → pdf-parse → { text }
  app/api/transcript/route.ts     # YouTube URL → oEmbed title + transcript
  app/api/export/docx/route.ts    # Word export via html-to-docx
  app/api/knowledge-*/route.ts    # optional Pinecone KB search/namespaces/info
  app/api/providers/route.ts      # exposes configured providers to the UI
  app/page.tsx                    # main UI — upload, provider select, generate
  components/ActionPlan.tsx       # renders generated plan output
  lib/ai-clients.ts               # all LLM provider calls + JSON repair/validation
  lib/prompt.ts                   # system ("master") presets + user message builder
  lib/markdown-parser.ts          # concatenates uploaded files
  lib/api-auth.ts                 # GENERATE_API_SECRET guard for generate/export routes
  lib/limits.ts                   # char limits (MAX_MARKDOWN_CHARS etc.)
  mcp-server.ts                   # standalone MCP server, same generation logic
  scripts/provider-smoke.ts       # npm run check:llms — smoke test each configured provider
```

## Where new code goes
- **New LLM provider:** add to the `Provider` union + `PROVIDER_CONFIGS` in `src/lib/ai-clients.ts` (one flat record — no per-provider files/classes). All providers speak the OpenAI-compatible chat-completions shape.
- **New system prompt preset:** add to `SystemPromptPresetId` + `SYSTEM_PROMPT_PRESETS` in `src/lib/prompt.ts`.
- **New API endpoint:** `src/app/api/<name>/route.ts`, mirroring an existing route (`generate`, `parse-pdf`). Guard with `src/lib/api-auth.ts` if it's costly/mutating like `generate` and `export/docx`.
- **New input/ingestion source** (beyond markdown/PDF/YouTube): a route under `src/app/api/<source>/route.ts` that normalizes input to `{ text }` or `{ title, transcript }` (see `parse-pdf`, `transcript`), then wire it into `DropZone.tsx` (file-based) or `page.tsx` (URL-based, see YouTube).
- **New UI piece:** one component per concern in `src/components/` (flat, no subfolders currently), composed together in `src/app/page.tsx`.
- **New MCP-exposed capability:** a `server.tool(...)` call in `src/mcp-server.ts`, calling into `ai-clients.ts` rather than duplicating logic (see `generate_action_plan`).

## Ground rules (conventions)
- **Types:** LLM output is validated with hand-rolled type guards (`validateActionPlan`/`normalizeMilestones` in `ai-clients.ts`), not `zod` — `zod` is a dependency but reserved for MCP tool schemas (`mcp-server.ts`).
- **Errors:** fail fast with explicit thrown `Error` messages on unrecoverable failures (missing API key, non-OK response, unparseable JSON — see `generateActionPlan`/`parseRobustJson`); degrade gracefully on per-item validation (`normalizeMilestones` skips invalid milestones with `console.warn` instead of failing the whole plan).
- **Testing:** no automated test suite exists — "done" means `npm run lint` passes.

## Working principles (agent steering)
- **Cross-platform tooling:** this project develops on Windows — verify shell commands work in PowerShell before assuming a Linux-only tool (e.g. `tree`) behaves the same; scope any OS branching explicitly rather than assuming Linux.

## Commands
- install: `npm install` · dev: `npm run dev` (webpack, not Turbopack — Turbopack can fail with "Access is denied" on Windows) · lint: `npm run lint` · provider smoke test: `npm run check:llms` · mcp server: `npm run mcp`
- Windows: `run.bat` / `start-action-plan.bat` (dev + browser, auto-cleans port 3000) · `stop-action-plan.bat` (kill stuck dev server) · `check-llms.bat`

## Environment (`.env.local`)
Set only the providers you use: `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`. Optional: `OPENROUTER_MODEL` (default in code: `openai/gpt-4o-mini`), `GENERATE_API_SECRET` (protects `/api/generate` and `/api/export/docx` when deployed), `MAX_MARKDOWN_CHARS`, `LLM_REQUEST_TIMEOUT_MS`.

For the Knowledge Base query mode: `PINECONE_API_KEY` (required), `PINECONE_INDEX` (default `peace`). `PINECONE_HOST` is auto-discovered via `describeIndex` — no manual configuration needed.

## On-demand context
- Touching providers or `ai-clients.ts` → `.claude/references/providers.md`
- Action plan data shape / milestone persistence → `.claude/references/action-plan-data.md`
- PDF or YouTube ingestion → `.claude/references/ingestion.md`
- Reusable workflows → `.claude/skills/` (e.g. `prime-codebase`, `piv-*`). Invoke by name in plain language ("prime the codebase") — not CLI slash commands (no `.claude/commands/` dir exists in this repo).
- This is a single Next.js app, not a split backend/frontend repo — prefer `prime-codebase` over `prime-backend`/`prime-frontend` here.
