'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type LeadStage =
  | 'NEW'
  | 'CONTACTED'
  | 'DEMO_BOOKED'
  | 'TRIAL'
  | 'WON'
  | 'LOST';

type LeadSource =
  | 'PRICING_PAGE'
  | 'CONTACT_FORM'
  | 'REFERRAL'
  | 'OUTBOUND'
  | 'DEMO_REQUEST';

type PlanType = 'STARTER' | 'OPERATOR' | 'PRO' | 'ENTERPRISE';

type Lead = {
  id: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  source: LeadSource;
  requestedPlan: PlanType;
  stage: LeadStage;
  salesOwner: string;
  lastContactAt: string;
  notes: string;
};

const initialLeads: Lead[] = [
  {
    id: 'lead_001',
    fullName: 'Tommy Brown',
    companyName: 'Alpha Cars',
    email: 'ops@alphacars.co.uk',
    phone: '0207 555 1000',
    source: 'PRICING_PAGE',
    requestedPlan: 'OPERATOR',
    stage: 'TRIAL',
    salesOwner: 'Megan Ross',
    lastContactAt: '2026-04-21T11:20:00',
    notes: 'Strong fit. Wants live driver map and better dispatch workflow.',
  },
  {
    id: 'lead_002',
    fullName: 'Sarah Lee',
    companyName: 'Metro Executive',
    email: 'admin@metroexec.co.uk',
    phone: '0207 555 1010',
    source: 'DEMO_REQUEST',
    requestedPlan: 'PRO',
    stage: 'DEMO_BOOKED',
    salesOwner: 'A Khan',
    lastContactAt: '2026-04-22T09:15:00',
    notes: 'Interested in compliance tracking and reporting.',
  },
  {
    id: 'lead_003',
    fullName: 'James Ford',
    companyName: 'Northline Travel',
    email: 'ops@northline.co.uk',
    phone: '0207 555 2020',
    source: 'CONTACT_FORM',
    requestedPlan: 'STARTER',
    stage: 'CONTACTED',
    salesOwner: 'Megan Ross',
    lastContactAt: '2026-04-20T16:05:00',
    notes: 'Needs cheaper alternative to current dispatch software.',
  },
  {
    id: 'lead_004',
    fullName: 'Priya Shah',
    companyName: 'Skyline Cars',
    email: 'owner@skylinecars.co.uk',
    phone: '0207 555 3030',
    source: 'REFERRAL',
    requestedPlan: 'ENTERPRISE',
    stage: 'NEW',
    salesOwner: 'D Patel',
    lastContactAt: '2026-04-22T08:45:00',
    notes: 'Multi-site operator. Potential enterprise account.',
  },
];

function stageClass(stage: LeadStage) {
  if (stage === 'WON') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (stage === 'TRIAL' || stage === 'DEMO_BOOKED') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  if (stage === 'CONTACTED' || stage === 'NEW') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function sourceClass(source: LeadSource) {
  if (source === 'PRICING_PAGE' || source === 'DEMO_REQUEST') {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }
  if (source === 'REFERRAL') {
    return 'border-violet-500/30 bg-violet-500/10 text-violet-300';
  }
  if (source === 'OUTBOUND') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }
  return 'border-white/10 bg-white/5 text-white/70';
}

function planClass(plan: PlanType) {
  if (plan === 'STARTER') return 'border-white/10 bg-white/5 text-white/70';
  if (plan === 'OPERATOR') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  if (plan === 'PRO') return 'border-violet-500/30 bg-violet-500/10 text-violet-300';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
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

export default function SuperAdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    initialLeads[0]?.id ?? null,
  );
  const [notesDraft, setNotesDraft] = useState(initialLeads[0]?.notes ?? '');
  const [saved, setSaved] = useState(false);

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;

    return leads.filter((lead) =>
      [
        lead.fullName,
        lead.companyName,
        lead.email,
        lead.phone,
        lead.source,
        lead.requestedPlan,
        lead.stage,
        lead.salesOwner,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [leads, search]);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedId) ?? null,
    [leads, selectedId],
  );

  const stats = useMemo(() => {
    return {
      total: leads.length,
      new: leads.filter((lead) => lead.stage === 'NEW').length,
      demoBooked: leads.filter((lead) => lead.stage === 'DEMO_BOOKED').length,
      trial: leads.filter((lead) => lead.stage === 'TRIAL').length,
      won: leads.filter((lead) => lead.stage === 'WON').length,
      lost: leads.filter((lead) => lead.stage === 'LOST').length,
    };
  }, [leads]);

  function updateLeadStage(id: string, stage: LeadStage) {
    setLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, stage } : lead)));
  }

  function saveNotes() {
    if (!selectedLead) return;

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === selectedLead.id ? { ...lead, notes: notesDraft } : lead,
      ),
    );

    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  function selectLead(id: string) {
    setSelectedId(id);
    const lead = leads.find((item) => item.id === id);
    setNotesDraft(lead?.notes ?? '');
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
              Leads CRM
            </h1>
            <p className="mt-2 text-white/55">
              Track new prospects, demos, trials and closed deals.
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
              Add Lead
            </button>
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Leads" value={stats.total} />
          <StatCard label="New" value={stats.new} />
          <StatCard label="Demo Booked" value={stats.demoBooked} />
          <StatCard label="Trial" value={stats.trial} />
          <StatCard label="Won" value={stats.won} />
          <StatCard label="Lost" value={stats.lost} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Lead Pipeline</h2>
                <p className="mt-1 text-sm text-white/60">
                  Search and manage all inbound and outbound leads.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads..."
                className="w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50 lg:w-[320px]"
              />
            </div>

            <div className="space-y-4">
              {filteredLeads.map((lead) => {
                const active = selectedId === lead.id;

                return (
                  <div
                    key={lead.id}
                    onClick={() => selectLead(lead.id)}
                    className={`cursor-pointer rounded-2xl border p-5 transition ${
                      active
                        ? 'border-cyan-500/50 bg-[#0c1b2c]'
                        : 'border-white/10 bg-[#0b1728]'
                    }`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-bold">{lead.companyName}</h3>

                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${stageClass(lead.stage)}`}>
                            {lead.stage.replace('_', ' ')}
                          </span>

                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${planClass(lead.requestedPlan)}`}>
                            {lead.requestedPlan}
                          </span>

                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${sourceClass(lead.source)}`}>
                            {lead.source.replace('_', ' ')}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-white/60">
                          {lead.fullName} · {lead.email}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                          <span>Phone: {lead.phone}</span>
                          <span>Owner: {lead.salesOwner}</span>
                          <span>Last Contact: {formatDateTime(lead.lastContactAt)}</span>
                        </div>
                      </div>

                      <button
                        className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                        type="button"
                      >
                        View
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredLeads.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-white/55">
                  No leads found.
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-6">
            {!selectedLead ? (
              <Panel title="Lead Detail">
                <div className="text-white/55">No lead selected.</div>
              </Panel>
            ) : (
              <>
                <Panel title="Lead Detail">
                  <DetailRow label="Contact" value={selectedLead.fullName} />
                  <DetailRow label="Company" value={selectedLead.companyName} />
                  <DetailRow label="Email" value={selectedLead.email} />
                  <DetailRow label="Phone" value={selectedLead.phone} />
                  <DetailRow label="Source" value={selectedLead.source.replace('_', ' ')} />
                  <DetailRow label="Requested Plan" value={selectedLead.requestedPlan} />
                  <DetailRow label="Sales Owner" value={selectedLead.salesOwner} />
                  <DetailRow label="Last Contact" value={formatDateTime(selectedLead.lastContactAt)} />
                </Panel>

                <Panel title="Stage Controls">
                  <div className="grid gap-3">
                    <button
                      onClick={() => updateLeadStage(selectedLead.id, 'NEW')}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                    >
                      Mark New
                    </button>
                    <button
                      onClick={() => updateLeadStage(selectedLead.id, 'CONTACTED')}
                      className="rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-500"
                    >
                      Mark Contacted
                    </button>
                    <button
                      onClick={() => updateLeadStage(selectedLead.id, 'DEMO_BOOKED')}
                      className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
                    >
                      Mark Demo Booked
                    </button>
                    <button
                      onClick={() => updateLeadStage(selectedLead.id, 'TRIAL')}
                      className="rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-600"
                    >
                      Mark Trial
                    </button>
                    <button
                      onClick={() => updateLeadStage(selectedLead.id, 'WON')}
                      className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      Mark Won
                    </button>
                    <button
                      onClick={() => updateLeadStage(selectedLead.id, 'LOST')}
                      className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500"
                    >
                      Mark Lost
                    </button>
                  </div>
                </Panel>

                <Panel title="Sales Notes">
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