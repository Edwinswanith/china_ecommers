import { ImageOff } from "lucide-react";
import Image from "next/image";

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

/** Square product image. SVG artwork is served as-is; photos go through the image optimiser. */
export function ProductImage({ src, alt, sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw", priority = false, className = "" }: ProductImageProps) {
  if (!src) {
    return (
      <div className={`grid aspect-square place-items-center bg-muted text-subtle ${className}`} role="img" aria-label={alt || "No photo"}>
        <ImageOff size={22} aria-hidden="true" />
      </div>
    );
  }
  return (
    <div className={`relative aspect-square overflow-hidden bg-muted ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={src.endsWith(".svg")} className="object-cover" />
    </div>
  );
}
