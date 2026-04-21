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

type CustomerSummary = {
  id: string;
  name: string;
  phone: string;
  bookingCount: number;
  completedCount: number;
  cancelledCount: number;
  totalSpend: number;
  lastBookingAt?: string | null;
  lastPickup?: string | null;
  lastDropoff?: string | null;
  lastDriverName?: string | null;
  notes?: string | null;
  bookings: Booking[];
};

function getPickupLabel(booking: Booking) {
  return booking.pickupAddress || booking.pickup || '—';
}

function getDropoffLabel(booking: Booking) {
  return booking.dropoffAddress || booking.dropoff || '—';
}

function getPickupTimeLabel(booking: Booking) {
  return booking.pickupAt || booking.pickupTime || '';
}

function getDriverName(driver?: Driver | null) {
  if (!driver) return 'Unassigned';
  return driver.fullName || driver.name || 'Unknown driver';
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

function formatCurrency(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '£0.00';
  return `£${value.toFixed(2)}`;
}

function statusTone(status?: string) {
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

function isCompleted(status?: string) {
  return (status || '').toUpperCase() === 'COMPLETED';
}

function isCancelled(status?: string) {
  return ['CANCELLED', 'NO_SHOW'].includes((status || '').toUpperCase());
}

function buildCustomers(bookings: Booking[]): CustomerSummary[] {
  const map = new Map<string, CustomerSummary>();

  for (const booking of bookings) {
    const rawName = booking.customerName?.trim() || 'Unknown customer';
    const rawPhone = booking.customerPhone?.trim() || 'No phone';
    const key = `${rawName.toLowerCase()}::${rawPhone.toLowerCase()}`;

    if (!map.has(key)) {
      map.set(key, {
        id: key,
        name: rawName,
        phone: rawPhone,
        bookingCount: 0,
        completedCount: 0,
        cancelledCount: 0,
        totalSpend: 0,
        lastBookingAt: null,
        lastPickup: null,
        lastDropoff: null,
        lastDriverName: null,
        notes: null,
        bookings: [],
      });
    }

    const customer = map.get(key)!;
    customer.bookingCount += 1;
    customer.bookings.push(booking);

    if (isCompleted(booking.status)) {
      customer.completedCount += 1;
      customer.totalSpend += booking.quotedPrice ?? 0;
    }

    if (isCancelled(booking.status)) {
      customer.cancelledCount += 1;
    }

    const bookingDate = getPickupTimeLabel(booking) || booking.createdAt || null;
    const currentLast = customer.lastBookingAt
      ? new Date(customer.lastBookingAt).getTime()
      : 0;
    const nextTime = bookingDate ? new Date(bookingDate).getTime() : 0;

    if (nextTime >= currentLast) {
      customer.lastBookingAt = bookingDate;
      customer.lastPickup = getPickupLabel(booking);
      customer.lastDropoff = getDropoffLabel(booking);
      customer.lastDriverName = getDriverName(booking.driver);
      customer.notes = booking.notes ?? null;
    }
  }

  return Array.from(map.values())
    .map((customer) => ({
      ...customer,
      bookings: [...customer.bookings].sort((a, b) => {
        const aTime = new Date(
          getPickupTimeLabel(a) || a.createdAt || 0,
        ).getTime();
        const bTime = new Date(
          getPickupTimeLabel(b) || b.createdAt || 0,
        ).getTime();

        return bTime - aTime;
      }),
    }))
    .sort((a, b) => {
      if (b.bookingCount !== a.bookingCount) {
        return b.bookingCount - a.bookingCount;
      }

      return a.name.localeCompare(b.name);
    });
}

export default function CustomersPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const data = await apiFetch<Booking[]>('/bookings');
        if (!mounted) return;
        setBookings(Array.isArray(data) ? data : []);
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
      const data = await apiFetch<Booking[]>('/bookings');
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  }

  const customers = useMemo(() => buildCustomers(bookings), [bookings]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;

    return customers.filter((customer) => {
      return [
        customer.name,
        customer.phone,
        customer.lastPickup,
        customer.lastDropoff,
        customer.lastDriverName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [customers, search]);

  const selectedCustomer = useMemo(() => {
    return filteredCustomers.find((customer) => customer.id === selectedCustomerId) ??
      customers.find((customer) => customer.id === selectedCustomerId) ??
      null;
  }, [customers, filteredCustomers, selectedCustomerId]);

  const totals = useMemo(() => {
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter((customer) => customer.bookingCount > 1).length;
    const totalBookings = customers.reduce(
      (sum, customer) => sum + customer.bookingCount,
      0,
    );
    const totalRevenue = customers.reduce(
      (sum, customer) => sum + customer.totalSpend,
      0,
    );
    const avgSpend = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

    return {
      totalCustomers,
      activeCustomers,
      totalBookings,
      totalRevenue,
      avgSpend,
    };
  }, [customers]);

  return (
    <AdminShell
      title="Customers"
      subtitle="Customer history, trip activity, spend totals and recent journeys"
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.10),transparent_30%),linear-gradient(135deg,#081120_0%,#0c1527_55%,#07101c_100%)] p-6 md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-cyan-500/25 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                CabHQ Customer Insights
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight text-white md:text-5xl">
                Understand your customer base
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                Review customer history, repeat usage, revenue contribution and
                recent journeys from one clean customer workspace.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => void handleRefresh()}
                className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-cyan-400"
              >
                {refreshing ? 'Refreshing...' : 'Refresh Customers'}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total Customers"
            value={loading ? '—' : String(totals.totalCustomers)}
            hint="Grouped from booking history"
            tone="slate"
          />
          <StatCard
            label="Repeat Customers"
            value={loading ? '—' : String(totals.activeCustomers)}
            hint="More than one booking"
            tone="cyan"
          />
          <StatCard
            label="Total Bookings"
            value={loading ? '—' : String(totals.totalBookings)}
            hint="Across all customers"
            tone="violet"
          />
          <StatCard
            label="Completed Revenue"
            value={loading ? '—' : formatCurrency(totals.totalRevenue)}
            hint="Completed jobs only"
            tone="emerald"
          />
          <StatCard
            label="Average Spend"
            value={loading ? '—' : formatCurrency(totals.avgSpend)}
            hint="Per customer"
            tone="amber"
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Customer Directory</h2>
                <p className="mt-1 text-sm text-white/60">
                  Search and review booking history by customer.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customer, phone, pickup, driver..."
                  className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-500/50 sm:w-[320px]"
                />

                <button
                  onClick={() => void handleRefresh()}
                  className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
                >
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            {loading ? (
              <LoadingBlock label="Loading customers..." />
            ) : filteredCustomers.length === 0 ? (
              <LoadingBlock label="No customers found." />
            ) : (
              <div className="space-y-3">
                {filteredCustomers.map((customer) => {
                  const isSelected = selectedCustomerId === customer.id;

                  return (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() =>
                        setSelectedCustomerId((current) =>
                          current === customer.id ? null : customer.id,
                        )
                      }
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-cyan-500/40 bg-[#0c1b2c]'
                          : 'border-white/10 bg-[#0b1728] hover:border-white/15'
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white">
                            {customer.name}
                          </div>
                          <div className="mt-1 text-xs text-white/50">
                            {customer.phone}
                          </div>
                          <div className="mt-2 text-sm text-white/70">
                            {customer.lastPickup || '—'} → {customer.lastDropoff || '—'}
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-4 lg:min-w-[420px]">
                          <MiniStat label="Bookings" value={customer.bookingCount} />
                          <MiniStat label="Completed" value={customer.completedCount} />
                          <MiniStat label="Cancelled" value={customer.cancelledCount} />
                          <MiniStat
                            label="Spend"
                            value={formatCurrency(customer.totalSpend)}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                        <span>Last trip: {formatDateTime(customer.lastBookingAt)}</span>
                        <span>Last driver: {customer.lastDriverName || '—'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-2xl font-bold">Customer Focus</h2>
              <p className="mt-1 text-sm text-white/60">
                Selected customer summary and recent activity.
              </p>

              {!selectedCustomer ? (
                <div className="mt-5 rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-sm text-white/60">
                  Select a customer to view their details.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xl font-bold text-white">
                          {selectedCustomer.name}
                        </p>
                        <p className="mt-1 text-sm text-white/50">
                          {selectedCustomer.phone}
                        </p>
                      </div>

                      <div className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                        {selectedCustomer.bookingCount} bookings
                      </div>
                    </div>

                    <div className="mt-5 space-y-2">
                      <DetailRow
                        label="Completed Trips"
                        value={String(selectedCustomer.completedCount)}
                      />
                      <DetailRow
                        label="Cancelled Trips"
                        value={String(selectedCustomer.cancelledCount)}
                      />
                      <DetailRow
                        label="Total Spend"
                        value={formatCurrency(selectedCustomer.totalSpend)}
                      />
                      <DetailRow
                        label="Last Booking"
                        value={formatDateTime(selectedCustomer.lastBookingAt)}
                      />
                      <DetailRow
                        label="Last Driver"
                        value={selectedCustomer.lastDriverName || '—'}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-5">
                    <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">
                      Recent route
                    </p>

                    <div className="space-y-2">
                      <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-white/40">
                          Pickup
                        </p>
                        <p className="mt-1 text-sm text-white">
                          {selectedCustomer.lastPickup || '—'}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-white/40">
                          Dropoff
                        </p>
                        <p className="mt-1 text-sm text-white">
                          {selectedCustomer.lastDropoff || '—'}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-white/40">
                          Notes
                        </p>
                        <p className="mt-1 text-sm text-white/70">
                          {selectedCustomer.notes || 'No notes on recent booking.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-2xl font-bold">Top Customers</h2>
              <p className="mt-1 text-sm text-white/60">
                Highest value customers by completed spend.
              </p>

              <div className="mt-5 space-y-3">
                {loading ? (
                  <LoadingBlock label="Loading top customers..." />
                ) : customers.length === 0 ? (
                  <LoadingBlock label="No customer data available." />
                ) : (
                  [...customers]
                    .sort((a, b) => b.totalSpend - a.totalSpend)
                    .slice(0, 6)
                    .map((customer, index) => (
                      <div
                        key={customer.id}
                        className="rounded-2xl border border-white/10 bg-[#0b1728] p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              #{index + 1} {customer.name}
                            </p>
                            <p className="mt-1 text-xs text-white/50">
                              {customer.bookingCount} bookings
                            </p>
                          </div>

                          <div className="text-sm font-semibold text-cyan-300">
                            {formatCurrency(customer.totalSpend)}
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-5">
            <h2 className="text-2xl font-bold">Recent Customer Bookings</h2>
            <p className="mt-1 text-sm text-white/60">
              Latest trips for the selected customer.
            </p>
          </div>

          {!selectedCustomer ? (
            <LoadingBlock label="Select a customer to view booking history." />
          ) : selectedCustomer.bookings.length === 0 ? (
            <LoadingBlock label="No bookings found for this customer." />
          ) : (
            <div className="space-y-3">
              {selectedCustomer.bookings.slice(0, 10).map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-2xl border border-white/10 bg-[#0b1728] p-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">
                          {booking.reference}
                        </p>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusTone(
                            booking.status,
                          )}`}
                        >
                          {(booking.status || 'UNKNOWN').replace(/_/g, ' ')}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-white/75">
                        {getPickupLabel(booking)} → {getDropoffLabel(booking)}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/45">
                        <span>Pickup: {formatDateTime(getPickupTimeLabel(booking))}</span>
                        <span>Driver: {getDriverName(booking.driver)}</span>
                        <span>Passengers: {booking.passengerCount ?? '—'}</span>
                      </div>
                    </div>

                    <div className="text-sm font-semibold text-white">
                      {formatCurrency(booking.quotedPrice)}
                    </div>
                  </div>

                  {booking.notes ? (
                    <div className="mt-3 border-t border-white/5 pt-3 text-sm text-white/60">
                      {booking.notes}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: 'slate' | 'cyan' | 'violet' | 'emerald' | 'amber';
}) {
  const toneMap = {
    slate: 'from-slate-500/10 to-transparent border-white/10',
    cyan: 'from-cyan-500/10 to-transparent border-cyan-500/20',
    violet: 'from-violet-500/10 to-transparent border-violet-500/20',
    emerald: 'from-emerald-500/10 to-transparent border-emerald-500/20',
    amber: 'from-amber-500/10 to-transparent border-amber-500/20',
  };

  return (
    <div className={`rounded-3xl border bg-gradient-to-br ${toneMap[tone]} p-5`}>
      <p className="text-sm font-medium text-white/60">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs text-white/45">{hint}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
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
      <span className="text-right text-sm text-white/85">{value}</span>
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