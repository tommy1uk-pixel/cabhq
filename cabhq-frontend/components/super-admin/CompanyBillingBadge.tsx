export default function CompanyBillingBadge({
  status,
}: {
  status?: string | null;
}) {
  const value = (status || 'TRIAL').toUpperCase();

  const styles: Record<string, string> = {
    TRIAL: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    ACTIVE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    PAST_DUE: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    CANCELLED: 'bg-red-500/15 text-red-300 border-red-500/30',
  };

  return (
    <span
      className={`inline-flex rounded-full border px-4 py-1.5 text-sm font-semibold tracking-wide ${
        styles[value] || styles.TRIAL
      }`}
    >
      {value}
    </span>
  );
}