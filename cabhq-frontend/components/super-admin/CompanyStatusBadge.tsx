export default function CompanyStatusBadge({
  status,
}: {
  status?: string | null;
}) {
  const value = (status || 'UNKNOWN').toUpperCase();

  const styles: Record<string, string> = {
    ACTIVE:
      'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    PENDING:
      'bg-amber-500/15 text-amber-300 border-amber-500/30',
    SUSPENDED:
      'bg-red-500/15 text-red-300 border-red-500/30',
    UNKNOWN:
      'bg-slate-500/15 text-slate-300 border-slate-500/30',
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${
        styles[value] || styles.UNKNOWN
      }`}
    >
      {value}
    </span>
  );
}