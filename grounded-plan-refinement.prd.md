# PRD — Grounded Plan Generation & Refinement

## 1. Problem Statement

Generated action plans are one-shot: the model sees only the single source document dropped in that
session, with no access to Matt's broader captured knowledge (past Recall/YouTube transcripts, past
generated plans), and there's no way to push back if the first draft comes out generic. As the volume of
captured knowledge and generated plans grows, this has become a real bottleneck — plans need manual
rewriting with real examples to be genuinely specific and actionable, which undercuts the tool's core
purpose: turning raw knowledge into a ready-to-execute playbook.

## 2. Evidence

- **Direct user testimony** (this PRD's interview): *"The main issue is to make sure that the plan that's
  generated is as specific and actionable as possible, with use cases and examples."* Confirmed the trigger
  is volume — enough capturing/generating is now happening that generic output is a real bottleneck, not a
  one-off annoyance.
- **Codebase-confirmed**: `generateActionPlan()` (`src/lib/ai-clients.ts`) is a single request/response call
  — one system prompt + one user prompt in, one JSON plan out. No multi-turn refinement exists today, and no
  retrieval step feeds outside knowledge into that call.
- **Codebase-confirmed**: the existing Knowledge Base feature (`/api/knowledge-search` etc.) is a
  manually-triggered, separate query mode in the UI — it is not wired into the generation flow, so today
  generation never automatically draws on anything beyond the pasted-in source.
- *Assumption — validate via use:* that grounding + refinement will measurably reduce how often Matt
  manually rewrites plan sections. No current baseline exists (see Open Questions).

## 3. Thesis (why build it, why now)

Solving genericness is table stakes for a "knowledge → action plan" tool — a generic plan is barely better
than the source document itself. The differentiation isn't just convenience: grounding generation in
knowledge Matt has *already captured* changes what's possible in the output — concrete, real examples
instead of plausible-sounding invented ones — and an "ask for improvement" loop means a mediocre first draft
doesn't have to be abandoned or manually salvaged. Why now: the volume of captured knowledge (via Recall) and
generated plans has crossed the point where manual rewriting is a real tax on every session, not an
occasional annoyance.

## 4. Hypothesis

> We believe adding **local-knowledge grounding + an "ask for improvements" refine loop** to plan generation
> will cause **Matt** to **keep and use plans closer to as-generated, with less manual rewriting**, resulting
> in **plans that actually get followed instead of reworked or abandoned**.
>
> We'll know we're **RIGHT** if most generated plans need little-to-no manual example-adding afterward, and
> "this is too generic" moments drop noticeably within the first few weeks of real use.
>
> We'll know we're **WRONG** if plans still feel generic despite grounding/refinement, or the refine loop
> goes unused and Matt reverts to manual editing.

## 5. Target User & JTBD

- **Primary user:** Matt — sole user, solo builder building this for himself.
- **JTBD:** *When I generate an action plan and the first draft comes out generic, I want to ground it in
  what I already know and ask for it to be sharpened, so I get a genuinely specific, ready-to-execute
  playbook without starting over or manually rewriting it myself.*
- **Non-users:** anyone else — this is not a team/shared feature. Also not useful to someone without an
  existing captured-knowledge habit (no Recall-equivalent) — the value depends on having something to ground
  against.

## 6. MVP

**Thinnest slice: the refine loop, before the local-knowledge grounding.** Add an "ask for improvements" step
on top of an already-generated plan — a way to tell the AI what's too generic and get it sharpened, using the
existing generation call made multi-turn rather than new retrieval infrastructure. This is the fastest way to
find out whether iterative querying fixes genericness at all, before investing in a local embedding store.

Local-knowledge grounding (retrieving from past transcripts/plans automatically at generation time) is the
next door once the refine loop validates the underlying hypothesis — not required to ship first.

**Door check:** two-way door — this is additive to existing generation, reversible, no reason to spike first.

*(Note from the interview, carried forward rather than decided here: Matt wants parallel-agent execution
considered when this gets built — that's an implementation/orchestration choice for the build phase, not a
PRD decision.)*

## 7. Success Metrics

No usage or completion analytics exist today (milestone tracking is `localStorage`-only, no events) — these
metrics are self-assessed until/unless lightweight logging is added (see Open Questions).

| Metric | Target | How measured |
|---|---|---|
| Plans needing manual example-adding after generation | Reduced from current baseline (unmeasured) toward near-zero | Self-tracked yes/no note per plan for first 2–4 weeks |
| Refine-loop usage when a draft feels generic | Used in the majority of sessions where the first draft is judged generic | Self-observed |
| Subjective specificity rating per plan (1–5: concrete example vs. generic instruction) | Improves from a first-measured baseline | Self-rated immediately after generation, tracked informally |

## 8. Non-goals

- Not a multi-user or team-shared feature.
- Not integrating with Pinecone or any paid embedding/storage for this feature — local embedding/storage only.
- Not building the full `pinecone_bulk.py`-style upload-to-KB pipeline — that idea was explicitly de-scoped
  this round in favor of grounding/refinement.
- Not redesigning export or milestone-tracking — separate, later concern.

## 9. Open Questions

- [ ] How do we actually measure "more specific/actionable" — stay self-rated, or add lightweight local
      logging/scoring?
- [ ] What counts as "local knowledge" to ground against — just past generated plans, or raw Recall
      transcripts too? Where do those currently live (already local markdown, or need an ingestion step)?
- [ ] Cold-start UX: what happens when there's no local knowledge yet to ground against?
- [ ] Does local-knowledge grounding (the stretch door) ship in the same cycle as the refine-loop MVP, or
      only after the refine loop validates the hypothesis?
- [ ] Local embedding/storage mechanism is an engineering decision for `plan-architecture`, not this PRD —
      flagging because it affects whether "local only" is actually feasible without new dependencies (the repo
      already has `@xenova/transformers` wired in for KB search, which may be reusable).
