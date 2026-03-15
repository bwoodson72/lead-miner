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

    console.log("[SerpApi] Searching for:", keyword, location ? "(location: " + location + ")" : "(no location)");

    const response = await fetch("https://serpapi.com/search.json?" + params.toString());

    if (!response.ok) {
      const text = await response.text();
      console.error("[SerpApi] HTTP error:", response.status, text.slice(0, 300));
      return [];
    }

    const data = await response.json();

    if (data.error) {
      console.error("[SerpApi] API error:", data.error);
      return [];
    }

    console.log("[SerpApi] Response keys:", Object.keys(data));

    const results: SerpAd[] = [];

    // PRIORITY 1: Traditional text ads (data.ads)
    const textAds = Array.isArray(data.ads) ? data.ads : [];
    console.log("[SerpApi] Text ads found:", textAds.length);

    for (const ad of textAds) {
      const serpAd = buildSerpAd(keyword, ad.title, ad.link, ad.displayed_link);
      if (serpAd) results.push(serpAd);
    }

    // PRIORITY 2: Local service ads (data.local_ads?.ads)
    if (results.length === 0) {
      const localServiceAds = Array.isArray(data.local_ads?.ads) ? data.local_ads.ads : [];
      console.log("[SerpApi] Local service ads found:", localServiceAds.length);

      for (const ad of localServiceAds) {
        const url = ad.link || ad.website || "";
        if (!url) continue;
        const serpAd = buildSerpAd(keyword, ad.title, url, ad.displayed_link || url);
        if (serpAd) results.push(serpAd);
      }
    }

    // PRIORITY 3: Local pack results with websites (data.local_results)
    if (results.length === 0) {
      const localResults = Array.isArray(data.local_results) ? data.local_results : [];
      const withWebsites = localResults.filter(
        (r: Record<string, unknown>) => typeof r.website === "string" && r.website.length > 0
      );
      console.log("[SerpApi] Local pack results:", localResults.length, "| With websites:", withWebsites.length);

      for (const result of withWebsites) {
        const r = result as Record<string, string>;
        const serpAd = buildSerpAd(keyword, r.title || "", r.website, r.website);
        if (serpAd) results.push(serpAd);
      }
    }

    if (results.length === 0) {
      console.log("[SerpApi] No ads or local results with websites found for:", keyword);
    }

    console.log("[SerpApi] Total leads extracted:", results.length);
    return results;

  } catch (err) {
    console.error("[SerpApi] Fetch error for keyword:", keyword, err);
    return [];
  }
}

function buildSerpAd(
  keyword: string,
  title: string | undefined,
  link: string | undefined,
  displayedLink: string | undefined
): SerpAd | null {
  if (!link) return null;

  let fullLink = link;
  if (!fullLink.startsWith("http://") && !fullLink.startsWith("https://")) {
    fullLink = "https://" + fullLink;
  }

  const displayDomain = (displayedLink ?? fullLink)
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];

  const mapped = {
    keyword,
    adTitle: title ?? "",
    landingPageUrl: fullLink,
    displayDomain,
  };

  const parsed = SerpAdSchema.safeParse(mapped);
  if (!parsed.success) {
    console.log("[SerpApi] Validation failed for:", fullLink, parsed.error.issues.map(i => i.message));
    return null;
  }
  return parsed.data;
}
