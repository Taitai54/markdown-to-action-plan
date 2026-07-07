# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**markdown-to-action-plan** — converts Markdown content into structured action plans via multiple LLM providers (OpenAI, Perplexity, Gemini, OpenRouter). Next.js app + optional MCP server.

## Commands

- `npm run dev` — local app (uses `--webpack`; Turbopack can fail on Windows with "Access is denied")
- `npm run lint` — ESLint
- `npm run check:llms` — smoke test each **configured** provider (loads `.env.local` first; see `src/scripts/provider-smoke.ts`)
- `npm run mcp` — run the MCP server standalone (`npx tsx src/mcp-server.ts`)

Windows: `run.bat` or `start-action-plan.bat` (dev server + browser; auto-cleans port 3000), `stop-action-plan.bat` (kill stuck dev server), `check-llms.bat` (runs `check:llms`).

## Environment (`.env.local`)

Set only the providers you use: `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`. Optional: `OPENROUTER_MODEL` (default in code: `openai/gpt-4o-mini`), `GENERATE_API_SECRET` (protects `/api/generate` and `/api/export/docx` when deployed), `MAX_MARKDOWN_CHARS`, `LLM_REQUEST_TIMEOUT_MS`.

For the Knowledge Base query mode: `PINECONE_API_KEY` (required), `PINECONE_INDEX` (default `peace`). The `PINECONE_HOST` is auto-discovered via `describeIndex` — no manual configuration needed.

## Architecture notes

- **Prompts**: System ("master") presets and optional override live in `src/lib/prompt.ts`; user message is built in the same module. API accepts `systemPromptPresetId`, `systemPromptOverride`, `userPromptOverride`, `modelOverride` (`src/app/api/generate/route.ts` → `generateActionPlan` in `src/lib/ai-clients.ts`).
- **Providers**: `getAvailableProviders()` = known names; `getConfiguredProviders()` = names with keys. UI and generate route must use **configured** for selectable generation; MCP tool rejects unconfigured providers.
- **JSON from models**: `parseRobustJson` in `ai-clients.ts` repairs common LLM JSON issues (bad escapes, unescaped quotes in strings, control chars in strings) then validates with `validateActionPlan` / `normalizeMilestones`.
- **Data structures**: `generateActionPlan()` returns `MasterActionPlan` — `{ title, summary, implementation_document, milestones[] }`. Each `Milestone` has `title`, `category` (`Setup|Integration|Automation|Optimization`), `priority` (`high|medium|low`), `done_when`.
- **Input ingestion**: PDFs are uploaded via `/api/parse-pdf` (FormData → `pdf-parse` → `{ text }`); YouTube URLs are processed via `/api/transcript` (oEmbed title + `@danielxceron/youtube-transcript` → `{ title, transcript }`). `pdf-parse` is CommonJS and must be listed in `serverExternalPackages` in `next.config.ts`.
- **Exports**: Markdown (raw download), Word via `html-to-docx` at `/api/export/docx`, Google Docs (copy-paste rich text). Milestone completion is persisted client-side in `localStorage` under `map-milestones:{sanitizedTitle}`.
- **Scripts importing `ai-clients`**: Load `dotenv` from `.env.local` **before** importing `@/lib/ai-clients` (or `getConfiguredProviders()` will miss keys). The smoke script follows this pattern.

## Key paths

| Area | Location |
|------|----------|
| LLM calls | `src/lib/ai-clients.ts` |
| Prompts | `src/lib/prompt.ts` |
| Generate API | `src/app/api/generate/route.ts` |
| Providers API | `src/app/api/providers/route.ts` |
| PDF parse API | `src/app/api/parse-pdf/route.ts` |
| YouTube transcript API | `src/app/api/transcript/route.ts` |
| KB search API | `src/app/api/knowledge-search/route.ts` |
| KB namespaces API | `src/app/api/knowledge-namespaces/route.ts` |
| Word export API | `src/app/api/export/docx/route.ts` |
| File concatenation | `src/lib/markdown-parser.ts` |
| API secret guard | `src/lib/api-auth.ts` |
| Char limits | `src/lib/limits.ts` |
| Main UI | `src/app/page.tsx` |
| Plan output UI | `src/components/ActionPlan.tsx` |
| MCP server | `src/mcp-server.ts` |
