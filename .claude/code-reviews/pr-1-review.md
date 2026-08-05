# PR #1 Review — Plan Refine Loop ("Ask for improvements")

**Branch**: `feature/grounded-plan-refinement-refine-loop` → `main`
**Reviewer**: `pr-review-toolkit:code-reviewer` agent (fresh context, all changed files read in full, not just the diff)

## Summary

Adds an `/api/refine` endpoint and UI that let a generated plan be revised with free-text feedback, by
threading an optional `refineContext` through the existing `generateActionPlan()` pipeline rather than
duplicating it. Architecture and prompt design are sound and match the approved plan closely — one High-severity
concurrency bug found in the UI needs a fix before merge.

## Validation

| Check | Result |
|---|---|
| `npm run lint` | 0 errors, 3 warnings — all pre-existing, confirmed via `git diff main` to be on lines this PR does not touch |
| `npm run build` (type-check) | Passed cleanly; `/api/refine` correctly registered as a new route |
| Manual end-to-end (live provider, from implementation report) | Real plan with empty `milestones` → refine with feedback → 4 grounded milestones returned, `implementation_document`/`summary` byte-for-byte unchanged |
| `npm run check:llms` | Not re-run this pass — recommended as a final check before merge since `ai-clients.ts` changed |

## Verified from the plan's own open questions

- **Circular import** (`prompt.ts` importing `MasterActionPlan` from `ai-clients.ts`, which imports from `prompt.ts`): safe. `import type` + `isolatedModules: true` in `tsconfig.json` fully erases it at compile time — no runtime cycle.
- **`modelOverride` extraction into `useMemo`**: behavior-identical to the inline computation it replaced; dependency array is complete.
- **Precedence logic** in `generateActionPlan()`: refine branch correctly sits *after* the `userPromptOverride` check, so an explicit override still wins, exactly as planned.
- **Route parity**: `refine/route.ts` carries every guard `generate/route.ts` has (auth, size, provider validation), in the same order, and deliberately omits `userPromptOverride` so feedback can't be silently discarded.

## Findings

### High

**H1 — Concurrent generate + refine can silently clobber the plan (last-writer-wins race)**
`src/app/page.tsx:834`, `src/app/page.tsx:879`

Neither the Generate button nor the Improve button is disabled by the other's in-flight state. Failure
scenario: click **Improve this plan** (a call that can take up to 180s), then click **Generate** while it's
still running. `handleGenerate` calls `setPlan(null)` immediately, which unmounts the refine card — no
indication a refine is still in flight. Generate resolves and sets plan A. The still-pending refine then
resolves and overwrites it with a refinement of the *previous* plan. No error, no warning — the user just
watches unrelated content silently appear after a successful-looking generate.

**Fix:**
```tsx
// line 834 (Generate button)
disabled={loading || refining || available.length === 0 || !canGenerate}
// line 879 (Improve button)
disabled={refining || loading || !refineFeedback.trim()}
```

### Medium

**M2 — Refine can fire with an empty source, producing a misleading 400**
`src/app/page.tsx:310` → `src/app/api/refine/route.ts:36`

`handleRefine` checks `plan` and `refineFeedback` but not `activeMarkdown`. Two reachable paths leave `plan`
set while the source is empty: removing the last file after generating (`handleRemoveFile` doesn't clear
`plan`, unlike "Clear All"), or a failed KB re-search (`kbResults` reset to `null` before the new search).
Either way, refine POSTs `markdown: ""`, and the server's `!markdown` check returns a generic 400 that reads
as a bug rather than "your source is gone."

**Fix:** mirror the generate-side guard —
```ts
if (!plan || !refineFeedback.trim()) return;
if (!activeMarkdown) {
  setRefineError("The source content is no longer available. Re-add your files or re-run the knowledge base search before refining.");
  return;
}
```

**M3 — Stale error/feedback state crosses between generate and refine**
`src/app/page.tsx:263-266`, `handleRefine`

`handleGenerate` clears `error`/`plan` but not `refineError`/`refineFeedback` — a failed refine's error and
typed feedback can persist and reappear after a fresh, successful generate. Symmetrically, `handleRefine`
never clears the generate-side `error`.

**Fix:** add `setRefineError(null); setRefineFeedback("");` to `handleGenerate`, and `setError(null);` to
`handleRefine`.

### Low

**L4 — `previousPlan` is type-asserted, not shape-validated** (`src/app/api/refine/route.ts:29,36`)
Matches `generate/route.ts`'s existing looseness (not a new divergence). A malformed `previousPlan` doesn't
crash anything — it's never dereferenced, only `JSON.stringify`'d into the prompt — but a 3-line shape guard
would be cheap and consistent with the project's hand-rolled-type-guard convention.

**L5 — No size guard on `previousPlan` + `feedback`** (`src/app/api/refine/route.ts:43-50`)
**Already documented** in the plan's Open Questions as an accepted limitation for a personal local tool —
recorded here as confirmed-accepted, not a new finding.

**L6 — Unescaped XML delimiters in the refine prompt: a quality risk, not a security one** (`src/lib/prompt.ts:318-324`)
Confirmed not a security concern in this threat model: single-user/single-tenant, no secrets in prompt
content (API keys go in the `Authorization` header), no tool access or outbound channel for the model, and
`ActionPlan.tsx` renders markdown without `rehype-raw` so injected HTML never becomes live DOM. Worst case is
"the refined plan is wrong," which the user reads and discards.

**L7 — No client-side size pre-check in `handleRefine`** (`src/app/page.tsx:296`)
Cosmetic only — an oversized source produces a server 413 that's already caught and displayed correctly,
just without the friendly pre-flight message `handleGenerate` has.

## What's done well

- The refine path is a genuine thread-through, not a parallel pipeline — `parseRobustJson`,
  `validateActionPlan`, and `normalizeMilestones` are reused untouched, so refine inherits the full JSON-repair
  pipeline for free. Highest-leverage decision in the PR.
- Precedence ordering (`userPromptOverride` still wins over refine) was thought through, not accidental.
- The circular-import risk was flagged in the plan *and* verified against `tsconfig.json`, not just assumed.
- Route guard parity with `generate/route.ts` is exact — no security guard was dropped in the copy.
- The prompt design (success rubric + scope constraint + few-shot pairs) is empirically validated in the
  implementation report, not just claimed — a real test showed the scope constraint held exactly.
- Validation reporting is honest: pre-existing lint warnings were verified via `git diff`, not hand-waved, and
  the OpenAI 429 was disclosed rather than hidden.

## Recommendation: Request changes

One High-severity finding (H1) — a silent data-clobbering race between generate and refine — should be fixed
before merge; it's a 2-line change. M2/M3 are recommended in the same pass but not blocking. All Low findings
are either already-accepted (L5), consistent with existing convention (L4), or non-exploitable in this threat
model (L6, L7). Everything else — architecture, security posture, standards compliance, validation — is solid.
Re-run `npm run check:llms` before merge as a final regression check on `ai-clients.ts`.
