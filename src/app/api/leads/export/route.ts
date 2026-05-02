import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const qs = request.nextUrl.searchParams.toString();
  const url = `${backendUrl}/api/leads/export${qs ? "?" + qs : ""}`;

  const upstream = await fetch(url);

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="leads.csv"',
    },
  });
}
