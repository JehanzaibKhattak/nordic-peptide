import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
import { getAvionPostbacks } from "@/lib/avion";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("reads monitoring privately with no cache, redirects or mutations", async () => {
  vi.stubEnv("AVION_API_URL", "https://backend.example.com");
  vi.stubEnv("AVION_API_KEY", "private-key");
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ok:true,enabled:true,configured:true,jobs:[]})));
  vi.stubGlobal("fetch", fetch);
  await expect(getAvionPostbacks()).resolves.toMatchObject({enabled:true,jobs:[]});
  const [url, options] = fetch.mock.calls[0];
  expect(String(url)).toBe("https://backend.example.com/api/v1/postbacks");
  expect(options).toMatchObject({headers:{"X-Avion-Key":"private-key"},cache:"no-store",redirect:"error"});
  expect(options.body).toBeUndefined();
});
it("rejects redirects, authorization failures and invalid responses", async () => {
  vi.stubEnv("AVION_API_URL", "https://backend.example.com");
  vi.stubEnv("AVION_API_KEY", "private-key");
  for (const response of [new Response("",{status:401}),new Response("",{status:302}),new Response('{}')]) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    await expect(getAvionPostbacks()).rejects.toThrow();
  }
});
it("does not send credentials to insecure URLs", async () => {
  vi.stubEnv("AVION_API_URL", "http://backend.example.com");vi.stubEnv("AVION_API_KEY", "private-key");
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  await expect(getAvionPostbacks()).rejects.toThrow(); expect(fetch).not.toHaveBeenCalled();
});
