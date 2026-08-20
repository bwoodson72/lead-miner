import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.LEAD_MINER_API_URL ?? "http://localhost:3001";
const NON_RESTRICTIVE_PARAMS = new Set(["page", "pageSize", "sortBy", "sortDir", "search"]);

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); }
  catch { return { error: text }; }
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const primary = await fetch(`${API_URL}/api/leads/query?${params.toString()}`, { cache: "no-store" });
    const primaryBody = await readJson(primary) as { leads?: unknown[]; total?: number; error?: string };

    const search = params.get("search")?.trim() ?? "";
    const hasRestrictiveFilters = Array.from(params.keys()).some((key) => !NON_RESTRICTIVE_PARAMS.has(key));
    const primaryTotal = Number(primaryBody.total ?? 0);

    if (search && !hasRestrictiveFilters && (!primary.ok || primaryTotal === 0)) {
      const page = Math.max(1, Number(params.get("page")) || 1);
      const pageSize = Math.min(100, Math.max(10, Number(params.get("pageSize")) || 50));
      const fallbackParams = new URLSearchParams({
        search,
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
      });
      const fallback = await fetch(`${API_URL}/api/leads?${fallbackParams.toString()}`, { cache: "no-store" });
      const fallbackBody = await readJson(fallback) as { leads?: unknown[]; total?: number; error?: string };
      if (fallback.ok) {
        const leads = Array.isArray(fallbackBody.leads) ? fallbackBody.leads : [];
        const total = Number(fallbackBody.total ?? leads.length);
        if (leads.length > 0 || total > 0) {
          return NextResponse.json(
            { leads, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)), searchFallback: true },
            { headers: { "X-Lead-Search-Fallback": "legacy-domain-search" } },
          );
        }
      }
    }

    return NextResponse.json(primaryBody, { status: primary.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
