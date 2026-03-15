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
    const timeout = setTimeout(() => controller.abort(), 45000);

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
      console.error("[PageSpeed] No lighthouseResult for:", url, "keys:", Object.keys(data));
      return null;
    }

    const audits = data.lighthouseResult.audits;
    const categories = data.lighthouseResult.categories;

    const result: PageSpeedResult = {
      performanceScore: Math.round(categories.performance.score * 100),
      lcp: audits["largest-contentful-paint"].numericValue,
      cls: audits["cumulative-layout-shift"].numericValue,
      tbt: audits["total-blocking-time"].numericValue,
      url,
    };

    console.log("[PageSpeed] Done:", url, "Score:", result.performanceScore, "(" + elapsed + "s)");
    return result;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn("[PageSpeed] Timeout (45s) for:", url);
    } else {
      console.error("[PageSpeed] Failed for:", url, err);
    }
    return null;
  }
}

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const currentIndex = index++;
      results[currentIndex] = await tasks[currentIndex]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function analyzeUrlsWithRateLimit(
  urls: { url: string; domain: string; keyword: string }[],
  maxDomains: number = 5,
  concurrency: number = 3
): Promise<Map<string, PageSpeedResult>> {
  const toAnalyze = urls.slice(0, maxDomains);
  console.log("[PageSpeed] Analyzing", toAnalyze.length, "of", urls.length, "domains (max:", maxDomains, "concurrency:", concurrency + ")");

  const tasks = toAnalyze.map((entry) => () => analyzeUrl(entry.url));
  const results = await runWithConcurrency(tasks, concurrency);

  const map = new Map<string, PageSpeedResult>();
  for (let i = 0; i < toAnalyze.length; i++) {
    const result = results[i];
    if (result !== null) {
      map.set(toAnalyze[i].domain, result);
    }
  }

  console.log("[PageSpeed] Completed:", map.size, "of", toAnalyze.length, "successful");
  return map;
}
