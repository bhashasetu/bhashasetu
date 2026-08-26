import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  adminCheckFailureResponse,
  badRequest,
  notFound,
  serverError,
} from "@/lib/api/respond";
import { learningEntryInputSchema } from "@/lib/validation/schemas";

const updateSchema = learningEntryInputSchema.partial();

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid learning entry input", parsed.error.flatten());
  }

  const { data, error } = await check.supabase
    .from("learning_entries")
    .update({ ...parsed.data, updated_by: check.user.id })
    .eq("id", id)
    .select()
    .single();

  if (error) return serverError(error.message);
  if (!data) return notFound("Learning entry not found");
  return NextResponse.json({ data });
}

/**
 * Archive an entry. This used to hard-delete the row.
 *
 * A verified word is the product of someone sitting with a speaker and
 * checking it; deleting it also orphans its verification_audit_log history
 * and silently drops it out of anything published. Archiving keeps the record
 * and the audit trail, and is reversible.
 *
 * The status route owns transitions and writes the audit row, so this defers
 * to it rather than updating status directly.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);
  const { id } = await params;

  const { data: entry } = await check.supabase
    .from("learning_entries")
    .select("id, status")
    .eq("id", id)
    .single();

  if (!entry) return notFound("Learning entry not found");
  if (entry.status === "archived") {
    return NextResponse.json({ data: { id, status: "archived" } });
  }

  const { error } = await check.supabase
    .from("learning_entries")
    .update({ status: "archived", updated_by: check.user.id })
    .eq("id", id);

  if (error) return serverError(error.message);

  const { error: auditError } = await check.supabase
    .from("verification_audit_log")
    .insert({
      learning_entry_id: id,
      old_status: entry.status,
      new_status: "archived",
      verified_by: check.user.id,
      notes: "Archived from the Words & Phrases list.",
    });

  if (auditError) return serverError(auditError.message);

  return NextResponse.json({ data: { id, status: "archived" } });
}
