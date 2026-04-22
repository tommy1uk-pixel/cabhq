type SuperAdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export default function SuperAdminPageHeader({
  eyebrow = 'Super Admin',
  title,
  description,
  actions,
}: SuperAdminPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">
          {eyebrow}
        </div>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-2 text-white/55">{description}</p>
        ) : null}
      </div>

      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}