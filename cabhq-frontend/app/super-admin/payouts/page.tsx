'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type PayoutStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';
type PayoutType = 'PARTNER_COMMISSION' | 'REFERRAL_BONUS' | 'RESELLER_SHARE';

type Payout = {
  id: string;
  partnerName: string;
  companyName: string;
  type: PayoutType;
  amount: number;
  period: string;
  status: PayoutStatus;
  dueDate: string;
  paidAt?: string | null;
  notes: string;
};

const initialPayouts: Payout[] = [
  {
    id: 'pay_001',
    partnerName: 'Megan Ross',
    companyName: 'Fleet Growth Partners',
    type: 'RESELLER_SHARE',
    amount: 480,
    period: 'Apr 2026',
    status: 'PENDING',
    dueDate: '2026-04-30',
    paidAt: null,
    notes: 'Commission from Alpha Cars and Metro Executive accounts.',
  },
  {
    id: 'pay_002',
    partnerName: 'A Khan',
    companyName: 'Taxi Ops Agency',
    type: 'PARTNER_COMMISSION',
    amount: 260,
    period: 'Apr 2026',
    status: 'PROCESSING',
    dueDate: '2026-04-30',
    paidAt: null,
    notes: 'Onboarding commission for fleet migration support.',
  },
  {
    id: 'pay_003',
    partnerName: 'David Cole',
    companyName: 'Dispatch Referrals UK',
    type: 'REFERRAL_BONUS',
    amount: 89,
    period: 'Mar 2026',
    status: 'PAID',
    dueDate: '2026-03-31',
    paidAt: '2026-04-02T10:15:00',
    notes: 'Referral bonus paid after first live billing cycle.',
  },
  {
    id: 'pay_004',
    partnerName: 'Priya Shah',
    companyName: 'Mobility Strategic Group',
    type: 'RESELLER_SHARE',
    amount: 620,
    period: 'Mar 2026',
    status: 'FAILED',
    dueDate: '2026-03-31',
    paidAt: null,
    notes: 'Bank transfer failed, awaiting updated payout details.',
  },
];

function money(value: number) {
  return `£${value.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: value.includes('T') ? '2-digit' : undefined,
    minute: value.includes('T') ? '2-digit' : undefined,
  });
}

function statusClass(status: PayoutStatus) {
  if (status === 'PAID') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (status === 'PROCESSING') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  if (status === 'PENDING') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function typeClass(type: PayoutType) {
  if (type === 'RESELLER_SHARE') return 'border-violet-500/30 bg-violet-500/10 text-violet-300';
  if (type === 'PARTNER_COMMISSION') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  return 'border-white/10 bg-white/5 text-white/75';
}

export default function SuperAdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>(initialPayouts);
  const [selectedId, setSelectedId] = useState<string | null>(initialPayouts[0]?.id ?? null);
  const [search, setSearch] = useState('');

  const filteredPayouts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payouts;

    return payouts.filter((payout) =>
      [
        payout.partnerName,
        payout.companyName,
        payout.type,
        payout.status,
        payout.period,
        payout.notes,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [payouts, search]);

  const selectedPayout = useMemo(
    () => payouts.find((payout) => payout.id === selectedId) ?? null,
    [payouts, selectedId],
  );

  const stats = useMemo(() => {
    return {
      total: payouts.length,
      pending: payouts.filter((p) => p.status === 'PENDING').length,
      processing: payouts.filter((p) => p.status === 'PROCESSING').length,
      paid: payouts.filter((p) => p.status === 'PAID').length,
      failed: payouts.filter((p) => p.status === 'FAILED').length,
      totalValue: payouts.reduce((sum, p) => sum + p.amount, 0),
    };
  }, [payouts]);

  function updateStatus(id: string, status: PayoutStatus) {
    setPayouts((prev) =>
      prev.map((payout) =>
        payout.id === id
          ? {
              ...payout,
              status,
              paidAt: status === 'PAID' ? new Date().toISOString() : payout.paidAt,
            }
          : payout,
      ),
    );
  }

  function addPayout() {
    const next: Payout = {
      id: `pay_${Math.random().toString(36).slice(2, 8)}`,
      partnerName: 'New Partner',
      companyName: 'New Partner Group',
      type: 'PARTNER_COMMISSION',
      amount: 120,
      period: 'Apr 2026',
      status: 'PENDING',
      dueDate: '2026-04-30',
      paidAt: null,
      notes: 'New payout created manually.',
    };

    setPayouts((prev) => [next, ...prev]);
    setSelectedId(next.id);
  }

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1850px]">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">
              Super Admin
            </div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              Payouts & Commissions
            </h1>
            <p className="mt-2 text-white/55">
              Track partner commissions, reseller shares and referral payouts.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/super-admin"
              className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Back to Overview
            </Link>
            <button
              onClick={addPayout}
              className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Create Payout
            </button>
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Payouts" value={stats.total} />
          <StatCard label="Pending" value={stats.pending} />
          <StatCard label="Processing" value={stats.processing} />
          <StatCard label="Paid" value={stats.paid} />
          <StatCard label="Failed" value={stats.failed} />
          <StatCard label="Total Value" value={money(stats.totalValue)} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Payout Queue</h2>
                <p className="mt-1 text-sm text-white/60">
                  Review and manage partner payout records.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search payouts..."
                className="w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50 lg:w-[320px]"
              />
            </div>

            <div className="space-y-4">
              {filteredPayouts.map((payout) => {
                const active = selectedId === payout.id;

                return (
                  <div
                    key={payout.id}
                    onClick={() => setSelectedId(payout.id)}
                    className={`cursor-pointer rounded-2xl border p-5 transition ${
                      active
                        ? 'border-cyan-500/50 bg-[#0c1b2c]'
                        : 'border-white/10 bg-[#0b1728]'
                    }`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold">{payout.partnerName}</h3>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(payout.status)}`}>
                            {payout.status}
                          </span>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${typeClass(payout.type)}`}>
                            {payout.type.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-white/60">
                          {payout.companyName} · {payout.period}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                          <span>Amount: {money(payout.amount)}</span>
                          <span>Due: {formatDate(payout.dueDate)}</span>
                          <span>Paid: {formatDate(payout.paidAt)}</span>
                        </div>
                      </div>

                      <div className="text-lg font-bold text-white">
                        {money(payout.amount)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredPayouts.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-white/55">
                  No payouts found.
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-6">
            {!selectedPayout ? (
              <Panel title="Payout Detail">
                <div className="text-white/55">No payout selected.</div>
              </Panel>
            ) : (
              <>
                <Panel title="Payout Detail">
                  <DetailRow label="Partner" value={selectedPayout.partnerName} />
                  <DetailRow label="Company" value={selectedPayout.companyName} />
                  <DetailRow label="Type" value={selectedPayout.type.replace(/_/g, ' ')} />
                  <DetailRow label="Status" value={selectedPayout.status} />
                  <DetailRow label="Period" value={selectedPayout.period} />
                  <DetailRow label="Amount" value={money(selectedPayout.amount)} />
                  <DetailRow label="Due Date" value={formatDate(selectedPayout.dueDate)} />
                  <DetailRow label="Paid At" value={formatDate(selectedPayout.paidAt)} />

                  <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                    <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
                      Notes
                    </div>
                    <p className="text-sm text-white/75">{selectedPayout.notes}</p>
                  </div>
                </Panel>

                <Panel title="Payout Actions">
                  <div className="grid gap-3">
                    <button
                      onClick={() => updateStatus(selectedPayout.id, 'PENDING')}
                      className="rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-500"
                    >
                      Mark Pending
                    </button>
                    <button
                      onClick={() => updateStatus(selectedPayout.id, 'PROCESSING')}
                      className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
                    >
                      Mark Processing
                    </button>
                    <button
                      onClick={() => updateStatus(selectedPayout.id, 'PAID')}
                      className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      Mark Paid
                    </button>
                    <button
                      onClick={() => updateStatus(selectedPayout.id, 'FAILED')}
                      className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500"
                    >
                      Mark Failed
                    </button>
                  </div>
                </Panel>
              </>
            )}
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