'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { apiFetch } from '@/lib/api';

type Driver = {
  id: string;
  fullName?: string;
  name?: string;
  status?: string;
};

type Booking = {
  id: string;
  reference: string;
  customerName?: string;
  customerPhone?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  pickup?: string;
  dropoff?: string;
  pickupAt?: string;
  pickupTime?: string;
  status: string;
  quotedPrice?: number | null;
  passengerCount?: number | null;
  notes?: string | null;
  driverId?: string | null;
  driver?: Driver | null;
  createdAt?: string;
};

type DriverShiftSummary = {
  totalJobs: number;
  completedJobs: number;
  cancelledJobs?: number;
  activeJobs: number;
};

type DriverShift = {
  id: string;
  driverId: string;
  companyId: string;
  startedAt: string;
  endedAt?: string | null;
  active: boolean;
  durationMinutes: number;
  summary: DriverShiftSummary;
};

type DriverRecord = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  status: string;
  shift?: DriverShift | null;
};

type VehicleRecord = {
  id: string;
  reg: string;
  make?: string | null;
  model?: string | null;
  status: string;
  driver?: {
    id: string;
    name: string;
  } | null;
};

type RangeKey = 'TODAY' | '7D' | '30D' | 'ALL';

function getDriverName(driver?: Driver | null) {
  if (!driver) return 'Unassigned';
  return driver.fullName || driver.name || 'Unknown driver';
}

function getPickupLabel(booking: Booking) {
  return booking.pickupAddress || booking.pickup || '—';
}

function getDropoffLabel(booking: Booking) {
  return booking.dropoffAddress || booking.dropoff || '—';
}

function getPickupTimeLabel(booking: Booking) {
  return booking.pickupAt || booking.pickupTime || '';
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '£0.00';
  return `£${value.toFixed(2)}`;
}

function formatMinutes(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return '—';

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  if (hours <= 0) return `${minutes}m`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function isCompleted(status?: string) {
  return (status || '').toUpperCase() === 'COMPLETED';
}

function isCancelled(status?: string) {
  return ['CANCELLED', 'NO_SHOW'].includes((status || '').toUpperCase());
}

function isLive(status?: string) {
  return ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB', 'ALLOCATED'].includes(
    (status || '').toUpperCase(),
  );
}

function isScheduled(status?: string) {
  return ['BOOKED', 'OFFERED'].includes((status || '').toUpperCase());
}

function inRange(dateValue: string | undefined, range: RangeKey) {
  if (range === 'ALL') return true;
  if (!dateValue) return false;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();

  if (range === 'TODAY') {
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }

  const days = range === '7D' ? 7 : 30;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  return date >= start;
}

export default function ReportsPage() {
  const [range, setRange] = useState<RangeKey>('7D');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        const [bookingsData, driversData, vehiclesData] = await Promise.all([
          apiFetch<Booking[]>('/bookings').catch(() => []),
          apiFetch<DriverRecord[]>('/drivers').catch(() => []),
          apiFetch<VehicleRecord[]>('/vehicles').catch(() => []),
        ]);

        if (!mounted) return;

        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        setDrivers(Array.isArray(driversData) ? driversData : []);
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      } catch (error) {
        console.error(error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleRefresh() {
    try {
      setRefreshing(true);

      const [bookingsData, driversData, vehiclesData] = await Promise.all([
        apiFetch<Booking[]>('/bookings').catch(() => []),
        apiFetch<DriverRecord[]>('/drivers').catch(() => []),
        apiFetch<VehicleRecord[]>('/vehicles').catch(() => []),
      ]);

      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setDrivers(Array.isArray(driversData) ? driversData : []);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  }

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      return inRange(
        getPickupTimeLabel(booking) || booking.createdAt,
        range,
      );
    });
  }, [bookings, range]);

  const totals = useMemo(() => {
    const completed = filteredBookings.filter((booking) =>
      isCompleted(booking.status),
    );
    const cancelled = filteredBookings.filter((booking) =>
      isCancelled(booking.status),
    );
    const live = filteredBookings.filter((booking) => isLive(booking.status));
    const scheduled = filteredBookings.filter((booking) =>
      isScheduled(booking.status),
    );

    const revenue = completed.reduce(
      (sum, booking) => sum + (booking.quotedPrice ?? 0),
      0,
    );

    const avgFare =
      completed.length > 0 ? revenue / completed.length : 0;

    return {
      total: filteredBookings.length,
      completed: completed.length,
      cancelled: cancelled.length,
      live: live.length,
      scheduled: scheduled.length,
      revenue,
      avgFare,
      completionRate:
        filteredBookings.length > 0
          ? Math.round((completed.length / filteredBookings.length) * 100)
          : 0,
      cancellationRate:
        filteredBookings.length > 0
          ? Math.round((cancelled.length / filteredBookings.length) * 100)
          : 0,
    };
  }, [filteredBookings]);

  const bookingsByStatus = useMemo(() => {
    const map = new Map<string, number>();

    for (const booking of filteredBookings) {
      const key = (booking.status || 'UNKNOWN').replace(/_/g, ' ');
      map.set(key, (map.get(key) || 0) + 1);
    }

    return Array.from(map.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredBookings]);

  const topDrivers = useMemo(() => {
    const counts = new Map<
      string,
      { driverName: string; completed: number; live: number; revenue: number }
    >();

    for (const booking of filteredBookings) {
      if (!booking.driverId && !booking.driver) continue;

      const driverId = booking.driverId || booking.driver?.id || 'unknown';
      const driverName = getDriverName(booking.driver);

      if (!counts.has(driverId)) {
        counts.set(driverId, {
          driverName,
          completed: 0,
          live: 0,
          revenue: 0,
        });
      }

      const current = counts.get(driverId)!;

      if (isCompleted(booking.status)) {
        current.completed += 1;
        current.revenue += booking.quotedPrice ?? 0;
      }

      if (isLive(booking.status)) {
        current.live += 1;
      }
    }

    return Array.from(counts.values()).sort((a, b) => {
      if (b.completed !== a.completed) return b.completed - a.completed;
      return b.revenue - a.revenue;
    });
  }, [filteredBookings]);

  const latestBookings = useMemo(() => {
    return [...filteredBookings]
      .sort((a, b) => {
        const aTime = new Date(
          getPickupTimeLabel(a) || a.createdAt || 0,
        ).getTime();
        const bTime = new Date(
          getPickupTimeLabel(b) || b.createdAt || 0,
        ).getTime();

        return bTime - aTime;
      })
      .slice(0, 8);
  }, [filteredBookings]);

  const driverSnapshot = useMemo(() => {
    const onShift = drivers.filter((driver) => Boolean(driver.shift?.active)).length;
    const available = drivers.filter((driver) =>
      ['AVAILABLE', 'ONLINE', 'ON_DUTY'].includes(
        (driver.status || '').toUpperCase(),
      ),
    ).length;
    const busy = drivers.filter((driver) =>
      ['BUSY'].includes((driver.status || '').toUpperCase()),
    ).length;

    return {
      total: drivers.length,
      onShift,
      available,
      busy,
    };
  }, [drivers]);

  const vehicleSnapshot = useMemo(() => {
    const active = vehicles.filter(
      (vehicle) => (vehicle.status || '').toUpperCase() === 'ACTIVE',
    ).length;
    const offRoad = vehicles.filter(
      (vehicle) => (vehicle.status || '').toUpperCase() === 'OFF_ROAD',
    ).length;
    const inactive = vehicles.filter(
      (vehicle) => (vehicle.status || '').toUpperCase() === 'INACTIVE',
    ).length;

    return {
      total: vehicles.length,
      active,
      offRoad,
      inactive,
    };
  }, [vehicles]);

  return (
    <AdminShell
      title="Reports"
      subtitle="Operational reporting, booking performance, driver output and fleet snapshot"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <RangeButton
              active={range === 'TODAY'}
              label="Today"
              onClick={() => setRange('TODAY')}
            />
            <RangeButton
              active={range === '7D'}
              label="Last 7 Days"
              onClick={() => setRange('7D')}
            />
            <RangeButton
              active={range === '30D'}
              label="Last 30 Days"
              onClick={() => setRange('30D')}
            />
            <RangeButton
              active={range === 'ALL'}
              label="All Time"
              onClick={() => setRange('ALL')}
            />
          </div>

          <button
            onClick={() => void handleRefresh()}
            className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
          >
            {refreshing ? 'Refreshing...' : 'Refresh Reports'}
          </button>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Bookings"
            value={loading ? '—' : String(totals.total)}
            hint="Within selected range"
          />
          <StatCard
            label="Completed Revenue"
            value={loading ? '—' : formatCurrency(totals.revenue)}
            hint="Completed jobs only"
          />
          <StatCard
            label="Average Fare"
            value={loading ? '—' : formatCurrency(totals.avgFare)}
            hint="Completed bookings"
          />
          <StatCard
            label="Completion Rate"
            value={loading ? '—' : `${totals.completionRate}%`}
            hint="Completed vs all bookings"
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MiniStatCard
            label="Live Jobs"
            value={loading ? '—' : String(totals.live)}
          />
          <MiniStatCard
            label="Scheduled"
            value={loading ? '—' : String(totals.scheduled)}
          />
          <MiniStatCard
            label="Cancelled"
            value={loading ? '—' : String(totals.cancelled)}
          />
          <MiniStatCard
            label="Cancellation Rate"
            value={loading ? '—' : `${totals.cancellationRate}%`}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5">
              <h2 className="text-2xl font-bold">Booking Status Breakdown</h2>
              <p className="mt-1 text-sm text-white/60">
                Jobs grouped by current status in the selected period.
              </p>
            </div>

            {loading ? (
              <LoadingBlock label="Loading booking status data..." />
            ) : bookingsByStatus.length === 0 ? (
              <LoadingBlock label="No booking data available for this range." />
            ) : (
              <div className="space-y-3">
                {bookingsByStatus.map((item) => {
                  const pct =
                    totals.total > 0
                      ? Math.max(6, Math.round((item.count / totals.total) * 100))
                      : 0;

                  return (
                    <div
                      key={item.status}
                      className="rounded-2xl border border-white/10 bg-[#0b1728] p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <div className="text-sm font-semibold text-white">
                          {item.status}
                        </div>
                        <div className="text-sm text-white/60">{item.count}</div>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-cyan-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5">
              <h2 className="text-2xl font-bold">Operations Snapshot</h2>
              <p className="mt-1 text-sm text-white/60">
                Current driver and fleet position.
              </p>
            </div>

            <div className="space-y-4">
              <SnapshotGroup
                title="Drivers"
                items={[
                  { label: 'Total', value: String(driverSnapshot.total) },
                  { label: 'On Shift', value: String(driverSnapshot.onShift) },
                  { label: 'Available', value: String(driverSnapshot.available) },
                  { label: 'Busy', value: String(driverSnapshot.busy) },
                ]}
              />

              <SnapshotGroup
                title="Vehicles"
                items={[
                  { label: 'Total', value: String(vehicleSnapshot.total) },
                  { label: 'Active', value: String(vehicleSnapshot.active) },
                  { label: 'Off Road', value: String(vehicleSnapshot.offRoad) },
                  { label: 'Inactive', value: String(vehicleSnapshot.inactive) },
                ]}
              />
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5">
              <h2 className="text-2xl font-bold">Top Drivers</h2>
              <p className="mt-1 text-sm text-white/60">
                Ranked by completed bookings in the selected range.
              </p>
            </div>

            {loading ? (
              <LoadingBlock label="Loading driver performance..." />
            ) : topDrivers.length === 0 ? (
              <LoadingBlock label="No driver performance data available." />
            ) : (
              <div className="space-y-3">
                {topDrivers.slice(0, 8).map((driver, index) => (
                  <div
                    key={`${driver.driverName}-${index}`}
                    className="rounded-2xl border border-white/10 bg-[#0b1728] p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          #{index + 1} {driver.driverName}
                        </div>
                        <div className="mt-1 text-xs text-white/50">
                          Completed: {driver.completed} · Live: {driver.live}
                        </div>
                      </div>

                      <div className="text-sm font-semibold text-cyan-300">
                        {formatCurrency(driver.revenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5">
              <h2 className="text-2xl font-bold">Latest Bookings</h2>
              <p className="mt-1 text-sm text-white/60">
                Most recent jobs inside the selected range.
              </p>
            </div>

            {loading ? (
              <LoadingBlock label="Loading recent bookings..." />
            ) : latestBookings.length === 0 ? (
              <LoadingBlock label="No recent bookings found." />
            ) : (
              <div className="space-y-3">
                {latestBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-2xl border border-white/10 bg-[#0b1728] p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-white">
                            {booking.reference}
                          </div>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusBadgeTone(
                              booking.status,
                            )}`}
                          >
                            {(booking.status || 'UNKNOWN').replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div className="mt-2 text-sm text-white/70">
                          {getPickupLabel(booking)} → {getDropoffLabel(booking)}
                        </div>

                        <div className="mt-1 text-xs text-white/50">
                          {formatDateTime(getPickupTimeLabel(booking) || booking.createdAt)} ·{' '}
                          {getDriverName(booking.driver)}
                        </div>
                      </div>

                      <div className="text-sm font-semibold text-white">
                        {formatCurrency(booking.quotedPrice)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-5">
            <h2 className="text-2xl font-bold">Business Summary</h2>
            <p className="mt-1 text-sm text-white/60">
              Quick operational summary for the selected period.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Completed Jobs"
              value={loading ? '—' : String(totals.completed)}
              hint="Finished trips"
            />
            <SummaryCard
              title="Cancelled Jobs"
              value={loading ? '—' : String(totals.cancelled)}
              hint="Cancelled or no-show"
            />
            <SummaryCard
              title="Scheduled Jobs"
              value={loading ? '—' : String(totals.scheduled)}
              hint="Booked or offered"
            />
            <SummaryCard
              title="Revenue"
              value={loading ? '—' : formatCurrency(totals.revenue)}
              hint="Completed fare total"
            />
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm font-medium text-white/60">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-xs text-white/45">{hint}</p>
    </div>
  );
}

function MiniStatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
      <p className="text-xs uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-3 text-2xl font-bold text-cyan-300">{value}</p>
      <p className="mt-2 text-xs text-white/45">{hint}</p>
    </div>
  );
}

function SnapshotGroup({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
        {title}
      </p>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between border-b border-white/5 pb-2 last:border-b-0 last:pb-0"
          >
            <span className="text-sm text-white/55">{item.label}</span>
            <span className="text-sm font-semibold text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-sm text-white/60">
      {label}
    </div>
  );
}

function RangeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'bg-cyan-600 text-white'
          : 'bg-white/5 text-slate-300 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );
}

function statusBadgeTone(status?: string) {
  const normalized = (status || '').toUpperCase();

  if (normalized === 'COMPLETED') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (normalized === 'CANCELLED' || normalized === 'NO_SHOW') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }

  if (normalized === 'BOOKED' || normalized === 'OFFERED') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  if (
    ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB', 'ALLOCATED'].includes(
      normalized,
    )
  ) {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }

  return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
}