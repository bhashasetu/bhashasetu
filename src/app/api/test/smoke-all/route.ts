import { NextResponse } from "next/server";

/**
 * Master smoke test runner for all OpenAI integrations
 * Runs all tests and provides a comprehensive report
 */
export async function POST() {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const tests = [
    { name: "Image Generation", path: "/api/test/smoke-image" },
    { name: "Chat Completions", path: "/api/test/smoke-chat" },
    { name: "Text-to-Speech", path: "/api/test/smoke-voice" },
  ];

  const results = [];

  for (const test of tests) {
    try {
      const response = await fetch(`${baseUrl}${test.path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      results.push({
        test: test.name,
        ...data,
      });
    } catch (error) {
      results.push({
        test: test.name,
        status: "FAIL",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const passCount = results.filter((r) => r.status === "PASS").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: passCount,
      failed: failCount,
      allPassed: failCount === 0,
    },
    results,
    recommendations:
      failCount > 0
        ? "Check OPENAI_API_KEY and model configuration in Vercel environment variables"
        : "All smoke tests passed. OpenAI integrations are ready for use.",
  });
}

export async function GET() {
  return NextResponse.json({
    message: "MyBhashaSetu OpenAI Smoke Test Suite",
    endpoints: [
      {
        path: "/api/test/smoke-all",
        method: "POST",
        description: "Run all smoke tests",
      },
      {
        path: "/api/test/smoke-image",
        method: "POST",
        description: "Test OpenAI image generation (dall-e-3)",
      },
      {
        path: "/api/test/smoke-chat",
        method: "POST",
        description: "Test OpenAI chat completions",
      },
      {
        path: "/api/test/smoke-voice",
        method: "POST",
        description: "Test OpenAI text-to-speech",
      },
    ],
  });
}
