'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_CUSTOMER' | 'RESOLVED' | 'CLOSED';
type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type TicketSource = 'EMAIL' | 'CHAT' | 'PHONE' | 'INTERNAL';

type SupportTicket = {
  id: string;
  subject: string;
  companyName: string;
  requesterName: string;
  requesterEmail: string;
  status: TicketStatus;
  priority: TicketPriority;
  source: TicketSource;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  description: string;
};

const initialTickets: SupportTicket[] = [
  {
    id: 'TCK-1001',
    subject: 'Driver app not receiving jobs',
    companyName: 'Alpha Cars',
    requesterName: 'Tommy Brown',
    requesterEmail: 'ops@alphacars.co.uk',
    status: 'OPEN',
    priority: 'HIGH',
    source: 'EMAIL',
    assignedTo: 'Megan Ross',
    createdAt: '2026-04-22T09:10:00',
    updatedAt: '2026-04-22T09:24:00',
    description:
      'Multiple drivers are online but not seeing dispatched jobs in the mobile app.',
  },
  {
    id: 'TCK-1002',
    subject: 'Need help importing vehicles',
    companyName: 'Metro Executive',
    requesterName: 'Sarah Lee',
    requesterEmail: 'admin@metroexec.co.uk',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    source: 'CHAT',
    assignedTo: 'A Khan',
    createdAt: '2026-04-22T08:35:00',
    updatedAt: '2026-04-22T10:05:00',
    description:
      'Customer wants guidance importing existing fleet records from spreadsheet.',
  },
  {
    id: 'TCK-1003',
    subject: 'Billing invoice looks wrong',
    companyName: 'Premier Fleet',
    requesterName: 'David Smith',
    requesterEmail: 'accounts@premierfleet.co.uk',
    status: 'WAITING_ON_CUSTOMER',
    priority: 'HIGH',
    source: 'PHONE',
    assignedTo: 'D Patel',
    createdAt: '2026-04-21T16:20:00',
    updatedAt: '2026-04-22T08:55:00',
    description:
      'Customer queried usage charges on latest invoice and requested item breakdown.',
  },
  {
    id: 'TCK-1004',
    subject: 'How do I add multiple depots?',
    companyName: 'Skyline Cars',
    requesterName: 'Priya Shah',
    requesterEmail: 'owner@skylinecars.co.uk',
    status: 'RESOLVED',
    priority: 'LOW',
    source: 'EMAIL',
    assignedTo: 'Megan Ross',
    createdAt: '2026-04-20T11:12:00',
    updatedAt: '2026-04-21T13:45:00',
    description:
      'Enterprise customer asked about multi-depot setup and permissions structure.',
  },
];

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

function statusClass(status: TicketStatus) {
  if (status === 'OPEN') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (status === 'IN_PROGRESS') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  if (status === 'WAITING_ON_CUSTOMER') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  if (status === 'RESOLVED') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  return 'border-white/10 bg-white/5 text-white/70';
}

function priorityClass(priority: TicketPriority) {
  if (priority === 'URGENT') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (priority === 'HIGH') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  if (priority === 'MEDIUM') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  return 'border-white/10 bg-white/5 text-white/70';
}

export default function SuperAdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(initialTickets[0]?.id ?? null);

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tickets;

    return tickets.filter((ticket) =>
      [
        ticket.subject,
        ticket.companyName,
        ticket.requesterName,
        ticket.requesterEmail,
        ticket.status,
        ticket.priority,
        ticket.assignedTo,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [tickets, search]);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedId) ?? null,
    [tickets, selectedId],
  );

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((ticket) => ticket.status === 'OPEN').length,
      inProgress: tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length,
      waiting: tickets.filter((ticket) => ticket.status === 'WAITING_ON_CUSTOMER').length,
      resolved: tickets.filter((ticket) => ticket.status === 'RESOLVED').length,
    };
  }, [tickets]);

  function updateStatus(id: string, status: TicketStatus) {
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === id
          ? {
              ...ticket,
              status,
              updatedAt: new Date().toISOString(),
            }
          : ticket,
      ),
    );
  }

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1850px]">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">
              Super Admin
            </div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">Support Tickets</h1>
            <p className="mt-2 text-white/55">
              Track customer issues, billing queries and onboarding support requests.
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
              New Ticket
            </button>
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Tickets" value={stats.total} />
          <StatCard label="Open" value={stats.open} />
          <StatCard label="In Progress" value={stats.inProgress} />
          <StatCard label="Waiting" value={stats.waiting} />
          <StatCard label="Resolved" value={stats.resolved} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Queue</h2>
                <p className="mt-1 text-sm text-white/60">
                  Review all current support tickets across customers.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tickets..."
                className="w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50 lg:w-[320px]"
              />
            </div>

            <div className="space-y-4">
              {filteredTickets.map((ticket) => {
                const active = selectedId === ticket.id;

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedId(ticket.id)}
                    className={`cursor-pointer rounded-2xl border p-5 transition ${
                      active
                        ? 'border-cyan-500/50 bg-[#0c1b2c]'
                        : 'border-white/10 bg-[#0b1728]'
                    }`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold">{ticket.subject}</h3>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                              ticket.status,
                            )}`}
                          >
                            {ticket.status.replace(/_/g, ' ')}
                          </span>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityClass(
                              ticket.priority,
                            )}`}
                          >
                            {ticket.priority}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-white/60">
                          {ticket.companyName} · {ticket.requesterName}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                          <span>{ticket.id}</span>
                          <span>{ticket.source}</span>
                          <span>Assigned: {ticket.assignedTo}</span>
                          <span>Updated: {formatDateTime(ticket.updatedAt)}</span>
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

              {filteredTickets.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-white/55">
                  No tickets found.
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-6">
            {!selectedTicket ? (
              <Panel title="Ticket Detail">
                <div className="text-white/55">No ticket selected.</div>
              </Panel>
            ) : (
              <>
                <Panel title="Ticket Detail">
                  <DetailRow label="Ticket ID" value={selectedTicket.id} />
                  <DetailRow label="Company" value={selectedTicket.companyName} />
                  <DetailRow label="Requester" value={selectedTicket.requesterName} />
                  <DetailRow label="Email" value={selectedTicket.requesterEmail} />
                  <DetailRow label="Status" value={selectedTicket.status.replace(/_/g, ' ')} />
                  <DetailRow label="Priority" value={selectedTicket.priority} />
                  <DetailRow label="Source" value={selectedTicket.source} />
                  <DetailRow label="Assigned To" value={selectedTicket.assignedTo} />
                  <DetailRow label="Created" value={formatDateTime(selectedTicket.createdAt)} />
                  <DetailRow label="Updated" value={formatDateTime(selectedTicket.updatedAt)} />

                  <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                    <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
                      Description
                    </div>
                    <p className="text-sm text-white/75">{selectedTicket.description}</p>
                  </div>
                </Panel>

                <Panel title="Ticket Actions">
                  <div className="grid gap-3">
                    <button
                      onClick={() => updateStatus(selectedTicket.id, 'OPEN')}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                    >
                      Mark Open
                    </button>
                    <button
                      onClick={() => updateStatus(selectedTicket.id, 'IN_PROGRESS')}
                      className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
                    >
                      Mark In Progress
                    </button>
                    <button
                      onClick={() => updateStatus(selectedTicket.id, 'WAITING_ON_CUSTOMER')}
                      className="rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-500"
                    >
                      Waiting on Customer
                    </button>
                    <button
                      onClick={() => updateStatus(selectedTicket.id, 'RESOLVED')}
                      className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      Resolve Ticket
                    </button>
                    <button
                      onClick={() => updateStatus(selectedTicket.id, 'CLOSED')}
                      className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 hover:bg-red-500/20"
                    >
                      Close Ticket
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