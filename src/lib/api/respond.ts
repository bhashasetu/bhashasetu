import { NextResponse } from "next/server";
import type { AdminCheckResult } from "@/lib/auth/require-admin";

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = "Internal server error") {
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Converts a failed AdminCheckResult into the matching HTTP response. */
export function adminCheckFailureResponse(
  result: Extract<AdminCheckResult, { ok: false }>
) {
  return result.status === 401 ? unauthorized(result.error) : forbidden(result.error);
}
