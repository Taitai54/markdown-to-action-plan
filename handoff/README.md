# Markdown to Action Plan Handoff

**Handoff date:** 2026-08-23
**Product:** `markdown-to-action-plan`
**Purpose:** Resume the practical knowledge extraction and large-source reliability work without reconstructing the previous conversation.

## Start Here

1. Read [current-state.md](current-state.md).
2. Read [product-direction.md](product-direction.md) for the PRD and delivery sequence.
3. Read [validation.md](validation.md) before changing code.
4. Continue from [next-work.md](next-work.md).

## Current Product

This is a Next.js app that accepts Markdown, PDF, and YouTube transcript input, optionally searches a Pinecone knowledge base, and generates a structured `MasterActionPlan` through OpenAI-compatible LLM providers. The output can be refined and exported to Markdown, Word, or Google Docs.

## Important Rule

Preserve the existing public response shape unless a later architecture decision explicitly changes it:

```ts
{
  title: string;
  summary: string;
  implementation_document: string;
  milestones: Milestone[];
}
```

## Resume Prompt

> Continue the Markdown to Action Plan handoff. Read `handoff/README.md`, `handoff/current-state.md`, `handoff/product-direction.md`, `handoff/validation.md`, and `handoff/next-work.md`. Inspect the current worktree before editing. Resume with the highest-priority unfinished item, make the smallest change, and run the narrowest executable validation immediately after it.
