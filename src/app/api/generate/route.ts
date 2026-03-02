import { NextRequest, NextResponse } from "next/server";
import { generateActionPlan, Provider, getAvailableProviders } from "@/lib/ai-clients";

export async function POST(req: NextRequest) {
  try {
    const { markdown, provider } = (await req.json()) as {
      markdown: string;
      provider: Provider;
    };

    if (!markdown || !provider) {
      return NextResponse.json(
        { error: "Missing markdown or provider" },
        { status: 400 }
      );
    }

    const available = getAvailableProviders();
    if (!available.includes(provider)) {
      return NextResponse.json(
        { error: `Provider "${provider}" is not configured` },
        { status: 400 }
      );
    }

    const result = await generateActionPlan(markdown, provider);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
