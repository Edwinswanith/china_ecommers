"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type BarState = "idle" | "loading" | "done";

const FINISH_MS = 500;
/** Give up showing progress if a page never arrives (e.g. the click was cancelled). */
const STALL_MS = 12_000;

function isPlainLeftClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.defaultPrevented;
}

/** True when clicking this link will load a different page of this site in the same tab. */
function leadsToAnotherPage(anchor: HTMLAnchorElement): boolean {
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  return url.pathname !== window.location.pathname || url.search !== window.location.search;
}

function Bar() {
  const location = `${usePathname()}?${useSearchParams().toString()}`;
  const [state, setState] = useState<BarState>("idle");
  const [seen, setSeen] = useState(location);

  // The address changed, so the page we were waiting for has arrived.
  if (seen !== location) {
    setSeen(location);
    if (state === "loading") setState("done");
  }

  useEffect(() => {
    const onClick = (event: MouseEvent): void => {
      if (!isPlainLeftClick(event)) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (anchor instanceof HTMLAnchorElement && leadsToAnotherPage(anchor)) setState("loading");
    };
    // Listen in the capture phase: the framework's own link handler runs later and cancels the browser's
    // default navigation, which would otherwise make every in-app link look like a cancelled click.
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), state === "done" ? FINISH_MS : STALL_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  return (
    <div className="nav-progress" data-state={state} aria-hidden="true">
      <span />
    </div>
  );
}

/** Thin progress bar at the top of the window while the next page loads. */
export function NavProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
