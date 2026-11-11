import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { safeImageName } from "./storage-names";

/**
 * Product image storage. Files live on local disk under .data/uploads and are
 * served by /media/[name]. To move to S3/R2 later, reimplement these two
 * functions; nothing else references the filesystem.
 */
const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_IMAGES_PER_PRODUCT = 6;

const SIGNATURES: ReadonlyArray<{ ext: string; test: (b: Buffer) => boolean }> = [
  { ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
  { ext: "avif", test: (b) => b.subarray(4, 12).toString("ascii") === "ftypavif" },
];

export class ImageRejectedError extends Error {}

/** Validate by file signature (not the client-supplied type) and store. Returns the public URL. */
export async function saveProductImage(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) throw new ImageRejectedError(`${file.name} is larger than 4 MB.`);
  const bytes = Buffer.from(await file.arrayBuffer());
  const match = SIGNATURES.find((s) => s.test(bytes));
  if (!match) throw new ImageRejectedError(`${file.name} is not a JPG, PNG, WebP or AVIF image.`);
  const name = `${randomUUID()}.${match.ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), bytes);
  return `/media/${name}`;
}

export async function readProductImage(name: string): Promise<Buffer | null> {
  if (!safeImageName(name)) return null;
  try {
    return await readFile(path.join(UPLOAD_DIR, name));
  } catch {
    return null;
  }
}
