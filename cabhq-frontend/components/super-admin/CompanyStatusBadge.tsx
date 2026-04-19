const styles: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
  PENDING: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
  TRIAL: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30',
  SUSPENDED: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30',
  CANCELLED: 'bg-zinc-500/15 text-zinc-300 ring-1 ring-zinc-500/30',
  ARCHIVED: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30',
  UNKNOWN: 'bg-slate-800 text-slate-200 ring-1 ring-slate-700',
};

function prettyStatus(status?: string | null) {
  const safeStatus = status && status.trim() !== '' ? status : 'UNKNOWN';

  return safeStatus
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function CompanyStatusBadge({
  status,
}: {
  status?: string | null;
}) {
  const safeStatus = status && status.trim() !== '' ? status : 'UNKNOWN';

  const className =
    styles[safeStatus] ||
    'bg-slate-800 text-slate-200 ring-1 ring-slate-700';

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${className}`}
    >
      {prettyStatus(safeStatus)}
    </span>
  );
}