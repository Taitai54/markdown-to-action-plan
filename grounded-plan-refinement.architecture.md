# Architecture — Grounded Plan Generation & Refinement (MVP: refine loop)

## Problem & goals

Generated plans are one-shot and often too generic — no concrete examples, no way to push back on a weak
first draft. Per the PRD (`grounded-plan-refinement.prd.md`), the MVP slice is an "ask for improvements"
refine loop on top of the existing generation flow, with local-knowledge grounding deferred as a later door.
Every decision below is judged against: does it make plans measurably more specific/actionable, with the
least new infrastructure, staying reversible.

## Approaches considered

1. **Stateless regenerate-with-feedback (chosen)** — one more LLM call, current plan JSON + feedback in, a
   fresh plan JSON out. No new state model; the client already replaces `plan` in React state on every
   generate response, refine reuses that exact flow.
2. **True multi-turn chat thread** — persisted message history resent each turn. More natural back-and-forth,
   but a genuinely new pattern (conversation state, growing per-turn token cost) that doesn't exist anywhere
   in this codebase today.
3. **Section-level targeted refine** — refine one milestone at a time, merge client-side. Cheapest per call,
   but by far the biggest UI lift for an MVP meant to test the hypothesis fast, not ship the full feature.

**Recommended and chosen: (1).** Thinnest slice, zero new infrastructure, fully reversible. (2) and (3) are
plausible upgrades if the refine loop validates the hypothesis, not prerequisites to testing it.

## Recommended approach

Add a new `/api/refine` route, sibling to `/api/generate`, following the same one-endpoint-per-concern
pattern already used across `src/app/api/`. It accepts the original source markdown, the current
`MasterActionPlan`, free-text user feedback, and the provider/preset/override that produced the original
draft. It returns a fresh `MasterActionPlan` the client swaps in exactly the way `setPlan(data)` already
works today. No persistence, no new external services — this plugs into the existing generate→display flow
as a second entry point into the same pipeline.

## Key decisions

- **Stack & libraries:** none new. Reuses `ai-clients.ts`'s existing provider-calling, `parseRobustJson`, and
  `validateActionPlan`/`normalizeMilestones` pipeline unchanged — the refine call produces the identical
  `MasterActionPlan` shape via a different prompt, not a different code path.

- **Data model:** none needed. `previousPlan` + `feedback` travel in the request body only; nothing is
  persisted server-side (consistent with the rest of this app — even milestone completion is
  `localStorage`-only). The future local-knowledge-grounding door will need real persistence of past plans;
  that's an explicit missing piece for *that* stretch, not this MVP.

- **Boundaries & contracts:** `/api/refine` gets the same `requireApiSecret` guard as `/api/generate` and
  `/api/export/docx` (same category: costly, LLM-calling route). Same `Provider`/configured-provider
  validation as `/api/generate`. No new secrets, no new external services.

- **API/endpoint shape:** new `src/app/api/refine/route.ts`, not an extension of `/api/generate` — mirrors
  the existing pattern where each concern gets its own route, and keeps the (larger, feedback-shaped) refine
  request/response contract from crowding the simpler generate contract.

- **Prompt engineering approach (the "excellent prompt" requirement)** — grounded in current research +
  Anthropic's own guidance rather than hand-written on instinct:
  - **Self-Refine pattern** (generate → critique → revise), with its known failure mode addressed: LLMs show
    *self-bias* critiquing their own output, and unconstrained refinement isn't always an improvement. Two
    guardrails against that, both close to free given the existing architecture:
    - An **explicit success rubric** in the refine prompt (does every milestone have a concrete example, an
      exact UI action/command, an observable "done when"?) — gives the model something concrete to check
      itself against, doing most of what a separate critique pass buys you without a second call.
    - A **scope constraint**: "only change what the feedback addresses; preserve everything else exactly" —
      directly guards against full-document drift/regression on sections that were already fine.
  - **Structured prompt**, per Anthropic's guidance for mixed instruction/context prompts: `<original_plan>`
    / `<user_feedback>` / `<success_criteria>` XML-tag sections in `buildRefineUserPrompt()`, rather than one
    freeform paragraph.
  - **A small set of generic→specific few-shot pairs** (3-5, diverse), scoped only into the refine prompt
    build function — not added to the main `SYSTEM_PROMPT`, so ordinary generation doesn't pay the extra
    token cost. Extends the same BAD/GOOD-example pattern the existing system prompt already uses for
    UI-first language, applied specifically to "generic instruction vs. concrete example."
  - **Self-bias mitigation made free by existing architecture:** `/api/refine` takes its own `provider` param
    (defaulting to whichever generated the draft, but switchable) — critiquing/revising with a *different*
    model than the one that wrote the draft directly addresses the self-bias finding, at zero extra
    engineering cost since every call already threads a `Provider` through.
  - Sources: [Self-Refine (Madaan et al.)](https://dl.acm.org/doi/10.5555/3666122.3668141) ·
    [The Prompt Report survey](https://arxiv.org/pdf/2406.06608) ·
    [Claude prompt engineering best practices](https://claude.com/blog/best-practices-for-prompt-engineering) ·
    [Anthropic prompting best-practices docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices)

## Missing pieces

- `buildRefineUserPrompt(originalPlan, feedback)` in `src/lib/prompt.ts` (XML-tag structured, rubric +
  scope constraint + few-shot pairs, per above).
- `src/app/api/refine/route.ts`, mirroring `src/app/api/generate/route.ts`'s structure and guards.
- `generateActionPlan()` in `src/lib/ai-clients.ts` gains an optional refine-context parameter (or a thin
  sibling function that shares its provider-call/parse/validate internals) rather than a fully parallel
  pipeline — avoids duplicating `parseRobustJson`/`validateActionPlan`.
- UI: feedback textarea + "Improve this plan" action in `ActionPlan.tsx`/`page.tsx`, replacing `plan` state
  on response. No undo/history stack — explicitly out of scope for this MVP.
- *(Future door, not this MVP)* persistence of past plans + a local embedding mechanism — needed only once
  the local-knowledge-grounding stretch is picked up.

## Spikes & experiments

None needed for this MVP — it's a two-way door: additive to existing generation, fully reversible, no new
external services or data migrations. (The local-knowledge-grounding stretch door is where a real spike
belongs later — local embedding mechanism + what "past knowledge" means — already flagged as open questions
in the PRD.)

## Open questions

- [ ] Exact rubric wording for "specific and actionable" in the success-criteria block — draft alongside the
      few-shot examples when this gets implemented, not decided at the architecture level.
- [ ] Should the UI surface which provider generated the current draft, to make the "switch provider for
      refine" self-bias mitigation an informed choice rather than a hidden default?
- [ ] Multiple refine rounds in one session: no cap decided — the user is the stopping condition (matches
      the "smart stopping over fixed iteration count" finding), but worth confirming there's no reason to add
      a soft limit later.
