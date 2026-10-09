import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";

export const runtime = "nodejs";

const extensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sign in to upload product images." }, { status: 401 });
  const data = await request.formData();
  const file = data.get("file");
  if (!(file instanceof File) || !extensions[file.type] || file.size === 0 || file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "Choose a PNG, JPG, WebP, or AVIF image under 4 MB." }, { status: 400 });
  }

  const filename = `${randomUUID()}${extensions[file.type]}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`products/${filename}`, file, { access: "public", addRandomSuffix: true, contentType: file.type });
    return NextResponse.json({ url: blob.url });
  }
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Image storage is not configured. Connect Vercel Blob before uploading." }, { status: 503 });
  }

  const directory = join(process.cwd(), "public", "product-uploads");
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, filename), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/product-uploads/${filename}` });
}
