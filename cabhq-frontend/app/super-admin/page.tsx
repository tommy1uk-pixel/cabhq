'use client';

import Link from 'next/link';
import SuperAdminPageHeader from '@/components/super-admin/SuperAdminPageHeader';
import SuperAdminPanel from '@/components/super-admin/SuperAdminPanel';
import SuperAdminStatCard from '@/components/super-admin/SuperAdminStatCard';

const stats = [
  { label: 'Total Companies', value: '15', hint: 'All active, trial and suspended tenants' },
  { label: 'MRR', value: '£1,546', hint: 'Monthly recurring revenue' },
  { label: 'Trials', value: '3', hint: 'Companies currently in trial' },
  { label: 'Overdue Billing', value: '2', hint: 'Accounts needing action' },
  { label: 'Open Tickets', value: '4', hint: 'Support queue currently open' },
  { label: 'Critical Audit Events', value: '2', hint: 'Sensitive events in last 24h' },
];

const companies = [
  {
    name: 'Alpha Cars',
    plan: 'OPERATOR',
    status: 'ACTIVE',
    revenue: '£89',
    billing: 'PAID',
  },
  {
    name: 'Metro Executive',
    plan: 'PRO',
    status: 'TRIAL',
    revenue: '£149',
    billing: 'DUE',
  },
  {
    name: 'Premier Fleet',
    plan: 'ENTERPRISE',
    status: 'ACTIVE',
    revenue: '£249',
    billing: 'PAID',
  },
  {
    name: 'Northline Travel',
    plan: 'STARTER',
    status: 'SUSPENDED',
    revenue: '£49',
    billing: 'OVERDUE',
  },
];

const activity = [
  {
    title: 'Plan upgraded for Alpha Cars',
    meta: 'Starter → Operator · 22 Apr · Super Admin',
    tone: 'info',
  },
  {
    title: 'Billing failed for Northline Travel',
    meta: 'Monthly renewal attempt failed · 22 Apr',
    tone: 'danger',
  },
  {
    title: 'New lead created from pricing page',
    meta: 'Skyline Cars · Enterprise interest',
    tone: 'info',
  },
  {
    title: 'Support ticket opened',
    meta: 'Driver app not receiving jobs · Alpha Cars',
    tone: 'warning',
  },
  {
    title: 'API key revoked',
    meta: 'Old Metro integration key removed',
    tone: 'neutral',
  },
];

const quickLinks = [
  { href: '/super-admin/companies', title: 'Companies', text: 'Manage tenants, plans and status.' },
  { href: '/super-admin/billing', title: 'Billing', text: 'Review subscriptions and invoices.' },
  { href: '/super-admin/analytics', title: 'Analytics', text: 'Monitor growth, MRR and usage.' },
  { href: '/super-admin/leads', title: 'Leads CRM', text: 'Track prospects, demos and trials.' },
  { href: '/super-admin/support', title: 'Support', text: 'Handle customer issues and tickets.' },
  { href: '/super-admin/platform', title: 'Platform Health', text: 'Monitor services and incidents.' },
];

function toneClass(tone: 'info' | 'warning' | 'danger' | 'neutral') {
  if (tone === 'info') return 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200';
  if (tone === 'warning') return 'border-amber-500/20 bg-amber-500/10 text-amber-200';
  if (tone === 'danger') return 'border-red-500/20 bg-red-500/10 text-red-200';
  return 'border-white/10 bg-white/5 text-white/70';
}

function badgeClass(value: string) {
  if (value === 'ACTIVE' || value === 'PAID') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (value === 'TRIAL' || value === 'DUE' || value === 'OPERATOR') {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }
  if (value === 'PRO') {
    return 'border-violet-500/30 bg-violet-500/10 text-violet-300';
  }
  if (value === 'ENTERPRISE') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }
  if (value === 'OVERDUE' || value === 'SUSPENDED') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }
  return 'border-white/10 bg-white/5 text-white/70';
}

export default function SuperAdminOverviewPage() {
  return (
    <main className="min-h-screen px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1850px]">
        <SuperAdminPageHeader
          eyebrow="Platform Overview"
          title="Super Admin Dashboard"
          description="Revenue, growth, billing health, support load and platform activity in one view."
          actions={
            <>
              <Link
                href="/super-admin/companies/create"
                className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
              >
                Create Company
              </Link>
              <Link
                href="/super-admin/analytics"
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Open Analytics
              </Link>
            </>
          }
        />

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {stats.map((stat) => (
            <SuperAdminStatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              hint={stat.hint}
            />
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <SuperAdminPanel
              title="Recent Platform Activity"
              description="The latest commercial and operational events."
            >
              <div className="mb-4 flex justify-end">
                <Link
                  href="/super-admin/audit"
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Open Audit
                </Link>
              </div>

              <div className="space-y-3">
                {activity.map((item) => (
                  <div
                    key={item.title}
                    className={`rounded-2xl border p-4 ${toneClass(item.tone as 'info' | 'warning' | 'danger' | 'neutral')}`}
                  >
                    <div className="text-sm font-semibold">{item.title}</div>
                    <div className="mt-2 text-xs opacity-80">{item.meta}</div>
                  </div>
                ))}
              </div>
            </SuperAdminPanel>

            <SuperAdminPanel
              title="Top Company Snapshot"
              description="Quick commercial view across key accounts."
            >
              <div className="mb-4 flex justify-end">
                <Link
                  href="/super-admin/companies"
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                >
                  View All
                </Link>
              </div>

              <div className="space-y-4">
                {companies.map((company) => (
                  <div
                    key={company.name}
                    className="rounded-2xl border border-white/10 bg-[#0b1728] p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold">{company.name}</h3>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(company.plan)}`}>
                            {company.plan}
                          </span>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(company.status)}`}>
                            {company.status}
                          </span>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(company.billing)}`}>
                            {company.billing}
                          </span>
                        </div>
                      </div>

                      <div className="text-sm font-semibold text-white">
                        {company.revenue}/month
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SuperAdminPanel>
          </section>

          <section className="space-y-6">
            <SuperAdminPanel
              title="Quick Access"
              description="Jump into the main operating areas."
            >
              <div className="grid gap-4">
                {quickLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-2xl border border-white/10 bg-[#0b1728] p-5 transition hover:bg-[#101d32]"
                  >
                    <div className="text-lg font-semibold text-white">{item.title}</div>
                    <div className="mt-2 text-sm text-white/60">{item.text}</div>
                  </Link>
                ))}
              </div>
            </SuperAdminPanel>

            <SuperAdminPanel title="Today’s Focus">
              <div className="space-y-4">
                <FocusRow label="Billing accounts needing review" value="2" />
                <FocusRow label="Trial companies close to conversion" value="3" />
                <FocusRow label="Open support tickets" value="4" />
                <FocusRow label="Pending payouts" value="2" />
                <FocusRow label="Feature flags in beta rollout" value="3" />
              </div>
            </SuperAdminPanel>

            <SuperAdminPanel title="Recommended Actions">
              <div className="space-y-3">
                <ActionButton href="/super-admin/billing" label="Review overdue billing" />
                <ActionButton href="/super-admin/leads" label="Follow up trial leads" />
                <ActionButton href="/super-admin/support" label="Clear support queue" />
                <ActionButton href="/super-admin/platform" label="Check degraded services" />
              </div>
            </SuperAdminPanel>
          </section>
        </div>
      </div>
    </main>
  );
}

function FocusRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-4 last:border-b-0 last:pb-0">
      <div className="text-sm text-white/60">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  );
}

function ActionButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#101d32]"
    >
      {label}
    </Link>
  );
}