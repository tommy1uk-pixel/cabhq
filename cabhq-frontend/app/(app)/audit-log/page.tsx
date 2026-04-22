'use client';

import { useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';

type AuditActionType =
  | 'BOOKING_CREATED'
  | 'BOOKING_UPDATED'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_REASSIGNED'
  | 'BOOKING_CANCELLED'
  | 'STATUS_CHANGED'
  | 'DRIVER_CREATED'
  | 'VEHICLE_UPDATED'
  | 'LOGIN'
  | 'PAYMENT_RECORDED';

type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

type AuditLogItem = {
  id: string;
  action: AuditActionType;
  severity: AuditSeverity;
  actorName: string;
  actorRole: string;
  entityType: 'BOOKING' | 'DRIVER' | 'VEHICLE' | 'PAYMENT' | 'AUTH' | 'SYSTEM';
  entityRef: string;
  createdAt: string;
  summary: string;
  details: string[];
  ipAddress?: string;
};

const initialAuditLogs: AuditLogItem[] = [
  {
    id: '1',
    action: 'BOOKING_CREATED',
    severity: 'INFO',
    actorName: 'Dispatch Admin',
    actorRole: 'ADMIN',
    entityType: 'BOOKING',
    entityRef: 'CAB-250421-1001',
    createdAt: '2026-04-21T08:12:00',
    summary: 'Booking created for Heathrow pickup.',
    details: [
      'Customer: John Smith',
      'Pickup: Heathrow Terminal 3',
      'Dropoff: Paddington Station',
      'Quoted Price: £68.00',
    ],
    ipAddress: '82.14.110.24',
  },
  {
    id: '2',
    action: 'DRIVER_ASSIGNED',
    severity: 'INFO',
    actorName: 'Dispatch Admin',
    actorRole: 'DISPATCHER',
    entityType: 'BOOKING',
    entityRef: 'CAB-250421-1002',
    createdAt: '2026-04-21T09:59:00',
    summary: 'Driver assigned to booking.',
    details: ['Driver: Imran Patel', 'Vehicle: LG21 XYZ'],
    ipAddress: '82.14.110.24',
  },
  {
    id: '3',
    action: 'BOOKING_CANCELLED',
    severity: 'WARNING',
    actorName: 'Support Team',
    actorRole: 'STAFF',
    entityType: 'BOOKING',
    entityRef: 'CAB-250421-1007',
    createdAt: '2026-04-21T10:31:00',
    summary: 'Booking cancelled by operator.',
    details: ['Reason: Customer no longer travelling'],
    ipAddress: '82.14.110.31',
  },
  {
    id: '4',
    action: 'VEHICLE_UPDATED',
    severity: 'WARNING',
    actorName: 'Fleet Admin',
    actorRole: 'ADMIN',
    entityType: 'VEHICLE',
    entityRef: 'LG21 XYZ',
    createdAt: '2026-04-21T10:48:00',
    summary: 'Vehicle marked OFF_ROAD.',
    details: ['Reason: MOT expired', 'Dispatch blocked automatically'],
    ipAddress: '82.14.110.19',
  },
  {
    id: '5',
    action: 'LOGIN',
    severity: 'CRITICAL',
    actorName: 'Unknown User',
    actorRole: 'UNKNOWN',
    entityType: 'AUTH',
    entityRef: 'LOGIN-EVENT',
    createdAt: '2026-04-21T11:03:00',
    summary: 'Multiple failed login attempts detected.',
    details: ['5 failed attempts in 2 minutes', 'User email: ops@cabhq.test'],
    ipAddress: '45.89.201.17',
  },
];

function formatDateTime(value: string) {
  const d = new Date(value);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function severityClass(severity: AuditSeverity) {
  if (severity === 'INFO') {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }
  if (severity === 'WARNING') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function entityClass(entityType: AuditLogItem['entityType']) {
  const map: Record<AuditLogItem['entityType'], string> = {
    BOOKING: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    DRIVER: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300',
    VEHICLE: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
    PAYMENT: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    AUTH: 'border-red-500/30 bg-red-500/10 text-red-300',
    SYSTEM: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  };

  return map[entityType];
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>(initialAuditLogs);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    initialAuditLogs[0]?.id ?? null,
  );

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;

    return logs.filter((item) =>
      [
        item.action,
        item.severity,
        item.actorName,
        item.actorRole,
        item.entityType,
        item.entityRef,
        item.summary,
        ...item.details,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [logs, search]);

  const selectedLog = useMemo(
    () => logs.find((item) => item.id === selectedId) ?? null,
    [logs, selectedId],
  );

  const stats = useMemo(() => {
    return {
      total: logs.length,
      info: logs.filter((log) => log.severity === 'INFO').length,
      warning: logs.filter((log) => log.severity === 'WARNING').length,
      critical: logs.filter((log) => log.severity === 'CRITICAL').length,
      auth: logs.filter((log) => log.entityType === 'AUTH').length,
    };
  }, [logs]);

  function clearLog(id: string) {
    const confirmed = window.confirm('Remove this audit record from the page?');
    if (!confirmed) return;

    setLogs((prev) => prev.filter((item) => item.id !== id));

    if (selectedId === id) {
      const remaining = logs.filter((item) => item.id !== id);
      setSelectedId(remaining[0]?.id ?? null);
    }
  }

  return (
    <AdminShell
      title="Audit Log"
      subtitle="Operational history, admin actions, compliance changes, dispatch events and security activity."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Events" value={stats.total} />
          <StatCard label="Info" value={stats.info} />
          <StatCard label="Warnings" value={stats.warning} />
          <StatCard label="Critical" value={stats.critical} />
          <StatCard label="Auth Events" value={stats.auth} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Event Stream</h2>
                <p className="mt-1 text-sm text-white/60">
                  Search recent actions across bookings, drivers, fleet and auth.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search audit log..."
                className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50 lg:w-[320px]"
              />
            </div>

            {filteredLogs.length === 0 ? (
              <div className="rounded-2xl bg-[#0b1728] p-6 text-white/60">
                No audit events found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((item) => {
                  const isSelected = selectedId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-5 transition ${
                        isSelected
                          ? 'border-cyan-500/50 bg-[#0c1b2c]'
                          : 'border-white/10 bg-[#0b1728]'
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div
                          className="min-w-0 cursor-pointer"
                          onClick={() =>
                            setSelectedId((current) =>
                              current === item.id ? null : item.id,
                            )
                          }
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold">{item.action.replace(/_/g, ' ')}</h3>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClass(
                                item.severity,
                              )}`}
                            >
                              {item.severity}
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${entityClass(
                                item.entityType,
                              )}`}
                            >
                              {item.entityType}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-white/75">{item.summary}</p>

                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                            <span>Actor: {item.actorName}</span>
                            <span>Role: {item.actorRole}</span>
                            <span>Ref: {item.entityRef}</span>
                            <span>{formatDateTime(item.createdAt)}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => clearLog(item.id)}
                          className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Event Detail</h2>
            <p className="mt-1 text-sm text-white/60">
              Full context for the selected audit event.
            </p>

            {!selectedLog ? (
              <div className="mt-5 rounded-2xl bg-[#0b1728] p-6 text-white/60">
                No event selected.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-white">
                      {selectedLog.action.replace(/_/g, ' ')}
                    </h3>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClass(
                        selectedLog.severity,
                      )}`}
                    >
                      {selectedLog.severity}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-white/70">{selectedLog.summary}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Metadata
                  </h4>
                  <DetailRow label="Actor" value={selectedLog.actorName} />
                  <DetailRow label="Role" value={selectedLog.actorRole} />
                  <DetailRow label="Entity Type" value={selectedLog.entityType} />
                  <DetailRow label="Entity Ref" value={selectedLog.entityRef} />
                  <DetailRow label="Time" value={formatDateTime(selectedLog.createdAt)} />
                  <DetailRow label="IP Address" value={selectedLog.ipAddress || '—'} />
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Details
                  </h4>

                  {selectedLog.details.length === 0 ? (
                    <p className="text-sm text-white/50">No additional details.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedLog.details.map((detail) => (
                        <div
                          key={detail}
                          className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/80"
                        >
                          {detail}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminShell>
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