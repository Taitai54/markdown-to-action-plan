import { NextResponse } from "next/server";

interface OpenRouterModel {
  id: string;
  name: string;
}

// OpenRouter's model catalog is public (no API key needed) and changes often —
// fetch it live so the picker always reflects every model OpenRouter currently offers,
// instead of a hand-maintained list that goes stale.
export async function GET() {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      next: { revalidate: 3600 }, // refresh at most once an hour
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenRouter models fetch failed (${res.status})` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { data?: OpenRouterModel[] };
    const models = (data.data ?? [])
      .map((m) => ({ id: m.id, label: m.name }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return NextResponse.json({ models });
  } catch (err) {
    console.error("OpenRouter models fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch OpenRouter models" },
      { status: 502 }
    );
  }
}
