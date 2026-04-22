'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type ServiceStatus = 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE' | 'MAINTENANCE';
type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type Service = {
  id: string;
  name: string;
  status: ServiceStatus;
  uptime: string;
  latencyMs: number;
  notes: string;
};

type Incident = {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: 'OPEN' | 'MONITORING' | 'RESOLVED';
  startedAt: string;
  updatedAt: string;
  summary: string;
};

const initialServices: Service[] = [
  {
    id: 'svc_001',
    name: 'API',
    status: 'OPERATIONAL',
    uptime: '99.98%',
    latencyMs: 84,
    notes: 'Core REST API healthy and stable.',
  },
  {
    id: 'svc_002',
    name: 'Dispatch Engine',
    status: 'OPERATIONAL',
    uptime: '99.95%',
    latencyMs: 112,
    notes: 'Auto dispatch and live assignment processing normal.',
  },
  {
    id: 'svc_003',
    name: 'Realtime Sockets',
    status: 'DEGRADED',
    uptime: '99.61%',
    latencyMs: 248,
    notes: 'Intermittent latency spikes on live tracking updates.',
  },
  {
    id: 'svc_004',
    name: 'Billing',
    status: 'OPERATIONAL',
    uptime: '99.99%',
    latencyMs: 72,
    notes: 'Subscription and invoicing services normal.',
  },
  {
    id: 'svc_005',
    name: 'Driver App',
    status: 'OPERATIONAL',
    uptime: '99.92%',
    latencyMs: 96,
    notes: 'Driver mobile traffic normal.',
  },
  {
    id: 'svc_006',
    name: 'Email / Notifications',
    status: 'MAINTENANCE',
    uptime: '99.70%',
    latencyMs: 140,
    notes: 'Scheduled maintenance window for template deployment.',
  },
];

const initialIncidents: Incident[] = [
  {
    id: 'inc_001',
    title: 'Realtime socket latency spike',
    severity: 'MEDIUM',
    status: 'MONITORING',
    startedAt: '2026-04-22T08:55:00',
    updatedAt: '2026-04-22T11:05:00',
    summary:
      'Some dispatch boards experienced slower-than-normal live updates for driver movement.',
  },
  {
    id: 'inc_002',
    title: 'Notification provider maintenance',
    severity: 'LOW',
    status: 'OPEN',
    startedAt: '2026-04-22T10:40:00',
    updatedAt: '2026-04-22T11:20:00',
    summary:
      'Email notification infrastructure in controlled maintenance mode during template rollout.',
  },
  {
    id: 'inc_003',
    title: 'Billing retry queue delay resolved',
    severity: 'HIGH',
    status: 'RESOLVED',
    startedAt: '2026-04-21T16:15:00',
    updatedAt: '2026-04-21T18:50:00',
    summary:
      'Automated billing retries were delayed due to upstream timeout, now resolved.',
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

function serviceStatusClass(status: ServiceStatus) {
  if (status === 'OPERATIONAL') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (status === 'DEGRADED') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }
  if (status === 'MAINTENANCE') {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function incidentSeverityClass(severity: IncidentSeverity) {
  if (severity === 'LOW') {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }
  if (severity === 'MEDIUM') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }
  if (severity === 'HIGH') {
    return 'border-orange-500/30 bg-orange-500/10 text-orange-300';
  }
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function incidentStatusClass(status: Incident['status']) {
  if (status === 'RESOLVED') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (status === 'MONITORING') {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }
  return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
}

export default function SuperAdminPlatformPage() {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    initialServices[0]?.id ?? null,
  );

  const stats = useMemo(() => {
    return {
      services: services.length,
      operational: services.filter((service) => service.status === 'OPERATIONAL')
        .length,
      degraded: services.filter((service) => service.status === 'DEGRADED').length,
      incidentsOpen: incidents.filter((incident) => incident.status !== 'RESOLVED')
        .length,
      avgLatency: Math.round(
        services.reduce((sum, service) => sum + service.latencyMs, 0) /
          services.length,
      ),
    };
  }, [services, incidents]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  function setServiceStatus(id: string, status: ServiceStatus) {
    setServices((prev) =>
      prev.map((service) =>
        service.id === id ? { ...service, status } : service,
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
            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              Platform Health
            </h1>
            <p className="mt-2 text-white/55">
              Monitor service health, incidents, uptime and performance across the platform.
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
              Create Incident
            </button>
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Services" value={stats.services} />
          <StatCard label="Operational" value={stats.operational} />
          <StatCard label="Degraded" value={stats.degraded} />
          <StatCard label="Open Incidents" value={stats.incidentsOpen} />
          <StatCard label="Avg Latency" value={`${stats.avgLatency} ms`} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <Panel title="Services">
              <div className="space-y-4">
                {services.map((service) => {
                  const active = selectedServiceId === service.id;

                  return (
                    <div
                      key={service.id}
                      onClick={() => setSelectedServiceId(service.id)}
                      className={`cursor-pointer rounded-2xl border p-5 transition ${
                        active
                          ? 'border-cyan-500/50 bg-[#0c1b2c]'
                          : 'border-white/10 bg-[#0b1728]'
                      }`}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-bold">{service.name}</h3>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${serviceStatusClass(
                                service.status,
                              )}`}
                            >
                              {service.status}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-white/70">{service.notes}</p>

                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                            <span>Uptime: {service.uptime}</span>
                            <span>Latency: {service.latencyMs} ms</span>
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
              </div>
            </Panel>

            <Panel title="Incidents">
              <div className="space-y-4">
                {incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="rounded-2xl border border-white/10 bg-[#0b1728] p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold">{incident.title}</h3>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${incidentSeverityClass(
                              incident.severity,
                            )}`}
                          >
                            {incident.severity}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${incidentStatusClass(
                              incident.status,
                            )}`}
                          >
                            {incident.status}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-white/70">{incident.summary}</p>

                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                          <span>Started: {formatDateTime(incident.startedAt)}</span>
                          <span>Updated: {formatDateTime(incident.updatedAt)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <section className="space-y-6">
            {!selectedService ? (
              <Panel title="Service Detail">
                <div className="text-white/55">No service selected.</div>
              </Panel>
            ) : (
              <>
                <Panel title="Service Detail">
                  <DetailRow label="Service" value={selectedService.name} />
                  <DetailRow label="Status" value={selectedService.status} />
                  <DetailRow label="Uptime" value={selectedService.uptime} />
                  <DetailRow label="Latency" value={`${selectedService.latencyMs} ms`} />

                  <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                    <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
                      Notes
                    </div>
                    <p className="text-sm text-white/75">{selectedService.notes}</p>
                  </div>
                </Panel>

                <Panel title="Service Actions">
                  <div className="grid gap-3">
                    <button
                      onClick={() => setServiceStatus(selectedService.id, 'OPERATIONAL')}
                      className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      Mark Operational
                    </button>
                    <button
                      onClick={() => setServiceStatus(selectedService.id, 'DEGRADED')}
                      className="rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-500"
                    >
                      Mark Degraded
                    </button>
                    <button
                      onClick={() => setServiceStatus(selectedService.id, 'MAINTENANCE')}
                      className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
                    >
                      Put in Maintenance
                    </button>
                    <button
                      onClick={() => setServiceStatus(selectedService.id, 'OUTAGE')}
                      className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500"
                    >
                      Mark Outage
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