import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
const types: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const match = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|avif)$/.exec(filename);
  const directory = process.env.PRODUCT_IMAGE_UPLOAD_DIR || (process.env.NODE_ENV === "development" ? join(process.cwd(), "uploads") : null);
  if (!match || !directory) return new Response(null, { status: 404 });
  try {
    const image = await readFile(join(directory, filename));
    return new Response(new Uint8Array(image), { headers: { "Content-Type": types[match[1]], "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Response(null, { status: 404 });
    throw error;
  }
}
