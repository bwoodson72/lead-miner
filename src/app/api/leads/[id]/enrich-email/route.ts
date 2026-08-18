import { NextRequest, NextResponse } from "next/server";

function getApiBase() {
  if (process.env.NODE_ENV === "development") {
    return process.env.LEAD_MINER_DEV_API_URL ?? "http://localhost:3001";
  }
  return process.env.LEAD_MINER_API_URL ?? "http://localhost:3001";
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const apiBase = getApiBase();
  const force = request.nextUrl.searchParams.get("force");
  const query = force ? `?force=${encodeURIComponent(force)}` : "";

  try {
    const response = await fetch(`${apiBase}/api/leads/${id}/enrich-email${query}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    const text = await response.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { error: `Backend returned a non-JSON response (${response.status})` };
    }
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}
