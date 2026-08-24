import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * Bulk-update editorial copy for one page.
 *
 * The Homepage Content screen saves every changed field in a single call so a
 * partial failure cannot leave half a section updated. Each entry is addressed
 * by its page_content row id, which the editor already holds.
 */
const bodySchema = z.object({
  fields: z
    .array(
      z.object({
        id: z.string().uuid(),
        content: z.string().max(5000),
      })
    )
    .min(1)
    .max(200),
});

export async function PATCH(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status }
    );
  }

  const { supabase, user } = adminCheck;

  let parsed;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
            : "Invalid request body",
      },
      { status: 400 }
    );
  }

  const updatedAt = new Date().toISOString();

  for (const field of parsed.fields) {
    const { error } = await supabase
      .from("page_content")
      .update({
        content: field.content,
        updated_by: user.id,
        updated_at: updatedAt,
      })
      .eq("id", field.id);

    if (error) {
      return NextResponse.json(
        { error: `Could not save field ${field.id}: ${error.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ saved: parsed.fields.length });
}
