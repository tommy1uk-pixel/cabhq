'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type PlanType = 'STARTER' | 'OPERATOR' | 'PRO' | 'ENTERPRISE';
type CompanyStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED';
type BillingState = 'PAID' | 'DUE' | 'OVERDUE';

type CompanyAnalyticsRow = {
  id: string;
  companyName: string;
  plan: PlanType;
  status: CompanyStatus;
  billingState: BillingState;
  monthlyRevenue: number;
  bookingsMonth: number;
  drivers: number;
  vehicles: number;
  activeUsers: number;
  createdAt: string;
};

type TrendRow = {
  label: string;
  companies: number;
  revenue: number;
  bookings: number;
};

const companiesSeed: CompanyAnalyticsRow[] = [
  {
    id: 'cmp_001',
    companyName: 'Alpha Cars',
    plan: 'OPERATOR',
    status: 'ACTIVE',
    billingState: 'PAID',
    monthlyRevenue: 18420,
    bookingsMonth: 3184,
    drivers: 34,
    vehicles: 28,
    activeUsers: 8,
    createdAt: '2025-11-01',
  },
  {
    id: 'cmp_002',
    companyName: 'Metro Executive',
    plan: 'PRO',
    status: 'TRIAL',
    billingState: 'DUE',
    monthlyRevenue: 0,
    bookingsMonth: 441,
    drivers: 12,
    vehicles: 8,
    activeUsers: 3,
    createdAt: '2026-03-12',
  },
  {
    id: 'cmp_003',
    companyName: 'Northline Travel',
    plan: 'STARTER',
    status: 'SUSPENDED',
    billingState: 'OVERDUE',
    monthlyRevenue: 79,
    bookingsMonth: 102,
    drivers: 6,
    vehicles: 5,
    activeUsers: 2,
    createdAt: '2025-09-18',
  },
  {
    id: 'cmp_004',
    companyName: 'Cityline Transport',
    plan: 'STARTER',
    status: 'ACTIVE',
    billingState: 'PAID',
    monthlyRevenue: 49,
    bookingsMonth: 188,
    drivers: 5,
    vehicles: 4,
    activeUsers: 1,
    createdAt: '2026-02-10',
  },
  {
    id: 'cmp_005',
    companyName: 'Premier Fleet',
    plan: 'ENTERPRISE',
    status: 'ACTIVE',
    billingState: 'PAID',
    monthlyRevenue: 249,
    bookingsMonth: 4020,
    drivers: 61,
    vehicles: 46,
    activeUsers: 14,
    createdAt: '2025-08-03',
  },
  {
    id: 'cmp_006',
    companyName: 'Skyline Cars',
    plan: 'PRO',
    status: 'ACTIVE',
    billingState: 'PAID',
    monthlyRevenue: 149,
    bookingsMonth: 1672,
    drivers: 22,
    vehicles: 16,
    activeUsers: 6,
    createdAt: '2026-01-20',
  },
];

const trendsSeed: TrendRow[] = [
  { label: 'Jan', companies: 8, revenue: 690, bookings: 6120 },
  { label: 'Feb', companies: 10, revenue: 927, bookings: 7040 },
  { label: 'Mar', companies: 13, revenue: 1176, bookings: 8290 },
  { label: 'Apr', companies: 15, revenue: 1546, bookings: 9607 },
];

function money(value: number) {
  return `£${value.toLocaleString('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function badgePlan(plan: PlanType) {
  if (plan === 'STARTER') {
    return 'border-white/10 bg-white/5 text-white/70';
  }
  if (plan === 'OPERATOR') {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }
  if (plan === 'PRO') {
    return 'border-violet-500/30 bg-violet-500/10 text-violet-300';
  }
  return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
}

function badgeStatus(status: CompanyStatus) {
  if (status === 'ACTIVE') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (status === 'TRIAL') {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function badgeBilling(status: BillingState) {
  if (status === 'PAID') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (status === 'DUE') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

export default function SuperAdminAnalyticsPage() {
  const [companies] = useState(companiesSeed);
  const [trends] = useState(trendsSeed);

  const stats = useMemo(() => {
    const mrr = companies
      .filter((c) => c.status !== 'SUSPENDED')
      .reduce((sum, c) => sum + c.monthlyRevenue, 0);

    const activeCompanies = companies.filter((c) => c.status === 'ACTIVE').length;
    const trialCompanies = companies.filter((c) => c.status === 'TRIAL').length;
    const overdueBilling = companies.filter((c) => c.billingState === 'OVERDUE').length;
    const totalBookings = companies.reduce((sum, c) => sum + c.bookingsMonth, 0);
    const totalDrivers = companies.reduce((sum, c) => sum + c.drivers, 0);
    const newThisMonth = companies.filter((c) => c.createdAt.startsWith('2026-03') || c.createdAt.startsWith('2026-04')).length;
    const churnRisk = companies.filter(
      (c) => c.status === 'SUSPENDED' || c.billingState === 'OVERDUE',
    ).length;

    return {
      mrr,
      activeCompanies,
      trialCompanies,
      overdueBilling,
      totalBookings,
      totalDrivers,
      newThisMonth,
      churnRisk,
    };
  }, [companies]);

  const planBreakdown = useMemo(() => {
    return {
      starter: companies.filter((c) => c.plan === 'STARTER').length,
      operator: companies.filter((c) => c.plan === 'OPERATOR').length,
      pro: companies.filter((c) => c.plan === 'PRO').length,
      enterprise: companies.filter((c) => c.plan === 'ENTERPRISE').length,
    };
  }, [companies]);

  const topRevenue = useMemo(() => {
    return [...companies]
      .sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
      .slice(0, 5);
  }, [companies]);

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1850px]">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">
              Super Admin
            </div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              Analytics
            </h1>
            <p className="mt-2 text-white/55">
              SaaS revenue, company growth, billing health and operator usage in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/super-admin"
              className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Back to Overview
            </Link>
            <Link
              href="/super-admin/companies"
              className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Open Companies
            </Link>
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
          <StatCard label="MRR" value={money(stats.mrr)} />
          <StatCard label="Active Companies" value={stats.activeCompanies} />
          <StatCard label="Trial Companies" value={stats.trialCompanies} />
          <StatCard label="Overdue Billing" value={stats.overdueBilling} />
          <StatCard label="Churn Risk" value={stats.churnRisk} />
          <StatCard label="New This Month" value={stats.newThisMonth} />
          <StatCard label="Bookings Month" value={stats.totalBookings.toLocaleString('en-GB')} />
          <StatCard label="Drivers" value={stats.totalDrivers.toLocaleString('en-GB')} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <Panel title="Growth Trend">
              <div className="grid gap-4 md:grid-cols-4">
                {trends.map((trend) => (
                  <div
                    key={trend.label}
                    className="rounded-2xl border border-white/10 bg-[#0b1728] p-5"
                  >
                    <div className="text-sm text-white/50">{trend.label}</div>
                    <div className="mt-3 text-3xl font-bold text-white">
                      {money(trend.revenue)}
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-white/50">
                      <div>Companies: {trend.companies}</div>
                      <div>Bookings: {trend.bookings.toLocaleString('en-GB')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Top Companies by Revenue">
              <div className="space-y-4">
                {topRevenue.map((company) => (
                  <div
                    key={company.id}
                    className="rounded-2xl border border-white/10 bg-[#0b1728] p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-bold">{company.companyName}</h3>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgePlan(company.plan)}`}>
                            {company.plan}
                          </span>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeStatus(company.status)}`}>
                            {company.status}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                          <span>Revenue: {money(company.monthlyRevenue)}</span>
                          <span>Bookings: {company.bookingsMonth.toLocaleString('en-GB')}</span>
                          <span>Drivers: {company.drivers}</span>
                          <span>Vehicles: {company.vehicles}</span>
                          <span>Users: {company.activeUsers}</span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Link
                          href={`/super-admin/companies/${company.id}`}
                          className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                        >
                          Open
                        </Link>
                        <Link
                          href={`/super-admin/companies/${company.id}/billing`}
                          className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
                        >
                          Billing
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <section className="space-y-6">
            <Panel title="Plan Distribution">
              <div className="grid gap-4 md:grid-cols-2">
                <MiniMetricCard label="Starter" value={planBreakdown.starter} tone="neutral" />
                <MiniMetricCard label="Operator" value={planBreakdown.operator} tone="cyan" />
                <MiniMetricCard label="Pro" value={planBreakdown.pro} tone="violet" />
                <MiniMetricCard label="Enterprise" value={planBreakdown.enterprise} tone="amber" />
              </div>
            </Panel>

            <Panel title="Billing Health">
              <div className="space-y-4">
                {companies.map((company) => (
                  <div
                    key={company.id}
                    className="rounded-2xl border border-white/10 bg-[#0b1728] p-4"
                  >
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold text-white">{company.companyName}</div>
                          <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${badgeBilling(company.billingState)}`}>
                            {company.billingState}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-white/50">
                          Revenue: {money(company.monthlyRevenue)} · Bookings: {company.bookingsMonth.toLocaleString('en-GB')}
                        </div>
                      </div>

                      <Link
                        href={`/super-admin/companies/${company.id}/billing`}
                        className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Platform Summary">
              <div className="space-y-3">
                <DetailRow label="Total Monthly Revenue" value={money(stats.mrr)} />
                <DetailRow label="Total Monthly Bookings" value={stats.totalBookings.toLocaleString('en-GB')} />
                <DetailRow label="Total Drivers" value={stats.totalDrivers.toLocaleString('en-GB')} />
                <DetailRow label="Trial Conversion Opportunity" value={String(stats.trialCompanies)} />
                <DetailRow label="Accounts Needing Billing Action" value={String(stats.overdueBilling)} />
              </div>
            </Panel>
          </section>
        </div>
      </div>
    </main>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>
      {children}
    </section>
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

function MiniMetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'cyan' | 'violet' | 'amber';
}) {
  const toneClass =
    tone === 'neutral'
      ? 'border-white/10 bg-[#0b1728]'
      : tone === 'cyan'
      ? 'border-cyan-500/20 bg-cyan-500/10'
      : tone === 'violet'
      ? 'border-violet-500/20 bg-violet-500/10'
      : 'border-amber-500/20 bg-amber-500/10';

  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <div className="text-sm text-white/55">{label}</div>
      <div className="mt-3 text-3xl font-bold text-white">{value}</div>
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
      <span className="text-right text-sm text-white/85">{value}</span>
    </div>
  );
}