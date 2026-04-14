import { NextResponse } from "next/server";
import { getAvailableProviders, getConfiguredProviders } from "@/lib/ai-clients";

export async function GET() {
  return NextResponse.json({
    providers: getConfiguredProviders(),
    allProviders: getAvailableProviders(),
  });
}
