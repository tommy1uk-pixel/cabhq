type SuperAdminStatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
};

export default function SuperAdminStatCard({
  label,
  value,
  hint,
}: SuperAdminStatCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-white/60">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
      {hint ? <p className="mt-2 text-xs text-white/45">{hint}</p> : null}
    </div>
  );
}