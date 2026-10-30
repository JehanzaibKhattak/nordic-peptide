import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const admin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/admin-session", () => ({ requireAdmin: admin }));
import { POST } from "@/app/api/admin/product-images/route";
import { GET } from "@/app/product-uploads/[filename]/route";
let directory: string;
beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), "product-image-test-")); vi.stubEnv("PRODUCT_IMAGE_UPLOAD_DIR", directory); admin.mockResolvedValue(true); });
afterEach(async () => { vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });
const upload = (file: File) => { const form = new FormData(); form.set("file", file); return new Request("http://localhost/api/admin/product-images", { method: "POST", body: form }); };
it("requires admin access and rejects unsupported uploads", async () => {
  admin.mockResolvedValueOnce(false);
  expect((await POST(upload(new File(["x"], "x.png", { type: "image/png" })))).status).toBe(401);
  expect((await POST(upload(new File(["<svg/>"], "x.svg", { type: "image/svg+xml" })))).status).toBe(400);
  expect(await readdir(directory)).toEqual([]);
});
it("persists image bytes and serves only generated image names", async () => {
  const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==", "base64");
  const response = await POST(upload(new File([bytes], "sample.png", { type: "image/png" })));
  expect(response.status).toBe(200);
  const { url } = await response.json();
  const filename = url.split("/").pop();
  const image = await GET(new Request("http://localhost" + url), { params: Promise.resolve({ filename }) });
  expect(Buffer.from(await image.arrayBuffer())).toEqual(bytes);
  expect(image.headers.get("content-type")).toBe("image/png");
  expect(image.headers.get("x-content-type-options")).toBe("nosniff");
  expect((await GET(new Request("http://localhost"), { params: Promise.resolve({ filename: "../.env" }) })).status).toBe(404);
  expect((await GET(new Request("http://localhost"), { params: Promise.resolve({ filename: "00000000-0000-0000-0000-000000000000.jpg" }) })).status).toBe(404);
});
it("fails closed when production storage is not configured", async () => {
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("PRODUCT_IMAGE_UPLOAD_DIR", "");
  expect((await POST(upload(new File(["x"], "x.jpg", { type: "image/jpeg" })))).status).toBe(503);
  expect(await readdir(directory)).toEqual([]);
});
