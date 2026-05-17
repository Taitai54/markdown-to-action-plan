/** Max characters for concatenated markdown sent to the LLM (override via env). */
export const MAX_MARKDOWN_CHARS = Number.parseInt(
  process.env.MAX_MARKDOWN_CHARS ?? "200000",
  10
);

/** Max HTML payload size for DOCX export (bytes, approximate via string length). */
export const MAX_DOCX_HTML_CHARS = Number.parseInt(
  process.env.MAX_DOCX_HTML_CHARS ?? "2000000",
  10
);

export function formatCharLimit(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}
