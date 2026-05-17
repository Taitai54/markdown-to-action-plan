import { NextRequest, NextResponse } from "next/server";

/**
 * When GENERATE_API_SECRET is set, POST routes require matching
 * `x-api-secret` or `Authorization: Bearer <secret>`.
 * Unset secret = local dev mode (no auth).
 */
export function requireApiSecret(req: NextRequest): NextResponse | null {
  const secret = process.env.GENERATE_API_SECRET?.trim();
  if (!secret) return null;

  const headerSecret = req.headers.get("x-api-secret")?.trim();
  const auth = req.headers.get("authorization");
  const bearer =
    auth?.startsWith("Bearer ") ? auth.slice(7).trim() : undefined;

  if (headerSecret === secret || bearer === secret) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
