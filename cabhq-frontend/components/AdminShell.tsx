'use client';

type AdminShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
};

export default function AdminShell({
  title,
  subtitle,
  children,
  actions,
}: AdminShellProps) {
  return (
    <div className="min-h-screen bg-transparent text-white">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/70">
              CabHQ
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              {title}
            </h1>

            {subtitle ? (
              <p className="mt-2 max-w-3xl text-sm text-white/60">{subtitle}</p>
            ) : null}
          </div>

          {actions ? (
            <div className="flex flex-wrap items-center gap-3">{actions}</div>
          ) : null}
        </div>

        {children}
      </div>
    </div>
  );
}