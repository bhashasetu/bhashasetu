import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pages")
    .select(
      `
      *,
      page_sections(
        *,
        media_slots(
          *,
          generation_prompts(*),
          slot_media_assignments(*, media_asset:media_assets(*))
        ),
        page_content(*)
      )
      `
    )
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { user, error: authError } = await requireAdmin();
  if (authError) return authError;

  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("pages")
    .update({
      ...body,
      updated_by: user.id,
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const supabase = await createClient();

  const { error } = await supabase.from("pages").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
