'use client';

import { useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';

type TrackingStatus =
  | 'ONLINE'
  | 'IDLE'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'ON_JOB'
  | 'OFFLINE';

type TrackedDriver = {
  id: string;
  name: string;
  vehicle: string;
  status: TrackingStatus;
  latitude: number;
  longitude: number;
  speedMph: number;
  heading: number;
  lastLocationAt: string;
  currentJobRef?: string | null;
  pickup?: string | null;
  dropoff?: string | null;
};

const initialDrivers: TrackedDriver[] = [
  {
    id: '1',
    name: 'Imran Patel',
    vehicle: 'LG21 XYZ • Toyota Prius',
    status: 'EN_ROUTE',
    latitude: 51.5098,
    longitude: -0.118,
    speedMph: 21,
    heading: 72,
    lastLocationAt: '2026-04-21T11:04:00',
    currentJobRef: 'CAB-250421-1002',
    pickup: 'Northside Medical Centre',
    dropoff: 'St Thomas Hospital',
  },
  {
    id: '2',
    name: 'David Ali',
    vehicle: 'KM19 ABC • Ford Galaxy',
    status: 'ON_JOB',
    latitude: 52.4797,
    longitude: -1.9027,
    speedMph: 34,
    heading: 145,
    lastLocationAt: '2026-04-21T11:03:00',
    currentJobRef: 'CAB-250421-1004',
    pickup: 'City Stay Hotel',
    dropoff: 'Birmingham Airport',
  },
  {
    id: '3',
    name: 'M Aslam',
    vehicle: 'YX20 JKL • Skoda Octavia',
    status: 'IDLE',
    latitude: 53.4808,
    longitude: -2.2426,
    speedMph: 0,
    heading: 0,
    lastLocationAt: '2026-04-21T10:58:00',
    currentJobRef: null,
    pickup: null,
    dropoff: null,
  },
  {
    id: '4',
    name: 'Sarah Begum',
    vehicle: 'BT22 PQR • Mercedes Vito',
    status: 'OFFLINE',
    latitude: 51.501,
    longitude: -0.1416,
    speedMph: 0,
    heading: 0,
    lastLocationAt: '2026-04-21T09:41:00',
    currentJobRef: null,
    pickup: null,
    dropoff: null,
  },
];

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';

  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function statusClasses(status: TrackingStatus) {
  if (status === 'ONLINE' || status === 'IDLE') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (status === 'EN_ROUTE' || status === 'ARRIVED' || status === 'ON_JOB') {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function coordinateText(value: number) {
  return value.toFixed(5);
}

export default function LiveTrackingPage() {
  const [drivers] = useState<TrackedDriver[]>(initialDrivers);
  const [search, setSearch] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(
    initialDrivers[0]?.id ?? null,
  );

  const filteredDrivers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;

    return drivers.filter((driver) =>
      [
        driver.name,
        driver.vehicle,
        driver.status,
        driver.currentJobRef ?? '',
        driver.pickup ?? '',
        driver.dropoff ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [drivers, search]);

  const selectedDriver = useMemo(
    () => drivers.find((driver) => driver.id === selectedDriverId) ?? null,
    [drivers, selectedDriverId],
  );

  const stats = useMemo(() => {
    return {
      total: drivers.length,
      live: drivers.filter((d) => d.status !== 'OFFLINE').length,
      onJob: drivers.filter((d) => d.status === 'ON_JOB').length,
      enRoute: drivers.filter((d) => d.status === 'EN_ROUTE').length,
      offline: drivers.filter((d) => d.status === 'OFFLINE').length,
    };
  }, [drivers]);

  return (
    <AdminShell
      title="Live Tracking"
      subtitle="Driver locations, live movement, current job references and last GPS updates."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Tracked Drivers" value={stats.total} />
          <StatCard label="Live" value={stats.live} />
          <StatCard label="On Job" value={stats.onJob} />
          <StatCard label="En Route" value={stats.enRoute} />
          <StatCard label="Offline" value={stats.offline} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Tracking Board</h2>
                <p className="mt-1 text-sm text-white/60">
                  Monitor live driver positions, movement and current job state.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search drivers, vehicle, ref..."
                className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50 lg:w-[300px]"
              />
            </div>

            <div className="space-y-4">
              {filteredDrivers.map((driver) => {
                const isSelected = selectedDriverId === driver.id;

                return (
                  <div
                    key={driver.id}
                    className={`cursor-pointer rounded-2xl border p-5 transition ${
                      isSelected
                        ? 'border-cyan-500/50 bg-[#0c1b2c]'
                        : 'border-white/10 bg-[#0b1728]'
                    }`}
                    onClick={() => setSelectedDriverId(driver.id)}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-bold">{driver.name}</h3>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
                              driver.status,
                            )}`}
                          >
                            {driver.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-white/70">
                          {driver.vehicle}
                        </p>

                        <div className="mt-3 grid gap-2 text-xs text-white/50 md:grid-cols-2 xl:grid-cols-4">
                          <span>
                            Lat: {coordinateText(driver.latitude)}
                          </span>
                          <span>
                            Lng: {coordinateText(driver.longitude)}
                          </span>
                          <span>Speed: {driver.speedMph} mph</span>
                          <span>Heading: {driver.heading}°</span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                          <span>Last GPS: {formatDateTime(driver.lastLocationAt)}</span>
                          <span>Job: {driver.currentJobRef || 'None'}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500">
                          Open Driver
                        </button>
                        <button className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/10">
                          Open Job
                        </button>
                      </div>
                    </div>

                    {(driver.pickup || driver.dropoff) && (
                      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-sm text-white/75">
                          {driver.pickup || '—'} → {driver.dropoff || '—'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredDrivers.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-white/60">
                  No tracked drivers found.
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Driver Focus</h2>
            <p className="mt-1 text-sm text-white/60">
              Live detail for the selected driver.
            </p>

            {!selectedDriver ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-white/60">
                No driver selected.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-white">
                      {selectedDriver.name}
                    </h3>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
                        selectedDriver.status,
                      )}`}
                    >
                      {selectedDriver.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-white/70">
                    {selectedDriver.vehicle}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Position
                  </h4>

                  <DetailRow
                    label="Latitude"
                    value={coordinateText(selectedDriver.latitude)}
                  />
                  <DetailRow
                    label="Longitude"
                    value={coordinateText(selectedDriver.longitude)}
                  />
                  <DetailRow
                    label="Speed"
                    value={`${selectedDriver.speedMph} mph`}
                  />
                  <DetailRow
                    label="Heading"
                    value={`${selectedDriver.heading}°`}
                  />
                  <DetailRow
                    label="Last GPS"
                    value={formatDateTime(selectedDriver.lastLocationAt)}
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Current Job
                  </h4>

                  <DetailRow
                    label="Reference"
                    value={selectedDriver.currentJobRef || 'None'}
                  />
                  <DetailRow
                    label="Pickup"
                    value={selectedDriver.pickup || '—'}
                  />
                  <DetailRow
                    label="Dropoff"
                    value={selectedDriver.dropoff || '—'}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button className="rounded-2xl bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-500">
                    Open Driver Record
                  </button>
                  <button className="rounded-2xl border border-white/10 px-4 py-3 font-semibold text-white hover:bg-white/10">
                    Open Dispatch
                  </button>
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