import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAvailableProviders } from "@/lib/media/image-providers";

/**
 * Which image providers are configured on the server.
 *
 * The Back Office previously read process.env.OPENAI_API_KEY directly in a
 * client component, where it is always undefined — so it always claimed no
 * provider was configured. Server keys are never exposed; only a boolean per
 * provider crosses the wire (CLAUDE.md section 19).
 */
export async function GET() {
  const check = await requireAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  return NextResponse.json({ providers: getAvailableProviders() });
}
