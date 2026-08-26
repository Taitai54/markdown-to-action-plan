# Handoff: Plan Refine Loop (Improve this plan)

Status: COMPLETE (implementation added)

Summary
- Intent: Add a stateless "refine" loop to improve an already-generated action plan via free-text feedback.
- Current state: Feature implemented, endpoint and UI added. Validation performed (lint/build + manual provider calls). See report for details.

Primary artifacts
- Plan (what to implement / read first): [.claude/plans/grounded-plan-refinement-refine-loop.md](/Users/matthewatkinson/GitHub projects mac/markdown-to-action-plan.worktrees/handoff-document-check-today/.claude/plans/grounded-plan-refinement-refine-loop.md)
- Implementation report (validation + issues): [.claude/reports/grounded-plan-refinement-refine-loop-report.md](/Users/matthewatkinson/GitHub projects mac/markdown-to-action-plan.worktrees/handoff-document-check-today/.claude/reports/grounded-plan-refinement-refine-loop-report.md)
- PRD & architecture: [grounded-plan-refinement.prd.md](/Users/matthewatkinson/GitHub projects mac/markdown-to-action-plan.worktrees/handoff-document-check-today/grounded-plan-refinement.prd.md), [grounded-plan-refinement.architecture.md](/Users/matthewatkinson/GitHub projects mac/markdown-to-action-plan.worktrees/handoff-document-check-today/grounded-plan-refinement.architecture.md)

Key code to review (start here)
- [src/lib/ai-clients.ts](/Users/matthewatkinson/GitHub projects mac/markdown-to-action-plan.worktrees/handoff-document-check-today/src/lib/ai-clients.ts) — generateActionPlan(), parseRobustJson(), validateActionPlan(); the refine path is threaded via an optional `refineContext` param.
- [src/lib/prompt.ts](/Users/matthewatkinson/GitHub projects mac/markdown-to-action-plan.worktrees/handoff-document-check-today/src/lib/prompt.ts) — new buildRefineUserPrompt() function and user/system prompt patterns.
- [src/app/api/refine/route.ts](/Users/matthewatkinson/GitHub projects mac/markdown-to-action-plan.worktrees/handoff-document-check-today/src/app/api/refine/route.ts) — new endpoint mirroring generate/route.ts (requireApiSecret guard, size checks, provider validation).
- [src/app/page.tsx](/Users/matthewatkinson/GitHub projects mac/markdown-to-action-plan.worktrees/handoff-document-check-today/src/app/page.tsx) — UI additions: refine state, handleRefine, and the "Ask for improvements" card placed after <ActionPlan />.

Concrete next steps for an agent to pick up
1. Read the Plan and Report (links above).
2. Review the three code files listed under "Key code to review" for any outstanding TODOs or comments.
3. Run local validation: npm run lint && npm run build
   - Note: an environment eslint reinstall was required in the report; if eslint fails, run `npm install eslint@9.39.3 --no-save`.
4. Run a minimal end-to-end manual test (requires a working provider key):
   - Start dev server: npm run dev
   - POST to /api/generate with provider set (e.g., gemini) to produce a plan, then POST to /api/refine with feedback to verify refine modifies only what's requested.
5. If everything passes, open a PR (if not already) or merge per repo process.

Known caveats and context
- Provider key/quota: OpenAI key on the machine used for validation had insufficient quota (429). Use an alternative provider or valid key for tests.
- No automated tests exist in the repo; validation is lint + build + manual provider calls.
- Naming/circular-import caution: prompt.ts and ai-clients.ts use `import type` to avoid runtime cycles; preserve this pattern if modifying.

Suggested git actions
- Branch: feature/grounded-plan-refinement-refine-loop (implementation branch referenced in report)
- Commit message for finalizing handoff: "Add handoff summary for plan-refine-loop feature"

If you want, next actions can be:
- Create structured todos for the remaining validation/merge steps so an agent can act autonomously.
- Open or update a PR with the handoff summary attached.

Prepared by: Copilot (AI assistant using Copilot CLI runtime in VS Code) - 2026-08-23 17:45:40 BST
