# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**markdown-to-action-plan** — converts Markdown content into structured action plans via multiple LLM providers (OpenAI, Perplexity, Gemini, OpenRouter). Next.js app + optional MCP server.

## Commands

- `npm run dev` — local app
- `npm run lint` — ESLint
- `npm run check:llms` — smoke test each **configured** provider (loads `.env.local` first; see `src/scripts/provider-smoke.ts`)

Windows: `start-action-plan.bat` (prints which API keys are set), `check-llms.bat` (runs `check:llms`).

## Environment (`.env.local`)

Set only the providers you use: `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`. Optional: `OPENROUTER_MODEL` (default in code: `openai/gpt-4o-mini`).

## Architecture notes

- **Prompts**: System (“master”) presets and optional override live in `src/lib/prompt.ts`; user message is built in the same module. API accepts `systemPromptPresetId`, `systemPromptOverride`, `userPromptOverride`, `modelOverride` (`src/app/api/generate/route.ts` → `generateActionPlan` in `src/lib/ai-clients.ts`).
- **Providers**: `getAvailableProviders()` = known names; `getConfiguredProviders()` = names with keys. UI and generate route must use **configured** for selectable generation; MCP tool rejects unconfigured providers.
- **JSON from models**: `parseRobustJson` in `ai-clients.ts` repairs common LLM JSON issues (bad escapes, unescaped quotes in strings, control chars in strings) then validates with `validateActionPlan` / `normalizeMilestones`.
- **Scripts importing `ai-clients`**: Load `dotenv` from `.env.local` **before** importing `@/lib/ai-clients` (or `getConfiguredProviders()` will miss keys). The smoke script follows this pattern.

## Key paths

| Area        | Location |
|------------|----------|
| LLM calls  | `src/lib/ai-clients.ts` |
| Prompts    | `src/lib/prompt.ts` |
| Generate API | `src/app/api/generate/route.ts` |
| Providers API | `src/app/api/providers/route.ts` |
| Main UI    | `src/app/page.tsx` |
| Plan output UI | `src/components/ActionPlan.tsx` |
| MCP        | `src/mcp-server.ts` |
