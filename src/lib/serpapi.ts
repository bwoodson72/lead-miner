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

    console.log("[SerpApi] Searching for:", keyword);
    const response = await fetch(`https://serpapi.com/search.json?${params}`);
    const data = await response.json();

    console.log("[SerpApi] Response keys:", Object.keys(data));
    console.log("[SerpApi] Ads found:", data.ads?.length ?? 0);

    if (!Array.isArray(data.ads)) {
      console.log("[SerpApi] No ads array in response. Available top-level keys:", Object.keys(data));
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
        console.log("[SerpApi] Ad validation failed:", parsed.error);
        continue;
      }
      results.push(parsed.data);
    }

    return results;
  } catch (err) {
    console.error("[SerpApi] Fetch error for keyword:", keyword, err);
    return [];
  }
}
