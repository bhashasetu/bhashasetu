import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS entirely.
 * Reserved for exceptional server-side operations only
 * (e.g. one-off admin bootstrap). Never use for routine
 * CRUD — routine operations must go through the
 * user-scoped server client so RLS applies.
 */
export function createAdminClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured. Set it in the Vercel project dashboard for this exceptional operation."
    );
  }

  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
