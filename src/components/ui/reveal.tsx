"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

interface RevealProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  /** Stagger items in a row: delay in milliseconds before this one appears. */
  readonly delay?: number;
}

/** Fades its content up into place the first time it scrolls into view. */
export function Reveal({ children, className = "", delay = 0 }: RevealProps) {
  const element = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      // Start a little before the content reaches the screen, so fast scrolling never shows a gap.
      { rootMargin: "0px 0px 8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={element} className={`reveal ${visible ? "is-visible" : ""} ${className}`} style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}
