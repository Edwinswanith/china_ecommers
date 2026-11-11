interface AuthCardProps {
  eyebrow?: string;
  title: string;
  intro: string;
  wide?: boolean;
  children: React.ReactNode;
}

export function AuthCard({ eyebrow, title, intro, wide = false, children }: AuthCardProps) {
  return (
    <div className="bg-muted">
      <div className={`shell py-12 md:py-16 ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-card)] md:p-9">
          {eyebrow ? <p className="text-[14px] font-medium text-brand">{eyebrow}</p> : null}
          <h1 className="display mt-1 text-2xl md:text-[1.75rem]">{title}</h1>
          <p className="mb-7 mt-2 text-[15px] leading-relaxed text-subtle">{intro}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
