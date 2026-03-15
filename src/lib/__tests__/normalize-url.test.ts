import { describe, it, expect } from "vitest";
import { normalizeUrl, extractRootDomain } from "../normalize-url";

describe("normalizeUrl", () => {
  it("removes utm_source", () => {
    expect(normalizeUrl("https://example.com/?utm_source=google")).toBe(
      "https://example.com/"
    );
  });

  it("removes gclid", () => {
    expect(normalizeUrl("https://example.com/?gclid=abc123")).toBe(
      "https://example.com/"
    );
  });

  it("removes fbclid", () => {
    expect(normalizeUrl("https://example.com/?fbclid=xyz")).toBe(
      "https://example.com/"
    );
  });

  it("removes msclkid", () => {
    expect(normalizeUrl("https://example.com/?msclkid=xyz")).toBe(
      "https://example.com/"
    );
  });

  it("removes all utm_* params and preserves non-tracking params", () => {
    expect(
      normalizeUrl(
        "https://example.com/?utm_source=google&utm_medium=cpc&ref=homepage&utm_campaign=spring"
      )
    ).toBe("https://example.com/?ref=homepage");
  });

  it("removes mixed tracking params", () => {
    expect(
      normalizeUrl(
        "https://example.com/page?gclid=abc&utm_source=google&color=red"
      )
    ).toBe("https://example.com/page?color=red");
  });

  it("removes trailing slash from pathname", () => {
    expect(normalizeUrl("https://example.com/page/")).toBe(
      "https://example.com/page"
    );
  });

  it("preserves root slash", () => {
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });

  it("returns unchanged URL when no tracking params present (minus trailing slash)", () => {
    expect(normalizeUrl("https://example.com/about")).toBe(
      "https://example.com/about"
    );
  });

  it("preserves path after cleaning tracking params", () => {
    expect(
      normalizeUrl("https://example.com/services/seo/?utm_source=google")
    ).toBe("https://example.com/services/seo");
  });

  it("removes custom utm_* param not in the explicit list", () => {
    expect(normalizeUrl("https://example.com/?utm_custom=foo")).toBe(
      "https://example.com/"
    );
  });

  it("throws on invalid URL", () => {
    expect(() => normalizeUrl("not-a-url")).toThrow("Invalid URL");
  });
});

describe("extractRootDomain", () => {
  it("returns hostname without www", () => {
    expect(extractRootDomain("https://www.example.com/page")).toBe(
      "example.com"
    );
  });

  it("returns hostname when no www present", () => {
    expect(extractRootDomain("https://example.com/page")).toBe("example.com");
  });

  it("handles subdomain other than www", () => {
    expect(extractRootDomain("https://shop.example.com/")).toBe(
      "shop.example.com"
    );
  });

  it("throws on invalid URL", () => {
    expect(() => extractRootDomain("not-a-url")).toThrow("Invalid URL");
  });
});
