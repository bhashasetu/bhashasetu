import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse, badRequest, serverError } from "@/lib/api/respond";
import { chatConfigInputSchema } from "@/lib/validation/schemas";
import { CHAT_CONFIG_COLUMNS } from "@/lib/chat/config";

export async function GET() {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const { data, error } = await check.supabase
    .from("chat_config")
    .select(CHAT_CONFIG_COLUMNS)
    .eq("id", 1)
    .single();

  if (error) return serverError(error.message);
  return NextResponse.json({ data });
}

export async function PUT(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const body = await request.json().catch(() => null);
  const parsed = chatConfigInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid chat settings", parsed.error.flatten());
  }

  // Sarvam is reached with a key held in the Vercel environment. Turning the
  // model on without one would leave the assistant failing every question it
  // could not answer from the database, which looks like a bug rather than a
  // missing setting — so it is refused here with the actual reason.
  if (parsed.data.llm_enabled && !process.env.SARVAM_API_KEY) {
    return badRequest(
      "SARVAM_API_KEY is not set in this environment, so the model cannot be reached."
    );
  }
  if (parsed.data.tts_enabled && !process.env.SARVAM_API_KEY) {
    return badRequest(
      "SARVAM_API_KEY is not set in this environment, so spoken answers cannot be produced."
    );
  }

  const { data, error } = await check.supabase
    .from("chat_config")
    .update({
      ...parsed.data,
      chat_model: parsed.data.chat_model?.trim() || null,
      updated_by: check.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select(CHAT_CONFIG_COLUMNS)
    .single();

  if (error) return serverError(error.message);
  return NextResponse.json({ data });
}
