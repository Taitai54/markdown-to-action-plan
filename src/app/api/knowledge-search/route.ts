import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // first request downloads ~330 MB ONNX model

const PINECONE_API_KEY = process.env.PINECONE_API_KEY ?? "";
const PINECONE_INDEX = process.env.PINECONE_INDEX ?? "peace";

interface KbChunk {
  id: string;
  score: number;
  title: string;
  source: string;
  text: string;
  docType: string;
  section: string;
}

// Module-level singletons — survive across requests in the same Node.js process
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _extractor: any = null;
let _host: string | null = null;

async function getExtractor() {
  if (!_extractor) {
    console.log("[knowledge-search] Loading embedding model (first request only — may take a few minutes)…");
    const { pipeline } = await import("@xenova/transformers");
    _extractor = await pipeline("feature-extraction", "Xenova/multilingual-e5-large");
    console.log("[knowledge-search] Embedding model ready.");
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

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { query, namespace, topK = 8 } = (body ?? {}) as {
    query?: string;
    namespace?: string;
    topK?: number;
  };

  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }
  if (!namespace || typeof namespace !== "string") {
    return NextResponse.json({ error: "namespace is required" }, { status: 400 });
  }
  if (!PINECONE_API_KEY) {
    return NextResponse.json({ error: "PINECONE_API_KEY not set in environment" }, { status: 500 });
  }

  // Embed locally in Node.js — zero Pinecone credits
  const extractor = await getExtractor();
  const output = await extractor(`query: ${query}`, { pooling: "mean", normalize: true });
  const vector: number[] = Array.from(output.data as Float32Array);

  // Query Pinecone classic vector endpoint with the pre-computed embedding
  const host = await getHost();
  const pineconeResp = await fetch(`${host}/query`, {
    method: "POST",
    headers: {
      "Api-Key": PINECONE_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      vector,
      top_k: topK,
      includeMetadata: true,
      namespace,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!pineconeResp.ok) {
    const text = await pineconeResp.text();
    return NextResponse.json(
      { error: `Pinecone error ${pineconeResp.status}: ${text.slice(0, 300)}` },
      { status: 500 }
    );
  }

  const pineconeData = (await pineconeResp.json()) as {
    matches?: Array<{
      id: string;
      score: number;
      metadata?: Record<string, string>;
    }>;
  };

  const chunks: KbChunk[] = (pineconeData.matches ?? []).map((m) => {
    const meta = m.metadata ?? {};
    return {
      id: m.id ?? "",
      score: m.score ?? 0,
      title: meta.title ?? meta.source ?? m.id ?? "Source",
      source: meta.source ?? "",
      text: meta.text ?? "",
      docType: meta.doc_type ?? "",
      section: meta.section ?? "",
    };
  });

  const markdown =
    chunks.length > 0
      ? chunks
          .map((c) => `## ${c.title} (relevance: ${c.score.toFixed(3)})\n\n${c.text}`)
          .join("\n\n---\n\n")
      : "No results found for the given query and namespace.";

  return NextResponse.json({ markdown, chunks });
}
