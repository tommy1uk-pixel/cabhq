type SuperAdminDetailRowProps = {
  label: string;
  value: string;
};

export default function SuperAdminDetailRow({
  label,
  value,
}: SuperAdminDetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-2 last:border-b-0">
      <span className="text-sm text-white/50">{label}</span>
      <span className="max-w-[60%] text-right text-sm text-white/85">
        {value}
      </span>
    </div>
  );
}