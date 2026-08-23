import { NextResponse } from "next/server";

/**
 * Smoke test for OpenAI image generation
 * Tests: POST /v1/images/generations using dall-e-3
 * Expected: Valid image URL in response
 */
export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        status: "FAIL",
        endpoint: "/v1/images/generations",
        model: "dall-e-3",
        error: "OPENAI_API_KEY not configured",
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: "A simple test image for smoke testing",
        n: 1,
        size: "1024x1024",
        quality: "standard",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "FAIL",
          endpoint: "/v1/images/generations",
          model: "dall-e-3",
          httpStatus: response.status,
          error: data.error?.message || response.statusText,
        },
        { status: response.status }
      );
    }

    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json(
        {
          status: "FAIL",
          endpoint: "/v1/images/generations",
          model: "dall-e-3",
          error: "No image URL in response",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "PASS",
      endpoint: "/v1/images/generations",
      model: "dall-e-3",
      imageUrlPrefix: imageUrl.substring(0, 50) + "...",
      imageSizeBytes: null,
      message: "Image generation successful",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        status: "FAIL",
        endpoint: "/v1/images/generations",
        model: "dall-e-3",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Use POST method to run image generation smoke test" });
}
