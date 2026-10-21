import { afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks = vi.hoisted(() => ({ findMany: vi.fn().mockResolvedValue([]), get: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { orderEvent: { findMany: mocks.findMany } } }));
vi.mock("@/lib/avion", () => ({ avionEnabled: () => process.env.NEXT_PUBLIC_AVION_CHECKOUT === "true", getAvionPostbacks: mocks.get }));
vi.mock("@/app/admin/actions", () => ({ resendPostbackAction: vi.fn() }));
import AdminPostbacks from "@/app/admin/(panel)/postbacks/page";
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it("shows backend records in the existing admin without another login", async () => {
  vi.stubEnv("NEXT_PUBLIC_AVION_CHECKOUT", "true");
  mocks.get.mockResolvedValue({ enabled: true, configured: true, jobs: [{order_ref: "NPS123", event: "sale", status: "sent", attempts: 1, sent_at: "2026-10-21 12:00:00", last_error: null}] });
  const html = renderToStaticMarkup(await AdminPostbacks());
  expect(html).toContain("Enabled"); expect(html).toContain("NPS123"); expect(html).toContain("sent");
  expect(html).not.toContain("admin.peptbay.com"); expect(mocks.findMany).not.toHaveBeenCalled();
});
it("does not present an unavailable backend as an empty queue", async () => {
  vi.stubEnv("NEXT_PUBLIC_AVION_CHECKOUT", "true"); mocks.get.mockRejectedValue(new Error("unavailable"));
  expect(renderToStaticMarkup(await AdminPostbacks())).toContain("temporarily unavailable");
});
it("keeps the legacy log outside Avion mode", async () => {
  vi.stubEnv("NEXT_PUBLIC_AVION_CHECKOUT", "false");
  expect(renderToStaticMarkup(await AdminPostbacks())).toContain("No postbacks yet.");
  expect(mocks.findMany).toHaveBeenCalledOnce();
});
