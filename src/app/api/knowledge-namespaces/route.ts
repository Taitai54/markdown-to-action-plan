import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";

const PINECONE_API_KEY = process.env.PINECONE_API_KEY ?? "";
const PINECONE_INDEX = process.env.PINECONE_INDEX ?? "peace";

export async function GET() {
  if (!PINECONE_API_KEY) {
    return NextResponse.json(
      { error: "PINECONE_API_KEY not configured", namespaces: [] },
      { status: 200 } // 200 so the UI can handle it gracefully
    );
  }

  try {
    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    const indexInfo = await pinecone.describeIndex(PINECONE_INDEX);
    const index = pinecone.index(PINECONE_INDEX, indexInfo.host);
    const stats = await index.describeIndexStats();

    const namespaces = Object.keys(stats.namespaces ?? {})
      .filter((ns) => ns !== "")
      .sort();

    return NextResponse.json({ namespaces });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch namespaces";
    return NextResponse.json({ error: message, namespaces: [] }, { status: 200 });
  }
}
