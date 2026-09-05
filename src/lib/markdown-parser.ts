export interface ParsedFile {
  name: string;
  size: number;
  content: string;
  sourceType?: string;
  sourceUrl?: string;
  /** Last modified time (ms since epoch) from file metadata, if available. */
  lastModified?: number;
}

export function concatenateMarkdown(files: ParsedFile[]): string {
  return files
    .map((f) => {
      const dateLine =
        f.lastModified != null
          ? `\n*Source last modified: ${formatDate(f.lastModified)}*\n`
          : "\n";
      const sourceType = f.sourceType ?? getSourceType(f.name);
      const sourceUrl = f.sourceUrl ? `\n*Source URL: ${f.sourceUrl}*` : "";
      return `# ${f.name}\n*Source type: ${sourceType}*${sourceUrl}${dateLine}\n${f.content}`;
    })
    .join("\n\n---\n\n");
}

function getSourceType(name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.startsWith("youtube:")) return "YouTube transcript";
  if (lowerName.endsWith(".pdf")) return "PDF";
  if (lowerName.endsWith(".md") || lowerName.endsWith(".markdown")) return "Markdown";
  if (lowerName.endsWith(".txt")) return "Plain text";
  if (lowerName.endsWith(".csv")) return "CSV";
  return "Imported document";
}

function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
