export interface ParsedFile {
  name: string;
  size: number;
  content: string;
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
      return `# ${f.name}${dateLine}\n${f.content}`;
    })
    .join("\n\n---\n\n");
}

function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
