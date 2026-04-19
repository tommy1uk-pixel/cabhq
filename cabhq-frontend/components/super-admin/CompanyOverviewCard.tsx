import InfoRow from './InfoRow';

export default function CompanyOverviewCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          {title}
        </h2>
      </div>

      <div>{children}</div>
    </section>
  );
}

export function CompanyInfoRows({
  rows,
}: {
  rows: Array<{ label: string; value?: string | null }>;
}) {
  return (
    <div>
      {rows.map((row) => (
        <InfoRow
          key={row.label}
          label={row.label}
          value={row.value}
        />
      ))}
    </div>
  );
}