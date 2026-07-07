import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";

const PINECONE_API_KEY = process.env.PINECONE_API_KEY ?? "";
const PINECONE_INDEX = process.env.PINECONE_INDEX ?? "peace";

export async function GET() {
  if (!PINECONE_API_KEY) {
    return NextResponse.json({ error: "PINECONE_API_KEY not configured" }, { status: 500 });
  }
  try {
    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    const info = await pinecone.describeIndex(PINECONE_INDEX);
    return NextResponse.json({
      name: info.name,
      dimension: info.dimension,
      metric: info.metric,
      host: info.host,
      embed: (info as unknown as Record<string, unknown>).embed ?? null,
      spec: info.spec,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
