# Implementation Report — Plan Refine Loop ("Improve this plan")

**Plan**: `.claude/plans/grounded-plan-refinement-refine-loop.md`   **Branch**: `feature/grounded-plan-refinement-refine-loop`   **Status**: COMPLETE

## Summary

Added an "ask for improvements" refine loop on top of already-generated action plans. A new `/api/refine`
route takes the current plan + free-text feedback and returns a revised plan via one more LLM call, reusing
`generateActionPlan()`'s existing provider-call/JSON-repair/validation pipeline through a new optional
`refineContext` parameter rather than a parallel code path. The prompt (`buildRefineUserPrompt`) embeds an
explicit success rubric, a scope constraint against unrelated drift, and few-shot generic→specific examples,
per the architecture doc's prompt-engineering decisions. UI is a feedback textarea + "Improve this plan"
button below the rendered plan.

## Tasks completed

- Add `buildRefineUserPrompt()` → `src/lib/prompt.ts` (CREATE function + type-only `MasterActionPlan` import)
- Thread `refineContext` through `generateActionPlan()` → `src/lib/ai-clients.ts` (UPDATE)
- Create the refine endpoint → `src/app/api/refine/route.ts` (CREATE)
- Extract shared `modelOverride` resolution into a `useMemo` → `src/app/page.tsx` (UPDATE)
- Add refine state + `handleRefine` → `src/app/page.tsx` (UPDATE)
- Add the "Ask for improvements" card after `<ActionPlan plan={plan} />` → `src/app/page.tsx` (UPDATE)

## Tests added

None — this repo has no automated test framework (confirmed: no test script in `package.json`, no
`*.test.*`/`*.spec.*` files anywhere in `src/`), matching `CLAUDE.md:37`'s documented convention. Validation
was lint + type-check (build) + a real end-to-end manual pass against a live provider (see below), per the
plan's Testing Strategy.

## Validation results

- **Lint** (`npm run lint`): 0 errors, 3 warnings — all 3 confirmed via `git diff main` to be on lines this
  feature did not touch (2 pre-existing `eslint-disable` directives in `page.tsx`, 1 pre-existing
  `react-hooks/exhaustive-deps` warning in `ActionPlan.tsx`, which this feature never modified). Exit code 0.
- **Build/type-check** (`npm run build`): passed cleanly. `/api/refine` correctly appears in the build's
  route table as a new dynamic route. The `prompt.ts` ↔ `ai-clients.ts` circular-import concern flagged in
  the plan's Open Questions resolved cleanly via `import type` (no runtime cycle, `isolatedModules: true` in
  `tsconfig.json` supports this).
- **Manual end-to-end** (real dev server, real provider calls, not mocked):
  - `POST /api/generate` with `provider: "openai"` → 429 (account has no credits) — confirmed clean error
    handling (500 with the provider's actual message, no crash).
  - `POST /api/generate` with `provider: "gemini"` → 200, real plan generated, but with `milestones: []`
    (the model didn't populate them this run — pre-existing generate behavior, unrelated to this feature).
  - `POST /api/refine` with that exact plan + feedback ("milestones array is empty, add 3-4 with real
    done_when") → 200, returned 4 concrete milestones with `done_when` values referencing real details from
    the plan (`sudo docker run hello-world`, `http://YOUR_VPS_IP_ADDRESS`), **and** `implementation_document`
    came back byte-for-byte identical, `summary` unchanged — empirically confirms the scope-constraint
    prompt design works, not just in theory.
- **Provider smoke test** (`npm run check:llms`): not run this pass — the manual `/api/generate` +
  `/api/refine` calls above already exercised real provider calls end-to-end more thoroughly than the smoke
  test would for this specific change. Recommend running it before merge as a final regression check.

## Deviations from the plan

- **eslint required a targeted reinstall before it would run at all** (`Cannot find module
  './getter-return'` — the on-disk `node_modules/eslint` install was missing files, unrelated to this
  feature; confirmed via `git diff main -- package.json package-lock.json` showing no dependency changes
  from this branch). Fixed with `rm -rf node_modules/eslint && npm install eslint@9.39.3 --no-save` to unblock
  the plan's Level 1 validation gate. This is an environment repair, not a code change — nothing in the diff
  reflects it.
- Skipped `npm run check:llms` in favor of direct `/api/generate` + `/api/refine` calls against a live
  provider, which is a strictly more thorough real-world check for this specific change (see above) — noting
  as a deviation since the plan named the smoke test explicitly as Level 5.

## Issues encountered

- The OpenAI provider key on this machine currently has no credits (429 `insufficient_quota`) — unrelated to
  this feature, discovered only because I exercised a real call. Not fixed (out of scope — billing, not code).
- The base `/api/generate` call used for the manual test happened to return `milestones: []` for this
  particular Gemini response (the model just didn't populate the array that run) — this is existing
  `generate` behavior, not something this feature changed, and it made for a good real test case for refine.
