'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type PartnerStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';
type PartnerTier = 'REFERRAL' | 'RESELLER' | 'AGENCY' | 'STRATEGIC';

type Partner = {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  status: PartnerStatus;
  tier: PartnerTier;
  commissionRate: number;
  referredCompanies: number;
  activeRevenue: number;
  pipelineValue: number;
  notes: string;
  joinedAt: string;
};

const initialPartners: Partner[] = [
  {
    id: 'prt_001',
    name: 'Megan Ross',
    companyName: 'Fleet Growth Partners',
    email: 'megan@fleetgrowth.co.uk',
    phone: '0207 555 1212',
    status: 'ACTIVE',
    tier: 'RESELLER',
    commissionRate: 18,
    referredCompanies: 7,
    activeRevenue: 1280,
    pipelineValue: 3400,
    notes: 'Strong reseller in London and South East. Good pipeline quality.',
    joinedAt: '2025-11-10T10:00:00',
  },
  {
    id: 'prt_002',
    name: 'A Khan',
    companyName: 'Taxi Ops Agency',
    email: 'akhan@taxiops.co.uk',
    phone: '0207 555 4545',
    status: 'ACTIVE',
    tier: 'AGENCY',
    commissionRate: 12,
    referredCompanies: 4,
    activeRevenue: 760,
    pipelineValue: 1800,
    notes: 'Agency partner focused on onboarding and migration.',
    joinedAt: '2026-01-06T09:20:00',
  },
  {
    id: 'prt_003',
    name: 'David Cole',
    companyName: 'Dispatch Referrals UK',
    email: 'david@dispatchreferrals.co.uk',
    phone: '0207 555 8989',
    status: 'PENDING',
    tier: 'REFERRAL',
    commissionRate: 10,
    referredCompanies: 1,
    activeRevenue: 89,
    pipelineValue: 650,
    notes: 'Early-stage referral partner, still validating fit.',
    joinedAt: '2026-04-03T15:10:00',
  },
  {
    id: 'prt_004',
    name: 'Priya Shah',
    companyName: 'Mobility Strategic Group',
    email: 'priya@mobilitystrategic.co.uk',
    phone: '0207 555 7777',
    status: 'SUSPENDED',
    tier: 'STRATEGIC',
    commissionRate: 20,
    referredCompanies: 2,
    activeRevenue: 498,
    pipelineValue: 0,
    notes: 'Paused pending updated commercial agreement.',
    joinedAt: '2025-08-18T12:40:00',
  },
];

function money(value: number) {
  return `£${value.toLocaleString('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
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

function statusClass(status: PartnerStatus) {
  if (status === 'ACTIVE') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (status === 'PENDING') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function tierClass(tier: PartnerTier) {
  if (tier === 'REFERRAL') {
    return 'border-white/10 bg-white/5 text-white/70';
  }
  if (tier === 'RESELLER') {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }
  if (tier === 'AGENCY') {
    return 'border-violet-500/30 bg-violet-500/10 text-violet-300';
  }
  return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
}

export default function SuperAdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>(initialPartners);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    initialPartners[0]?.id ?? null,
  );
  const [notesDraft, setNotesDraft] = useState(initialPartners[0]?.notes ?? '');
  const [saved, setSaved] = useState(false);

  const filteredPartners = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return partners;

    return partners.filter((partner) =>
      [
        partner.name,
        partner.companyName,
        partner.email,
        partner.phone,
        partner.status,
        partner.tier,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [partners, search]);

  const selectedPartner = useMemo(
    () => partners.find((partner) => partner.id === selectedId) ?? null,
    [partners, selectedId],
  );

  const stats = useMemo(() => {
    return {
      total: partners.length,
      active: partners.filter((partner) => partner.status === 'ACTIVE').length,
      pending: partners.filter((partner) => partner.status === 'PENDING').length,
      suspended: partners.filter((partner) => partner.status === 'SUSPENDED').length,
      companies: partners.reduce((sum, partner) => sum + partner.referredCompanies, 0),
      revenue: partners.reduce((sum, partner) => sum + partner.activeRevenue, 0),
      pipeline: partners.reduce((sum, partner) => sum + partner.pipelineValue, 0),
    };
  }, [partners]);

  function updateStatus(id: string, status: PartnerStatus) {
    setPartners((prev) =>
      prev.map((partner) => (partner.id === id ? { ...partner, status } : partner)),
    );
  }

  function saveNotes() {
    if (!selectedPartner) return;

    setPartners((prev) =>
      prev.map((partner) =>
        partner.id === selectedPartner.id ? { ...partner, notes: notesDraft } : partner,
      ),
    );

    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  function selectPartner(id: string) {
    setSelectedId(id);
    const partner = partners.find((item) => item.id === id);
    setNotesDraft(partner?.notes ?? '');
  }

  function addPartner() {
    const next: Partner = {
      id: `prt_${Math.random().toString(36).slice(2, 8)}`,
      name: 'New Partner',
      companyName: 'New Partner Group',
      email: 'partner@example.com',
      phone: '0207 555 0000',
      status: 'PENDING',
      tier: 'REFERRAL',
      commissionRate: 10,
      referredCompanies: 0,
      activeRevenue: 0,
      pipelineValue: 0,
      notes: 'New partner profile pending review.',
      joinedAt: new Date().toISOString(),
    };

    setPartners((prev) => [next, ...prev]);
    setSelectedId(next.id);
    setNotesDraft(next.notes);
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
              Partners & Resellers
            </h1>
            <p className="mt-2 text-white/55">
              Manage referral partners, resellers, agencies and strategic channel relationships.
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
              onClick={addPartner}
              className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Add Partner
            </button>
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
          <StatCard label="Partners" value={stats.total} />
          <StatCard label="Active" value={stats.active} />
          <StatCard label="Pending" value={stats.pending} />
          <StatCard label="Suspended" value={stats.suspended} />
          <StatCard label="Referred Companies" value={stats.companies} />
          <StatCard label="Active Revenue" value={money(stats.revenue)} />
          <StatCard label="Pipeline" value={money(stats.pipeline)} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Partner Directory</h2>
                <p className="mt-1 text-sm text-white/60">
                  Search and manage all channel partners and reseller relationships.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search partners..."
                className="w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50 lg:w-[320px]"
              />
            </div>

            <div className="space-y-4">
              {filteredPartners.map((partner) => {
                const active = selectedId === partner.id;

                return (
                  <div
                    key={partner.id}
                    onClick={() => selectPartner(partner.id)}
                    className={`cursor-pointer rounded-2xl border p-5 transition ${
                      active
                        ? 'border-cyan-500/50 bg-[#0c1b2c]'
                        : 'border-white/10 bg-[#0b1728]'
                    }`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold">{partner.companyName}</h3>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                              partner.status,
                            )}`}
                          >
                            {partner.status}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tierClass(
                              partner.tier,
                            )}`}
                          >
                            {partner.tier}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-white/60">
                          {partner.name} · {partner.email}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                          <span>Commission: {partner.commissionRate}%</span>
                          <span>Companies: {partner.referredCompanies}</span>
                          <span>Revenue: {money(partner.activeRevenue)}</span>
                          <span>Pipeline: {money(partner.pipelineValue)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                      >
                        View
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredPartners.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-white/55">
                  No partners found.
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-6">
            {!selectedPartner ? (
              <Panel title="Partner Detail">
                <div className="text-white/55">No partner selected.</div>
              </Panel>
            ) : (
              <>
                <Panel title="Partner Detail">
                  <DetailRow label="Partner Name" value={selectedPartner.name} />
                  <DetailRow label="Company" value={selectedPartner.companyName} />
                  <DetailRow label="Email" value={selectedPartner.email} />
                  <DetailRow label="Phone" value={selectedPartner.phone} />
                  <DetailRow label="Status" value={selectedPartner.status} />
                  <DetailRow label="Tier" value={selectedPartner.tier} />
                  <DetailRow
                    label="Commission Rate"
                    value={`${selectedPartner.commissionRate}%`}
                  />
                  <DetailRow
                    label="Referred Companies"
                    value={String(selectedPartner.referredCompanies)}
                  />
                  <DetailRow
                    label="Active Revenue"
                    value={money(selectedPartner.activeRevenue)}
                  />
                  <DetailRow
                    label="Pipeline Value"
                    value={money(selectedPartner.pipelineValue)}
                  />
                  <DetailRow
                    label="Joined"
                    value={formatDateTime(selectedPartner.joinedAt)}
                  />
                </Panel>

                <Panel title="Partner Actions">
                  <div className="grid gap-3">
                    <button
                      onClick={() => updateStatus(selectedPartner.id, 'ACTIVE')}
                      className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      Mark Active
                    </button>
                    <button
                      onClick={() => updateStatus(selectedPartner.id, 'PENDING')}
                      className="rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-500"
                    >
                      Mark Pending
                    </button>
                    <button
                      onClick={() => updateStatus(selectedPartner.id, 'SUSPENDED')}
                      className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500"
                    >
                      Suspend Partner
                    </button>
                  </div>
                </Panel>

                <Panel title="Partner Notes">
                  <textarea
                    rows={8}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none focus:border-cyan-500/50"
                  />
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={saveNotes}
                      className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
                    >
                      Save Notes
                    </button>
                    {saved ? <span className="text-sm text-emerald-300">Saved</span> : null}
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