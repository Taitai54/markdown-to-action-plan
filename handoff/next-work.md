# Next Work

## Completed Priority 1: Complete-Book Synthesis API & UI Integration
- Shipped `/api/synthesize/route.ts` with `SYSTEM_PROMPT_BOOK_SYNTHESIS` and `buildBookSynthesisUserPrompt()`.
- Added **"Synthesize Full Book"** UI button & progress status indicator in `src/app/page.tsx`. Automatically iterates through all document sections and generates a unified master playbook.

## Completed Priority 3: Deterministic Evaluation Fixtures
- Shipped `src/scripts/check-chunker.ts` (`npm run check:chunker`). Tests single-chunk fallback, section heading isolation, paragraph boundary splitting, and title extraction.

## Completed Priority 4: Practice & Decision Rules Loop
- Shipped **Practice & Decision Rules Self-Check Loop** widget in `src/components/ActionPlan.tsx` with user situation input and persistent local progress tracking.

## Next Priority: Better Context Preservation & Advanced Retrieval

- Keep document boundaries and section headings in every chunk.
- Add chunk index and total chunk count to the generated source context (partially completed).
- Preserve YouTube timestamps in a structured way rather than only inline text if the response contract is expanded.
- Pass KB metadata such as `title`, `source`, `docType`, `section`, score, and chunk ID in a structured context block.

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
