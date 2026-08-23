import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AdminCheckResult =
  | { ok: true; user: User; supabase: SupabaseClient }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Verifies the caller is an authenticated Supabase user (via getUser(),
 * which re-validates the token against the Supabase server rather than
 * trusting an unverified session cookie) AND holds an active admin role
 * in back_office_users.
 *
 * Every /api/admin/* route must call this independently — the
 * admin/(protected) page layout does not protect API routes.
 */
export async function requireAdmin(): Promise<AdminCheckResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const { data: adminRecord, error: dbError } = await supabase
    .from("back_office_users")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (
    dbError ||
    !adminRecord ||
    adminRecord.role !== "admin" ||
    !adminRecord.is_active
  ) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, user, supabase };
}
