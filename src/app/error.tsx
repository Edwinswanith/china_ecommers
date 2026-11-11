"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-screen place-items-center bg-muted px-5">
      <div className="max-w-xl text-center">
        <p className="label text-brand">Error</p>
        <h1 className="display mt-3 text-3xl md:text-4xl">Something went wrong</h1>
        <p className="mt-5 text-lg text-subtle">The page hit an unexpected error. Your cart and orders are safe.</p>
        <button type="button" onClick={reset} className="btn btn-primary mt-8">Try again</button>
      </div>
    </main>
  );
}
