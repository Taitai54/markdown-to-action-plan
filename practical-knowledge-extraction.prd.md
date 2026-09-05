# PRD - Practical Knowledge Extraction

## 1. Problem Statement

People can collect excellent knowledge from books, PDFs, Markdown notes, and YouTube transcripts, but collection does not reliably become understanding or changed behavior. The current product is strongest when the source already describes a procedure. When the source is conceptual, principle-driven, or advice-oriented, a conventional action-plan format can produce generic summaries, miss the author's reasoning, or give instructions without enough examples to make the idea usable.

The cost is high: the reader still has to interpret the source, decide when an idea applies, translate it into a behavior or implementation, invent an example, and work out how to verify whether it worked. That manual translation is the core job this product should remove.

## 2. Evidence

- **Direct user requirement:** The product should accept knowledge from PDFs, Markdown, YouTube, and books, extract core principles and concepts, and make them practical enough to deploy and understand.
- **Direct user requirement:** Code needs exact details so it can be embraced and implemented; tips need concrete examples.
- **Codebase observation:** the current generation path produces one `MasterActionPlan` with a title, summary, implementation document, and milestones. This is effective for execution tracking but does not represent concepts, principles, examples, or provenance separately.
- **Codebase observation:** uploaded sources are concatenated into one Markdown string before generation, and KB mode supplies ranked chunks with limited metadata. Important source context can therefore be difficult for the model and reader to distinguish.
- **Assumption - validate through use:** readers will trust and reuse plans more often when each important idea includes a decision rule, worked example, and verification step.
- **Unknown:** no baseline currently measures whether plans are understood, followed, or manually rewritten after generation. This needs lightweight validation during the first implementation slices.

## 3. Thesis

Markdown to Action Plan should become a knowledge-to-practice system, not only a document-to-checklist converter. Its differentiation is a reliable bridge from source material to usable judgment: preserve what the source means, explain the mental model, show when the idea applies, demonstrate it in a realistic situation, and provide a way to try and verify it.

This matters now because the product already has multiple ingestion paths and a knowledge-base mode. Improving the transformation quality creates more value from the sources already being collected before adding more integrations or model providers.

## 4. Hypothesis

> We believe requiring every important extracted idea to include its meaning, use conditions, concrete example, practical action, and verification method will cause knowledge workers and builders using the product to understand and apply more of what they read or watch, resulting in fewer generic plans and less manual rewriting.
>
> We'll know we're **RIGHT** if, across a small set of book, YouTube, PDF, tip, and code sources, readers can identify what to do next and produce a source-specific example without returning to the original source, while reporting fewer missing-example and missing-detail problems than with the current output.
>
> We'll know we're **WRONG** if the richer structure increases length without improving execution, causes important procedural detail to be buried, or readers still need to reopen the source to understand when or how to apply the ideas.

## 5. Target User & JTBD

- **Primary user:** a solo builder, operator, or knowledge worker who regularly saves books, PDFs, Markdown notes, and YouTube transcripts and wants to turn them into decisions, behaviors, or implementations.
- **Trigger:** they have a source they value but do not want to reread, interpret, and operationalize manually.
- **JTBD:** When I capture valuable source material, I want to understand the ideas and know exactly how to apply them in my context, so I can act on the knowledge instead of merely storing or summarizing it.
- **Secondary context:** developers who need complete code and configuration details; operators who need procedures and decision rules; learners who need examples and exercises.
- **Non-users:** people seeking a short abstract summary only; teams requiring collaborative permissions, shared editing, or enterprise governance; users expecting the product to independently verify every claim without source or web evidence.

## 6. MVP

The MVP is a better source-to-practice transformation for the existing input and output flow:

1. Identify the source's knowledge units: concepts, principles, tips, procedures, code recipes, examples, and unresolved gaps.
2. Explain each high-value unit in plain language and preserve the reasoning that makes it useful.
3. Translate each unit into use conditions, a decision rule or trigger, a concrete action, a realistic example, and a verification method.
4. Keep procedural and code output exact, complete, and source-grounded.
5. Make uncertainty visible instead of inventing missing details.
6. Validate the result with representative fixtures and a small manual rubric.

The MVP does not require a new storage system, new provider, or multi-user workflow. Those may become useful after the transformation quality is proven.

## 7. Success Metrics

| Metric | Target | How measured |
|---|---|---|
| Major ideas with a concrete example | At least 90% in evaluated outputs | Manual rubric across representative fixtures |
| Major ideas with an observable verification method | At least 90% | Manual rubric |
| Source-specificity rating | Average at least 4/5 | Reader rates output after generation |
| Missing-detail rewrites | Fewer than 1 in 3 evaluated plans require manual example/detail additions | Self-tracked during the first 2-4 weeks |
| Code recipe completeness | No required dependency, configuration, path, input, output, or test omitted in fixture outputs | Checklist-based review |
| Grounding discipline | Unsupported specifics are labeled as assumptions or research gaps | Manual review of fixture outputs |

## 8. Non-goals

- Building a general-purpose learning management system.
- Guaranteeing factual correctness beyond the evidence available in the supplied or explicitly researched sources.
- Replacing the existing action-plan and milestone workflow.
- Adding team collaboration, accounts, permissions, or cloud document management.
- Adding new LLM providers solely to improve output quality.
- Persisting every generated plan or source before the transformation contract is validated.
- Making engineering choices about storage, chunking, schema migrations, or model routing in this product PRD; those belong in an implementation architecture decision.

## 9. Product Principles

- **Ground before embellishing:** source fidelity comes before richness.
- **Understanding before execution:** explain the idea before asking the reader to perform it.
- **Examples are part of the explanation:** examples must use realistic context, inputs, and expected outcomes.
- **Specificity must be earned:** exact details come from the source, user context, or clearly labeled research.
- **Verification closes the loop:** every important recommendation needs an observable way to test it.
- **Progressive depth:** give the reader a concise mental model first, then detailed implementation.
- **Different knowledge needs different treatment:** a principle is not a procedure, a tip is not a code recipe, and a code recipe is not a summary.

## 10. Delivery Sequence

### Slice 1 - Practical transformation contract
Improve the generation prompt so outputs consistently contain concepts, principles, use conditions, examples, actions, and verification while preserving exact procedural and code detail.

### Slice 2 - Evaluation fixtures and rubric
Add representative source fixtures and a repeatable review rubric covering books, YouTube, PDFs, tips, mixed sources, code, and source gaps.

### Slice 3 - Large-source chunking
Detect sources that are too large for a reliable single request, split them at chapter or heading boundaries where possible, and let the reader choose which section to generate. Preserve enough context in each chunk to avoid silent truncation or accidental whole-book failures.

### Slice 4 - Provenance and source gaps
Expose source titles, sections, pages, timestamps, excerpts, confidence, and explicit distinctions between source-backed content, synthesis, assumptions, and research needs.

### Slice 5 - Input and retrieval context
Preserve document boundaries and contextual metadata through PDF, YouTube, Markdown, and KB retrieval so synthesis can cite and compare the right evidence.

### Slice 6 - Practice and feedback loop
Add exercises, self-checks, plan refinement, and lightweight local signals showing whether readers can apply the knowledge without reopening the source.

### Slice 7 - Structured knowledge objects
Only after the earlier slices validate the value, consider representing principles, concepts, examples, code recipes, and procedures as reusable objects for targeted views and retrieval.

## 11. Open Questions

- [ ] Should the default output optimize for a single immediate application or teach a reusable general model first?
- [ ] What is the minimum context to request from the reader for examples without adding too much friction?
- [ ] Which source types need distinct extraction rules first: books, YouTube transcripts, technical PDFs, or mixed notes?
- [ ] Should provenance appear inline, in expandable details, or in a dedicated source-notes section?
- [ ] What level of external research is acceptable when a source contains a useful principle but omits implementation details?
- [ ] Should the product offer separate Learn, Apply, Build, and Review modes, or should one adaptive output handle these needs?
- [ ] How should the product measure real-world application while keeping the workflow local and lightweight?
