export interface ParsedFile {
  name: string;
  size: number;
  content: string;
}

export function concatenateMarkdown(files: ParsedFile[]): string {
  return files
    .map((f) => `# ${f.name}\n\n${f.content}`)
    .join("\n\n---\n\n");
}
