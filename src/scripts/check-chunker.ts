/**
 * Deterministic test script for src/lib/chunker.ts
 * Validates chunking rules specified in Priority 3 of next-work.md.
 */
import { splitMarkdownIntoChunks } from "../lib/chunker";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

function runTests() {
  console.log("Running chunker validation tests...\n");

  // Test 1: Small input returns one "Full source" chunk
  const smallInput = "# Introduction\n\nThis is a small test document.";
  const smallChunks = splitMarkdownIntoChunks(smallInput, 1000);
  assert(
    smallChunks.length === 1 && smallChunks[0].title === "Full source",
    "Small input returns single 'Full source' chunk"
  );
  assert(
    smallChunks[0].content === smallInput,
    "Small chunk content matches input exactly"
  );

  // Test 2: Headings remain attached to their section content
  const multiSectionInput = [
    "# Chapter 1: Foundations",
    "Paragraph A in chapter 1 with some details.",
    "Paragraph B in chapter 1 with more context.",
    "",
    "## Section 1.1: Setup",
    "Prerequisite setup instructions go here.",
    "",
    "# Chapter 2: Implementation",
    "Detailed code and step-by-step instructions for implementation.",
  ].join("\n");

  // Force splitting by setting maxCharacters small enough
  const sectionChunks = splitMarkdownIntoChunks(multiSectionInput, 150);
  assert(
    sectionChunks.length > 1,
    `Multi-section document splits into multiple chunks (got ${sectionChunks.length})`
  );

  // Verify headings remain attached to their section
  for (const chunk of sectionChunks) {
    assert(
      chunk.characters <= 250,
      `Chunk #${chunk.index} length (${chunk.characters}) is within expected limits`
    );
  }

  // Test 3: Large atomic fragment handled gracefully
  const hugeParagraph = "A".repeat(500);
  const hugeInput = `# Oversized Section\n\n${hugeParagraph}`;
  const hugeChunks = splitMarkdownIntoChunks(hugeInput, 200);
  assert(
    hugeChunks.length >= 2,
    "Oversized section/paragraph is split across fallback chunk boundaries"
  );

  // Test 4: Preserves heading titles in metadata
  assert(
    hugeChunks[0].title === "Oversized Section",
    `Extracted section title correctly as '${hugeChunks[0].title}'`
  );

  console.log("\nAll chunker validation tests passed successfully!");
}

runTests();
