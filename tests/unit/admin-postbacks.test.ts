import { afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const findMany = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock("@/lib/db", () => ({ db: { orderEvent: { findMany } } }));
vi.mock("@/app/admin/actions", () => ({ resendPostbackAction: vi.fn() }));
import AdminPostbacks from "@/app/admin/(panel)/postbacks/page";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

it("routes Avion operators to the backend queue without exposing the endpoint or querying the wrong log", async () => {
  vi.stubEnv("NEXT_PUBLIC_AVION_CHECKOUT", "true");
  vi.stubEnv("KEITARO_POSTBACK_URL", "https://tracker.example/private-secret/postback");
  const html = renderToStaticMarkup(await AdminPostbacks());
  expect(html).toContain("Managed by the Avion backend");
  for (const status of ["sent", "queued", "failed"]) {
    expect(html).toContain(`https://admin.peptbay.com/tracking?status=${status}`);
  }
  expect(html).not.toContain("private-secret");
  expect(html).not.toContain("not configured");
  expect(findMany).not.toHaveBeenCalled();
});

it("keeps the storefront log for checkout modes that use its sender", async () => {
  vi.stubEnv("NEXT_PUBLIC_AVION_CHECKOUT", "false");
  const html = renderToStaticMarkup(await AdminPostbacks());
  expect(html).toContain("No postbacks yet.");
  expect(findMany).toHaveBeenCalledOnce();
});
