import { SerpAdSchema, type SerpAd } from "./schemas";

export async function searchAds(keyword: string, location?: string): Promise<SerpAd[]> {
  try {
    const { env } = await import("./env");

    const params = new URLSearchParams({
      engine: "google",
      q: keyword,
      api_key: env.SERPAPI_KEY,
    });
    if (location) {
      params.set("location", location);
    }

    const response = await fetch(`https://serpapi.com/search.json?${params}`);
    const data = await response.json();

    if (!Array.isArray(data.ads)) {
      return [];
    }

    const results: SerpAd[] = [];
    for (const ad of data.ads) {
      const displayDomain = (ad.displayed_link ?? "")
        .replace(/^https?:\/\//, "")
        .split("/")[0];

      const mapped = {
        keyword,
        adTitle: ad.title ?? "",
        landingPageUrl: ad.link ?? "",
        displayDomain,
      };

      const parsed = SerpAdSchema.safeParse(mapped);
      if (!parsed.success) {
        console.warn(`searchAds: skipping invalid ad for keyword "${keyword}":`, parsed.error);
        continue;
      }
      results.push(parsed.data);
    }

    return results;
  } catch (err) {
    console.error(`searchAds: failed for keyword "${keyword}":`, err);
    return [];
  }
}
