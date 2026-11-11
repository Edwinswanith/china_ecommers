"use client";

import { useState } from "react";
import { ProductImage } from "./product-image";

interface ProductGalleryProps {
  images: readonly string[];
  name: string;
}

export function ProductGallery({ images, name }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  return (
    <div className="lg:sticky lg:top-44">
      <div className="overflow-hidden rounded-3xl border border-line">
        <ProductImage key={images[active]} src={images[active]} alt={`${name}, photo ${active + 1}`} priority sizes="(min-width: 1024px) 50vw, 100vw" className="animate-fade" />
      </div>
      {images.length > 1 ? (
        <div className="mt-3 flex gap-3">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show photo ${index + 1}`}
              aria-pressed={index === active}
              className={`w-20 overflow-hidden rounded-xl border-2 transition-all ${index === active ? "border-brand" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              <ProductImage src={src} alt="" sizes="80px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
