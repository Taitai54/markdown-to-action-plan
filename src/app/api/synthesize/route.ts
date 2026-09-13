import { NextRequest, NextResponse } from "next/server";
import {
  generateActionPlan,
  Provider,
  getAvailableProviders,
  getConfiguredProviders,
  MasterActionPlan,
} from "@/lib/ai-clients";
import { requireApiSecret } from "@/lib/api-auth";
import { buildBookSynthesisUserPrompt } from "@/lib/prompt";

export async function POST(req: NextRequest) {
  const authError = requireApiSecret(req);
  if (authError) return authError;

  try {
    const {
      chapterPlans,
      provider,
      modelOverride,
    } = (await req.json()) as {
      chapterPlans: Array<{ chunkTitle: string; plan: MasterActionPlan }>;
      provider: Provider;
      modelOverride?: string;
    };

    if (!Array.isArray(chapterPlans) || chapterPlans.length === 0 || !provider) {
      return NextResponse.json(
        { error: "Missing chapterPlans array or provider" },
        { status: 400 }
      );
    }

    const knownProviders = getAvailableProviders();
    if (!knownProviders.includes(provider)) {
      return NextResponse.json(
        { error: `Unknown provider "${provider}"` },
        { status: 400 }
      );
    }

    const configuredProviders = getConfiguredProviders();
    if (!configuredProviders.includes(provider)) {
      return NextResponse.json(
        { error: `Provider "${provider}" is not configured` },
        { status: 400 }
      );
    }

    const userPrompt = buildBookSynthesisUserPrompt(chapterPlans);

    const result = await generateActionPlan(
      JSON.stringify(chapterPlans),
      provider,
      {
        userPromptOverride: userPrompt,
        systemPromptPresetId: "book-synthesis",
        modelOverride: modelOverride != null && modelOverride !== "" ? modelOverride : undefined,
      }
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
