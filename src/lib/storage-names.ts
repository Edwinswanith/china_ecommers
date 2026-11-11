/** Uploaded files are always stored as <uuid>.<ext>; anything else is rejected. */
const IMAGE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|avif)$/;

export function safeImageName(name: string): boolean {
  return IMAGE_NAME.test(name);
}

export const IMAGE_CONTENT_TYPES: Readonly<Record<string, string>> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};
