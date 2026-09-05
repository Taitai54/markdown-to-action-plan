# Validation Record

## Passed

- `npx tsc --noEmit`
- `npx eslint src/lib/prompt.ts`
- `npx eslint src/lib/markdown-parser.ts src/app/page.tsx src/components/DropZone.tsx src/components/FileList.tsx src/app/api/transcript/route.ts`
- `npx eslint src/lib/chunker.ts src/app/page.tsx`
- `npx eslint src`
- Static prompt contract check for file and KB prompt requirements.
- Static provenance contract check for source fields, source URL, and timestamp handling.
- Local development server responded with HTTP `200` at `http://localhost:3000` after the chunking changes.

## Not Fully Passing

- `npm run lint` reports generated Chrome profile diagnostics under `chrome_profile_notebooklm/`. These are unrelated to the application changes and include `no-this-alias` errors in generated browser files.
- `npm run build` is blocked because `next/font` attempts to download Geist and Geist Mono from Google Fonts while network access is unavailable. This is an existing environment/build dependency issue, not a TypeScript error from the chunking changes.
- A TypeScript smoke script using `tsx` could not run because npm attempted to fetch `tsx` and received HTTP `403`; no dependency was added.

## Manual Test Plan

1. Open `http://localhost:3000`.
2. Upload a small Markdown file under `120k` characters. Confirm no chunk selector appears and generation uses the full source.
3. Upload a long Markdown file with headings such as `# Chapter 1`, `# Chapter 2`, and `# Chapter 3`. Confirm the large-source panel appears with section names and character counts.
4. Change chunk size from `120k` to `60k`. Confirm the chunk list recalculates and selection returns to the first chunk.
5. Select a later chapter and generate. Confirm the request succeeds and the output focuses on the selected section.
6. Use `Ask for improvements` on that plan. Confirm refinement uses the selected section rather than the entire source.
7. Import a YouTube transcript. Confirm the uploaded file shows `YouTube transcript`; inspect the generated source context or prompt and confirm the canonical YouTube URL and `[HH:MM:SS]` markers are present.
8. Upload a PDF. Confirm it is marked `PDF`. Do not expect page numbers yet.
9. Run the evaluation in [practical-knowledge-evaluation.md](../practical-knowledge-evaluation.md) against a conceptual source and a code source.
