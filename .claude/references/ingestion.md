# Input ingestion (PDF / YouTube)

PDFs go through `/api/parse-pdf`: FormData upload → `pdf-parse` → `{ text }`. `pdf-parse` is CommonJS, so it must stay listed in `serverExternalPackages` in `next.config.ts` — if you add another CJS-only parsing dependency, it needs the same treatment.

YouTube URLs go through `/api/transcript`: oEmbed fetch for the title + `@danielxceron/youtube-transcript` for the transcript → `{ title, transcript }`.
