import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Debug endpoint for admin login issues
 * Checks all components of the authentication flow
 */
export async function GET(request: Request) {
  const debug = {
    timestamp: new Date().toISOString(),
    checks: [] as any[],
    environment: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT SET",
    },
  };

  // Check 1: Supabase client initialization
  try {
    const supabase = await createClient();
    debug.checks.push({
      check: "Supabase client initialization",
      status: "OK",
      message: "Server-side Supabase client created successfully",
    });
  } catch (error) {
    debug.checks.push({
      check: "Supabase client initialization",
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(debug);
  }

  // Check 2: Get current session
  try {
    const supabase = await createClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      debug.checks.push({
        check: "Get current session",
        status: "ERROR",
        error: sessionError.message,
      });
    } else {
      debug.checks.push({
        check: "Get current session",
        status: session ? "ACTIVE" : "NO_SESSION",
        message: session
          ? `Session active for user: ${session.user.email}`
          : "No active session",
        sessionUser: session?.user.email || null,
      });
    }
  } catch (error) {
    debug.checks.push({
      check: "Get current session",
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Check 3: back_office_users table exists
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("back_office_users")
      .select("count")
      .limit(1);

    if (error) {
      debug.checks.push({
        check: "back_office_users table access",
        status: "ERROR",
        error: error.message,
      });
    } else {
      debug.checks.push({
        check: "back_office_users table access",
        status: "OK",
        message: "Table exists and is readable",
      });
    }
  } catch (error) {
    debug.checks.push({
      check: "back_office_users table access",
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Check 4: List all users in back_office_users
  try {
    const supabase = await createClient();
    const { data: users, error } = await supabase
      .from("back_office_users")
      .select("id, email, role, is_active");

    if (error) {
      debug.checks.push({
        check: "List back_office_users",
        status: "ERROR",
        error: error.message,
      });
    } else {
      debug.checks.push({
        check: "List back_office_users",
        status: "OK",
        userCount: users?.length || 0,
        users: users?.map((u) => ({
          email: u.email,
          role: u.role,
          is_active: u.is_active,
        })) || [],
      });
    }
  } catch (error) {
    debug.checks.push({
      check: "List back_office_users",
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Check 5: Test RLS policy on back_office_users
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      debug.checks.push({
        check: "RLS policy test",
        status: "NO_AUTH",
        message: "No authenticated user - cannot test RLS",
      });
    } else {
      const { data, error } = await supabase
        .from("back_office_users")
        .select("*")
        .eq("id", user.id);

      debug.checks.push({
        check: "RLS policy test (query own record)",
        status: error ? "ERROR" : "OK",
        message: error
          ? `RLS blocked: ${error.message}`
          : `Found ${data?.length || 0} record(s)`,
        error: error?.message || null,
      });
    }
  } catch (error) {
    debug.checks.push({
      check: "RLS policy test",
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Check 6: Test auth.users table access (via admin)
  try {
    const supabase = await createClient();
    const { data: authUsers, error } = await supabase.auth.admin.listUsers();

    if (error) {
      debug.checks.push({
        check: "auth.users table (admin access)",
        status: "ERROR",
        error: error.message,
        message:
          "Admin access to auth.users failed - OPENAI_API_KEY not configured as admin service role",
      });
    } else {
      debug.checks.push({
        check: "auth.users table (admin access)",
        status: "OK",
        userCount: authUsers?.users?.length || 0,
      });
    }
  } catch (error) {
    debug.checks.push({
      check: "auth.users table (admin access)",
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return NextResponse.json(debug, { status: 200 });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Missing email or password" },
      { status: 400 }
    );
  }

  const debug = {
    timestamp: new Date().toISOString(),
    email,
    steps: [] as any[],
  };

  try {
    const supabase = await createClient();

    // Step 1: Attempt sign-in
    const { data: authData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      debug.steps.push({
        step: "Sign-in attempt",
        status: "FAILED",
        error: signInError.message,
      });
      return NextResponse.json(debug);
    }

    debug.steps.push({
      step: "Sign-in attempt",
      status: "SUCCESS",
      userId: authData.user?.id,
    });

    // Step 2: Get user
    const { data: userData, error: getUserError } =
      await supabase.auth.getUser();

    if (getUserError) {
      debug.steps.push({
        step: "Get authenticated user",
        status: "FAILED",
        error: getUserError.message,
      });
      return NextResponse.json(debug);
    }

    debug.steps.push({
      step: "Get authenticated user",
      status: "SUCCESS",
      userId: userData.user?.id,
    });

    // Step 3: Check back_office_users record
    const { data: adminRecord, error: adminError } = await supabase
      .from("back_office_users")
      .select("*")
      .eq("id", userData.user!.id)
      .single();

    if (adminError) {
      debug.steps.push({
        step: "Query back_office_users",
        status: "FAILED",
        error: adminError.message,
        hint: "RLS policy may be blocking this query",
      });
      return NextResponse.json(debug);
    }

    if (!adminRecord) {
      debug.steps.push({
        step: "Query back_office_users",
        status: "NOT_FOUND",
        message: "User exists in auth but not in back_office_users",
      });
      return NextResponse.json(debug);
    }

    debug.steps.push({
      step: "Query back_office_users",
      status: "FOUND",
      record: {
        role: adminRecord.role,
        is_active: adminRecord.is_active,
      },
    });

    // Step 4: Verify admin status
    if (adminRecord.role !== "admin") {
      debug.steps.push({
        step: "Check admin role",
        status: "FAILED",
        role: adminRecord.role,
        message: "User is not an admin",
      });
      return NextResponse.json(debug);
    }

    if (!adminRecord.is_active) {
      debug.steps.push({
        step: "Check is_active",
        status: "FAILED",
        is_active: adminRecord.is_active,
        message: "Admin account is inactive",
      });
      return NextResponse.json(debug);
    }

    debug.steps.push({
      step: "Verify admin privileges",
      status: "SUCCESS",
      message: "User can access admin dashboard",
    });

    return NextResponse.json(debug);
  } catch (error) {
    debug.steps.push({
      step: "Unknown error",
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(debug);
  }
}
