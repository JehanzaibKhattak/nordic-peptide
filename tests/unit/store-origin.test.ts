import { describe, expect, it } from "vitest";
import { isStoreOrigin } from "@/lib/store-origin";

const production = { NODE_ENV: "production", STORE_BASE_URL: "https://peptbay.com/" };
const request = (origin?: string) => new Request("http://localhost:3000/api/orders", { headers: origin ? { origin, "x-forwarded-host": "evil.example" } : {} });

describe("checkout origin validation behind the reverse proxy", () => {
  it("accepts the configured public origin despite an internal request URL", () => {
    expect(isStoreOrigin(request("https://peptbay.com"), production)).toBe(true);
  });
  it("rejects missing, unrelated, lookalike and insecure origins", () => {
    for (const origin of [undefined, "null", "https://evil.example", "https://peptbay.com.evil.example", "http://peptbay.com", "http://localhost:3000"]) {
      expect(isStoreOrigin(request(origin), production)).toBe(false);
    }
  });
  it("fails closed for missing or invalid production configuration", () => {
    expect(isStoreOrigin(request("https://peptbay.com"), { NODE_ENV: "production" })).toBe(false);
    expect(isStoreOrigin(request("https://peptbay.com"), { ...production, STORE_BASE_URL: "invalid" })).toBe(false);
  });
  it("allows the local origin in development without public configuration", () => {
    expect(isStoreOrigin(request("http://localhost:3000"), { NODE_ENV: "development" })).toBe(true);
  });
});

it("accepts only explicitly configured alternate store origins", () => {
  const env = { ...production, STORE_ADDITIONAL_ORIGINS: "https://www.peptbay.com" };
  expect(isStoreOrigin(request("https://www.peptbay.com"), production)).toBe(false);
  expect(isStoreOrigin(request("https://www.peptbay.com"), env)).toBe(true);
  expect(isStoreOrigin(request("https://www.peptbay.com.evil.example"), env)).toBe(false);
  expect(isStoreOrigin(request("http://www.peptbay.com"), env)).toBe(false);
});
