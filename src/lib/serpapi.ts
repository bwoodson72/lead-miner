import { SerpAdSchema, type SerpAd } from "./schemas";

export async function searchAds(keyword: string, location?: string): Promise<SerpAd[]> {
  try {
    const { env } = await import("./env");
    const results: SerpAd[] = [];

    // PHASE 1: Regular Google Search (gets text ads + local 3-pack)
    const searchResults = await queryGoogleSearch(env.SERPAPI_KEY, keyword, location);
    results.push(...searchResults);
    console.log("[SerpApi] Phase 1 (Google Search) results:", searchResults.length);

    // PHASE 2: Google Local engine (gets 10-20+ local businesses)
    const localResults = await queryGoogleLocal(env.SERPAPI_KEY, keyword, location);
    console.log("[SerpApi] Phase 2 (Google Local) results:", localResults.length);

    // Merge, dedup by domain
    const seenDomains = new Set<string>();
    const deduped: SerpAd[] = [];
    for (const ad of [...results, ...localResults]) {
      const domain = ad.displayDomain.toLowerCase();
      if (seenDomains.has(domain)) continue;
      seenDomains.add(domain);
      deduped.push(ad);
    }

    console.log("[SerpApi] Total unique leads for '" + keyword + "':", deduped.length);
    return deduped;

  } catch (err) {
    console.error("[SerpApi] Error for keyword:", keyword, err);
    return [];
  }
}

async function queryGoogleSearch(apiKey: string, keyword: string, location?: string): Promise<SerpAd[]> {
  const params = new URLSearchParams({
    engine: "google",
    q: keyword,
    api_key: apiKey,
  });
  if (location) params.set("location", location);

  console.log("[SerpApi] Google Search query:", keyword, location || "(no location)");
  const response = await fetch("https://serpapi.com/search.json?" + params.toString());
  if (!response.ok) {
    console.error("[SerpApi] Google Search HTTP error:", response.status);
    return [];
  }

  const data = await response.json();
  if (data.error) {
    console.error("[SerpApi] Google Search API error:", data.error);
    return [];
  }

  console.log("[SerpApi] Google Search response keys:", Object.keys(data));
  const results: SerpAd[] = [];

  // Source A: Text ads
  const textAds = Array.isArray(data.ads) ? data.ads : [];
  console.log("[SerpApi] Text ads:", textAds.length);
  for (const ad of textAds) {
    const serpAd = buildSerpAd(keyword, ad.title, ad.link, ad.displayed_link);
    if (serpAd) results.push(serpAd);
  }

  // Source B: Local service ads
  const localServiceAds = Array.isArray(data.local_ads?.ads) ? data.local_ads.ads : [];
  console.log("[SerpApi] Local service ads:", localServiceAds.length);
  for (const ad of localServiceAds) {
    const url = ad.link || ad.website || "";
    if (!url) continue;
    const serpAd = buildSerpAd(keyword, ad.title, url, ad.displayed_link || url);
    if (serpAd) results.push(serpAd);
  }

  // Source C: Local pack results (3-pack) — may be array or object with places
  let localResultsArray: Record<string, unknown>[] = [];
  if (Array.isArray(data.local_results)) {
    localResultsArray = data.local_results;
  } else if (data.local_results?.places && Array.isArray(data.local_results.places)) {
    localResultsArray = data.local_results.places;
  }
  const withWebsites = localResultsArray.filter((r) => {
    const links = r.links as Record<string, string> | undefined;
    return typeof links?.website === "string" && links.website.length > 0;
  });
  console.log("[SerpApi] Local pack:", localResultsArray.length, "| With websites:", withWebsites.length);
  for (const result of withWebsites) {
    const links = result.links as Record<string, string>;
    const serpAd = buildSerpAd(keyword, (result.title as string) || "", links.website, links.website);
    if (serpAd) results.push(serpAd);
  }

  return results;
}

async function queryGoogleLocal(apiKey: string, keyword: string, location?: string): Promise<SerpAd[]> {
  const params = new URLSearchParams({
    engine: "google_local",
    q: keyword,
    api_key: apiKey,
  });
  if (location) params.set("location", location);

  console.log("[SerpApi] Google Local query:", keyword, location || "(no location)");
  const response = await fetch("https://serpapi.com/search.json?" + params.toString());
  if (!response.ok) {
    console.error("[SerpApi] Google Local HTTP error:", response.status);
    return [];
  }

  const data = await response.json();
  if (data.error) {
    console.error("[SerpApi] Google Local API error:", data.error);
    return [];
  }

  console.log("[SerpApi] Google Local response keys:", Object.keys(data));
  const results: SerpAd[] = [];

  // Google Local returns local_results with links.website
  const localResults = Array.isArray(data.local_results) ? data.local_results : [];
  console.log("[SerpApi] Google Local results:", localResults.length);

  for (const result of localResults) {
    const r = result as Record<string, unknown>;
    const links = r.links as Record<string, string> | undefined;
    const website = links?.website;
    if (!website) continue;

    const serpAd = buildSerpAd(keyword, (r.title as string) || "", website, website);
    if (serpAd) results.push(serpAd);
  }

  // Google Local may also have ads_results
  const adsResults = Array.isArray(data.ads_results) ? data.ads_results : [];
  console.log("[SerpApi] Google Local ads_results:", adsResults.length);
  for (const ad of adsResults) {
    const a = ad as Record<string, unknown>;
    const links = a.links as Record<string, string> | undefined;
    const website = links?.website || (a.displayed_link as string) || "";
    if (!website) continue;
    const serpAd = buildSerpAd(keyword, (a.title as string) || "", website, website);
    if (serpAd) results.push(serpAd);
  }

  return results;
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
