# Current State

## Shipped in This Workstream

### Practical knowledge transformation
Updated `src/lib/prompt.ts` so the default and KB prompts classify source material into concepts, principles, tips, procedures, code recipes, examples, and source gaps. Major ideas are requested with:

- plain-language meaning;
- problem solved;
- when to use and when not to use;
- decision rule or trigger;
- smallest practical action;
- realistic example;
- observable verification;
- labels for source-backed content, synthesis, assumptions, and research needs.

Conceptual or mixed outputs may begin with `What this is`, `Core concepts`, `Principles and decision rules`, and `Worked examples` before implementation phases.

### Provenance preservation
Source metadata now flows through the uploaded-file model in `src/lib/markdown-parser.ts`, `src/app/page.tsx`, `src/components/DropZone.tsx`, and `src/components/FileList.tsx`.

- `sourceType` and `sourceUrl` are optional file fields.
- Concatenated source context includes source type and URL where available.
- YouTube imports retain a canonical watch URL.
- YouTube transcript segments include `[HH:MM:SS]` markers.
- PDFs are marked as PDF sources, but page numbers are not fabricated because the current parser returns flattened text only.

### Large-source chunking
Added `src/lib/chunker.ts` with `splitMarkdownIntoChunks()` and a default target of `120,000` characters.

- Sources under the target remain one `Full source` chunk.
- Larger Markdown is split at headings when possible.
- Oversized sections are split at paragraph boundaries.
- Oversized paragraphs fall back to hard character boundaries.
- Each chunk has `index`, `title`, `content`, and `characters`.

`src/app/page.tsx` now:

- detects large uploaded or retrieved sources;
- offers `60k`, `120k`, and `240k` chunk sizes;
- displays detected section titles and character counts;
- lets the user select a section to generate;
- sends the selected chunk to both `/api/generate` and `/api/refine`;
- resets selection to the first chunk when chunk sizing or source content changes.

This is intentionally one-chunk-at-a-time. It does not yet combine chapter plans into a book-level synthesis.

## Existing Relevant Architecture

- `src/app/api/generate/route.ts`: validates request and calls `generateActionPlan()`.
- `src/app/api/refine/route.ts`: revises an existing plan with feedback.
- `src/lib/ai-clients.ts`: provider calls, JSON repair, response validation, and `MasterActionPlan` type.
- `src/lib/prompt.ts`: system presets and user prompt builders.
- `src/lib/markdown-parser.ts`: source concatenation.
- `src/app/api/parse-pdf/route.ts`: PDF to flattened text.
- `src/app/api/transcript/route.ts`: YouTube title and transcript extraction.
- `src/app/api/knowledge-search/route.ts`: Pinecone retrieval and chunk formatting.
- `src/components/ActionPlan.tsx`: output rendering, milestone state, and exports.

## Current Constraints

- No automated test suite exists.
- The application response schema has not been expanded with structured knowledge objects.
- PDF page-level provenance is not currently available from the parser response.
- KB retrieval uses ranked Pinecone chunks with title/source/text/doc type/section metadata, but generation still receives a formatted Markdown string.
- Large sources are selected and generated individually; there is no orchestration or synthesis pass.
- The full `npm run lint` command sees generated `chrome_profile_notebooklm/` files and reports unrelated errors/warnings from those artifacts.
- `npm run build` is currently blocked when Next.js tries to fetch Google Fonts without network access.
