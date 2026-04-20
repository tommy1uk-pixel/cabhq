import Link from 'next/link';
import { fetchCompanies } from '@/lib/super-admin/api';
import CompaniesTable from '@/components/super-admin/CompaniesTable';
import LogoutButton from '@/components/auth/LogoutButton';

export default async function SuperAdminCompaniesPage() {
  const companies = await fetchCompanies();

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(
    (company) => company.status === 'ACTIVE',
  ).length;
  const pendingCompanies = companies.filter(
    (company) => company.status === 'PENDING',
  ).length;
  const suspendedCompanies = companies.filter(
    (company) => company.status === 'SUSPENDED',
  ).length;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="inline-flex rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300">
              Super Admin Control Centre
            </div>

            <div>
              <h1 className="text-5xl font-semibold tracking-tight text-white">
                Companies
              </h1>

              <p className="mt-3 max-w-3xl text-lg text-slate-400">
                Manage tenants, company provisioning, platform access,
                operational status, growth and lifecycle management across
                CabHQ.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LogoutButton />

            <Link
              href="/super-admin/companies/new"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-4 text-base font-semibold text-black transition hover:bg-slate-200"
            >
              Add Company
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Companies"
          value={totalCompanies}
          valueClassName="text-white"
          description="Active and pending tenants."
        />

        <MetricCard
          label="Active"
          value={activeCompanies}
          valueClassName="text-emerald-400"
          description="Currently operational companies."
        />

        <MetricCard
          label="Pending"
          value={pendingCompanies}
          valueClassName="text-amber-400"
          description="Awaiting onboarding or activation."
        />

        <MetricCard
          label="Suspended"
          value={suspendedCompanies}
          valueClassName="text-red-400"
          description="Restricted platform access."
        />
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              Company Directory
            </h2>

            <p className="mt-2 text-base text-slate-400">
              Search, review and manage all registered tenants.
            </p>
          </div>
        </div>

        <CompaniesTable companies={companies} />
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  valueClassName,
  description,
}: {
  label: string;
  value: number;
  valueClassName: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
        {label}
      </p>

      <p className={`mt-4 text-4xl font-semibold ${valueClassName}`}>
        {value}
      </p>

      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </div>
  );
}