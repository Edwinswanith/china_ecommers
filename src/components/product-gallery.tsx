"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { ProductImage } from "./product-image";

interface ProductGalleryProps {
  images: readonly string[];
  name: string;
}

const ZOOM_SCALE = 1.9;
/** A sideways drag shorter than this is treated as a tap, not a swipe. */
const SWIPE_MIN_PX = 40;

const arrow = "absolute top-1/2 grid h-10 w-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/95 text-fg opacity-0 shadow-[var(--shadow-card)] transition-all hover:bg-white focus-visible:opacity-100 group-hover:opacity-100 max-lg:hidden";

/**
 * Product photos. With a mouse, the photo zooms in under the pointer. On a
 * touch screen, swipe left or right to move between photos.
 */
export function ProductGallery({ images, name }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const many = images.length > 1;

  const go = (index: number): void => {
    setActive((index + images.length) % images.length);
    setZoom(null);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setZoom({ x: ((event.clientX - bounds.left) / bounds.width) * 100, y: ((event.clientY - bounds.top) / bounds.height) * 100 });
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType !== "mouse") swipeStart.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || !many) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy)) go(active + (dx < 0 ? 1 : -1));
  };

  const zoomStyle: CSSProperties = zoom
    ? { transform: `scale(${ZOOM_SCALE})`, transformOrigin: `${zoom.x}% ${zoom.y}%` }
    : { transform: "scale(1)", transformOrigin: "center" };

  return (
    <div className="lg:sticky lg:top-44 lg:self-start">
      <div className="group relative">
        <div
          className={`relative aspect-square touch-pan-y select-none overflow-hidden rounded-3xl border border-line bg-muted ${zoom ? "cursor-zoom-in" : ""}`}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setZoom(null)}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { swipeStart.current = null; }}
        >
          {images.length === 0 ? <ProductImage src={null} alt={name} /> : null}
          {images.map((src, index) => (
            <div
              key={src}
              className={`absolute inset-0 transition-opacity duration-300 ease-out ${index === active ? "opacity-100" : "pointer-events-none opacity-0"}`}
              aria-hidden={index === active ? undefined : true}
            >
              <div className="h-full w-full transition-transform duration-200 ease-out will-change-transform" style={index === active ? zoomStyle : undefined}>
                <ProductImage src={src} alt={`${name}, photo ${index + 1}`} priority={index === 0} sizes="(min-width: 1024px) 50vw, 100vw" />
              </div>
            </div>
          ))}
        </div>

        {many ? (
          <>
            <button type="button" className={`${arrow} left-3`} onClick={() => go(active - 1)} aria-label="Previous photo"><ChevronLeft size={20} aria-hidden="true" /></button>
            <button type="button" className={`${arrow} right-3`} onClick={() => go(active + 1)} aria-label="Next photo"><ChevronRight size={20} aria-hidden="true" /></button>
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden" aria-hidden="true">
              {images.map((src, index) => (
                <span key={src} className={`h-1.5 rounded-full bg-white shadow-sm transition-all duration-300 ${index === active ? "w-5 opacity-100" : "w-1.5 opacity-60"}`} />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {many ? (
        <div className="mt-3 flex gap-3">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => go(index)}
              aria-label={`Show photo ${index + 1}`}
              aria-pressed={index === active}
              className={`w-20 cursor-pointer overflow-hidden rounded-xl border-2 transition-all ${index === active ? "border-brand" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              <ProductImage src={src} alt="" sizes="80px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
