'use client';

import { useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';

type HealthStatus = 'HEALTHY' | 'WARNING' | 'DOWN';
type IntegrationType =
  | 'API'
  | 'PAYMENTS'
  | 'SMS'
  | 'EMAIL'
  | 'MAPS'
  | 'SOCKET'
  | 'DATABASE';

type ServiceItem = {
  id: string;
  name: string;
  type: IntegrationType;
  status: HealthStatus;
  uptime: string;
  latencyMs: number;
  lastCheckedAt: string;
  notes: string;
};

const initialServices: ServiceItem[] = [
  {
    id: '1',
    name: 'Core API',
    type: 'API',
    status: 'HEALTHY',
    uptime: '99.98%',
    latencyMs: 84,
    lastCheckedAt: '2026-04-21T11:34:00',
    notes: 'Main booking and dispatch endpoints operational.',
  },
  {
    id: '2',
    name: 'Socket Server',
    type: 'SOCKET',
    status: 'HEALTHY',
    uptime: '99.92%',
    latencyMs: 42,
    lastCheckedAt: '2026-04-21T11:34:00',
    notes: 'Live driver and booking updates flowing normally.',
  },
  {
    id: '3',
    name: 'Stripe',
    type: 'PAYMENTS',
    status: 'WARNING',
    uptime: '99.70%',
    latencyMs: 261,
    lastCheckedAt: '2026-04-21T11:33:00',
    notes: 'Elevated payment processing latency detected.',
  },
  {
    id: '4',
    name: 'Twilio SMS',
    type: 'SMS',
    status: 'HEALTHY',
    uptime: '99.89%',
    latencyMs: 130,
    lastCheckedAt: '2026-04-21T11:33:00',
    notes: 'Outbound SMS delivery normal.',
  },
  {
    id: '5',
    name: 'Mail Provider',
    type: 'EMAIL',
    status: 'WARNING',
    uptime: '99.55%',
    latencyMs: 318,
    lastCheckedAt: '2026-04-21T11:32:00',
    notes: 'Queue delays on non-urgent email sends.',
  },
  {
    id: '6',
    name: 'Maps / Geocoding',
    type: 'MAPS',
    status: 'HEALTHY',
    uptime: '99.95%',
    latencyMs: 73,
    lastCheckedAt: '2026-04-21T11:33:00',
    notes: 'Address lookups and route plotting available.',
  },
  {
    id: '7',
    name: 'Primary Database',
    type: 'DATABASE',
    status: 'HEALTHY',
    uptime: '99.99%',
    latencyMs: 18,
    lastCheckedAt: '2026-04-21T11:34:00',
    notes: 'No replication lag detected.',
  },
  {
    id: '8',
    name: 'Backup API Region',
    type: 'API',
    status: 'DOWN',
    uptime: '96.40%',
    latencyMs: 0,
    lastCheckedAt: '2026-04-21T11:30:00',
    notes: 'Secondary failover region unavailable.',
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

function statusClass(status: HealthStatus) {
  if (status === 'HEALTHY') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (status === 'WARNING') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function typeClass(type: IntegrationType) {
  const map: Record<IntegrationType, string> = {
    API: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    PAYMENTS: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    SMS: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300',
    EMAIL: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
    MAPS: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
    SOCKET: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    DATABASE: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  };

  return map[type];
}

export default function SystemHealthPage() {
  const [services, setServices] = useState<ServiceItem[]>(initialServices);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialServices[0]?.id ?? null,
  );
  const [search, setSearch] = useState('');

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;

    return services.filter((service) =>
      [service.name, service.type, service.status, service.notes]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [services, search]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedId) ?? null,
    [services, selectedId],
  );

  const stats = useMemo(() => {
    return {
      total: services.length,
      healthy: services.filter((s) => s.status === 'HEALTHY').length,
      warning: services.filter((s) => s.status === 'WARNING').length,
      down: services.filter((s) => s.status === 'DOWN').length,
      avgLatency:
        services.length > 0
          ? Math.round(
              services.reduce((sum, service) => sum + service.latencyMs, 0) /
                services.length,
            )
          : 0,
    };
  }, [services]);

  function updateStatus(id: string, status: HealthStatus) {
    setServices((prev) =>
      prev.map((service) => (service.id === id ? { ...service, status } : service)),
    );
  }

  return (
    <AdminShell
      title="System Health / Integrations"
      subtitle="Service monitoring, provider health, latency visibility and operational integration status."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Services" value={stats.total} />
          <StatCard label="Healthy" value={stats.healthy} />
          <StatCard label="Warnings" value={stats.warning} />
          <StatCard label="Down" value={stats.down} />
          <StatCard label="Avg Latency" value={`${stats.avgLatency} ms`} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Services</h2>
                <p className="mt-1 text-sm text-white/60">
                  Monitor core systems and external providers from one place.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services..."
                className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-500/50 lg:w-[300px]"
              />
            </div>

            {filteredServices.length === 0 ? (
              <div className="rounded-2xl bg-[#0b1728] p-6 text-white/60">
                No services found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredServices.map((service) => {
                  const isSelected = selectedId === service.id;

                  return (
                    <div
                      key={service.id}
                      className={`cursor-pointer rounded-2xl border p-5 transition ${
                        isSelected
                          ? 'border-cyan-500/50 bg-[#0c1b2c]'
                          : 'border-white/10 bg-[#0b1728]'
                      }`}
                      onClick={() => setSelectedId(service.id)}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-bold">{service.name}</h3>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${typeClass(
                                service.type,
                              )}`}
                            >
                              {service.type}
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                                service.status,
                              )}`}
                            >
                              {service.status}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                            <span>Uptime: {service.uptime}</span>
                            <span>Latency: {service.latencyMs} ms</span>
                            <span>Checked: {formatDateTime(service.lastCheckedAt)}</span>
                          </div>

                          <p className="mt-3 text-sm text-white/65">{service.notes}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Service Detail</h2>
            <p className="mt-1 text-sm text-white/60">
              Selected service status, timings and quick controls.
            </p>

            {!selectedService ? (
              <div className="mt-5 rounded-2xl bg-[#0b1728] p-6 text-white/60">
                No service selected.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-white">
                      {selectedService.name}
                    </h3>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                        selectedService.status,
                      )}`}
                    >
                      {selectedService.status}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Metrics
                  </h4>
                  <DetailRow label="Type" value={selectedService.type} />
                  <DetailRow label="Uptime" value={selectedService.uptime} />
                  <DetailRow
                    label="Latency"
                    value={`${selectedService.latencyMs} ms`}
                  />
                  <DetailRow
                    label="Last Checked"
                    value={formatDateTime(selectedService.lastCheckedAt)}
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Notes
                  </h4>
                  <p className="text-sm text-white/75">{selectedService.notes}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Actions
                  </h4>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => updateStatus(selectedService.id, 'HEALTHY')}
                      className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      Mark Healthy
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(selectedService.id, 'WARNING')}
                      className="w-full rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
                    >
                      Mark Warning
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(selectedService.id, 'DOWN')}
                      className="w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                    >
                      Mark Down
                    </button>
                  </div>
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