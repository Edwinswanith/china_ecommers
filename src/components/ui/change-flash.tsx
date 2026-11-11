"use client";

import { useState } from "react";

interface ChangeFlashProps {
  /** When this value changes, the content pops once to draw the eye. */
  readonly watch: string;
  readonly children: React.ReactNode;
}

/** Pops its content whenever the watched value changes, e.g. a status badge after an update. */
export function ChangeFlash({ watch, children }: ChangeFlashProps) {
  const [seen, setSeen] = useState(watch);
  const [changes, setChanges] = useState(0);
  if (seen !== watch) {
    setSeen(watch);
    setChanges(changes + 1);
  }
  return (
    <span key={changes} className={`inline-flex ${changes > 0 ? "animate-pop" : ""}`}>
      {children}
    </span>
  );
}
