# Next Work

## Priority 1: Complete-Book Workflow

The current chunking implementation lets the reader generate one selected chunk. The next useful behavior is a two-stage workflow:

1. Generate a plan for each selected chapter or chunk.
2. Combine those chapter plans in a separate synthesis request that receives only the chapter outputs and source metadata.
3. Produce a book-level plan that deduplicates principles, preserves disagreements, and links each conclusion to chapter/source locations.

Keep the existing one-chunk mode as the fast path. Do not send the original full book plus all chapter plans into one request.

## Priority 2: Better Context Preservation

- Keep document boundaries and section headings in every chunk.
- Add chunk index and total chunk count to the generated source context.
- Preserve YouTube timestamps in a structured way rather than only inline text if the response contract is expanded.
- Investigate whether the installed `pdf-parse` version exposes page-level text; if it does, return page markers. If not, state that limitation clearly.
- Pass KB metadata such as `title`, `source`, `docType`, `section`, score, and chunk ID in a structured context block.

## Priority 3: Evaluation Fixtures

Turn the manual rubric into executable fixture checks without adding a new test framework prematurely. A small script can validate deterministic chunking properties first:

- small input returns one full-source chunk;
- headings remain in the same chunk as their section content;
- no chunk exceeds the requested target except only where a deliberately oversized atomic fragment is handled by fallback;
- concatenating chunks preserves source content in order.

Then add saved model-output fixtures or a provider smoke mode for qualitative scoring.

## Priority 4: Practice Loop

Add exercises and self-checks after the generated plan has proven useful:

- one “apply this to your situation” exercise per major principle;
- a short reader answer/checklist;
- optional local completion and specificity notes;
- retain completed practice state when exporting or refining.

## Do Not Do Yet

- Do not add a new database or structured knowledge-object schema before the output contract is evaluated.
- Do not add more model providers as a substitute for better context and evaluation.
- Do not silently auto-process an entire book with many expensive LLM calls; show estimated chunks and require an explicit action.
- Do not claim page-level PDF citations unless the parser actually provides page boundaries.

## Suggested Resume Task

Implement deterministic tests for `src/lib/chunker.ts`, then manually exercise a long Markdown book with at least three headings. Fix any boundary or selection issues before starting book-level synthesis.
