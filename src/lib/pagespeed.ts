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

    const response = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`
    );

    const data = await response.json();
    const audits = data.lighthouseResult.audits;
    const categories = data.lighthouseResult.categories;

    return {
      performanceScore: categories.performance.score * 100,
      lcp: audits["largest-contentful-paint"].numericValue,
      cls: audits["cumulative-layout-shift"].numericValue,
      tbt: audits["total-blocking-time"].numericValue,
      url,
    };
  } catch (err) {
    console.error(`PageSpeed analysis failed for ${url}:`, err);
    return null;
  }
}

export async function analyzeUrlsWithRateLimit(
  urls: { url: string; domain: string; keyword: string }[],
  delayMs = 200
): Promise<Map<string, PageSpeedResult>> {
  const results = new Map<string, PageSpeedResult>();

  for (let i = 0; i < urls.length; i++) {
    const entry = urls[i];
    const result = await analyzeUrl(entry.url);
    if (result !== null) {
      results.set(entry.domain, result);
    }
    if (i < urls.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
