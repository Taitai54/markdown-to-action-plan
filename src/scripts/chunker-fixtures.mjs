import { splitMarkdownIntoChunks } from "../lib/chunker.ts";

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    console.error(`FAIL: ${message} — expected ${expected}, got ${actual}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${message}`);
  }
}

function rebuild(chunks) {
  return chunks.map((c) => c.content).join("\n\n");
}

console.log("=== Chunker Fixture Tests ===\n");

const small = "# Hello\n\nThis is a small document.\n";
const smallChunks = splitMarkdownIntoChunks(small, 120_000);
assert(smallChunks.length === 1, "small input returns one full-source chunk");
assert(smallChunks[0].title === "Full source", "single chunk title is 'Full source'");
assert(smallChunks[0].content === small, "single chunk content is original");
assertEqual(smallChunks[0].characters, small.length, "single chunk characters count matches");

const longWithHeadings = `# Chapter 1\n\nContent for chapter 1.`.padEnd(500, "x") +
  `\n\n# Chapter 2\n\nContent for chapter 2.`.padEnd(500, "y") +
  `\n\n# Chapter 3\n\nContent for chapter 3.`.padEnd(500, "z");

const headingChunks = splitMarkdownIntoChunks(longWithHeadings, 800);
assert(headingChunks.length >= 3, `headings split into at least 3 chunks (got ${headingChunks.length})`);

for (const chunk of headingChunks) {
  const lines = chunk.content.split("\n");
  const firstLine = lines[0];
  assert(firstLine.startsWith("# "), `chunk "${chunk.title}" starts with its heading`);
}

const rebuilt = rebuild(headingChunks);
assertEqual(rebuilt, longWithHeadings, "concatenating chunks preserves source content in order");

const target = 1_000;
const oversizedChunks = splitMarkdownIntoChunks(longWithHeadings, target);
for (const chunk of oversizedChunks) {
  if (chunk.title !== "Full source" && chunk.content.length > target) {
    assert(false, `chunk "${chunk.title}" exceeds target without being oversized heading/paragraph fallback`);
  }
}

const hugeParagraph = "word ".repeat(10_000);
const hugeInput = `# Title\n\n${hugeParagraph}`;
const hugeChunks = splitMarkdownIntoChunks(hugeInput, 500);
assert(hugeChunks.length > 1, "huge paragraph is split into multiple chunks");
for (let i = 0; i < hugeChunks.length; i++) {
  const chunk = hugeChunks[i];
  const allowance = i === 0 ? chunk.content.match(/^(#{1,6}\s+.+?)(?:\n\s*\n|\n|$)/)?.[0].length ?? 0 : 0;
  assert(chunk.content.length <= target + 2 + allowance, `oversized paragraph fallback chunk ${i} does not wildly exceed target (got ${chunk.content.length}, allowance ${allowance + 2})`);
}

const emptyInput = "";
const emptyChunks = splitMarkdownIntoChunks(emptyInput, 120_000);
assert(emptyChunks.length === 0, "empty input returns no chunks");

const onlyWhitespace = "   \n\n\t  ";
const wsChunks = splitMarkdownIntoChunks(onlyWhitespace, 120_000);
assert(wsChunks.length === 0, "whitespace-only input returns no chunks");

console.log("\n=== Tests Complete ===");
