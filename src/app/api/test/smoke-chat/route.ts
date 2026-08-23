import { NextResponse } from "next/server";

/**
 * Smoke test for OpenAI chat completions
 * Tests: POST /v1/chat/completions using gpt-4o-mini
 * Expected: Valid text response
 */
export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const chatModel = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return NextResponse.json(
      {
        status: "FAIL",
        endpoint: "/v1/chat/completions",
        model: chatModel,
        error: "OPENAI_API_KEY not configured",
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: chatModel,
        messages: [
          {
            role: "user",
            content: "Respond with exactly: Smoke test successful",
          },
        ],
        max_tokens: 50,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "FAIL",
          endpoint: "/v1/chat/completions",
          model: chatModel,
          httpStatus: response.status,
          error: data.error?.message || response.statusText,
        },
        { status: response.status }
      );
    }

    const content = data.choices?.[0]?.message?.content;
    const tokensUsed = data.usage?.total_tokens || 0;

    if (!content) {
      return NextResponse.json(
        {
          status: "FAIL",
          endpoint: "/v1/chat/completions",
          model: chatModel,
          error: "No content in response",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "PASS",
      endpoint: "/v1/chat/completions",
      model: chatModel,
      responsePreview: content.substring(0, 100),
      tokensUsed,
      message: "Chat completion successful",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        status: "FAIL",
        endpoint: "/v1/chat/completions",
        model: chatModel,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Use POST method to run chat completions smoke test" });
}
