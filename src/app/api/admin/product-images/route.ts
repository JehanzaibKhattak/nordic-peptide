import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
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
  const directory = process.env.PRODUCT_IMAGE_UPLOAD_DIR || (process.env.NODE_ENV === "development" ? join(process.cwd(), "uploads") : null);
  if (!directory) return NextResponse.json({ error: "Persistent image storage is not configured." }, { status: 503 });
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, filename), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/product-uploads/${filename}` });
}
