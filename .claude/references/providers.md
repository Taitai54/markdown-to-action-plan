# Working with LLM providers

`getAvailableProviders()` (all known provider names) vs `getConfiguredProviders()` (only those with an API key set, or Ollama which always shows up) — the UI and `/api/generate` must only offer **available** providers; the MCP tool rejects unconfigured ones. Keep provider-specific quirks isolated inside `ai-clients.ts`, not leaked into route handlers or UI components.

Never trust raw model JSON: `parseRobustJson` in `ai-clients.ts` repairs common LLM JSON issues (bad escapes, unescaped quotes, control chars in strings) before `validateActionPlan`/`normalizeMilestones` validate the result. Route any new provider's output through this rather than hand-rolling parsing.

For **Ollama**: always available (local inference, no API key). Default endpoint `http://localhost:11434/v1/chat/completions`, default model `llama3.2`. Ensure `ollama serve` is running and the model is pulled before generating.

When you touch `ai-clients.ts` or add/modify a provider, verify JSON parsing/validation still holds across all providers via `npm run check:llms`.

Any script that imports `@/lib/ai-clients` must load `dotenv` from `.env.local` **before** the import, or `getConfiguredProviders()` silently misses keys. See `src/scripts/provider-smoke.ts` for the pattern.
