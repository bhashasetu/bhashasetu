import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  adminCheckFailureResponse,
  badRequest,
  notFound,
  serverError,
} from "@/lib/api/respond";
import { statusTransitionSchema } from "@/lib/validation/schemas";

/**
 * Allowed forward transitions for a learning entry's editorial workflow.
 * 'archived' is reachable from any active status as a direct shortcut.
 *
 * Publishing an entry here does NOT touch media_assets or media_links —
 * media has its own independent publication lifecycle (governance Point 9).
 */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["pending_verification", "archived"],
  pending_verification: ["verified", "draft", "archived"],
  verified: ["published", "archived"],
  published: ["archived"],
  archived: [],
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = statusTransitionSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid status transition input", parsed.error.flatten());
  }
  const { status: newStatus, notes } = parsed.data;

  const { data: entry, error: fetchError } = await check.supabase
    .from("learning_entries")
    .select("id, status")
    .eq("id", id)
    .single();

  if (fetchError || !entry) return notFound("Learning entry not found");

  const allowed = ALLOWED_TRANSITIONS[entry.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return badRequest(
      `Cannot transition learning entry from '${entry.status}' to '${newStatus}'`
    );
  }

  const updates: Record<string, unknown> = { status: newStatus };
  if (newStatus === "verified") {
    updates.verified = true;
    updates.verified_by = check.user.id;
    updates.verified_at = new Date().toISOString();
  }
  if (newStatus === "published") {
    updates.published_at = new Date().toISOString();
  }

  const { data: updated, error: updateError } = await check.supabase
    .from("learning_entries")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateError) return serverError(updateError.message);

  const { error: auditError } = await check.supabase
    .from("verification_audit_log")
    .insert({
      learning_entry_id: id,
      old_status: entry.status,
      new_status: newStatus,
      verified_by: check.user.id,
      notes: notes ?? null,
    });

  if (auditError) return serverError(auditError.message);

  return NextResponse.json({ data: updated });
}
