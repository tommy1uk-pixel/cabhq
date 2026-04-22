'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type PlanType = 'STARTER' | 'OPERATOR' | 'PRO' | 'ENTERPRISE';
type BillingStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED';
type InvoiceStatus = 'PAID' | 'DUE' | 'OVERDUE' | 'PENDING';

type CompanyBillingRow = {
  id: string;
  companyName: string;
  slug: string;
  plan: PlanType;
  monthlyPrice: number;
  usageCharges: number;
  invoiceTotal: number;
  billingStatus: BillingStatus;
  invoiceStatus: InvoiceStatus;
  billingEmail: string;
  nextBillingDate: string;
  lastPaymentDate?: string | null;
  paymentMethod?: string | null;
  users: number;
  drivers: number;
  vehicles: number;
  notes?: string | null;
};

const PLAN_META: Record<
  PlanType,
  {
    label: string;
    priceLabel: string;
    monthlyPrice: number;
    badge: string;
    badgeClass: string;
    cardClass: string;
    buttonClass: string;
    features: string[];
  }
> = {
  STARTER: {
    label: 'Starter',
    priceLabel: '£49/month',
    monthlyPrice: 49,
    badge: 'Best for new operators',
    badgeClass:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    cardClass: 'border-cyan-500/20 bg-[#071427]',
    buttonClass: 'bg-white text-black hover:bg-slate-200',
    features: [
      '1–5 vehicles',
      'Manual dispatch board',
      'Create bookings',
      'Future bookings',
      'Manual job assignment',
      'Add/manage drivers',
      'Add/manage vehicles',
      '1 admin login',
      'Company settings',
      'Email support',
    ],
  },
  OPERATOR: {
    label: 'Operator',
    priceLabel: '£89/month',
    monthlyPrice: 89,
    badge: 'Most popular',
    badgeClass: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300',
    cardClass: 'border-cyan-500/30 bg-[#081a31]',
    buttonClass: 'bg-cyan-500 text-black hover:bg-cyan-400',
    features: [
      'Everything in Starter',
      'Auto dispatch v1',
      'Closest driver suggestions',
      'Driver availability filtering',
      'Live driver tracking map',
      'Real-time status board',
      'Up to 5 admin users',
      'Role-based staff access',
      'Priority support',
      'Driver performance basics',
    ],
  },
  PRO: {
    label: 'Pro',
    priceLabel: '£149/month',
    monthlyPrice: 149,
    badge: 'For established fleets',
    badgeClass: 'border-violet-500/25 bg-violet-500/10 text-violet-300',
    cardClass: 'border-violet-500/30 bg-[#101328]',
    buttonClass: 'bg-violet-500 text-white hover:bg-violet-400',
    features: [
      'Everything in Operator',
      'Driver licence expiry alerts',
      'DBS expiry tracking',
      'Badge expiry reminders',
      'Vehicle insurance alerts',
      'MOT expiry reminders',
      'Zone / area logic',
      'Smart dispatch rules',
      'Priority booking logic',
      'Driver performance reports',
      'Booking trends',
      'Revenue / job summaries',
      'Unlimited admin users',
    ],
  },
  ENTERPRISE: {
    label: 'Enterprise',
    priceLabel: '£249+/month',
    monthlyPrice: 249,
    badge: 'For larger groups',
    badgeClass: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
    cardClass: 'border-amber-500/30 bg-[#17120a]',
    buttonClass: 'bg-amber-400 text-black hover:bg-amber-300',
    features: [
      'Everything in Pro',
      'Multiple companies / depots',
      'Central owner controls',
      'Group reporting',
      'API access',
      'Custom workflows',
      'Bespoke setup',
      'Dedicated account support',
      'Staff training',
      'Priority roadmap requests',
      'White-label options later',
    ],
  },
};

const initialCompanies: CompanyBillingRow[] = [
  {
    id: '1',
    companyName: 'Alpha Cars',
    slug: 'alpha-cars',
    plan: 'OPERATOR',
    monthlyPrice: 89,
    usageCharges: 24,
    invoiceTotal: 113,
    billingStatus: 'ACTIVE',
    invoiceStatus: 'PAID',
    billingEmail: 'billing@alphacars.co.uk',
    nextBillingDate: '2026-05-01T00:00:00',
    lastPaymentDate: '2026-04-01T09:14:00',
    paymentMethod: 'Visa ending 4242',
    users: 4,
    drivers: 18,
    vehicles: 14,
    notes: 'Growing operator using live dispatch and map tools.',
  },
  {
    id: '2',
    companyName: 'CityLine Transport',
    slug: 'cityline-transport',
    plan: 'STARTER',
    monthlyPrice: 49,
    usageCharges: 0,
    invoiceTotal: 49,
    billingStatus: 'TRIAL',
    invoiceStatus: 'PENDING',
    billingEmail: 'finance@cityline.co.uk',
    nextBillingDate: '2026-04-28T00:00:00',
    lastPaymentDate: null,
    paymentMethod: 'Awaiting card setup',
    users: 1,
    drivers: 5,
    vehicles: 4,
    notes: 'New operator moving off paper diary workflow.',
  },
  {
    id: '3',
    companyName: 'Metro Executive',
    slug: 'metro-executive',
    plan: 'PRO',
    monthlyPrice: 149,
    usageCharges: 38,
    invoiceTotal: 187,
    billingStatus: 'ACTIVE',
    invoiceStatus: 'PAID',
    billingEmail: 'accounts@metroexec.co.uk',
    nextBillingDate: '2026-05-04T00:00:00',
    lastPaymentDate: '2026-04-04T08:22:00',
    paymentMethod: 'Direct Debit',
    users: 9,
    drivers: 41,
    vehicles: 28,
    notes: 'Compliance-heavy fleet with reporting requirements.',
  },
  {
    id: '4',
    companyName: 'Rapid Cab Group',
    slug: 'rapid-cab-group',
    plan: 'ENTERPRISE',
    monthlyPrice: 349,
    usageCharges: 91,
    invoiceTotal: 440,
    billingStatus: 'PAST_DUE',
    invoiceStatus: 'OVERDUE',
    billingEmail: 'ops@rapidcabgroup.co.uk',
    nextBillingDate: '2026-04-18T00:00:00',
    lastPaymentDate: '2026-03-18T11:41:00',
    paymentMethod: 'Visa ending 9021',
    users: 16,
    drivers: 73,
    vehicles: 52,
    notes: 'Multi-site group account with central oversight.',
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

function billingStatusClass(status: BillingStatus) {
  if (status === 'ACTIVE') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (status === 'TRIAL') {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }
  if (status === 'PAST_DUE') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }
  return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
}

function invoiceStatusClass(status: InvoiceStatus) {
  if (status === 'PAID') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (status === 'DUE' || status === 'PENDING') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }
  if (status === 'OVERDUE') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }
  return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
}

export default function SuperAdminBillingPage() {
  const [companies, setCompanies] = useState<CompanyBillingRow[]>(initialCompanies);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialCompanies[0]?.id ?? null,
  );
  const [search, setSearch] = useState('');

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;

    return companies.filter((company) =>
      [
        company.companyName,
        company.slug,
        company.billingEmail,
        company.plan,
        company.billingStatus,
        company.invoiceStatus,
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
      mrr: companies.reduce((sum, company) => sum + company.monthlyPrice, 0),
      usage: companies.reduce((sum, company) => sum + company.usageCharges, 0),
      invoiced: companies.reduce((sum, company) => sum + company.invoiceTotal, 0),
      active: companies.filter((company) => company.billingStatus === 'ACTIVE')
        .length,
      trials: companies.filter((company) => company.billingStatus === 'TRIAL')
        .length,
      overdue: companies.filter((company) => company.invoiceStatus === 'OVERDUE')
        .length,
    };
  }, [companies]);

  function setPlan(companyId: string, plan: PlanType) {
    setCompanies((prev) =>
      prev.map((company) =>
        company.id === companyId
          ? {
              ...company,
              plan,
              monthlyPrice: PLAN_META[plan].monthlyPrice,
              invoiceTotal: PLAN_META[plan].monthlyPrice + company.usageCharges,
            }
          : company,
      ),
    );
  }

  function setBillingStatus(companyId: string, billingStatus: BillingStatus) {
    setCompanies((prev) =>
      prev.map((company) =>
        company.id === companyId ? { ...company, billingStatus } : company,
      ),
    );
  }

  function setInvoiceStatus(companyId: string, invoiceStatus: InvoiceStatus) {
    setCompanies((prev) =>
      prev.map((company) =>
        company.id === companyId ? { ...company, invoiceStatus } : company,
      ),
    );
  }

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1850px]">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">
              Platform Billing
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              Super Admin Billing
            </h1>
            <p className="mt-2 text-sm text-white/55">
              Plan pricing aligned to Starter, Operator, Pro and Enterprise across all companies.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/super-admin"
              className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Back to Overview
            </Link>
            <button className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">
              Export Billing
            </button>
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard label="MRR" value={formatCurrency(stats.mrr)} />
          <StatCard label="Usage Charges" value={formatCurrency(stats.usage)} />
          <StatCard label="Invoiced" value={formatCurrency(stats.invoiced)} />
          <StatCard label="Active" value={stats.active} />
          <StatCard label="Trials" value={stats.trials} />
          <StatCard label="Overdue" value={stats.overdue} />
        </section>

        <div className="mb-6 grid gap-4 xl:grid-cols-4">
          {(Object.keys(PLAN_META) as PlanType[]).map((planKey) => {
            const plan = PLAN_META[planKey];

            return (
              <section
                key={planKey}
                className={`rounded-3xl border p-6 ${plan.cardClass}`}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${plan.badgeClass}`}
                  >
                    {plan.badge}
                  </span>
                </div>

                <h2 className="text-3xl font-bold text-white uppercase">
                  {plan.label}
                </h2>

                <div className="mt-4 flex items-end gap-2">
                  <span className="text-5xl font-bold text-white">
                    {plan.priceLabel.split('/')[0]}
                  </span>
                  <span className="pb-1 text-sm text-white/55">/month</span>
                </div>

                <div className="mt-5 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex gap-3 text-sm text-white/80">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/60">
                  {companies.filter((company) => company.plan === planKey).length} companies on this plan
                </div>
              </section>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Company Billing Accounts</h2>
                <p className="mt-1 text-sm text-white/60">
                  Review current plan, monthly charge, billing state and invoice status.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search companies..."
                className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50 lg:w-[320px]"
              />
            </div>

            {filteredCompanies.length === 0 ? (
              <div className="rounded-2xl bg-[#0b1728] p-6 text-white/60">
                No billing accounts found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCompanies.map((company) => (
                  <div
                    key={company.id}
                    onClick={() => setSelectedId(company.id)}
                    className={`cursor-pointer rounded-2xl border p-5 transition ${
                      selectedId === company.id
                        ? 'border-cyan-500/50 bg-[#0c1b2c]'
                        : 'border-white/10 bg-[#0b1728]'
                    }`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-bold">{company.companyName}</h3>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${PLAN_META[company.plan].badgeClass}`}
                          >
                            {PLAN_META[company.plan].label}
                          </span>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${billingStatusClass(
                              company.billingStatus,
                            )}`}
                          >
                            {company.billingStatus.replace('_', ' ')}
                          </span>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${invoiceStatusClass(
                              company.invoiceStatus,
                            )}`}
                          >
                            {company.invoiceStatus}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-white/60">
                          {company.billingEmail}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                          <span>Base: {formatCurrency(company.monthlyPrice)}</span>
                          <span>Usage: {formatCurrency(company.usageCharges)}</span>
                          <span>Total: {formatCurrency(company.invoiceTotal)}</span>
                          <span>Next Billing: {formatDate(company.nextBillingDate)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/super-admin/companies/${company.id}`}
                          className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                        >
                          Open
                        </Link>
                        <Link
                          href={`/super-admin/companies/${company.id}/edit`}
                          className="rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Billing Focus</h2>
            <p className="mt-1 text-sm text-white/60">
              Selected company pricing, billing controls and plan alignment.
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
                      {selectedCompany.companyName}
                    </h3>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${PLAN_META[selectedCompany.plan].badgeClass}`}
                    >
                      {PLAN_META[selectedCompany.plan].label}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-white/60">
                    {selectedCompany.billingEmail}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Pricing
                  </h4>
                  <DetailRow label="Plan" value={PLAN_META[selectedCompany.plan].label} />
                  <DetailRow label="Monthly Price" value={formatCurrency(selectedCompany.monthlyPrice)} />
                  <DetailRow label="Usage Charges" value={formatCurrency(selectedCompany.usageCharges)} />
                  <DetailRow label="Invoice Total" value={formatCurrency(selectedCompany.invoiceTotal)} />
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Account
                  </h4>
                  <DetailRow label="Payment Method" value={selectedCompany.paymentMethod || '—'} />
                  <DetailRow label="Last Payment" value={formatDate(selectedCompany.lastPaymentDate)} />
                  <DetailRow label="Next Billing" value={formatDate(selectedCompany.nextBillingDate)} />
                  <DetailRow label="Users" value={String(selectedCompany.users)} />
                  <DetailRow label="Drivers" value={String(selectedCompany.drivers)} />
                  <DetailRow label="Vehicles" value={String(selectedCompany.vehicles)} />
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Change Plan
                  </h4>

                  <div className="grid gap-2">
                    {(Object.keys(PLAN_META) as PlanType[]).map((plan) => (
                      <button
                        key={plan}
                        onClick={() => setPlan(selectedCompany.id, plan)}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                          selectedCompany.plan === plan
                            ? PLAN_META[plan].buttonClass
                            : 'border border-white/10 bg-transparent text-white hover:bg-white/10'
                        }`}
                      >
                        {PLAN_META[plan].label} · {PLAN_META[plan].priceLabel}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Billing Controls
                  </h4>

                  <div className="space-y-2">
                    <button
                      onClick={() => setBillingStatus(selectedCompany.id, 'ACTIVE')}
                      className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      Mark Active
                    </button>
                    <button
                      onClick={() => setBillingStatus(selectedCompany.id, 'TRIAL')}
                      className="w-full rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
                    >
                      Mark Trial
                    </button>
                    <button
                      onClick={() => setBillingStatus(selectedCompany.id, 'PAST_DUE')}
                      className="w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                    >
                      Mark Past Due
                    </button>
                    <button
                      onClick={() => setBillingStatus(selectedCompany.id, 'SUSPENDED')}
                      className="w-full rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                    >
                      Suspend Billing
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Invoice Controls
                  </h4>

                  <div className="space-y-2">
                    <button
                      onClick={() => setInvoiceStatus(selectedCompany.id, 'PAID')}
                      className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      Mark Paid
                    </button>
                    <button
                      onClick={() => setInvoiceStatus(selectedCompany.id, 'DUE')}
                      className="w-full rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
                    >
                      Mark Due
                    </button>
                    <button
                      onClick={() => setInvoiceStatus(selectedCompany.id, 'OVERDUE')}
                      className="w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                    >
                      Mark Overdue
                    </button>
                    <button
                      onClick={() => setInvoiceStatus(selectedCompany.id, 'PENDING')}
                      className="w-full rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                    >
                      Mark Pending
                    </button>
                  </div>
                </div>

                {selectedCompany.notes ? (
                  <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                      Notes
                    </h4>
                    <p className="text-sm text-white/75">{selectedCompany.notes}</p>
                  </div>
                ) : null}
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