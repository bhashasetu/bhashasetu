import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);
  const pageSlug = url.searchParams.get("slug");

  const { data, error } = pageSlug
    ? await supabase.from("pages").select("*").eq("slug", pageSlug).single()
    : await supabase
        .from("pages")
        .select("*")
        .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const { user, error: authError } = await requireAdmin();
  if (authError) return authError;

  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("pages")
    .insert({
      ...body,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
