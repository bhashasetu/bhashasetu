import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse, badRequest } from "@/lib/api/respond";
import { ping } from "@/lib/chat/sarvam";
import { isSarvamConfigured } from "@/lib/chat/config";
import { chatModelValues } from "@/lib/validation/schemas";

/**
 * One real call to Sarvam, and the unedited result.
 *
 * Whether this account can reach a given model is not something the code can
 * know, so this asks: press it, and read what the provider actually said.
 *
 * Admin-only, and the provider's message is returned verbatim because that is
 * the point. The key is never included: it goes in a header and is never read
 * back out.
 */
export async function POST(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  if (!isSarvamConfigured()) {
    return badRequest("SARVAM_API_KEY is not set in this environment.");
  }

  const body = await request.json().catch(() => null);
  const model = typeof body?.model === "string" ? body.model.trim() : "";
  if (!model) return badRequest("Choose a model first, then test.");
  // Not merely validation: each model has its own endpoint, so one outside this
  // list has nowhere to be sent. Refused here rather than billed for a 404.
  if (!(chatModelValues as readonly string[]).includes(model)) {
    return badRequest(`This build cannot reach "${model}".`);
  }

  const started = Date.now();
  const result = await ping(model);
  const ms = Date.now() - started;

  if (!result.ok) {
    return NextResponse.json({
      data: {
        ok: false,
        status: result.status,
        detail: result.detail || "No detail returned.",
        ms,
      },
    });
  }

  return NextResponse.json({
    data: { ok: true, reply: result.value.slice(0, 200), ms },
  });
}
