'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type CompanyStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED';
type BillingStatus = 'PAID' | 'OVERDUE' | 'TRIAL' | 'MANUAL';

type CompanyDetail = {
  id: string;
  name: string;
  slug: string;
  status: CompanyStatus;
  billingStatus: BillingStatus;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  users: number;
  drivers: number;
  vehicles: number;
  bookingsToday: number;
  bookingsMonth: number;
  monthlyRevenue: number;
  monthlyPlatformFee: number;
  usageCharges: number;
  nextBillingDate: string;
  lastPaymentDate?: string | null;
  paymentMethod?: string | null;
  createdAt: string;
  notes?: string | null;
};

type ActivityItem = {
  id: string;
  title: string;
  time: string;
  tone: 'INFO' | 'WARNING' | 'SUCCESS';
};

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'INVITED' | 'DISABLED';
};

const company: CompanyDetail = {
  id: '1',
  name: 'Alpha Cars',
  slug: 'alpha-cars',
  status: 'ACTIVE',
  billingStatus: 'PAID',
  contactName: 'Tommy Brown',
  contactEmail: 'ops@alphacars.co.uk',
  contactPhone: '0207 555 1000',
  users: 8,
  drivers: 34,
  vehicles: 28,
  bookingsToday: 142,
  bookingsMonth: 3184,
  monthlyRevenue: 18420,
  monthlyPlatformFee: 299,
  usageCharges: 84,
  nextBillingDate: '2026-05-01T00:00:00',
  lastPaymentDate: '2026-04-01T09:14:00',
  paymentMethod: 'Visa ending 4242',
  createdAt: '2025-11-02T09:20:00',
  notes:
    'High-volume airport and account-work operator. Strong live usage with regular weekly dispatch activity.',
};

const recentActivity: ActivityItem[] = [
  {
    id: '1',
    title: 'Company billing invoice marked paid',
    time: '2026-04-21T09:10:00',
    tone: 'SUCCESS',
  },
  {
    id: '2',
    title: 'New dispatcher invited to platform',
    time: '2026-04-21T10:04:00',
    tone: 'INFO',
  },
  {
    id: '3',
    title: 'Vehicle compliance alert generated',
    time: '2026-04-21T10:48:00',
    tone: 'WARNING',
  },
  {
    id: '4',
    title: 'Dispatch board usage spike detected',
    time: '2026-04-21T11:05:00',
    tone: 'INFO',
  },
];

const users: UserItem[] = [
  {
    id: '1',
    name: 'Tommy Brown',
    email: 'ops@alphacars.co.uk',
    role: 'OWNER',
    status: 'ACTIVE',
  },
  {
    id: '2',
    name: 'Sarah Khan',
    email: 'dispatch@alphacars.co.uk',
    role: 'DISPATCHER',
    status: 'ACTIVE',
  },
  {
    id: '3',
    name: 'M Ali',
    email: 'accounts@alphacars.co.uk',
    role: 'ACCOUNTS',
    status: 'ACTIVE',
  },
  {
    id: '4',
    name: 'New Ops User',
    email: 'newops@alphacars.co.uk',
    role: 'DISPATCHER',
    status: 'INVITED',
  },
];

function formatCurrency(value: number) {
  return `£${value.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';

  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';

  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

function activityClass(tone: ActivityItem['tone']) {
  if (tone === 'SUCCESS') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200';
  }
  if (tone === 'WARNING') {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-200';
  }
  return 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200';
}

function userStatusClass(status: UserItem['status']) {
  if (status === 'ACTIVE') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (status === 'INVITED') {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

export default function SuperAdminCompanyDetailPage() {
  const [companyState, setCompanyState] = useState<CompanyDetail>(company);

  const stats = useMemo(() => {
    return {
      totalPeople: companyState.users + companyState.drivers,
      totalFleet: companyState.vehicles,
      totalRevenue: companyState.monthlyRevenue,
      totalBilling:
        companyState.monthlyPlatformFee + companyState.usageCharges,
    };
  }, [companyState]);

  function setStatus(status: CompanyStatus) {
    setCompanyState((prev) => ({ ...prev, status }));
  }

  function setBillingStatus(status: BillingStatus) {
    setCompanyState((prev) => ({ ...prev, billingStatus: status }));
  }

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1850px]">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">
              Tenant Detail
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              {companyState.name}
            </h1>
            <p className="mt-2 text-sm text-white/55">
              Full company profile, usage metrics, billing state, users and recent activity.
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
              href={`/super-admin/companies/${companyState.id}/edit`}
              className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Edit Company
            </Link>
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Users + Drivers" value={stats.totalPeople} />
          <StatCard label="Vehicles" value={stats.totalFleet} />
          <StatCard label="Bookings Today" value={companyState.bookingsToday} />
          <StatCard label="Bookings Month" value={companyState.bookingsMonth} />
          <StatCard
            label="Revenue"
            value={formatCurrency(stats.totalRevenue)}
          />
          <StatCard
            label="Billing Total"
            value={formatCurrency(stats.totalBilling)}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold">{companyState.name}</h2>

                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${companyStatusClass(
                    companyState.status,
                  )}`}
                >
                  {companyState.status}
                </span>

                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${billingStatusClass(
                    companyState.billingStatus,
                  )}`}
                >
                  {companyState.billingStatus}
                </span>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <DetailCard
                  title="Company Info"
                  rows={[
                    ['Slug', companyState.slug],
                    ['Created', formatDate(companyState.createdAt)],
                    ['Contact', companyState.contactName],
                    ['Email', companyState.contactEmail],
                    ['Phone', companyState.contactPhone],
                  ]}
                />

                <DetailCard
                  title="Operational Usage"
                  rows={[
                    ['Users', String(companyState.users)],
                    ['Drivers', String(companyState.drivers)],
                    ['Vehicles', String(companyState.vehicles)],
                    ['Bookings Today', String(companyState.bookingsToday)],
                    ['Bookings This Month', String(companyState.bookingsMonth)],
                  ]}
                />
              </div>

              {companyState.notes ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Notes
                  </div>
                  <p className="text-sm text-white/75">{companyState.notes}</p>
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-bold">Recent Activity</h2>
                <span className="text-sm text-white/45">
                  {recentActivity.length} events
                </span>
              </div>

              <div className="space-y-3">
                {recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 ${activityClass(
                      item.tone,
                    )}`}
                  >
                    <div className="text-sm font-semibold">{item.title}</div>
                    <div className="mt-2 text-xs opacity-80">
                      {formatDateTime(item.time)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-bold">Users</h2>
                <span className="text-sm text-white/45">{users.length} users</span>
              </div>

              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-2xl border border-white/10 bg-[#0b1728] p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-lg font-semibold text-white">
                          {user.name}
                        </div>
                        <div className="mt-1 text-sm text-white/60">
                          {user.email}
                        </div>
                        <div className="mt-2 text-xs text-white/45">
                          Role: {user.role}
                        </div>
                      </div>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${userStatusClass(
                          user.status,
                        )}`}
                      >
                        {user.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-bold">Billing Summary</h2>
              <p className="mt-1 text-sm text-white/60">
                Plan fee, usage charges, payment method and next invoice timing.
              </p>

              <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                <DetailRow label="Monthly Platform Fee" value={formatCurrency(companyState.monthlyPlatformFee)} />
                <DetailRow label="Usage Charges" value={formatCurrency(companyState.usageCharges)} />
                <DetailRow
                  label="Billing Total"
                  value={formatCurrency(
                    companyState.monthlyPlatformFee + companyState.usageCharges,
                  )}
                />
                <DetailRow label="Next Billing" value={formatDate(companyState.nextBillingDate)} />
                <DetailRow label="Last Payment" value={formatDate(companyState.lastPaymentDate)} />
                <DetailRow label="Payment Method" value={companyState.paymentMethod || '—'} />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-bold">Admin Actions</h2>
              <p className="mt-1 text-sm text-white/60">
                Quick status and billing controls for this tenant.
              </p>

              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Company Status
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => setStatus('ACTIVE')}
                      className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      Mark Active
                    </button>
                    <button
                      onClick={() => setStatus('TRIAL')}
                      className="w-full rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
                    >
                      Mark Trial
                    </button>
                    <button
                      onClick={() => setStatus('SUSPENDED')}
                      className="w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                    >
                      Suspend Company
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Billing Status
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => setBillingStatus('PAID')}
                      className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      Mark Paid
                    </button>
                    <button
                      onClick={() => setBillingStatus('TRIAL')}
                      className="w-full rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
                    >
                      Mark Trial
                    </button>
                    <button
                      onClick={() => setBillingStatus('OVERDUE')}
                      className="w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                    >
                      Mark Overdue
                    </button>
                    <button
                      onClick={() => setBillingStatus('MANUAL')}
                      className="w-full rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                    >
                      Mark Manual Billing
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Navigation
                  </div>

                  <div className="space-y-2">
                    <Link
                      href={`/super-admin/companies/${companyState.id}/edit`}
                      className="block w-full rounded-xl border border-white/10 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-white/10"
                    >
                      Edit Company
                    </Link>
                    <Link
                      href="/super-admin/billing"
                      className="block w-full rounded-xl border border-white/10 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-white/10"
                    >
                      Open Billing
                    </Link>
                  </div>
                </div>
              </div>
            </div>
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

function DetailCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
      <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
        {title}
      </div>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <DetailRow key={label} label={label} value={value} />
        ))}
      </div>
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