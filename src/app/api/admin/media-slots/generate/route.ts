import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

const OPENAI_API_URL = "https://api.openai.com/v1/images/generations";
const FAL_AI_URL = "https://fal.run/fal-ai/flux-pro/submit";

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

  if (promptError || !prompt)
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });

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

  if (variantError)
    return NextResponse.json({ error: variantError.message }, { status: 500 });

  // Trigger generation based on provider
  if (provider === "openai") {
    return generateWithOpenAI(
      supabase,
      variant.id,
      prompt.prompt_text,
      user.id
    );
  } else if (provider === "fal.ai" || provider === "flux") {
    return generateWithFalAI(
      supabase,
      variant.id,
      prompt.prompt_text,
      user.id
    );
  }

  return NextResponse.json(
    { error: "Unsupported provider" },
    { status: 400 }
  );
}

async function generateWithOpenAI(
  supabase: Awaited<ReturnType<typeof createClient>>,
  variantId: string,
  prompt: string,
  userId: string
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    await supabase
      .from("generated_media_variants")
      .update({ generation_status: "failed" })
      .eq("id", variantId);

    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
      }),
    });

    if (!response.ok) {
      await supabase
        .from("generated_media_variants")
        .update({ generation_status: "failed" })
        .eq("id", variantId);

      return NextResponse.json(
        { error: "Image generation failed" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const imageUrl = data.data[0].url;

    // Download image from OpenAI URL
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();

    // Upload to Supabase Storage
    const filename = `generated-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("media-images")
      .upload(`generated/${filename}`, imageBuffer, {
        contentType: "image/png",
      });

    if (uploadError) {
      await supabase
        .from("generated_media_variants")
        .update({ generation_status: "failed" })
        .eq("id", variantId);

      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Create media asset record
    const { data: mediaAsset, error: assetError } = await supabase
      .from("media_assets")
      .insert({
        filename,
        mime_type: "image/png",
        file_size: imageBuffer.byteLength,
        storage_bucket: "media-images",
        storage_path: `generated/${filename}`,
        media_type: "image",
        title: `Generated image from prompt`,
        status: "draft",
        created_by: userId,
      })
      .select()
      .single();

    if (assetError) {
      await supabase
        .from("generated_media_variants")
        .update({ generation_status: "failed" })
        .eq("id", variantId);

      return NextResponse.json({ error: assetError.message }, { status: 500 });
    }

    // Update variant with completed media asset
    await supabase
      .from("generated_media_variants")
      .update({
        generation_status: "completed",
        media_asset_id: mediaAsset.id,
      })
      .eq("id", variantId);

    return NextResponse.json({ data: { variant: variantId, mediaAsset } });
  } catch (error) {
    await supabase
      .from("generated_media_variants")
      .update({ generation_status: "failed" })
      .eq("id", variantId);

    return NextResponse.json(
      { error: "Generation request failed" },
      { status: 500 }
    );
  }
}

async function generateWithFalAI(
  supabase: Awaited<ReturnType<typeof createClient>>,
  variantId: string,
  prompt: string,
  userId: string
) {
  const apiKey = process.env.FAL_AI_KEY;
  if (!apiKey) {
    await supabase
      .from("generated_media_variants")
      .update({ generation_status: "failed" })
      .eq("id", variantId);

    return NextResponse.json(
      { error: "fal.ai API key not configured" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(FAL_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        image_size: "landscape_4_3",
        num_images: 1,
        enable_safety_checker: true,
      }),
    });

    if (!response.ok) {
      await supabase
        .from("generated_media_variants")
        .update({ generation_status: "failed" })
        .eq("id", variantId);

      return NextResponse.json(
        { error: "Image generation failed" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const imageUrl = data.images[0].url;

    // Download image from fal.ai URL
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();

    // Upload to Supabase Storage
    const filename = `generated-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("media-images")
      .upload(`generated/${filename}`, imageBuffer, {
        contentType: "image/png",
      });

    if (uploadError) {
      await supabase
        .from("generated_media_variants")
        .update({ generation_status: "failed" })
        .eq("id", variantId);

      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Create media asset record
    const { data: mediaAsset, error: assetError } = await supabase
      .from("media_assets")
      .insert({
        filename,
        mime_type: "image/png",
        file_size: imageBuffer.byteLength,
        storage_bucket: "media-images",
        storage_path: `generated/${filename}`,
        media_type: "image",
        title: `Generated image from prompt`,
        status: "draft",
        created_by: userId,
      })
      .select()
      .single();

    if (assetError) {
      await supabase
        .from("generated_media_variants")
        .update({ generation_status: "failed" })
        .eq("id", variantId);

      return NextResponse.json({ error: assetError.message }, { status: 500 });
    }

    // Update variant with completed media asset
    await supabase
      .from("generated_media_variants")
      .update({
        generation_status: "completed",
        media_asset_id: mediaAsset.id,
      })
      .eq("id", variantId);

    return NextResponse.json({ data: { variant: variantId, mediaAsset } });
  } catch (error) {
    await supabase
      .from("generated_media_variants")
      .update({ generation_status: "failed" })
      .eq("id", variantId);

    return NextResponse.json(
      { error: "Generation request failed" },
      { status: 500 }
    );
  }
}
