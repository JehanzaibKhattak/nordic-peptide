import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/dev/echo/route";

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
it("requires explicit production activation", async () => {
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("POSTBACK_ECHO_ENABLED", "false");
  expect((await GET(new NextRequest("https://peptbay.com/api/dev/echo"))).status).toBe(404);
});
it("acknowledges and logs the substituted network postback fields", async () => {
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("POSTBACK_ECHO_ENABLED", "true");
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  const response = await GET(new NextRequest("https://peptbay.com/api/dev/echo?cid=TEST-CLICK&status=sale&payout=180.00&tid=TEST-ORDER"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, received: { cid: "TEST-CLICK", status: "sale", payout: "180.00", tid: "TEST-ORDER" } });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(log).toHaveBeenCalledOnce();
});
it("rejects unexpected secrets and invalid values without logging them", async () => {
  vi.stubEnv("POSTBACK_ECHO_ENABLED", "true");
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  for (const suffix of ["?key=private-value", "?cid=%0Abad", "?status=unknown", "?payout=not-money"]) expect((await GET(new NextRequest(`https://peptbay.com/api/dev/echo${suffix}`))).status).toBe(400);
  expect(log).not.toHaveBeenCalled();
});
