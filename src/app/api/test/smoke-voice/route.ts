import { NextResponse } from "next/server";

/**
 * Smoke test for OpenAI text-to-speech (audio/speech)
 * Tests: POST /v1/audio/speech using gpt-4o-mini-tts (actually uses text-to-speech model)
 * Expected: Valid audio/mpeg response
 */
export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        status: "FAIL",
        endpoint: "/v1/audio/speech",
        model: "tts-1",
        error: "OPENAI_API_KEY not configured",
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        input: "Smoke test successful for text to speech",
        voice: "alloy",
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      return NextResponse.json(
        {
          status: "FAIL",
          endpoint: "/v1/audio/speech",
          model: "tts-1",
          httpStatus: response.status,
          error: data.error?.message || response.statusText,
        },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type");
    const audioBuffer = await response.arrayBuffer();
    const audioSizeKb = (audioBuffer.byteLength / 1024).toFixed(2);

    if (!contentType?.includes("audio")) {
      return NextResponse.json(
        {
          status: "FAIL",
          endpoint: "/v1/audio/speech",
          model: "tts-1",
          error: `Invalid content type: ${contentType}`,
        },
        { status: 500 }
      );
    }

    if (audioBuffer.byteLength === 0) {
      return NextResponse.json(
        {
          status: "FAIL",
          endpoint: "/v1/audio/speech",
          model: "tts-1",
          error: "Empty audio response",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "PASS",
      endpoint: "/v1/audio/speech",
      model: "tts-1",
      contentType,
      audioSizeKb,
      message: "Text-to-speech generation successful",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        status: "FAIL",
        endpoint: "/v1/audio/speech",
        model: "tts-1",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Use POST method to run text-to-speech smoke test" });
}
