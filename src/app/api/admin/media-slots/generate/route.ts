import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { resolveConfiguredProvider } from "@/lib/media/image-providers";
import { conformImage } from "@/lib/media/conform-image";

export async function POST(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const supabase = adminCheck.supabase;
  const { user } = adminCheck;
  const body = await request.json();
  const { slotId, provider, promptId } = body;

  // Fetch the prompt
  const { data: prompt, error: promptError } = await supabase
    .from("generation_prompts")
    .select("*")
    .eq("id", promptId)
    .single();

  if (promptError || !prompt) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  // Create variant record
  const { data: variant, error: variantError } = await supabase
    .from("generated_media_variants")
    .insert({
      slot_id: slotId,
      prompt_id: promptId,
      provider,
      model_name: prompt.model_name,
      generation_status: "processing",
      created_by: user.id,
    })
    .select()
    .single();

  if (variantError) {
    return NextResponse.json({ error: variantError.message }, { status: 500 });
  }

  try {
    // Throws when the preset's provider has no key here, rather than
    // silently billing a different vendor.
    const imageProvider = resolveConfiguredProvider(provider);

    const { imageUrl, mimeType, modelName } = await imageProvider.generateImage(
      prompt.prompt_text
    );

    // Download image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to download generated image");
    }
    const rawBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Providers return their own fixed sizes (DALL-E squares, for one). They
    // are capped for storage but not cropped: the slot frames them at render
    // time around the asset's focal point, like any other upload.
    const conformed = await conformImage(rawBuffer, mimeType).catch(() => null);

    const imageBuffer = conformed?.buffer ?? rawBuffer;
    const storedMime = conformed?.mimeType ?? mimeType;

    const filename = `generated-${Date.now()}.${storedMime === "image/png" ? "png" : "jpg"}`;
    const { error: uploadError } = await supabase.storage
      .from("media-images")
      .upload(`generated/${filename}`, imageBuffer, {
        contentType: storedMime,
      });

    if (uploadError) {
      await supabase
        .from("generated_media_variants")
        .update({ generation_status: "failed" })
        .eq("id", variant.id);

      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Create media asset record
    const { data: mediaAsset, error: assetError } = await supabase
      .from("media_assets")
      .insert({
        filename,
        mime_type: storedMime,
        file_size: imageBuffer.byteLength,
        width: conformed?.width || null,
        height: conformed?.height || null,
        storage_bucket: "media-images",
        storage_path: `generated/${filename}`,
        media_type: "image",
        fit: conformed?.fit ?? "cover",
        title: `Generated image: ${prompt.prompt_text.substring(0, 50)}...`,
        status: "draft",
        created_by: user.id,
        source_type: "ai_generated",
      })
      .select()
      .single();

    if (assetError) {
      await supabase
        .from("generated_media_variants")
        .update({ generation_status: "failed" })
        .eq("id", variant.id);

      return NextResponse.json({ error: assetError.message }, { status: 500 });
    }

    // Update variant with completed media asset
    await supabase
      .from("generated_media_variants")
      .update({
        generation_status: "completed",
        media_asset_id: mediaAsset.id,
        approval_status: "draft",
        // Record the provider that ran. It now always matches the preset —
        // resolveConfiguredProvider refuses rather than substituting one
        // vendor for another — but the run is still recorded from the
        // provider object, not the request, so the audit trail reflects what
        // actually happened.
        provider: imageProvider.name,
        model_name: modelName ?? prompt.model_name,
      })
      .eq("id", variant.id);

    return NextResponse.json({
      data: {
        variant: variant.id,
        mediaAsset: {
          id: mediaAsset.id,
          filename: mediaAsset.filename,
          title: mediaAsset.title,
          status: mediaAsset.status,
        },
      },
    });
  } catch (error) {
    // Mark variant as failed
    await supabase
      .from("generated_media_variants")
      .update({ generation_status: "failed" })
      .eq("id", variant.id);

    const errorMessage = error instanceof Error ? error.message : "Image generation failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
