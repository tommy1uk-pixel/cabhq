import { fetchCompany } from '@/lib/super-admin/api';
import Link from 'next/link';
import CompanyStatusBadge from '@/components/super-admin/CompanyStatusBadge';
import CompanyStatusActions from '@/components/super-admin/CompanyStatusActions';

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const company = await fetchCompany(companyId);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="inline-block rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
              Company ID: {company.id.slice(0, 8)}
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
              {company.name}
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Created{' '}
              {company.createdAt
                ? new Date(company.createdAt).toLocaleString()
                : '—'}
            </p>
          </div>

          <div className="space-y-4">
            <CompanyStatusBadge status={company.status} />

            <CompanyStatusActions
              companyId={company.id}
              status={company.status}
            />

            <div className="flex flex-wrap gap-3">
              <Link
                href="/super-admin/companies"
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Back to companies
              </Link>

              <Link
                href={`/super-admin/companies/${company.id}/edit`}
                className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950"
              >
                Edit company
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Company Details
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card label="Name" value={company.name} />
            <Card label="Code" value={company.code || '—'} />
            <Card label="Slug" value={company.slug || '—'} />
            <Card label="Status" value={company.status || '—'} />
            <Card label="Contact Name" value={company.contactName || '—'} />
            <Card label="Contact Email" value={company.contactEmail || '—'} />
            <Card label="Contact Phone" value={company.contactPhone || '—'} />
            <Card label="Timezone" value={company.timezone || '—'} />
            <Card label="Currency" value={company.currency || '—'} />
            <Card
              label="Driver Limit"
              value={String(company.driverLimit ?? 0)}
            />
            <Card
              label="Vehicle Limit"
              value={String(company.vehicleLimit ?? 0)}
            />
            <Card
              label="Dispatcher Seats"
              value={String(company.dispatcherSeatLimit ?? 0)}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Admin Users
          </h2>

          <div className="mt-6 space-y-3">
            {company.users && company.users.length > 0 ? (
              company.users.map((user) => (
                <div
                  key={user.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
                >
                  <div className="text-sm font-medium text-white">
                    {user.email}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {user.role}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
                No admin users yet.
              </div>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}