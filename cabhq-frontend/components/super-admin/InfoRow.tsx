export default function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-800 py-3 last:border-b-0">
      <div className="text-sm text-slate-400">{label}</div>

      <div className="max-w-[60%] text-right text-sm font-medium text-white">
        {value && value.trim() !== '' ? value : '—'}
      </div>
    </div>
  );
}