import { readProductImage } from "@/lib/storage";
import { IMAGE_CONTENT_TYPES } from "@/lib/storage-names";

interface RouteContext {
  params: Promise<{ name: string }>;
}

/** Serves vendor-uploaded product photos. Names are validated inside readProductImage. */
export async function GET(_request: Request, { params }: RouteContext): Promise<Response> {
  const { name } = await params;
  const file = await readProductImage(name);
  if (!file) return new Response("Not found", { status: 404 });
  const extension = name.slice(name.lastIndexOf(".") + 1);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": IMAGE_CONTENT_TYPES[extension] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
