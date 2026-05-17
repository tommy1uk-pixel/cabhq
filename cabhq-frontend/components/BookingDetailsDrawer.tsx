'use client';

type Driver = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  lastLocationAt?: string | null;
};

type BookingEvent = {
  id: string;
  message: string;
  createdAt: string;
};

type Booking = {
  id: string;
  reference: string;
  pickup: string;
  dropoff: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  status: string;
  pickupTime: string;
  customerName?: string | null;
  customerPhone?: string | null;
  isThirdPartyBooking?: boolean;
  bookerName?: string | null;
  bookerPhone?: string | null;
  bookerEmail?: string | null;
  passengerName?: string | null;
  passengerPhone?: string | null;
  passengerNotes?: string | null;
  passengerCount?: number | null;
  notes?: string | null;
  pricingMode?: string | null;
  quotedPrice?: number | null;
  calculatedFare?: number | null;
  distanceMiles?: number | null;
  durationMinutes?: number | null;
  createdAt: string;
  driver?: Driver | null;
  driverId?: string | null;
  events?: BookingEvent[];
};

type Props = {
  booking: Booking | null;
  etaMinutes: number | null;
  actionError?: string;
  onClearError?: () => void;
  onClose: () => void;
  onStatusChange: (bookingId: string, status: string) => Promise<void> | void;
  onAutoDispatch: (bookingId: string) => Promise<void> | void;
  onUnassignDriver?: (bookingId: string) => Promise<void> | void;
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
  'NO_SHOW',
] as const;

const ACTIVE_DRIVER_STATUSES = ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB'];

export default function BookingDetailsDrawer({
  booking,
  etaMinutes,
  actionError,
  onClearError,
  onClose,
  onStatusChange,
  onAutoDispatch,
  onUnassignDriver,
}: Props) {
  if (!booking) return null;

  const hasAssignedDriver = Boolean(booking.driver || booking.driverId);
  const canAutoDispatch = !hasAssignedDriver && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(booking.status);
  const canUnassign =
    hasAssignedDriver &&
    onUnassignDriver &&
    !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(booking.status);

  const bookerName = booking.bookerName || booking.customerName || '—';
  const bookerPhone = booking.bookerPhone || booking.customerPhone || '—';
  const passengerName =
    booking.passengerName || booking.customerName || booking.bookerName || '—';
  const passengerPhone =
    booking.passengerPhone || booking.customerPhone || booking.bookerPhone || '—';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-[#07111f] text-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#07111f]/95 px-6 py-5 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                Booking Drawer
              </p>
              <h2 className="mt-2 text-2xl font-black">{booking.reference}</h2>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">
                  {booking.status}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/70">
                  {hasAssignedDriver ? 'Driver Assigned' : 'Unassigned'}
                </span>
                {booking.isThirdPartyBooking ? (
                  <span className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-bold text-fuchsia-300">
                    Third-party
                  </span>
                ) : null}
              </div>
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
          {actionError ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-amber-200">
                    Dispatch action failed
                  </p>
                  <p className="mt-2 text-sm text-amber-100">{actionError}</p>
                </div>

                {onClearError ? (
                  <button
                    type="button"
                    onClick={onClearError}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/80 transition hover:bg-white/10"
                  >
                    Dismiss
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 text-lg font-bold">Journey</h3>

            <InfoBlock label="Pickup" value={booking.pickup} />
            <InfoBlock label="Dropoff" value={booking.dropoff} />
            <InfoBlock label="Pickup Time" value={formatDateTime(booking.pickupTime)} />
            <InfoBlock
              label="Fare"
              value={
                booking.quotedPrice != null
                  ? `£${booking.quotedPrice.toFixed(2)}`
                  : booking.calculatedFare != null
                    ? `£${booking.calculatedFare.toFixed(2)}`
                    : 'No price'
              }
            />
            <InfoBlock
              label="Distance"
              value={
                booking.distanceMiles != null
                  ? `${booking.distanceMiles.toFixed(2)} miles`
                  : 'Unknown'
              }
            />
            <InfoBlock
              label="Duration"
              value={
                booking.durationMinutes != null
                  ? `${booking.durationMinutes} mins`
                  : 'Unknown'
              }
            />
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 text-lg font-bold">People</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <PersonCard
                label="Booked By"
                name={bookerName}
                phone={bookerPhone}
                email={booking.bookerEmail}
              />
              <PersonCard
                label="Passenger"
                name={passengerName}
                phone={passengerPhone}
                extra={`Passengers: ${booking.passengerCount ?? '—'}`}
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
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold">Driver</h3>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  hasAssignedDriver
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : 'bg-amber-500/10 text-amber-300'
                }`}
              >
                {hasAssignedDriver ? 'Assigned' : 'Needs Driver'}
              </span>
            </div>

            {booking.driver ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-lg font-black text-white">{booking.driver.name}</p>
                <p className="mt-1 text-sm text-white/70">
                  {booking.driver.phone || 'No phone'}
                  {booking.driver.email ? ` · ${booking.driver.email}` : ''}
                </p>
                <p className="mt-2 text-xs font-bold text-cyan-300">
                  Status: {booking.driver.status}
                </p>

                {booking.driver.latitude != null && booking.driver.longitude != null ? (
                  <p className="mt-1 text-xs text-white/50">
                    GPS {booking.driver.latitude.toFixed(5)}, {booking.driver.longitude.toFixed(5)}
                  </p>
                ) : null}

                {booking.driver.lastLocationAt ? (
                  <p className="mt-1 text-xs text-white/50">
                    Last update: {formatDateTime(booking.driver.lastLocationAt)}
                  </p>
                ) : null}

                {etaMinutes != null ? (
                  <p className="mt-3 text-sm font-bold text-emerald-300">
                    ETA: {etaMinutes} mins
                  </p>
                ) : null}

                {canUnassign ? (
                  <button
                    type="button"
                    onClick={() => void onUnassignDriver(booking.id)}
                    className="mt-4 w-full rounded-xl bg-slate-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-600"
                  >
                    Unassign Driver
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                No driver assigned yet. Use Auto Dispatch or assign from the main dispatch board.
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 text-lg font-bold">Actions</h3>

            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => void onAutoDispatch(booking.id)}
                disabled={!canAutoDispatch}
                className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                  canAutoDispatch
                    ? 'bg-amber-600 text-white hover:bg-amber-500'
                    : 'cursor-not-allowed bg-slate-700/60 text-white/35'
                }`}
              >
                {hasAssignedDriver ? 'Driver Already Assigned' : 'Auto Dispatch'}
              </button>

              <select
                value={booking.status}
                onChange={(e) => void onStatusChange(booking.id, e.target.value)}
                className="rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {hasAssignedDriver && ACTIVE_DRIVER_STATUSES.includes(booking.status) ? (
              <p className="mt-3 text-xs text-emerald-300">
                This booking is already live with a driver. Assignment controls are hidden to prevent duplicate dispatch.
              </p>
            ) : null}
          </section>

          {booking.notes ? (
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="mb-4 text-lg font-bold">Booking Notes</h3>
              <div className="rounded-xl border border-white/10 bg-[#0b1728] p-4 text-sm text-white/80">
                {booking.notes}
              </div>
            </section>
          ) : null}

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
              <div className="rounded-xl border border-white/10 bg-[#0b1728] p-4 text-white/50">
                No timeline events yet.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-white/10 py-4 first:pt-0 last:border-b-0 last:pb-0">
      <p className="text-xs uppercase tracking-[0.2em] text-white/40">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function PersonCard({
  label,
  name,
  phone,
  email,
  extra,
}: {
  label: string;
  name: string;
  phone: string;
  email?: string | null;
  extra?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b1728] p-4">
      <p className="text-xs uppercase tracking-[0.15em] text-white/40">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{name}</p>
      <p className="mt-1 text-sm text-white/60">{phone}</p>
      {email ? <p className="mt-1 break-words text-xs text-white/45">{email}</p> : null}
      {extra ? <p className="mt-2 text-xs text-white/45">{extra}</p> : null}
    </div>
  );
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