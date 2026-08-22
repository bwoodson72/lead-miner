import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.LEAD_MINER_API_URL ?? "http://localhost:3001";
const NON_RESTRICTIVE_PARAMS = new Set(["page", "pageSize", "sortBy", "sortDir", "search"]);
const CSV_SCOPE_PARAMS = new Set(["page", "pageSize", "search", "discoverySource", "importBatchId"]);

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); }
  catch { return { error: text }; }
}

function csvScopedParams(params: URLSearchParams) {
  const scoped = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    if (CSV_SCOPE_PARAMS.has(key) && value) scoped.set(key, value);
  }
  scoped.set("discoverySource", "csv_import");
  scoped.set("sortBy", "createdAt");
  scoped.set("sortDir", "desc");
  return scoped;
}

export async function GET(request: NextRequest) {
  try {
    const requestedParams = request.nextUrl.searchParams;
    const params = new URLSearchParams(requestedParams.toString());
    const csvImportView = params.get("discoverySource") === "csv_import";

    // Fresh CSV imports do not have priority scores yet, so the dashboard's default
    // priority sort makes them look like they disappeared. Keep CSV views newest-first.
    if (csvImportView && params.get("sortBy") === "priorityScore") {
      params.set("sortBy", "createdAt");
      params.set("sortDir", "desc");
    }

    const primary = await fetch(`${API_URL}/api/leads/query?${params.toString()}`, { cache: "no-store" });
    const primaryBody = await readJson(primary) as { leads?: unknown[]; total?: number; error?: string };

    const search = params.get("search")?.trim() ?? "";
    const hasRestrictiveFilters = Array.from(params.keys()).some((key) => !NON_RESTRICTIVE_PARAMS.has(key));
    const primaryTotal = Number(primaryBody.total ?? 0);

    // Dashboard filters persist in session storage. A stale email, priority,
    // qualification, or research filter can otherwise hide an entire fresh CSV batch.
    // If an explicit CSV-source view produces nothing, retry as a clean CSV scope.
    if (csvImportView && primary.ok && primaryTotal === 0) {
      const scopedParams = csvScopedParams(requestedParams);
      const fallback = await fetch(`${API_URL}/api/leads/query?${scopedParams.toString()}`, { cache: "no-store" });
      const fallbackBody = await readJson(fallback) as { leads?: unknown[]; total?: number; error?: string };
      const fallbackTotal = Number(fallbackBody.total ?? 0);
      if (fallback.ok && fallbackTotal > 0) {
        const ignoredFilters = Array.from(requestedParams.keys()).filter((key) => !CSV_SCOPE_PARAMS.has(key) && !["sortBy", "sortDir"].includes(key));
        return NextResponse.json(
          { ...fallbackBody, csvImportFilterFallback: true, ignoredFilters },
          { headers: { "X-Lead-Filter-Fallback": "csv-import-scope" } },
        );
      }
    }

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
