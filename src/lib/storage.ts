import "server-only";
import { randomUUID } from "node:crypto";
import { Binary } from "mongodb";
import { getDb } from "@/lib/db/client";
import { IMAGE_CONTENT_TYPES, MAX_IMAGE_BYTES, MAX_IMAGES_PER_PRODUCT, safeImageName } from "./storage-names";

/**
 * Product image storage. Uploaded photos are saved in the database (the
 * `media` collection) and served by /media/[name], so they survive on
 * serverless hosting where there is no permanent disk. To move to S3/R2
 * later, reimplement these two functions; nothing else knows where files live.
 */
export { MAX_IMAGE_BYTES, MAX_IMAGES_PER_PRODUCT };

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
  const db = await getDb();
  await db.media.insertOne({ _id: name, contentType: IMAGE_CONTENT_TYPES[match.ext], data: new Binary(bytes), createdAt: new Date() });
  return `/media/${name}`;
}

export async function readProductImage(name: string): Promise<Buffer | null> {
  if (!safeImageName(name)) return null;
  const db = await getDb();
  const file = await db.media.findOne({ _id: name }, { projection: { data: 1 } });
  return file ? Buffer.from(file.data.buffer) : null;
}
