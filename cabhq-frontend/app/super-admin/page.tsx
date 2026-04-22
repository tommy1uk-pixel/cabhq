'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type CompanyStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED';
type BillingStatus = 'PAID' | 'OVERDUE' | 'TRIAL' | 'MANUAL';

type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  status: CompanyStatus;
  billingStatus: BillingStatus;
  users: number;
  drivers: number;
  vehicles: number;
  bookingsToday: number;
  monthlyRevenue: number;
  createdAt: string;
};

const initialCompanies: CompanyRow[] = [
  {
    id: '1',
    name: 'Alpha Cars',
    slug: 'alpha-cars',
    status: 'ACTIVE',
    billingStatus: 'PAID',
    users: 8,
    drivers: 34,
    vehicles: 28,
    bookingsToday: 142,
    monthlyRevenue: 18420,
    createdAt: '2025-11-02T09:20:00',
  },
  {
    id: '2',
    name: 'CityLine Transport',
    slug: 'cityline-transport',
    status: 'TRIAL',
    billingStatus: 'TRIAL',
    users: 3,
    drivers: 11,
    vehicles: 9,
    bookingsToday: 37,
    monthlyRevenue: 4120,
    createdAt: '2026-03-18T14:40:00',
  },
  {
    id: '3',
    name: 'Metro Executive',
    slug: 'metro-executive',
    status: 'ACTIVE',
    billingStatus: 'PAID',
    users: 14,
    drivers: 61,
    vehicles: 44,
    bookingsToday: 206,
    monthlyRevenue: 33780,
    createdAt: '2025-07-21T11:00:00',
  },
  {
    id: '4',
    name: 'Rapid Cab Group',
    slug: 'rapid-cab-group',
    status: 'SUSPENDED',
    billingStatus: 'OVERDUE',
    users: 5,
    drivers: 19,
    vehicles: 17,
    bookingsToday: 0,
    monthlyRevenue: 0,
    createdAt: '2025-12-05T16:10:00',
  },
];

function formatCurrency(value: number) {
  return `£${value.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  const d = new Date(value);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function companyStatusClass(status: CompanyStatus) {
  if (status === 'ACTIVE') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (status === 'TRIAL') {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function billingStatusClass(status: BillingStatus) {
  if (status === 'PAID') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (status === 'TRIAL' || status === 'MANUAL') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

export default function SuperAdminOverviewPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>(initialCompanies);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    initialCompanies[0]?.id ?? null,
  );

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;

    return companies.filter((company) =>
      [
        company.name,
        company.slug,
        company.status,
        company.billingStatus,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [companies, search]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedId) ?? null,
    [companies, selectedId],
  );

  const stats = useMemo(() => {
    return {
      companies: companies.length,
      active: companies.filter((company) => company.status === 'ACTIVE').length,
      trial: companies.filter((company) => company.status === 'TRIAL').length,
      suspended: companies.filter((company) => company.status === 'SUSPENDED').length,
      revenue: companies.reduce((sum, company) => sum + company.monthlyRevenue, 0),
      drivers: companies.reduce((sum, company) => sum + company.drivers, 0),
    };
  }, [companies]);

  function updateCompanyStatus(id: string, status: CompanyStatus) {
    setCompanies((prev) =>
      prev.map((company) =>
        company.id === id ? { ...company, status } : company,
      ),
    );
  }

  function updateBillingStatus(id: string, billingStatus: BillingStatus) {
    setCompanies((prev) =>
      prev.map((company) =>
        company.id === id ? { ...company, billingStatus } : company,
      ),
    );
  }

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1850px]">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">
              Platform Control
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              Super Admin Overview
            </h1>
            <p className="mt-2 text-sm text-white/55">
              Company activity, billing state, usage totals and tenant controls.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/super-admin/companies"
              className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Open Companies
            </Link>
            <Link
              href="/super-admin/companies/new"
              className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Add Company
            </Link>
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Companies" value={stats.companies} />
          <StatCard label="Active" value={stats.active} />
          <StatCard label="Trial" value={stats.trial} />
          <StatCard label="Suspended" value={stats.suspended} />
          <StatCard label="Drivers" value={stats.drivers} />
          <StatCard label="Revenue" value={formatCurrency(stats.revenue)} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Companies</h2>
                <p className="mt-1 text-sm text-white/60">
                  Review tenant usage, live status and billing posture.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search companies..."
                className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50 lg:w-[300px]"
              />
            </div>

            {filteredCompanies.length === 0 ? (
              <div className="rounded-2xl bg-[#0b1728] p-6 text-white/60">
                No companies found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCompanies.map((company) => {
                  const isSelected = selectedId === company.id;

                  return (
                    <div
                      key={company.id}
                      onClick={() => setSelectedId(company.id)}
                      className={`cursor-pointer rounded-2xl border p-5 transition ${
                        isSelected
                          ? 'border-cyan-500/50 bg-[#0c1b2c]'
                          : 'border-white/10 bg-[#0b1728]'
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-bold">{company.name}</h3>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${companyStatusClass(
                                company.status,
                              )}`}
                            >
                              {company.status}
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${billingStatusClass(
                                company.billingStatus,
                              )}`}
                            >
                              {company.billingStatus}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-white/60">
                            {company.slug}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                            <span>Users: {company.users}</span>
                            <span>Drivers: {company.drivers}</span>
                            <span>Vehicles: {company.vehicles}</span>
                            <span>Bookings Today: {company.bookingsToday}</span>
                            <span>Revenue: {formatCurrency(company.monthlyRevenue)}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/super-admin/companies/${company.id}/edit`}
                            className="rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/super-admin/companies/${company.id}`}
                            className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                          >
                            Open
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Company Focus</h2>
            <p className="mt-1 text-sm text-white/60">
              Selected tenant summary and quick admin actions.
            </p>

            {!selectedCompany ? (
              <div className="mt-5 rounded-2xl bg-[#0b1728] p-6 text-white/60">
                No company selected.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-white">
                      {selectedCompany.name}
                    </h3>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${companyStatusClass(
                        selectedCompany.status,
                      )}`}
                    >
                      {selectedCompany.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-white/60">{selectedCompany.slug}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Usage
                  </h4>
                  <DetailRow label="Users" value={String(selectedCompany.users)} />
                  <DetailRow label="Drivers" value={String(selectedCompany.drivers)} />
                  <DetailRow label="Vehicles" value={String(selectedCompany.vehicles)} />
                  <DetailRow
                    label="Bookings Today"
                    value={String(selectedCompany.bookingsToday)}
                  />
                  <DetailRow
                    label="Monthly Revenue"
                    value={formatCurrency(selectedCompany.monthlyRevenue)}
                  />
                  <DetailRow
                    label="Created"
                    value={formatDate(selectedCompany.createdAt)}
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Quick Actions
                  </h4>

                  <div className="space-y-2">
                    <button
                      onClick={() =>
                        updateCompanyStatus(selectedCompany.id, 'ACTIVE')
                      }
                      className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      Mark Active
                    </button>

                    <button
                      onClick={() =>
                        updateCompanyStatus(selectedCompany.id, 'TRIAL')
                      }
                      className="w-full rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
                    >
                      Mark Trial
                    </button>

                    <button
                      onClick={() =>
                        updateCompanyStatus(selectedCompany.id, 'SUSPENDED')
                      }
                      className="w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                    >
                      Suspend Company
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Billing
                  </h4>

                  <div className="space-y-2">
                    <button
                      onClick={() =>
                        updateBillingStatus(selectedCompany.id, 'PAID')
                      }
                      className="w-full rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/10"
                    >
                      Mark Paid
                    </button>

                    <button
                      onClick={() =>
                        updateBillingStatus(selectedCompany.id, 'TRIAL')
                      }
                      className="w-full rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/10"
                    >
                      Mark Trial
                    </button>

                    <button
                      onClick={() =>
                        updateBillingStatus(selectedCompany.id, 'OVERDUE')
                      }
                      className="w-full rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-200 hover:bg-red-500/20"
                    >
                      Mark Overdue
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-white/60">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-2 last:border-b-0">
      <span className="text-sm text-white/50">{label}</span>
      <span className="max-w-[60%] text-right text-sm text-white/85">
        {value}
      </span>
    </div>
  );
}