import { NextResponse } from "next/server";

/**
 * Server-side smoke test runner
 * Tests all OpenAI integrations and returns detailed results
 */
/** The per-test helpers below build these ad hoc, so the extra diagnostic
 *  fields vary by test; only name and status are guaranteed. */
type TestResult = {
  name: string;
  status: string;
  [key: string]: unknown;
};

type SmokeResults = {
  timestamp: string;
  environment: Record<string, unknown>;
  tests: TestResult[];
  summary?: Record<string, unknown>;
};

export async function GET() {
  const results: SmokeResults = {
    timestamp: new Date().toISOString(),
    environment: {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      chatModel: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
    },
    tests: [],
  };

  // Test 1: Image Generation
  try {
    const imageTest = await testImageGeneration();
    results.tests.push(imageTest);
  } catch (error) {
    results.tests.push({
      name: "Image Generation",
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 2: Chat Completions
  try {
    const chatTest = await testChat();
    results.tests.push(chatTest);
  } catch (error) {
    results.tests.push({
      name: "Chat Completions",
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 3: Text-to-Speech
  try {
    const voiceTest = await testVoice();
    results.tests.push(voiceTest);
  } catch (error) {
    results.tests.push({
      name: "Text-to-Speech",
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Summary
  const passed = results.tests.filter((t) => t.status === "PASS").length;
  const failed = results.tests.filter((t) => t.status === "FAIL").length;
  const errors = results.tests.filter((t) => t.status === "ERROR").length;

  results.summary = {
    total: results.tests.length,
    passed,
    failed,
    errors,
    allPassed: failed === 0 && errors === 0,
  };

  return NextResponse.json(results);
}

async function testImageGeneration() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      name: "Image Generation (dall-e-3)",
      status: "FAIL",
      endpoint: "/v1/images/generations",
      reason: "OPENAI_API_KEY not configured",
    };
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: "A simple test image",
      n: 1,
      size: "1024x1024",
      quality: "standard",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      name: "Image Generation (dall-e-3)",
      status: "FAIL",
      endpoint: "/v1/images/generations",
      httpStatus: response.status,
      error: data.error?.message || response.statusText,
    };
  }

  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) {
    return {
      name: "Image Generation (dall-e-3)",
      status: "FAIL",
      endpoint: "/v1/images/generations",
      error: "No image URL in response",
    };
  }

  return {
    name: "Image Generation (dall-e-3)",
    status: "PASS",
    endpoint: "/v1/images/generations",
    imageUrlLength: imageUrl.length,
    imageUrlPrefix: imageUrl.substring(0, 60) + "...",
  };
}

async function testChat() {
  const apiKey = process.env.OPENAI_API_KEY;
  const chatModel = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return {
      name: "Chat Completions",
      status: "FAIL",
      endpoint: "/v1/chat/completions",
      model: chatModel,
      reason: "OPENAI_API_KEY not configured",
    };
  }

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
          content: "Respond with: Test successful",
        },
      ],
      max_tokens: 50,
      temperature: 0.7,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      name: "Chat Completions",
      status: "FAIL",
      endpoint: "/v1/chat/completions",
      model: chatModel,
      httpStatus: response.status,
      error: data.error?.message || response.statusText,
    };
  }

  const content = data.choices?.[0]?.message?.content;
  const tokensUsed = data.usage?.total_tokens || 0;

  if (!content) {
    return {
      name: "Chat Completions",
      status: "FAIL",
      endpoint: "/v1/chat/completions",
      model: chatModel,
      error: "No content in response",
    };
  }

  return {
    name: "Chat Completions",
    status: "PASS",
    endpoint: "/v1/chat/completions",
    model: chatModel,
    responsePreview: content.substring(0, 100),
    tokensUsed,
  };
}

async function testVoice() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      name: "Text-to-Speech (tts-1)",
      status: "FAIL",
      endpoint: "/v1/audio/speech",
      reason: "OPENAI_API_KEY not configured",
    };
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "tts-1",
      input: "Test successful for text to speech",
      voice: "alloy",
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    return {
      name: "Text-to-Speech (tts-1)",
      status: "FAIL",
      endpoint: "/v1/audio/speech",
      httpStatus: response.status,
      error: data.error?.message || response.statusText,
    };
  }

  const contentType = response.headers.get("content-type");
  const audioBuffer = await response.arrayBuffer();
  const audioSizeKb = (audioBuffer.byteLength / 1024).toFixed(2);

  if (!contentType?.includes("audio")) {
    return {
      name: "Text-to-Speech (tts-1)",
      status: "FAIL",
      endpoint: "/v1/audio/speech",
      error: `Invalid content type: ${contentType}`,
    };
  }

  if (audioBuffer.byteLength === 0) {
    return {
      name: "Text-to-Speech (tts-1)",
      status: "FAIL",
      endpoint: "/v1/audio/speech",
      error: "Empty audio response",
    };
  }

  return {
    name: "Text-to-Speech (tts-1)",
    status: "PASS",
    endpoint: "/v1/audio/speech",
    contentType,
    audioSizeKb: `${audioSizeKb} KB`,
  };
}
