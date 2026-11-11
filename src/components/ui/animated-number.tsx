"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/domain/money";

export type NumberFormat = "money" | "count";

interface AnimatedNumberProps {
  /** Final value. For money, in minor units. */
  readonly value: number;
  readonly format: NumberFormat;
  readonly currency?: string;
  /** Count up from zero when first shown. When false, only later changes animate. */
  readonly countUpOnMount?: boolean;
  readonly className?: string;
}

const DURATION_MS = 700;
const MINOR_PER_UNIT = 100;

const easeOut = (t: number): number => 1 - (1 - t) ** 3;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A number that rolls to its new value instead of jumping. */
export function AnimatedNumber({ value, format, currency = "INR", countUpOnMount = false, className = "" }: AnimatedNumberProps) {
  // null means "show the real value": used for the server render and whenever nothing is animating.
  const [shown, setShown] = useState<number | null>(null);
  const [started, setStarted] = useState(!countUpOnMount);
  const from = useRef(countUpOnMount ? 0 : value);
  const element = useRef<HTMLSpanElement>(null);
  // A count-up waits until the number is on screen, so it is actually seen.
  const [onScreen, setOnScreen] = useState(!countUpOnMount);

  useEffect(() => {
    const node = element.current;
    if (onScreen || !node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setOnScreen(true);
      observer.disconnect();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [onScreen]);

  useEffect(() => {
    if (!onScreen) return;
    const start = from.current;
    from.current = value;
    if (start === value || prefersReducedMotion()) {
      const frame = requestAnimationFrame(() => {
        setShown(null);
        setStarted(true);
      });
      return () => cancelAnimationFrame(frame);
    }
    let frame = 0;
    const began = performance.now();
    const tick = (now: number): void => {
      const progress = Math.min(1, (now - began) / DURATION_MS);
      setStarted(true);
      if (progress >= 1) {
        setShown(null);
        return;
      }
      setShown(start + (value - start) * easeOut(progress));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      // Remember where an interrupted animation got to, so the next one continues from there.
      from.current = value;
    };
  }, [value, onScreen]);

  const current = shown ?? value;
  const text =
    format === "money"
      ? formatMoney(shown === null ? value : Math.round(current / MINOR_PER_UNIT) * MINOR_PER_UNIT, currency)
      : String(Math.round(current));

  return (
    <span ref={element} className={`${className} ${started ? "" : "count-pending"}`} aria-hidden={shown !== null ? true : undefined}>
      {text}
      {shown !== null ? <span className="sr-only">{format === "money" ? formatMoney(value, currency) : value}</span> : null}
    </span>
  );
}
