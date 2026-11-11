/** Placeholder layouts shown while a page's data loads. Shapes roughly match the real page so nothing jumps. */

const bar = (className: string): React.ReactNode => <div className={`skeleton ${className}`} />;

function Announce({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-label={label} className={className}>
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <Announce label="Loading page" className="shell py-10">
      {bar("h-9 w-64 max-w-full")}
      {bar("mt-4 h-4 w-96 max-w-full")}
      <div className="mt-8 space-y-4">
        {bar("h-36 w-full rounded-2xl")}
        {bar("h-36 w-full rounded-2xl")}
        {bar("h-24 w-full rounded-2xl")}
      </div>
    </Announce>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <Announce label="Loading products" className="shell py-10">
      {bar("h-9 w-56")}
      {bar("mt-4 h-4 w-80 max-w-full")}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-line bg-white">
            {bar("aspect-square w-full rounded-none")}
            <div className="space-y-2.5 p-4">
              {bar("h-3 w-20")}
              {bar("h-4 w-4/5")}
              {bar("h-3 w-full")}
              {bar("mt-4 h-5 w-24")}
            </div>
          </div>
        ))}
      </div>
    </Announce>
  );
}

export function ProductDetailSkeleton() {
  return (
    <Announce label="Loading product" className="shell py-8">
      {bar("h-4 w-72 max-w-full")}
      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-14">
        {bar("aspect-square w-full rounded-3xl")}
        <div>
          {bar("h-4 w-24")}
          {bar("mt-3 h-10 w-4/5")}
          {bar("mt-4 h-4 w-full")}
          {bar("mt-2 h-4 w-2/3")}
          {bar("mt-7 h-9 w-40")}
          {bar("mt-7 h-[50px] w-full rounded-xl")}
          {bar("mt-7 h-48 w-full rounded-2xl")}
        </div>
      </div>
    </Announce>
  );
}

export function DashboardSkeleton() {
  return (
    <Announce label="Loading">
      {bar("h-8 w-48")}
      {bar("mt-3 h-4 w-64 max-w-full")}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-2xl border border-line bg-white p-5">
            {bar("h-4 w-28")}
            {bar("mt-4 h-8 w-32")}
            {bar("mt-3 h-3 w-24")}
          </div>
        ))}
      </div>
      <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-white">
        {bar("h-11 w-full rounded-none")}
        <div className="space-y-4 p-5">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex items-center gap-4">
              {bar("h-4 w-28")}
              {bar("h-4 flex-1")}
              {bar("h-4 w-20")}
              {bar("h-7 w-20 rounded-full")}
            </div>
          ))}
        </div>
      </div>
    </Announce>
  );
}
