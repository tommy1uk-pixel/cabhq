'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type Status = 'ACTIVE' | 'TRIAL' | 'SUSPENDED';
type Plan = 'STARTER' | 'OPERATOR' | 'PRO' | 'ENTERPRISE';

type Company = {
  id: string;
  companyName: string;
  owner: string;
  email: string;
  status: Status;
  plan: Plan;
  monthlyRevenue: number;
  drivers: number;
  vehicles: number;
  bookings: number;
  createdAt: string;
};

const seedCompanies: Company[] = [
  {
    id: 'cmp_001',
    companyName: 'Alpha Cars',
    owner: 'Tommy Brown',
    email: 'ops@alphacars.co.uk',
    status: 'ACTIVE',
    plan: 'OPERATOR',
    monthlyRevenue: 18420,
    drivers: 34,
    vehicles: 28,
    bookings: 3184,
    createdAt: '2025-11-01',
  },
  {
    id: 'cmp_002',
    companyName: 'Metro Executive',
    owner: 'Sarah Lee',
    email: 'admin@metroexec.co.uk',
    status: 'TRIAL',
    plan: 'PRO',
    monthlyRevenue: 0,
    drivers: 12,
    vehicles: 8,
    bookings: 441,
    createdAt: '2026-03-12',
  },
  {
    id: 'cmp_003',
    companyName: 'Northline Travel',
    owner: 'James Ford',
    email: 'ops@northline.co.uk',
    status: 'SUSPENDED',
    plan: 'STARTER',
    monthlyRevenue: 79,
    drivers: 6,
    vehicles: 5,
    bookings: 102,
    createdAt: '2025-09-18',
  },
];

function money(v: number) {
  return `£${v.toLocaleString('en-GB')}`;
}

function badgeStatus(status: Status) {
  if (status === 'ACTIVE')
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';

  if (status === 'TRIAL')
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';

  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function badgePlan(plan: Plan) {
  if (plan === 'STARTER')
    return 'border-white/10 bg-white/5 text-white/70';

  if (plan === 'OPERATOR')
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';

  if (plan === 'PRO')
    return 'border-violet-500/30 bg-violet-500/10 text-violet-300';

  return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
}

export default function SuperAdminCompaniesPage() {
  const [search, setSearch] = useState('');
  const [companies] = useState<Company[]>(seedCompanies);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return companies;

    return companies.filter((c) =>
      [
        c.companyName,
        c.owner,
        c.email,
        c.plan,
        c.status,
      ].some((v) => v.toLowerCase().includes(q)),
    );
  }, [search, companies]);

  const stats = useMemo(() => {
    return {
      total: companies.length,
      active: companies.filter((c) => c.status === 'ACTIVE').length,
      trial: companies.filter((c) => c.status === 'TRIAL').length,
      suspended: companies.filter((c) => c.status === 'SUSPENDED').length,
      revenue: companies.reduce((sum, c) => sum + c.monthlyRevenue, 0),
    };
  }, [companies]);

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1800px]">

        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">
              Super Admin
            </div>

            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              Companies
            </h1>

            <p className="mt-2 text-white/55">
              Manage tenants, subscriptions, billing and platform growth.
            </p>
          </div>

          <Link
            href="/super-admin/companies/new"
            className="rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
          >
            Create Company
          </Link>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Companies" value={stats.total} />
          <StatCard label="Active" value={stats.active} />
          <StatCard label="Trial" value={stats.trial} />
          <StatCard label="Suspended" value={stats.suspended} />
          <StatCard label="MRR" value={money(stats.revenue)} />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <h2 className="text-2xl font-bold">All Companies</h2>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, owner, email..."
              className="w-full xl:w-[340px] rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="space-y-4">
            {filtered.map((company) => (
              <div
                key={company.id}
                className="rounded-2xl border border-white/10 bg-[#0b1728] p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-bold text-white">
                        {company.companyName}
                      </h3>

                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeStatus(company.status)}`}>
                        {company.status}
                      </span>

                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgePlan(company.plan)}`}>
                        {company.plan}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-white/60">
                      {company.owner} · {company.email}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                      <span>Drivers: {company.drivers}</span>
                      <span>Vehicles: {company.vehicles}</span>
                      <span>Bookings: {company.bookings}</span>
                      <span>Revenue: {money(company.monthlyRevenue)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/super-admin/companies/${company.id}`}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                    >
                      Open
                    </Link>

                    <Link
                      href={`/super-admin/companies/${company.id}/billing`}
                      className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20"
                    >
                      Billing
                    </Link>

                    <Link
                      href={`/super-admin/companies/${company.id}/edit`}
                      className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
                    >
                      Edit
                    </Link>
                  </div>

                </div>
              </div>
            ))}

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-white/55">
                No companies found.
              </div>
            ) : null}
          </div>
        </section>
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