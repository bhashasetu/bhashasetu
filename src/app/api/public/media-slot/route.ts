import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSignedSlotMediaUrl } from "@/lib/media/slot-url-generator";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slotId = url.searchParams.get("slot_id");

  if (!slotId) {
    return NextResponse.json(
      { error: "slot_id is required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const signedUrl = await getSignedSlotMediaUrl(supabase, slotId);

  if (!signedUrl) {
    return NextResponse.json({ data: null }, { status: 200 });
  }

  return NextResponse.json({ data: { url: signedUrl, expiresInSeconds: 3600 } });
}
