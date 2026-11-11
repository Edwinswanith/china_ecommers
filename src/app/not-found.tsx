import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-muted px-5">
      <div className="max-w-xl text-center">
        <p className="label text-brand">Error 404</p>
        <h1 className="display mt-3 text-4xl md:text-5xl">Page not found</h1>
        <p className="mt-5 text-lg text-subtle">This page does not exist, or the product has been removed from sale.</p>
        <Link href="/products" className="btn btn-primary mt-8">Browse all products</Link>
      </div>
    </main>
  );
}
