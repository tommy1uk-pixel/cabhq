'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type AuditType =
  | 'COMPANY_CREATED'
  | 'COMPANY_UPDATED'
  | 'COMPANY_SUSPENDED'
  | 'PLAN_CHANGED'
  | 'BILLING_FAILED'
  | 'PASSWORD_RESET'
  | 'USER_LOGIN'
  | 'USER_IMPERSONATION'
  | 'RATE_UPDATED'
  | 'DRIVER_DELETED'
  | 'API_KEY_CREATED';

type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

type AuditLog = {
  id: string;
  createdAt: string;
  actorName: string;
  actorEmail: string;
  companyName?: string;
  type: AuditType;
  severity: AuditSeverity;
  description: string;
  ipAddress: string;
};

const initialLogs: AuditLog[] = [
  {
    id: 'log_001',
    createdAt: '2026-04-22T09:12:00',
    actorName: 'Tommy Brown',
    actorEmail: 'ops@alphacars.co.uk',
    companyName: 'Alpha Cars',
    type: 'PLAN_CHANGED',
    severity: 'WARNING',
    description: 'Company plan changed from STARTER to OPERATOR.',
    ipAddress: '81.22.101.14',
  },
  {
    id: 'log_002',
    createdAt: '2026-04-22T09:34:00',
    actorName: 'Megan Ross',
    actorEmail: 'megan@cabhq.co.uk',
    companyName: 'Metro Executive',
    type: 'COMPANY_CREATED',
    severity: 'INFO',
    description: 'New company account created from super admin panel.',
    ipAddress: '10.0.0.2',
  },
  {
    id: 'log_003',
    createdAt: '2026-04-22T10:04:00',
    actorName: 'System',
    actorEmail: 'system@cabhq.local',
    companyName: 'Northline Travel',
    type: 'BILLING_FAILED',
    severity: 'CRITICAL',
    description: 'Recurring billing charge failed for monthly subscription.',
    ipAddress: '127.0.0.1',
  },
  {
    id: 'log_004',
    createdAt: '2026-04-22T10:18:00',
    actorName: 'Sarah Lee',
    actorEmail: 'admin@metroexec.co.uk',
    companyName: 'Metro Executive',
    type: 'USER_LOGIN',
    severity: 'INFO',
    description: 'Successful admin login from web dashboard.',
    ipAddress: '92.11.188.7',
  },
  {
    id: 'log_005',
    createdAt: '2026-04-22T10:40:00',
    actorName: 'Super Admin',
    actorEmail: 'admin@cabhq.co.uk',
    companyName: 'Alpha Cars',
    type: 'USER_IMPERSONATION',
    severity: 'WARNING',
    description: 'Super admin impersonated company owner for troubleshooting.',
    ipAddress: '10.0.0.1',
  },
  {
    id: 'log_006',
    createdAt: '2026-04-22T11:03:00',
    actorName: 'Tommy Brown',
    actorEmail: 'ops@alphacars.co.uk',
    companyName: 'Alpha Cars',
    type: 'RATE_UPDATED',
    severity: 'INFO',
    description: 'Standard fare card updated in settings.',
    ipAddress: '81.22.101.14',
  },
  {
    id: 'log_007',
    createdAt: '2026-04-22T11:20:00',
    actorName: 'System',
    actorEmail: 'system@cabhq.local',
    companyName: 'Skyline Cars',
    type: 'PASSWORD_RESET',
    severity: 'WARNING',
    description: 'Owner password reset request completed successfully.',
    ipAddress: '127.0.0.1',
  },
  {
    id: 'log_008',
    createdAt: '2026-04-22T11:48:00',
    actorName: 'Admin User',
    actorEmail: 'dispatch@premierfleet.co.uk',
    companyName: 'Premier Fleet',
    type: 'DRIVER_DELETED',
    severity: 'CRITICAL',
    description: 'Driver profile deleted from company records.',
    ipAddress: '145.62.81.33',
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

function severityClass(severity: AuditSeverity) {
  if (severity === 'INFO') {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }
  if (severity === 'WARNING') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function typeLabel(type: AuditType) {
  return type.replace(/_/g, ' ');
}

export default function SuperAdminAuditPage() {
  const [logs] = useState<AuditLog[]>(initialLogs);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | AuditSeverity>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(initialLogs[0]?.id ?? null);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesSearch =
        !q ||
        [
          log.actorName,
          log.actorEmail,
          log.companyName || '',
          log.type,
          log.description,
          log.ipAddress,
        ]
          .join(' ')
          .toLowerCase()
          .includes(q);

      const matchesSeverity =
        severityFilter === 'ALL' || log.severity === severityFilter;

      return matchesSearch && matchesSeverity;
    });
  }, [logs, search, severityFilter]);

  const selectedLog = useMemo(
    () => logs.find((log) => log.id === selectedId) ?? null,
    [logs, selectedId],
  );

  const stats = useMemo(() => {
    return {
      total: logs.length,
      info: logs.filter((log) => log.severity === 'INFO').length,
      warning: logs.filter((log) => log.severity === 'WARNING').length,
      critical: logs.filter((log) => log.severity === 'CRITICAL').length,
    };
  }, [logs]);

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1850px]">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">
              Super Admin
            </div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              Audit Logs
            </h1>
            <p className="mt-2 text-white/55">
              Track system actions, billing events, access history and sensitive admin operations.
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
              Export Logs
            </button>
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Events" value={stats.total} />
          <StatCard label="Info" value={stats.info} />
          <StatCard label="Warnings" value={stats.warning} />
          <StatCard label="Critical" value={stats.critical} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Event Stream</h2>
                <p className="mt-1 text-sm text-white/60">
                  Review platform-wide actions and sensitive changes.
                </p>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search logs..."
                  className="w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50 lg:w-[260px]"
                />

                <select
                  value={severityFilter}
                  onChange={(e) =>
                    setSeverityFilter(e.target.value as 'ALL' | AuditSeverity)
                  }
                  className="rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50"
                >
                  <option value="ALL">All severities</option>
                  <option value="INFO">Info</option>
                  <option value="WARNING">Warning</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {filteredLogs.map((log) => {
                const active = selectedId === log.id;

                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedId(log.id)}
                    className={`cursor-pointer rounded-2xl border p-5 transition ${
                      active
                        ? 'border-cyan-500/50 bg-[#0c1b2c]'
                        : 'border-white/10 bg-[#0b1728]'
                    }`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold">{typeLabel(log.type)}</h3>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClass(
                              log.severity,
                            )}`}
                          >
                            {log.severity}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-white/70">{log.description}</p>

                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                          <span>{log.actorName}</span>
                          <span>{log.companyName || 'Platform'}</span>
                          <span>{formatDateTime(log.createdAt)}</span>
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

              {filteredLogs.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-white/55">
                  No logs found.
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-6">
            {!selectedLog ? (
              <Panel title="Event Detail">
                <div className="text-white/55">No event selected.</div>
              </Panel>
            ) : (
              <>
                <Panel title="Event Detail">
                  <DetailRow label="Event Type" value={typeLabel(selectedLog.type)} />
                  <DetailRow label="Severity" value={selectedLog.severity} />
                  <DetailRow label="Actor" value={selectedLog.actorName} />
                  <DetailRow label="Actor Email" value={selectedLog.actorEmail} />
                  <DetailRow label="Company" value={selectedLog.companyName || 'Platform'} />
                  <DetailRow label="IP Address" value={selectedLog.ipAddress} />
                  <DetailRow label="Created At" value={formatDateTime(selectedLog.createdAt)} />

                  <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                    <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
                      Description
                    </div>
                    <p className="text-sm text-white/75">{selectedLog.description}</p>
                  </div>
                </Panel>

                <Panel title="Quick Actions">
                  <div className="grid gap-3">
                    <button className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
                      Copy Event ID
                    </button>
                    <button className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20">
                      Export Event
                    </button>
                    <button className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200 hover:bg-amber-500/20">
                      Flag for Review
                    </button>
                  </div>
                </Panel>

                <Panel title="Monitoring Notes">
                  <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4 text-sm text-white/65">
                    Use audit logs to monitor admin impersonation, failed billing,
                    account suspension, plan changes and sensitive user actions.
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