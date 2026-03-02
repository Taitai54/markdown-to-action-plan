import { NextResponse } from "next/server";
import { getAvailableProviders } from "@/lib/ai-clients";

export async function GET() {
  return NextResponse.json({ providers: getAvailableProviders() });
}
