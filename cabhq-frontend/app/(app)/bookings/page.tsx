'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { apiFetch } from '@/lib/api';

type Driver = {
  id: string;
  fullName?: string;
  name?: string;
  phone?: string | null;
  email?: string | null;
  status?: string;
};

type Account = {
  id: string;
  name: string;
  code?: string | null;
  status?: string;
};

type BookingEvent = {
  id: string;
  message: string;
  createdAt: string;
};

type Booking = {
  id: string;
  reference: string;
  customerName?: string | null;
  customerPhone?: string | null;
  isThirdPartyBooking?: boolean;
  bookerName?: string | null;
  bookerPhone?: string | null;
  bookerEmail?: string | null;
  passengerName?: string | null;
  passengerPhone?: string | null;
  passengerNotes?: string | null;
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
  accountId?: string | null;
  account?: Account | null;
  events?: BookingEvent[];
};

type BookingTab = 'ALL' | 'LIVE' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

type EditForm = {
  pickup: string;
  dropoff: string;
  pickupTime: string;
  bookerName: string;
  bookerPhone: string;
  bookerEmail: string;
  passengerName: string;
  passengerPhone: string;
  passengerNotes: string;
  passengerCount: string;
  notes: string;
  quotedPrice: string;
  pricingMode: string;
};

const STATUS_OPTIONS = [
  'BOOKED',
  'OFFERED',
  'NO_DRIVER',
  'ACCEPTED',
  'EN_ROUTE',
  'ARRIVED',
  'ON_JOB',
  'COMPLETED',
  'CANCELLED',
];

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

function getAccountLabel(booking: Booking) {
  if (booking.account?.name) return booking.account.name;
  return 'Non-account';
}

function getBookerName(booking: Booking) {
  return booking.bookerName || booking.customerName || '—';
}

function getBookerPhone(booking: Booking) {
  return booking.bookerPhone || booking.customerPhone || '—';
}

function getPassengerName(booking: Booking) {
  return booking.passengerName || booking.customerName || booking.bookerName || '—';
}

function getPassengerPhone(booking: Booking) {
  return booking.passengerPhone || booking.customerPhone || booking.bookerPhone || '—';
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

function toDateTimeLocal(value?: string | null) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(date.getTime() - offsetMs);

  return localDate.toISOString().slice(0, 16);
}

function formatPrice(value?: number | null) {
  if (value == null) return '—';
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

function bookingTypeTone(isThirdParty?: boolean) {
  return isThirdParty
    ? 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300'
    : 'border-slate-500/30 bg-slate-500/10 text-slate-300';
}

function isCompleted(status?: string) {
  return ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(
    (status || '').toUpperCase(),
  );
}

function isCancelled(status?: string) {
  return ['CANCELLED', 'NO_SHOW'].includes((status || '').toUpperCase());
}

function isLive(status?: string) {
  return !isCompleted(status);
}

function isScheduled(status?: string) {
  return ['BOOKED', 'OFFERED'].includes((status || '').toUpperCase());
}

function buildEditForm(booking: Booking): EditForm {
  return {
    pickup: getPickupLabel(booking) === '—' ? '' : getPickupLabel(booking),
    dropoff: getDropoffLabel(booking) === '—' ? '' : getDropoffLabel(booking),
    pickupTime: toDateTimeLocal(getPickupTimeLabel(booking)),
    bookerName: booking.bookerName || booking.customerName || '',
    bookerPhone: booking.bookerPhone || booking.customerPhone || '',
    bookerEmail: booking.bookerEmail || '',
    passengerName: booking.passengerName || '',
    passengerPhone: booking.passengerPhone || '',
    passengerNotes: booking.passengerNotes || '',
    passengerCount:
      booking.passengerCount != null ? String(booking.passengerCount) : '',
    notes: booking.notes || '',
    quotedPrice: booking.quotedPrice != null ? String(booking.quotedPrice) : '',
    pricingMode: '',
  };
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<BookingTab>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [accountFilter, setAccountFilter] = useState<
    'ALL' | 'ACCOUNT' | 'NON_ACCOUNT'
  >('ALL');

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [drawerError, setDrawerError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const loadBookings = useCallback(async () => {
    const data = await apiFetch<Booking[]>('/bookings');
    setBookings(Array.isArray(data) ? data : []);
  }, []);

  const loadAccounts = useCallback(async () => {
    const data = await apiFetch<Account[]>('/accounts').catch(() => []);
    setAccounts(Array.isArray(data) ? data : []);
  }, []);

  const loadDrivers = useCallback(async () => {
    const data = await apiFetch<Driver[]>('/drivers').catch(() => []);
    setDrivers(Array.isArray(data) ? data : []);
  }, []);

  async function refreshSelectedBooking(bookingId: string) {
    const freshBookings = await apiFetch<Booking[]>('/bookings').catch(() => []);
    setBookings(Array.isArray(freshBookings) ? freshBookings : []);

    const fresh = Array.isArray(freshBookings)
      ? freshBookings.find((booking) => booking.id === bookingId)
      : null;

    setSelectedBooking(fresh || null);
  }

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        setLoading(true);

        const [bookingsData, accountsData, driversData] = await Promise.all([
          apiFetch<Booking[]>('/bookings').catch(() => []),
          apiFetch<Account[]>('/accounts').catch(() => []),
          apiFetch<Driver[]>('/drivers').catch(() => []),
        ]);

        if (!mounted) return;

        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        setAccounts(Array.isArray(accountsData) ? accountsData : []);
        setDrivers(Array.isArray(driversData) ? driversData : []);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void run();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadBookings();
    }, 10000);

    return () => clearInterval(interval);
  }, [loadBookings]);

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    let items = [...bookings];

    if (activeTab === 'LIVE') {
      items = items.filter((booking) => isLive(booking.status));
    }

    if (activeTab === 'SCHEDULED') {
      items = items.filter((booking) => isScheduled(booking.status));
    }

    if (activeTab === 'COMPLETED') {
      items = items.filter(
        (booking) => (booking.status || '').toUpperCase() === 'COMPLETED',
      );
    }

    if (activeTab === 'CANCELLED') {
      items = items.filter((booking) => isCancelled(booking.status));
    }

    if (accountFilter === 'ACCOUNT') {
      items = items.filter((booking) =>
        Boolean(booking.accountId || booking.account),
      );
    } else if (accountFilter === 'NON_ACCOUNT') {
      items = items.filter((booking) => !booking.accountId && !booking.account);
    }

    if (!q) return items;

    return items.filter((booking) =>
      [
        booking.reference,
        booking.customerName,
        booking.customerPhone,
        booking.bookerName,
        booking.bookerPhone,
        booking.bookerEmail,
        booking.passengerName,
        booking.passengerPhone,
        booking.passengerNotes,
        getPickupLabel(booking),
        getDropoffLabel(booking),
        getDriverName(booking.driver),
        booking.status,
        booking.account?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [bookings, activeTab, search, accountFilter]);

  const counts = useMemo(() => {
    return {
      all: bookings.length,
      live: bookings.filter((b) => isLive(b.status)).length,
      scheduled: bookings.filter((b) => isScheduled(b.status)).length,
      completed: bookings.filter(
        (b) => (b.status || '').toUpperCase() === 'COMPLETED',
      ).length,
      cancelled: bookings.filter((b) => isCancelled(b.status)).length,
      accountLinked: bookings.filter((b) => Boolean(b.accountId || b.account))
        .length,
      thirdParty: bookings.filter((b) => b.isThirdPartyBooking).length,
    };
  }, [bookings]);

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await Promise.all([loadBookings(), loadAccounts(), loadDrivers()]);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleStatusChange(bookingId: string, status: string) {
    try {
      setActionLoading(`status-${bookingId}`);
      setDrawerError('');

      await apiFetch(`/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      await refreshSelectedBooking(bookingId);
    } catch (error) {
      setDrawerError(
        error instanceof Error ? error.message : 'Failed to update booking status',
      );
    } finally {
      setActionLoading('');
    }
  }

  async function handleUpdateBooking(bookingId: string, form: EditForm) {
    try {
      setActionLoading(`edit-${bookingId}`);
      setDrawerError('');

      const payload = {
        pickup: form.pickup.trim(),
        dropoff: form.dropoff.trim(),
        pickupTime: form.pickupTime ? new Date(form.pickupTime).toISOString() : '',
        bookerName: form.bookerName.trim() || null,
        bookerPhone: form.bookerPhone.trim() || null,
        bookerEmail: form.bookerEmail.trim() || null,
        customerName: form.bookerName.trim() || null,
        customerPhone: form.bookerPhone.trim() || null,
        passengerName: form.passengerName.trim() || null,
        passengerPhone: form.passengerPhone.trim() || null,
        passengerNotes: form.passengerNotes.trim() || null,
        passengerCount: form.passengerCount.trim()
          ? Number(form.passengerCount)
          : null,
        notes: form.notes.trim() || null,
        quotedPrice: form.quotedPrice.trim() ? Number(form.quotedPrice) : null,
        pricingMode: form.pricingMode.trim() || null,
      };

      await apiFetch(`/bookings/${bookingId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      await refreshSelectedBooking(bookingId);
    } catch (error) {
      setDrawerError(
        error instanceof Error ? error.message : 'Failed to update booking',
      );
    } finally {
      setActionLoading('');
    }
  }

  async function handleCancelBooking(bookingId: string) {
    const confirmed = window.confirm('Are you sure you want to cancel this booking?');
    if (!confirmed) return;

    try {
      setActionLoading(`cancel-${bookingId}`);
      setDrawerError('');

      await apiFetch(`/bookings/${bookingId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          reason: 'Cancelled from bookings page',
        }),
      });

      await refreshSelectedBooking(bookingId);
    } catch (error) {
      setDrawerError(
        error instanceof Error ? error.message : 'Failed to cancel booking',
      );
    } finally {
      setActionLoading('');
    }
  }

  async function handleAutoDispatch(bookingId: string) {
    try {
      setActionLoading(`auto-${bookingId}`);
      setDrawerError('');

      await apiFetch(`/bookings/${bookingId}/auto-dispatch`, {
        method: 'POST',
      });

      await refreshSelectedBooking(bookingId);
    } catch (error) {
      setDrawerError(
        error instanceof Error ? error.message : 'Failed to auto-dispatch booking',
      );
    } finally {
      setActionLoading('');
    }
  }

  async function handleUnassignDriver(bookingId: string) {
    const confirmed = window.confirm('Unassign the current driver from this booking?');
    if (!confirmed) return;

    try {
      setActionLoading(`unassign-${bookingId}`);
      setDrawerError('');

      await apiFetch(`/bookings/${bookingId}/unassign-driver`, {
        method: 'POST',
      });

      await refreshSelectedBooking(bookingId);
    } catch (error) {
      setDrawerError(
        error instanceof Error ? error.message : 'Failed to unassign driver',
      );
    } finally {
      setActionLoading('');
    }
  }

  async function handleAssignDriver(
    bookingId: string,
    driverId: string,
    isReassign: boolean,
  ) {
    if (!driverId) {
      setDrawerError('Please select a driver first');
      return;
    }

    const endpoint = isReassign
      ? `/bookings/${bookingId}/reassign-driver`
      : `/bookings/${bookingId}/assign-driver`;

    try {
      setActionLoading(`assign-${bookingId}`);
      setDrawerError('');

      await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ driverId }),
      });

      await refreshSelectedBooking(bookingId);
    } catch (error) {
      setDrawerError(
        error instanceof Error ? error.message : 'Failed to assign driver',
      );
    } finally {
      setActionLoading('');
    }
  }

  return (
    <AdminShell
      title="Bookings"
      subtitle="Search, review and manage all bookings across the business"
      actions={
        <div className="flex flex-wrap gap-3">
          <Link
            href="/bookings/create"
            className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-cyan-400"
          >
            Create Booking
          </Link>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70">
            Drivers: <span className="font-semibold text-white">{drivers.length}</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70">
            Accounts: <span className="font-semibold text-white">{accounts.length}</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70">
            Third-party: <span className="font-semibold text-white">{counts.thirdParty}</span>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.10),transparent_30%),linear-gradient(135deg,#081120_0%,#0c1527_55%,#07101c_100%)] p-6 md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-cyan-500/25 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                CabHQ Booking Control
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight text-white md:text-5xl">
                Booking management in one place
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                Click any booking to open full details, edit the journey, assign
                drivers, update status, auto-dispatch or cancel the job.
              </p>
            </div>

            <button
              onClick={() => void handleRefresh()}
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {refreshing ? 'Refreshing...' : 'Refresh Bookings'}
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
          <StatCard label="All Bookings" value={counts.all} hint="Every booking record" tone="slate" />
          <StatCard label="Live" value={counts.live} hint="Open and active jobs" tone="cyan" />
          <StatCard label="Scheduled" value={counts.scheduled} hint="Booked or offered" tone="amber" />
          <StatCard label="Completed" value={counts.completed} hint="Finished jobs" tone="emerald" />
          <StatCard label="Cancelled" value={counts.cancelled} hint="Cancelled or no-show" tone="red" />
          <StatCard label="Account Linked" value={counts.accountLinked} hint="Ready for billing" tone="violet" />
          <StatCard label="Third-party" value={counts.thirdParty} hint="Booked for someone else" tone="fuchsia" />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              <TabButton active={activeTab === 'ALL'} label={`All (${counts.all})`} onClick={() => setActiveTab('ALL')} />
              <TabButton active={activeTab === 'LIVE'} label={`Live (${counts.live})`} onClick={() => setActiveTab('LIVE')} />
              <TabButton active={activeTab === 'SCHEDULED'} label={`Scheduled (${counts.scheduled})`} onClick={() => setActiveTab('SCHEDULED')} />
              <TabButton active={activeTab === 'COMPLETED'} label={`Completed (${counts.completed})`} onClick={() => setActiveTab('COMPLETED')} />
              <TabButton active={activeTab === 'CANCELLED'} label={`Cancelled (${counts.cancelled})`} onClick={() => setActiveTab('CANCELLED')} />
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
              <select
                value={accountFilter}
                onChange={(e) =>
                  setAccountFilter(
                    e.target.value as 'ALL' | 'ACCOUNT' | 'NON_ACCOUNT',
                  )
                }
                className="rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50"
              >
                <option value="ALL">All booking types</option>
                <option value="ACCOUNT">Account-linked only</option>
                <option value="NON_ACCOUNT">Non-account only</option>
              </select>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ref, booker, passenger, phone, route, driver..."
                className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-500/50 sm:w-[460px]"
              />
            </div>
          </div>

          <div className="hidden grid-cols-[150px_190px_1.5fr_1.5fr_1.8fr_150px_150px_120px] gap-3 border-b border-white/10 px-3 pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 xl:grid">
            <div>Reference</div>
            <div>Pickup Time</div>
            <div>Booked By</div>
            <div>Passenger</div>
            <div>Route</div>
            <div>Status</div>
            <div>Driver</div>
            <div>Fare</div>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-sm text-white/60">
                Loading bookings...
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-sm text-white/60">
                No bookings found.
              </div>
            ) : (
              filteredBookings.map((booking) => (
                <button
                  type="button"
                  key={booking.id}
                  onClick={() => {
                    setDrawerError('');
                    setSelectedBooking(booking);
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-[#0b1728] p-4 text-left transition hover:border-cyan-500/30 hover:bg-[#0d1a2d]"
                >
                  <div className="grid gap-4 xl:grid-cols-[150px_190px_1.5fr_1.5fr_1.8fr_150px_150px_120px] xl:items-center">
                    <div>
                      <div className="text-sm font-bold text-white">
                        {booking.reference}
                      </div>
                      <div className="mt-2">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${bookingTypeTone(
                            booking.isThirdPartyBooking,
                          )}`}
                        >
                          {booking.isThirdPartyBooking ? 'Third-party' : 'Direct'}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm text-white/80">
                      {formatDateTime(getPickupTimeLabel(booking))}
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-white">
                        {getBookerName(booking)}
                      </div>
                      <div className="mt-1 text-xs text-white/50">
                        {getBookerPhone(booking)}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-white">
                        {getPassengerName(booking)}
                      </div>
                      <div className="mt-1 text-xs text-white/50">
                        {getPassengerPhone(booking)}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-sm text-white">
                        {getPickupLabel(booking)}
                      </div>
                      <div className="truncate text-sm text-white/50">
                        → {getDropoffLabel(booking)}
                      </div>
                    </div>

                    <div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(
                          booking.status,
                        )}`}
                      >
                        {(booking.status || 'UNKNOWN').replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-sm text-white/80">
                      {getDriverName(booking.driver)}
                    </div>

                    <div className="text-sm font-semibold text-white">
                      {formatPrice(booking.quotedPrice)}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/5 pt-4 text-xs text-white/50">
                    <span>Account: {getAccountLabel(booking)}</span>
                    <span>Passengers: {booking.passengerCount ?? '—'}</span>
                    <span>Created: {formatDateTime(booking.createdAt)}</span>
                    <span className="text-cyan-300">Click to view details</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      <BookingDrawer
        booking={selectedBooking}
        drivers={drivers}
        error={drawerError}
        actionLoading={actionLoading}
        onClose={() => setSelectedBooking(null)}
        onCancelBooking={handleCancelBooking}
        onStatusChange={handleStatusChange}
        onAutoDispatch={handleAutoDispatch}
        onUnassignDriver={handleUnassignDriver}
        onAssignDriver={handleAssignDriver}
        onUpdateBooking={handleUpdateBooking}
      />
    </AdminShell>
  );
}

function BookingDrawer({
  booking,
  drivers,
  error,
  actionLoading,
  onClose,
  onCancelBooking,
  onStatusChange,
  onAutoDispatch,
  onUnassignDriver,
  onAssignDriver,
  onUpdateBooking,
}: {
  booking: Booking | null;
  drivers: Driver[];
  error: string;
  actionLoading: string;
  onClose: () => void;
  onCancelBooking: (bookingId: string) => Promise<void>;
  onStatusChange: (bookingId: string, status: string) => Promise<void>;
  onAutoDispatch: (bookingId: string) => Promise<void>;
  onUnassignDriver: (bookingId: string) => Promise<void>;
  onAssignDriver: (
    bookingId: string,
    driverId: string,
    isReassign: boolean,
  ) => Promise<void>;
  onUpdateBooking: (bookingId: string, form: EditForm) => Promise<void>;
}) {
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  useEffect(() => {
    setSelectedDriverId('');
    setEditMode(false);
    setEditForm(booking ? buildEditForm(booking) : null);
  }, [booking?.id]);

  useEffect(() => {
    if (!booking || editMode) return;
    setEditForm(buildEditForm(booking));
  }, [booking, editMode]);

  if (!booking || !editForm) return null;

  const isCancelledBooking = isCancelled(booking.status);
  const isCompletedBooking = (booking.status || '').toUpperCase() === 'COMPLETED';
  const locked = Boolean(actionLoading) || isCancelledBooking || isCompletedBooking;
  const hasDriver = Boolean(booking.driverId);
  const selectedDriverIsCurrent =
    selectedDriverId && selectedDriverId === booking.driverId;

  function setEditField<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setEditForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: value,
      };
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="h-full w-full max-w-3xl overflow-y-auto border-l border-white/10 bg-[#07111f] text-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#07111f]/95 px-6 py-5 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                Booking Details
              </p>
              <h2 className="mt-2 text-2xl font-bold">{booking.reference}</h2>
              <p className="mt-2 text-sm text-white/60">
                {getPickupLabel(booking)} → {getDropoffLabel(booking)}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/5"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <section className="grid gap-4 md:grid-cols-3">
            <InfoCard label="Status" value={booking.status} />
            <InfoCard
              label="Pickup Time"
              value={formatDateTime(getPickupTimeLabel(booking))}
            />
            <InfoCard label="Fare" value={formatPrice(booking.quotedPrice)} />
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold">Edit Booking</h3>

              {!editMode ? (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => setEditMode(true)}
                  className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-50"
                >
                  Edit Booking
                </button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={Boolean(actionLoading)}
                    onClick={() => {
                      setEditMode(false);
                      setEditForm(buildEditForm(booking));
                    }}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10 disabled:opacity-50"
                  >
                    Cancel Edit
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(actionLoading)}
                    onClick={async () => {
                      await onUpdateBooking(booking.id, editForm);
                      setEditMode(false);
                    }}
                    className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-cyan-400 disabled:opacity-50"
                  >
                    {actionLoading === `edit-${booking.id}`
                      ? 'Saving...'
                      : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            {editMode ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <EditField
                    label="Pickup"
                    value={editForm.pickup}
                    onChange={(value) => setEditField('pickup', value)}
                  />
                  <EditField
                    label="Dropoff"
                    value={editForm.dropoff}
                    onChange={(value) => setEditField('dropoff', value)}
                  />
                  <EditField
                    label="Pickup Date / Time"
                    type="datetime-local"
                    value={editForm.pickupTime}
                    onChange={(value) => setEditField('pickupTime', value)}
                  />
                  <EditField
                    label="Quoted Price"
                    type="number"
                    value={editForm.quotedPrice}
                    onChange={(value) => setEditField('quotedPrice', value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <EditField
                    label="Booker Name"
                    value={editForm.bookerName}
                    onChange={(value) => setEditField('bookerName', value)}
                  />
                  <EditField
                    label="Booker Phone"
                    value={editForm.bookerPhone}
                    onChange={(value) => setEditField('bookerPhone', value)}
                  />
                  <EditField
                    label="Booker Email"
                    value={editForm.bookerEmail}
                    onChange={(value) => setEditField('bookerEmail', value)}
                  />
                  <EditField
                    label="Passenger Count"
                    type="number"
                    value={editForm.passengerCount}
                    onChange={(value) => setEditField('passengerCount', value)}
                  />
                  <EditField
                    label="Passenger Name"
                    value={editForm.passengerName}
                    onChange={(value) => setEditField('passengerName', value)}
                  />
                  <EditField
                    label="Passenger Phone"
                    value={editForm.passengerPhone}
                    onChange={(value) => setEditField('passengerPhone', value)}
                  />
                </div>

                <EditArea
                  label="Passenger Notes"
                  value={editForm.passengerNotes}
                  onChange={(value) => setEditField('passengerNotes', value)}
                />

                <EditArea
                  label="Booking Notes"
                  value={editForm.notes}
                  onChange={(value) => setEditField('notes', value)}
                />
              </div>
            ) : (
              <p className="text-sm text-white/55">
                Use edit mode to amend passenger details, pickup time, route,
                notes and quoted price.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 text-lg font-bold">People</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <InfoPanel
                title="Booked By"
                lines={[
                  getBookerName(booking),
                  getBookerPhone(booking),
                  booking.bookerEmail || '',
                ]}
              />
              <InfoPanel
                title="Passenger"
                lines={[
                  getPassengerName(booking),
                  getPassengerPhone(booking),
                  `Passengers: ${booking.passengerCount ?? '—'}`,
                ]}
              />
            </div>

            {booking.passengerNotes ? (
              <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-cyan-300">
                  Passenger Notes
                </p>
                <p className="mt-2 text-sm text-cyan-50">
                  {booking.passengerNotes}
                </p>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 text-lg font-bold">Journey</h3>
            <div className="space-y-3">
              <InfoPanel title="Pickup" lines={[getPickupLabel(booking)]} />
              <InfoPanel title="Dropoff" lines={[getDropoffLabel(booking)]} />
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 text-lg font-bold">Driver Assignment</h3>

            <div className="space-y-4">
              <InfoPanel
                title="Current Driver"
                lines={[
                  getDriverName(booking.driver),
                  booking.driver?.phone || '',
                  booking.driver?.email || '',
                  booking.driver?.status
                    ? `Status: ${booking.driver.status}`
                    : '',
                ]}
              />

              <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                <select
                  value={selectedDriverId}
                  disabled={locked}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none disabled:opacity-50"
                >
                  <option value="">Select driver</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {getDriverName(driver)}
                      {driver.status ? ` · ${driver.status}` : ''}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={
                    locked ||
                    !selectedDriverId ||
                    Boolean(selectedDriverIsCurrent)
                  }
                  onClick={() =>
                    void onAssignDriver(booking.id, selectedDriverId, hasDriver)
                  }
                  className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-50"
                >
                  {actionLoading === `assign-${booking.id}`
                    ? hasDriver
                      ? 'Reassigning...'
                      : 'Assigning...'
                    : hasDriver
                      ? 'Reassign'
                      : 'Assign'}
                </button>
              </div>

              {selectedDriverIsCurrent ? (
                <p className="text-xs text-amber-300">
                  This driver is already assigned to the booking.
                </p>
              ) : null}
            </div>
          </section>

          {booking.notes ? (
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="mb-4 text-lg font-bold">Booking Notes</h3>
              <p className="rounded-xl border border-white/10 bg-[#0b1728] p-4 text-sm text-white/80">
                {booking.notes}
              </p>
            </section>
          ) : null}

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 text-lg font-bold">Actions</h3>

            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={booking.status}
                disabled={locked}
                onChange={(e) => void onStatusChange(booking.id, e.target.value)}
                className="rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none disabled:opacity-50"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={locked}
                onClick={() => void onAutoDispatch(booking.id)}
                className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
              >
                {actionLoading === `auto-${booking.id}`
                  ? 'Dispatching...'
                  : 'Auto Dispatch'}
              </button>

              <button
                type="button"
                disabled={locked || !booking.driverId}
                onClick={() => void onUnassignDriver(booking.id)}
                className="rounded-xl border border-slate-500/20 bg-slate-500/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-500/20 disabled:opacity-50"
              >
                {actionLoading === `unassign-${booking.id}`
                  ? 'Unassigning...'
                  : booking.driverId
                    ? 'Unassign Driver'
                    : 'No Driver Assigned'}
              </button>

              <button
                type="button"
                disabled={locked}
                onClick={() => void onCancelBooking(booking.id)}
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
              >
                {actionLoading === `cancel-${booking.id}`
                  ? 'Cancelling...'
                  : isCancelledBooking
                    ? 'Already Cancelled'
                    : 'Cancel Booking'}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 text-lg font-bold">Timeline</h3>

            {booking.events?.length ? (
              <div className="space-y-3">
                {booking.events.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-xl border border-white/10 bg-[#0b1728] p-4"
                  >
                    <p className="text-sm text-white/85">{event.message}</p>
                    <p className="mt-2 text-xs text-white/45">
                      {formatDateTime(event.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-[#0b1728] p-4 text-sm text-white/50">
                No timeline events yet.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-white/65">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50"
      />
    </label>
  );
}

function EditArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-white/65">{label}</div>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50"
      />
    </label>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-white/50">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function InfoPanel({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b1728] p-4">
      <p className="text-xs uppercase tracking-[0.15em] text-white/40">
        {title}
      </p>
      <div className="mt-2 space-y-1">
        {lines
          .filter((line) => line !== '')
          .map((line, index) => (
            <p key={`${title}-${index}`} className="text-sm text-white/80">
              {line}
            </p>
          ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: 'slate' | 'cyan' | 'amber' | 'emerald' | 'red' | 'violet' | 'fuchsia';
}) {
  const toneMap = {
    slate: 'from-slate-500/10 to-transparent border-white/10',
    cyan: 'from-cyan-500/10 to-transparent border-cyan-500/20',
    amber: 'from-amber-500/10 to-transparent border-amber-500/20',
    emerald: 'from-emerald-500/10 to-transparent border-emerald-500/20',
    red: 'from-red-500/10 to-transparent border-red-500/20',
    violet: 'from-violet-500/10 to-transparent border-violet-500/20',
    fuchsia: 'from-fuchsia-500/10 to-transparent border-fuchsia-500/20',
  };

  return (
    <div className={`rounded-3xl border bg-gradient-to-br ${toneMap[tone]} p-5`}>
      <p className="text-sm font-medium text-white/60">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs text-white/45">{hint}</p>
    </div>
  );
}

function TabButton({
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
          ? 'bg-cyan-500 text-black'
          : 'bg-white/5 text-slate-300 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );
}