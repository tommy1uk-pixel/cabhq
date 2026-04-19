export default function OverviewMetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
        {value}
      </div>
      {hint ? <div className="mt-2 text-xs text-slate-400">{hint}</div> : null}
    </div>
  );
}