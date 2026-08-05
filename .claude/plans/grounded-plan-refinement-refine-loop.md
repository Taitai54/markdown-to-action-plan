# Feature: Plan Refine Loop ("Improve this plan")

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Adds an "ask for improvements" loop on top of an already-generated action plan. Once a plan exists, the
user can type feedback ("milestone 3 is too generic, give me a real example") and get back a revised plan
that addresses the feedback while leaving everything else untouched — without regenerating from scratch or
manually rewriting sections.

## User Story

As the sole user of this tool
I want to ask the AI to sharpen a generated plan that came out too generic
So that I get a genuinely specific, ready-to-execute playbook without starting over or manually rewriting it

## Problem Statement

`generateActionPlan()` is a single-shot call — one prompt in, one JSON plan out, no way to push back if the
draft is generic. Milestones frequently lack concrete examples or exact commands/UI actions, and today the
only fix is manually rewriting the output by hand.

## Solution Statement

Add a new `/api/refine` route that takes the original source markdown, the current plan, and free-text
feedback, and returns a revised plan from one more LLM call — reusing the exact same provider-calling /
JSON-repair / validation pipeline `generateActionPlan()` already has, via a new refine-flavored prompt rather
than a parallel code path. No new persistence, no new dependencies.

## Out of Scope / Non-Goals

- **Not** a multi-turn chat thread with persisted message history — each refine round is a fresh, stateless
  call (per `grounded-plan-refinement.architecture.md`, Approaches Considered).
- **Not** section-level/per-milestone refine — feedback always applies to the whole plan; the model is
  instructed to change only what the feedback addresses, but the API surface itself is whole-plan in,
  whole-plan out.
- **Not** persisting plan history or an undo/redo stack — refining replaces `plan` state exactly like
  generating does today. If a refine round makes things worse, there's no built-in way back (accepted
  trade-off for MVP scope).
- **Not** exposed via the MCP server (`mcp-server.ts`) — the architecture doc's missing-pieces list doesn't
  include it; `generate_action_plan` is unaffected by this change.
- **Not** local-knowledge grounding (retrieving from past transcripts/plans) — that's the PRD's next door,
  not this ticket.
- **Not** building any UI to let the user pick a *different* provider specifically for refine — the existing
  provider dropdown already applies to whichever action (generate or refine) runs next, which already
  satisfies the self-bias-mitigation idea from the architecture doc for free. No new provider UI needed.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Low
**Primary Systems Affected**: `src/lib/prompt.ts`, `src/lib/ai-clients.ts`, `src/app/api/refine/route.ts` (new), `src/app/page.tsx`
**Dependencies**: None new — reuses existing `@modelcontextprotocol` / provider fetch machinery already in `ai-clients.ts`.

## Related Work

**Implements**: PRD `grounded-plan-refinement.prd.md` (MVP door) · **Epic/Architecture**: `grounded-plan-refinement.architecture.md`

**Back-references**:
- `grounded-plan-refinement.architecture.md` — Why: this plan inherits its approach (stateless
  regenerate-with-feedback), endpoint shape (new `/api/refine` route), and prompt-design decisions
  (success rubric + scope constraint + XML structure + few-shot pairs + free self-bias mitigation via the
  existing provider param). None of those are re-decided here.

**Forward-references**: (none yet — local-knowledge grounding is a future ticket)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `src/lib/ai-clients.ts` (lines 1-60, 312-385) — Why: `generateActionPlan()`'s exact signature, options
  shape, and how `userContent`/`systemContent`/`modelName` are resolved (lines 337-349) — the refine branch
  slots in here. Also `MasterActionPlan`/`Milestone` types (lines 36-50) and `parseRobustJson`/
  `validateActionPlan` (lines 168-310), which must NOT be duplicated for refine — reused as-is.
- `src/lib/prompt.ts` (lines 263-276) — Why: `buildUserPrompt`/`buildKbUserPrompt` are the exact pattern
  `buildRefineUserPrompt` must mirror (plain exported function, template string, source content interpolated
  at the end).
- `src/app/api/generate/route.ts` (all 86 lines) — Why: this is the route `/api/refine/route.ts` mirrors
  exactly — same `requireApiSecret` guard, same size check, same provider validation, same try/catch → 500
  shape. Copy the structure, don't reinvent it.
- `src/lib/api-auth.ts` (all 21 lines) — Why: `requireApiSecret(req)` — same guard, imported as-is.
- `src/lib/limits.ts` (lines 1-5) — Why: `MAX_MARKDOWN_CHARS`/`formatCharLimit`, reused as-is for the same
  size check `/api/generate` already does.
- `src/app/page.tsx` (lines 59-99 state block, 240-290 `handleGenerate`, 791-820 render/button area) — Why:
  `handleGenerate` is the exact pattern `handleRefine` mirrors (loading/error state, `modelOverride`
  resolution, fetch → setPlan). The `modelOverride` computation (lines 258-265) is currently inline in
  `handleGenerate` only — Task 4 below extracts it so `handleRefine` doesn't duplicate it.
- `src/components/ActionPlan.tsx` (lines 1-20, 158-176) — Why: confirms `plan` state shape and that this
  component takes only a `{ plan }` prop today — the refine UI does NOT go inside this component (keep it a
  pure display component); it's added directly in `page.tsx` after `<ActionPlan plan={plan} />` at line 820,
  same way the YouTube-import card (lines 345-379) sits beside `DropZone` rather than inside it.
- `CLAUDE.md` (lines 26-33 "Where new code goes", line 37 "Testing") — Why: confirms the new-endpoint pattern
  and the project's actual testing convention (no automated suite — lint is the bar). Do not introduce a test
  framework as part of this ticket.

### New Files to Create

- `src/app/api/refine/route.ts` — the refine endpoint, mirroring `generate/route.ts`.

### Relevant Documentation

- [Self-Refine (Madaan et al.)](https://dl.acm.org/doi/10.5555/3666122.3668141) — Why: the generate→critique→revise
  pattern this feature implements, and its known self-bias failure mode (addressed via the scope constraint
  + free provider-switch, both already in this plan).
- [Anthropic prompt engineering best practices](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices) —
  Why: XML-tag structuring for mixed instruction/context prompts, and the 3-5 diverse few-shot example
  guidance both used in the `buildRefineUserPrompt` template below.

### Patterns to Follow

**Naming conventions:** `build<X>UserPrompt` functions in `prompt.ts` (`buildUserPrompt`, `buildKbUserPrompt`
→ add `buildRefineUserPrompt`). API routes are `POST` handlers exporting `async function POST(req: NextRequest)`.

**Error handling:** every route wraps its body in try/catch, returns `NextResponse.json({ error: message },
{ status })` — 400 for missing/invalid input, 413 for oversized input, 500 for unexpected failures
(`src/app/api/generate/route.ts:33-84`). Client-side handlers follow `setLoading(true) → try/fetch/setState →
catch → setError → finally setLoading(false)` (`src/app/page.tsx:240-290`).

**Prompt composition:** `generateActionPlan()` resolves `userContent` by precedence — explicit
`userPromptOverride` wins, otherwise falls back to a `build*UserPrompt` call
(`src/lib/ai-clients.ts:337-340`). The refine branch inserts *before* the final fallback, not before the
override check — an explicit override should still be able to short-circuit refine too, for consistency.

**Other:** `MasterActionPlan`/`Milestone` types are already exported from `ai-clients.ts` and reused directly
— no new type needed for the refine payload.

---

## IMPLEMENTATION PLAN

### Phase 1: Prompt + core function change

Foundational — everything else depends on this.

**Tasks:**
- Add `buildRefineUserPrompt()` to `prompt.ts`
- Extend `generateActionPlan()`'s options and `userContent` resolution in `ai-clients.ts`

### Phase 2: API route

**Depends on:** Phase 1 (the route calls `generateActionPlan()` with the new refine option)

**Tasks:**
- Create `src/app/api/refine/route.ts`

### Phase 3: UI

**Depends on:** Phase 2 (the UI calls `/api/refine`)

**Tasks:**
- Extract the shared `modelOverride` resolution out of `handleGenerate`
- Add refine state + `handleRefine` to `page.tsx`
- Add the "Improve this plan" card to the render, after `<ActionPlan plan={plan} />`

### Phase 4: Validation

**Depends on:** Phases 1-3

**Tasks:**
- Lint, build (type-check), manual end-to-end pass, provider smoke test

---

## STEP-BY-STEP TASKS

### CREATE `src/lib/prompt.ts` — add `buildRefineUserPrompt`

- **IMPLEMENT**: Add a new exported function after `buildKbUserPrompt` (end of file, after line 276):

  ```ts
  export function buildRefineUserPrompt(
    markdown: string,
    previousPlan: MasterActionPlan,
    feedback: string
  ): string {
    return `You previously generated the action plan below from the source material. The user has feedback — revise the plan to address it.

  <success_criteria>
  A milestone or task is genuinely specific and actionable only if it has:
  1. A concrete, real-world example or use case — not just an abstract instruction
  2. An exact UI action, command, URL, or field value — never a vague "configure X"
  3. An observable "✅ Done when:" outcome
  Check every milestone against this list before finalizing.
  </success_criteria>

  <scope_constraint>
  Only change what the feedback below asks you to change. Do not rewrite, reorder, or "improve" sections the feedback didn't mention — preserve them exactly as they are in the original plan.
  </scope_constraint>

  <examples>
  <example>
  Generic: "Set up authentication for the app."
  Specific: "In the Supabase dashboard, go to Authentication → Providers → toggle on **Email**. Copy the **Project URL** and **anon public key** from Settings → API into your \`.env.local\` as \`NEXT_PUBLIC_SUPABASE_URL\` and \`NEXT_PUBLIC_SUPABASE_ANON_KEY\`."
  </example>
  <example>
  Generic: "Configure the database connection."
  Specific: "Run \`npx prisma migrate dev --name init\` from the project root. This creates \`prisma/migrations/\` and applies the schema in \`prisma/schema.prisma\` to the database at \`DATABASE_URL\`."
  </example>
  <example>
  Generic: "Test that the feature works."
  Specific: "Run \`npm run test -- auth.spec.ts\`. **Done when:** the terminal shows \`4 passed\`."
  </example>
  </examples>

  <original_source>
  ${markdown}
  </original_source>

  <original_plan>
  ${JSON.stringify(previousPlan)}
  </original_plan>

  <user_feedback>
  ${feedback}
  </user_feedback>

  Return the complete, revised plan as JSON in the exact same shape as the original (title, summary, implementation_document, milestones). Apply the user's feedback and the success criteria above, respecting the scope constraint.`;
  }
  ```

- **PATTERN**: `buildKbUserPrompt` (prompt.ts:269-276) — same "plain exported function, template literal,
  content interpolated" shape.
- **IMPORTS**: needs `MasterActionPlan` — `prompt.ts` currently imports nothing from `ai-clients.ts` (check
  for a circular-import risk: `ai-clients.ts` imports FROM `prompt.ts`, so `prompt.ts` importing
  `MasterActionPlan`'s *type* back from `ai-clients.ts` would be circular). **GOTCHA**: avoid the cycle by
  declaring the parameter as a structural type inline (`{ title: string; summary: string;
  implementation_document: string; milestones: unknown[] }`) or by defining `MasterActionPlan`/`Milestone` in
  a shared location — simplest fix: type the `previousPlan` param as `import type { MasterActionPlan } from
  "./ai-clients"` using a **type-only** import, which TypeScript/bundlers resolve without a runtime circular
  dependency (verify `tsconfig.json`'s `isolatedModules`/module settings don't reject this — if they do,
  fall back to the inline structural type).
- **VALIDATE**: `npm run build` (type-checks the whole app, including this new function)
- **SATISFIES**: Architecture doc "Missing pieces" — `buildRefineUserPrompt`; PRD MVP.

### UPDATE `src/lib/ai-clients.ts` — thread refine context through `generateActionPlan()`

- **IMPLEMENT**:
  1. Import `buildRefineUserPrompt` alongside the existing `buildUserPrompt`/`getSystemPromptForPreset`
     import at the top of the file (line 1).
  2. Add an optional field to the `options` parameter of `generateActionPlan` (around line 325-330):
     ```ts
     refineContext?: { previousPlan: MasterActionPlan; feedback: string };
     ```
  3. Update the `userContent` resolution (currently lines 337-340) to insert a refine branch between the
     override check and the plain-generate fallback:
     ```ts
     const userContent =
       options?.userPromptOverride != null && options.userPromptOverride !== ""
         ? options.userPromptOverride
         : options?.refineContext
           ? buildRefineUserPrompt(markdown, options.refineContext.previousPlan, options.refineContext.feedback)
           : buildUserPrompt(markdown);
     ```
- **PATTERN**: the existing precedence chain immediately above/below it (`systemContent`, `modelName`
  resolution, ai-clients.ts:342-349) — same ternary-chain style, don't restructure into if/else.
- **IMPORTS**: `buildRefineUserPrompt` from `./prompt` (same import line as `buildUserPrompt`).
- **GOTCHA**: do not touch `systemContent`/`modelName` resolution — refine reuses whatever preset/override/
  model the client sends, unchanged. Do not add a new `refineActionPlan()` function — the whole point (per
  `grounded-plan-refinement.architecture.md`, Missing Pieces) is threading one optional param through the
  existing function so `parseRobustJson`/`validateActionPlan` aren't duplicated.
- **VALIDATE**: `npm run build`
- **SATISFIES**: Architecture doc "Key decisions → Stack & libraries" (no new pipeline) and "Missing pieces".

### CREATE `src/app/api/refine/route.ts`

- **IMPLEMENT**: mirror `src/app/api/generate/route.ts` structure exactly, with a refine-shaped body:
  ```ts
  import { NextRequest, NextResponse } from "next/server";
  import {
    generateActionPlan,
    Provider,
    getAvailableProviders,
    getConfiguredProviders,
    MasterActionPlan,
  } from "@/lib/ai-clients";
  import { requireApiSecret } from "@/lib/api-auth";
  import { MAX_MARKDOWN_CHARS, formatCharLimit } from "@/lib/limits";
  import type { SystemPromptPresetId } from "@/lib/prompt";

  export async function POST(req: NextRequest) {
    const authError = requireApiSecret(req);
    if (authError) return authError;

    try {
      const {
        markdown,
        provider,
        previousPlan,
        feedback,
        systemPromptOverride,
        systemPromptPresetId,
        modelOverride,
      } = (await req.json()) as {
        markdown: string;
        provider: Provider;
        previousPlan: MasterActionPlan;
        feedback: string;
        systemPromptOverride?: string;
        systemPromptPresetId?: SystemPromptPresetId;
        modelOverride?: string;
      };

      if (!markdown || !provider || !previousPlan || !feedback) {
        return NextResponse.json(
          { error: "Missing markdown, provider, previousPlan, or feedback" },
          { status: 400 }
        );
      }

      if (markdown.length > MAX_MARKDOWN_CHARS) {
        return NextResponse.json(
          {
            error: `Markdown too large (${markdown.length} chars). Maximum is ${formatCharLimit(MAX_MARKDOWN_CHARS)} characters.`,
          },
          { status: 413 }
        );
      }

      const knownProviders = getAvailableProviders();
      if (!knownProviders.includes(provider)) {
        return NextResponse.json({ error: `Unknown provider "${provider}"` }, { status: 400 });
      }

      const configuredProviders = getConfiguredProviders();
      if (!configuredProviders.includes(provider)) {
        return NextResponse.json({ error: `Provider "${provider}" is not configured` }, { status: 400 });
      }

      const result = await generateActionPlan(markdown, provider, {
        refineContext: { previousPlan, feedback },
        systemPromptOverride:
          systemPromptOverride != null && systemPromptOverride !== "" ? systemPromptOverride : undefined,
        systemPromptPresetId: systemPromptPresetId ?? undefined,
        modelOverride: modelOverride != null && modelOverride !== "" ? modelOverride : undefined,
      });
      return NextResponse.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
  ```
- **PATTERN**: `src/app/api/generate/route.ts:1-86` — near-identical structure; the only real differences
  are the request shape (`previousPlan`/`feedback` instead of `userPromptOverride`) and passing
  `refineContext` instead of `userPromptOverride` into `generateActionPlan`.
- **IMPORTS**: `MasterActionPlan` type from `@/lib/ai-clients` (already exported).
- **GOTCHA**: deliberately no `userPromptOverride` field in this route's request body — if a client could
  send one, it would silently bypass `buildRefineUserPrompt` and the feedback would be ignored (see the
  precedence chain in the previous task). This is intentional, not an oversight — don't add it.
- **VALIDATE**: `npm run build`, then manually: `curl -X POST http://localhost:3000/api/refine -H "Content-Type: application/json" -d "{...}"` against a running dev server (see Level 4 validation below for a full example body).
- **SATISFIES**: PRD MVP; architecture doc "Recommended approach" + "Key decisions → API/endpoint shape";
  CLAUDE.md "Where new code goes → New API endpoint" (`CLAUDE.md:29`).

### UPDATE `src/app/page.tsx` — extract shared `modelOverride` resolution

- **IMPLEMENT**: `handleGenerate` currently computes `modelOverride` inline (lines 258-265). Extract it to a
  `useMemo` (or a plain function called from both handlers) placed near the other derived values
  (`concatenatedMarkdown`/`activeMarkdown`, around line 105-116), e.g.:
  ```ts
  const modelOverride = useMemo(() => {
    return provider === "openrouter"
      ? openRouterModelPreset === "custom" ? openRouterCustomModel : openRouterModelPreset
      : provider === "openai"
        ? openAiModelPreset === "custom" ? openAiCustomModel : openAiModelPreset
        : provider === "gemini"
          ? geminiModelPreset === "custom" ? geminiCustomModel : geminiModelPreset
          : undefined;
  }, [provider, openRouterModelPreset, openRouterCustomModel, openAiModelPreset, openAiCustomModel, geminiModelPreset, geminiCustomModel]);
  ```
  Then remove the inline computation from `handleGenerate` (it now closes over the memoized `modelOverride`),
  and use the same `modelOverride` in the new `handleRefine`.
- **PATTERN**: the existing `concatenatedMarkdown`/`activeMarkdown`/`defaultUserPrompt` `useMemo`s directly
  above (page.tsx:105-116) — same derived-value style.
- **GOTCHA**: this is a small refactor motivated directly by the new feature (avoiding duplicating the same
  5-branch ternary in `handleRefine`) — per CLAUDE.md working principles, keep it scoped to this; don't
  refactor unrelated parts of `page.tsx` while you're in there.
- **VALIDATE**: `npm run build` (confirms `handleGenerate` still compiles after the extraction)
- **SATISFIES**: enables the refine handler below without duplicating logic.

### ADD refine state + `handleRefine` to `src/app/page.tsx`

- **IMPLEMENT**: add near the other core state (after line 66, alongside `error`):
  ```ts
  const [refineFeedback, setRefineFeedback] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  ```
  Add the handler near `handleGenerate` (after it, ~line 291):
  ```ts
  const handleRefine = async () => {
    if (!plan || !refineFeedback.trim()) return;
    setRefining(true);
    setRefineError(null);

    const isCustomSystemPrompt =
      editableSystemPrompt !== "" &&
      editableSystemPrompt !== getSystemPromptForPreset(systemPromptPresetId);

    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: activeMarkdown,
          provider,
          previousPlan: plan,
          feedback: refineFeedback.trim(),
          ...(isCustomSystemPrompt
            ? { systemPromptOverride: editableSystemPrompt }
            : { systemPromptPresetId }),
          ...(modelOverride != null && modelOverride !== "" ? { modelOverride } : {}),
        }),
      });

      const data = (await res.json()) as MasterActionPlan & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to refine");
      setPlan(data);
      setRefineFeedback("");
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRefining(false);
    }
  };
  ```
- **PATTERN**: `handleGenerate` (page.tsx:240-290) — identical loading/try/fetch/setState/catch/finally
  shape; `handleKbSearch` (page.tsx:188-211) for the "clear its own error state at the start" convention.
- **GOTCHA**: reuses `activeMarkdown` (the currently-active source, whether files or KB mode) as the refine
  call's `markdown` — this is correct per the architecture doc (refine still needs the full source, not just
  the plan), but means if the user changed `files`/`kbResults` *after* generating and before refining, the
  refine call uses the *current* source, not necessarily what produced `plan`. Acceptable for MVP (edge
  case, not the common path) — note as a known limitation, don't engineer around it.
- **VALIDATE**: `npm run build`

### ADD the "Improve this plan" card to `src/app/page.tsx` render

- **IMPLEMENT**: directly after `<ActionPlan plan={plan} />` (line 820), before the closing `</div></main>`,
  conditioned on `plan !== null`:
  ```tsx
  {plan && (
    <div className={cardCls}>
      <label className="block text-sm font-medium text-slate-200">
        Ask for improvements
      </label>
      <p className="text-xs text-slate-500">
        Tell the AI what&apos;s wrong or too generic — it revises the plan, leaving everything else untouched.
      </p>
      <textarea
        value={refineFeedback}
        onChange={(e) => setRefineFeedback(e.target.value)}
        rows={3}
        className={inputCls}
        placeholder="e.g. Milestone 3 is too generic — give me a real example with exact commands."
      />
      <button
        onClick={handleRefine}
        disabled={refining || !refineFeedback.trim()}
        className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-all duration-200"
      >
        {refining ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Improving…
          </span>
        ) : "Improve this plan"}
      </button>
      {refineError && (
        <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl text-red-400 text-sm">
          {refineError}
        </div>
      )}
    </div>
  )}
  ```
- **PATTERN**: the YouTube-import card (page.tsx:345-379) for the label/description/textarea/button
  shape, and the Generate button (page.tsx:791-810) for the spinner SVG + disabled-state pattern. Uses
  `cardCls`/`inputCls` tokens already defined at page.tsx:293-295.
- **GOTCHA**: this card lives at the top level of the page's `<div className="space-y-6">`, *outside* the
  `{inputMode === "files" && (...)}` / mode-toggle blocks — it should show regardless of which mode produced
  the plan.
- **VALIDATE**: `npm run build`, then manual pass (Level 4 below).
- **SATISFIES**: PRD MVP — the actual "ask for improvements" surface; AC #1-3.

---

## TESTING STRATEGY

This project has **no automated test suite** (`CLAUDE.md:37` — "no automated test suite exists — 'done' means
`npm run lint` passes"; confirmed no test framework in `package.json`, no `*.test.*`/`*.spec.*` files
anywhere in `src/`). This plan follows that existing convention rather than introducing Jest/Vitest as an
unrequested side effect — validation is lint + type-check (via `npm run build`) + manual end-to-end + the
existing provider smoke test, per Levels 1-5 below.

### Edge Cases (covered by manual validation, Level 4)
- Refine with empty feedback → button stays disabled (`!refineFeedback.trim()`), no request sent.
- Refine when no plan exists yet → card doesn't render (`{plan && (...)}`).
- Refine fails (provider error, bad JSON from model) → `refineError` shows the existing error-card styling,
  `plan` state is untouched (only overwritten on success).
- Switching the provider dropdown before hitting "Improve this plan" → refine uses the newly-selected
  provider, exercising the free self-bias-mitigation path from the architecture doc.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
```
npm run lint
```

### Level 2: Type-check (substitutes for a dedicated typecheck script — none exists in package.json)
```
npm run build
```

### Level 3: Integration Tests
N/A — no test framework in this project (see Testing Strategy above).

### Level 4: Manual Validation
1. `npm run dev`, open http://localhost:3000.
2. Upload a markdown file, generate a plan, confirm it renders as today.
3. In the new "Ask for improvements" card, type feedback referencing a specific milestone, click **Improve
   this plan**.
4. Confirm: button shows "Improving…", then the plan re-renders with the feedback addressed and the
   textarea clears. Spot-check that an *unrelated* milestone is unchanged (validates the scope constraint).
5. Switch the provider dropdown to a different configured provider, refine again — confirm it still works
   (validates the free self-bias-mitigation path).
6. Trigger a failure case: stop the dev server's network access or use an invalid feedback string to confirm
   `refineError` renders and `plan` isn't clobbered.
7. Direct API check:
   ```
   curl -X POST http://localhost:3000/api/refine \
     -H "Content-Type: application/json" \
     -d '{"markdown":"# Test\nSome content","provider":"openai","previousPlan":{"title":"t","summary":"s","implementation_document":"d","milestones":[]},"feedback":"add an example"}'
   ```
   Confirm a `MasterActionPlan`-shaped JSON response (or a clear 400/500 error if no provider is configured).

### Level 5: Additional Validation
```
npm run check:llms
```
Confirms the provider smoke test still passes after the `ai-clients.ts` change (regression check — this
feature doesn't touch provider config, but the file was edited).

---

## ACCEPTANCE CRITERIA

- [ ] AC1: Given a generated plan, entering feedback and clicking "Improve this plan" returns a revised plan
      that addresses the feedback.
- [ ] AC2: Sections the feedback didn't mention are unchanged after a refine round (scope constraint holds).
- [ ] AC3: Refining uses whichever provider is currently selected in the existing provider dropdown — no new
      provider UI needed.
- [ ] AC4: `npm run lint` and `npm run build` pass with zero errors.
- [ ] AC5: No regressions to existing generate/export/KB-search flows.
- [ ] AC6: `npm run check:llms` still passes for configured providers.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] `npm run lint` and `npm run build` pass
- [ ] Manual end-to-end pass (Level 4) completed
- [ ] `npm run check:llms` passes
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## OPEN QUESTIONS / ASSUMPTIONS

- [ ] The `buildRefineUserPrompt` wording (rubric text, few-shot examples) is a first draft, not
      user-tested — per the architecture doc's own open question, expect to iterate on actual wording once
      real refine rounds are tried.
- [ ] Assumes sending the full `previousPlan` JSON in the request body is fine size-wise for local dev — no
      explicit size guard added (unlike `markdown`, which already has `MAX_MARKDOWN_CHARS`). Flagged, not
      solved: if this becomes a real serverless deployment (Vercel's ~4.5MB request body limit) it could
      theoretically matter for very large plans; out of scope to engineer around for a personal local tool.
- [ ] `buildRefineUserPrompt`'s `MasterActionPlan` import may hit a circular-import concern (`prompt.ts` ↔
      `ai-clients.ts`) — flagged with a specific mitigation (type-only import, or fall back to an inline
      structural type) in the task itself; confirm which one `tsconfig.json`'s module settings actually allow
      during implementation.

## NOTES (open canvas)

**Why extend `generateActionPlan()` instead of a new `refineActionPlan()` function:** the architecture doc
explicitly called this out as a decision to avoid duplicating `parseRobustJson`/`validateActionPlan`. The
alternative (a parallel function) was considered and rejected during architecture — not re-litigated here.

**Why the refine card is a separate component-less block in `page.tsx` rather than added to
`ActionPlan.tsx`:** `ActionPlan.tsx` is currently a pure display component (`{ plan }` prop only, no
handlers/mutation). Keeping it that way avoids threading `onRefine`/`refining`/`refineFeedback` props down
through it, and matches how every other input+action affordance in this codebase (YouTube import, KB search)
already lives in `page.tsx` beside the thing it produces, not inside a display component.

**Confidence for one-pass implementation: 9/10.** This is a small, well-understood change that reuses 100%
of the existing architecture (same pipeline, same error handling, same UI patterns) with zero new
dependencies. The only real uncertainty is the *quality* of the refine prompt's wording, which is inherently
iterative and not something code review alone can validate — expect to tune `buildRefineUserPrompt`'s exact
text after trying it against real generic plans, per the PRD's own success metrics (self-assessed, no
baseline yet).

## AMENDMENTS

(none yet)
