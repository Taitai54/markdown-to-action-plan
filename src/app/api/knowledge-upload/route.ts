import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const maxDuration = 300; // Allow time to embed & upload multiple chunks

const PINECONE_API_KEY = process.env.PINECONE_API_KEY ?? "";
const PINECONE_INDEX = process.env.PINECONE_INDEX ?? "peace";

interface UploadChunkInput {
  title?: string;
  section?: string;
  text: string;
  docType?: string;
  source?: string;
  tags?: string[];
}

// Module-level singletons
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _extractor: any = null;
let _host: string | null = null;

async function getExtractor() {
  if (!_extractor) {
    console.log("[knowledge-upload] Loading local embedding model (Xenova/multilingual-e5-large)…");
    const { pipeline } = await import("@xenova/transformers");
    _extractor = await pipeline("feature-extraction", "Xenova/multilingual-e5-large");
    console.log("[knowledge-upload] Local embedding model ready.");
  }
  return _extractor;
}

async function getHost(): Promise<string> {
  if (!_host) {
    const { Pinecone } = await import("@pinecone-database/pinecone");
    const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
    const info = await pc.describeIndex(PINECONE_INDEX);
    const raw = info.host;
    _host = raw.startsWith("http") ? raw : `https://${raw}`;
  }
  return _host;
}

function formatEmbedText(title?: string, section?: string, text?: string): string {
  const headers: string[] = [];
  if (title) headers.push(title);
  if (section) headers.push(section);
  const headerStr = headers.length > 0 ? `[${headers.join(" | ")}]\n` : "";
  return `passage: ${headerStr}${text || ""}`;
}

function sanitizeText(str: string): string {
  return str.replace(/[\uFFFD\uFFFE\uFFFF]/g, "");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { namespace, chunks } = (body ?? {}) as {
    namespace?: string;
    chunks?: UploadChunkInput[];
  };

  if (!namespace || typeof namespace !== "string" || !namespace.trim()) {
    return NextResponse.json({ error: "namespace is required" }, { status: 400 });
  }
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return NextResponse.json({ error: "chunks array is required and must not be empty" }, { status: 400 });
  }
  if (!PINECONE_API_KEY) {
    return NextResponse.json(
      { error: "PINECONE_API_KEY is not configured in .env.local" },
      { status: 500 }
    );
  }

  try {
    const extractor = await getExtractor();
    const host = await getHost();
    const targetNamespace = namespace.trim();
    const uploadedAt = Math.floor(Date.now() / 1000);

    const vectorsToUpsert = [];

    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      if (!c.text || !c.text.trim()) continue;

      const cleanText = sanitizeText(c.text.trim());
      const embedInput = formatEmbedText(c.title, c.section, cleanText);

      // Embed locally using multilingual-e5-large (1024 dims)
      const output = await extractor(embedInput, { pooling: "mean", normalize: true });
      const vector: number[] = Array.from(output.data as Float32Array);

      // Deterministic ID by hashing clean content (matches pinecone-management behavior)
      const uid = crypto.createHash("sha1").update(cleanText).digest("hex").slice(0, 24);

      const metadata: Record<string, string | number> = {
        text: cleanText,
        title: c.title || "Untitled",
        source: c.source || c.title || "Uploaded Document",
        doc_type: c.docType || "book",
        chunk_index: i,
        chunk_count: chunks.length,
        timestamp: uploadedAt,
        uploaded_at: uploadedAt,
      };

      if (c.section) metadata.section = c.section;
      if (Array.isArray(c.tags) && c.tags.length > 0) {
        metadata.tags = c.tags.join(",");
      }

      vectorsToUpsert.push({
        id: uid,
        values: vector,
        metadata,
      });
    }

    if (vectorsToUpsert.length === 0) {
      return NextResponse.json({ error: "No valid text chunks to embed" }, { status: 400 });
    }

    // Upsert in batches of 96 to adhere to Pinecone limits
    const BATCH_SIZE = 96;
    let upsertedCount = 0;

    for (let i = 0; i < vectorsToUpsert.length; i += BATCH_SIZE) {
      const batch = vectorsToUpsert.slice(i, i + BATCH_SIZE);
      const pineconeResp = await fetch(`${host}/vectors/upsert`, {
        method: "POST",
        headers: {
          "Api-Key": PINECONE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vectors: batch,
          namespace: targetNamespace,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!pineconeResp.ok) {
        const text = await pineconeResp.text();
        throw new Error(`Pinecone upsert failed (HTTP ${pineconeResp.status}): ${text.slice(0, 300)}`);
      }

      const resData = (await pineconeResp.json()) as { upsertedCount?: number };
      upsertedCount += resData.upsertedCount ?? batch.length;
    }

    return NextResponse.json({
      success: true,
      count: upsertedCount,
      namespace: targetNamespace,
      index: PINECONE_INDEX,
    });
  } catch (err) {
    console.error("[knowledge-upload] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to upload vectors to Pinecone" },
      { status: 500 }
    );
  }
}
