import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * Server-side auth guard for every page under admin/(protected).
 * Uses getUser() (re-validates the token against Supabase) rather than
 * trusting an unverified session cookie. This guard does NOT protect
 * /api/admin/* routes — each of those independently verifies the user
 * via requireAdmin() (src/lib/auth/require-admin.ts).
 */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/admin/login");
  }

  const { data: adminRecord } = await supabase
    .from("back_office_users")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!adminRecord || adminRecord.role !== "admin" || !adminRecord.is_active) {
    redirect("/admin/login");
  }

  return (
    <AdminShell title="Bhasha Setu Admin" email={user.email}>
      {children}
    </AdminShell>
  );
}
