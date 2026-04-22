type SuperAdminPanelProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export default function SuperAdminPanel({
  title,
  description,
  children,
}: SuperAdminPanelProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-white/60">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}