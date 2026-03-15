export type PageSpeedResult = {
  performanceScore: number;
  lcp: number;
  cls: number;
  tbt: number;
  url: string;
};

export async function analyzeUrl(url: string): Promise<PageSpeedResult | null> {
  try {
    const { env } = await import("./env");
    const params = new URLSearchParams({
      url,
      key: env.PAGESPEED_API_KEY,
      strategy: "mobile",
      category: "performance",
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    console.log("[PageSpeed] Analyzing:", url);
    const startTime = Date.now();

    const response = await fetch(
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?" + params.toString(),
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    const data = await response.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!data.lighthouseResult) {
      console.error("[PageSpeed] No lighthouseResult for:", url, "Response keys:", Object.keys(data));
      return null;
    }

    const audits = data.lighthouseResult.audits;
    const categories = data.lighthouseResult.categories;

    const result = {
      performanceScore: Math.round(categories.performance.score * 100),
      lcp: audits["largest-contentful-paint"].numericValue,
      cls: audits["cumulative-layout-shift"].numericValue,
      tbt: audits["total-blocking-time"].numericValue,
      url,
    };

    console.log("[PageSpeed] Done:", url, "Score:", result.performanceScore, "Time:", elapsed + "s");
    return result;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn("[PageSpeed] Timeout (30s) for:", url);
    } else {
      console.error("[PageSpeed] Failed for:", url, err);
    }
    return null;
  }
}

export async function analyzeUrlsWithRateLimit(
  urls: { url: string; domain: string; keyword: string }[],
  maxDomains: number = 10,
  delayMs: number = 500
): Promise<Map<string, PageSpeedResult>> {
  const results = new Map<string, PageSpeedResult>();

  const toAnalyze = urls.slice(0, maxDomains);
  console.log("[PageSpeed] Analyzing", toAnalyze.length, "of", urls.length, "domains (max:", maxDomains + ")");

  for (let i = 0; i < toAnalyze.length; i++) {
    const entry = toAnalyze[i];
    const result = await analyzeUrl(entry.url);
    if (result !== null) {
      results.set(entry.domain, result);
    }
    if (i < toAnalyze.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log("[PageSpeed] Completed:", results.size, "successful out of", toAnalyze.length, "attempted");
  return results;
}
