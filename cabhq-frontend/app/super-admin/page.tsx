import Link from 'next/link';
import { fetchCompanies } from '@/lib/super-admin/api';
import OverviewMetricCard from '@/components/super-admin/OverviewMetricCard';
import OverviewPanel from '@/components/super-admin/OverviewPanel';
import CompanyStatusBadge from '@/components/super-admin/CompanyStatusBadge';

export default async function SuperAdminHomePage() {
  const companies = await fetchCompanies();

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(
    (company) => (company.status || 'UNKNOWN') === 'ACTIVE',
  ).length;
  const pendingCompanies = companies.filter(
    (company) => (company.status || 'UNKNOWN') === 'PENDING',
  ).length;
  const suspendedCompanies = companies.filter(
    (company) => (company.status || 'UNKNOWN') === 'SUSPENDED',
  ).length;

  const totalDriverCapacity = companies.reduce(
    (sum, company) => sum + (company.driverLimit ?? 0),
    0,
  );

  const totalVehicleCapacity = companies.reduce(
    (sum, company) => sum + (company.vehicleLimit ?? 0),
    0,
  );

  const newestCompanies = [...companies].slice(0, 5);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div className="inline-flex rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
              Platform Control Centre
            </div>

            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white">
                Super Admin Overview
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Monitor companies, capacity, onboarding readiness, and the overall
                health of the CabHQ platform from one place.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/super-admin/companies"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              View companies
            </Link>
            <Link
              href="/super-admin/companies/new"
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950"
            >
              Add company
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <OverviewMetricCard
          label="Total Companies"
          value={String(totalCompanies)}
          hint="All tenant organisations"
        />
        <OverviewMetricCard
          label="Active"
          value={String(activeCompanies)}
          hint="Live operational companies"
        />
        <OverviewMetricCard
          label="Pending"
          value={String(pendingCompanies)}
          hint="Setup not complete"
        />
        <OverviewMetricCard
          label="Suspended"
          value={String(suspendedCompanies)}
          hint="Access restricted"
        />
        <OverviewMetricCard
          label="Driver Capacity"
          value={String(totalDriverCapacity)}
          hint="Total allowed drivers"
        />
        <OverviewMetricCard
          label="Vehicle Capacity"
          value={String(totalVehicleCapacity)}
          hint="Total allowed vehicles"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <OverviewPanel title="Newest Companies">
          <div className="space-y-3">
            {newestCompanies.length === 0 ? (
              <div className="text-sm text-slate-400">No companies found.</div>
            ) : (
              newestCompanies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3"
                >
                  <div>
                    <div className="font-medium text-white">
                      {company.displayName || company.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {company.legalName || company.name}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <CompanyStatusBadge status={company.status || 'UNKNOWN'} />
                    <Link
                      href={`/super-admin/companies/${company.id}`}
                      className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-800"
                    >
                      Open
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </OverviewPanel>

        <OverviewPanel title="Platform Snapshot">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Current Position
              </div>
              <div className="mt-2 text-sm text-slate-300">
                CabHQ is now running with a centralised Super Admin layer, tenant
                list view, company detail workspace, and edit-company foundation.
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Next Recommended Builds
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <div>• edit company save flow completion</div>
                <div>• suspend / reactivate company actions</div>
                <div>• create company admin user flow</div>
                <div>• platform audit trail</div>
                <div>• company onboarding tracker</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Attention Areas
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <div>• legacy companies need status backfill</div>
                <div>• driver and vehicle limits need real data</div>
                <div>• metadata fields need cleaning for old records</div>
              </div>
            </div>
          </div>
        </OverviewPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <OverviewPanel title="Company Status Breakdown">
          <div className="space-y-3">
            {[
              ['ACTIVE', activeCompanies],
              ['PENDING', pendingCompanies],
              ['SUSPENDED', suspendedCompanies],
              [
                'UNKNOWN',
                companies.filter((c) => !c.status || c.status === 'UNKNOWN').length,
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <CompanyStatusBadge status={label} />
                </div>
                <div className="text-lg font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>
        </OverviewPanel>

        <OverviewPanel title="Capacity Summary">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Driver Capacity
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {totalDriverCapacity}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Combined platform allowance
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Vehicle Capacity
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {totalVehicleCapacity}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Combined platform allowance
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:col-span-2">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Operational Note
              </div>
              <div className="mt-2 text-sm text-slate-300">
                Once driver, vehicle, bookings, and dispatch metrics are wired into
                platform analytics, this panel can become a live operational
                dashboard instead of a structural summary.
              </div>
            </div>
          </div>
        </OverviewPanel>
      </section>
    </div>
  );
}