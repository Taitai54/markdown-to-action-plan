export interface SourceChunk {
  index: number;
  title: string;
  content: string;
  characters: number;
}

export const DEFAULT_CHUNK_CHARS = 120_000;

export function splitMarkdownIntoChunks(
  markdown: string,
  maxCharacters = DEFAULT_CHUNK_CHARS
): SourceChunk[] {
  if (!markdown.trim()) return [];
  if (markdown.length <= maxCharacters) {
    return [{ index: 0, title: "Full source", content: markdown, characters: markdown.length }];
  }

  const sections = splitAtHeadings(markdown);
  const chunks: SourceChunk[] = [];
  let current = "";
  let currentTitle = "Full source";

   for (const section of sections) {
     if (section.length > maxCharacters) {
       if (current) {
         chunks.push(makeChunk(chunks.length, currentTitle, current));
         current = "";
       }

       const sectionTitle = extractTitle(section);
       const headingMatch = section.match(/^(#{1,6}\s+.+?)(?:\n\s*\n|\n|$)/);
       const heading = headingMatch ? headingMatch[1] : "";
       const headingEndIndex = headingMatch ? headingMatch[0].length : 0;
       const body = section.slice(headingEndIndex).replace(/^\n+/, "");

       const paragraphChunks = splitAtParagraphs(body, maxCharacters);

       if (paragraphChunks.length === 0) {
         chunks.push(makeChunk(chunks.length, sectionTitle, section));
       } else {
         for (let i = 0; i < paragraphChunks.length; i++) {
           const content =
             i === 0 && heading ? `${heading}\n\n${paragraphChunks[i]}` : paragraphChunks[i];
           chunks.push(makeChunk(chunks.length, sectionTitle, content));
         }
       }
       continue;
     }

    if (current && current.length + section.length + 2 > maxCharacters) {
      chunks.push(makeChunk(chunks.length, currentTitle, current));
      current = "";
    }

    if (!current) currentTitle = extractTitle(section);
    current = current ? `${current}\n\n${section}` : section;
  }

  if (current) chunks.push(makeChunk(chunks.length, currentTitle, current));
  return chunks;
}

function splitAtHeadings(markdown: string): string[] {
  const sections: string[] = [];
  let current = "";

  for (const line of markdown.split("\n")) {
    if (/^#{1,6}\s+/.test(line) && current.trim()) {
      sections.push(current.trim());
      current = line;
    } else {
      current += current ? `\n${line}` : line;
    }
  }

  if (current.trim()) sections.push(current.trim());
  return sections;
}

function splitAtParagraphs(text: string, maxCharacters: number): string[] {
  const paragraphs = text.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxCharacters) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let start = 0; start < paragraph.length; start += maxCharacters) {
        chunks.push(paragraph.slice(start, start + maxCharacters));
      }
    } else if (current && current.length + paragraph.length + 2 > maxCharacters) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function extractTitle(section: string): string {
  const heading = section.match(/^#{1,6}\s+(.+)$/m);
  return heading?.[1]?.trim() || "Untitled section";
}

function makeChunk(index: number, title: string, content: string): SourceChunk {
  return { index, title, content, characters: content.length };
}
