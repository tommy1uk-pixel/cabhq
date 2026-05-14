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
] as const;

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
                Booking Details
              </p>
              <h2 className="mt-2 text-2xl font-bold">{booking.reference}</h2>
              <p className="mt-2 text-sm text-white/60">
                {booking.pickup} → {booking.dropoff}
              </p>

              {booking.isThirdPartyBooking ? (
                <div className="mt-3 inline-flex rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-semibold text-fuchsia-300">
                  Booked for someone else
                </div>
              ) : null}
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

          <section className="grid gap-4 md:grid-cols-2">
            <Card label="Pickup Time" value={formatDateTime(booking.pickupTime)} />
            <Card label="Status" value={booking.status} />
            <Card
              label="Quoted Price"
              value={
                booking.quotedPrice != null
                  ? `£${booking.quotedPrice.toFixed(2)}`
                  : 'No price'
              }
            />
            <Card label="Pricing Mode" value={booking.pricingMode || 'Not set'} />
            <Card
              label="Distance"
              value={
                booking.distanceMiles != null
                  ? `${booking.distanceMiles.toFixed(2)} miles`
                  : 'Unknown'
              }
            />
            <Card
              label="Duration"
              value={
                booking.durationMinutes != null
                  ? `${booking.durationMinutes} mins`
                  : 'Unknown'
              }
            />
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold">People</h3>
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">
                {booking.isThirdPartyBooking ? 'Third-party booking' : 'Direct booking'}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-[#0b1728] p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-white/40">
                  Booked By
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{bookerName}</p>
                <p className="mt-1 text-sm text-white/60">{bookerPhone}</p>
                {booking.bookerEmail ? (
                  <p className="mt-1 break-words text-xs text-white/45">
                    {booking.bookerEmail}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0b1728] p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-white/40">
                  Passenger
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {passengerName}
                </p>
                <p className="mt-1 text-sm text-white/60">{passengerPhone}</p>
                <p className="mt-2 text-xs text-white/45">
                  Passengers: {booking.passengerCount ?? '—'}
                </p>
              </div>
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
              <h3 className="text-lg font-bold">Assigned Driver</h3>
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">
                {booking.driver ? 'Assigned' : 'Unassigned'}
              </span>
            </div>

            {booking.driver ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-[#0b1728] p-4">
                  <p className="font-semibold">{booking.driver.name}</p>
                  <p className="mt-1 text-sm text-white/60">
                    {booking.driver.phone || 'No phone'}
                    {booking.driver.email ? ` · ${booking.driver.email}` : ''}
                  </p>
                  <p className="mt-2 text-xs text-cyan-300">
                    Status: {booking.driver.status}
                  </p>
                  {booking.driver.lastLocationAt ? (
                    <p className="mt-1 text-xs text-white/45">
                      Last update: {formatDateTime(booking.driver.lastLocationAt)}
                    </p>
                  ) : null}
                  {booking.driver.latitude != null &&
                  booking.driver.longitude != null ? (
                    <p className="mt-1 text-xs text-white/45">
                      {booking.driver.latitude.toFixed(5)},{' '}
                      {booking.driver.longitude.toFixed(5)}
                    </p>
                  ) : null}
                  {etaMinutes != null ? (
                    <p className="mt-2 text-sm font-semibold text-emerald-300">
                      ETA: {etaMinutes} mins
                    </p>
                  ) : null}
                </div>

                {onUnassignDriver ? (
                  <button
                    type="button"
                    onClick={() => void onUnassignDriver(booking.id)}
                    className="w-full rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-600"
                  >
                    Unassign Driver
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-[#0b1728] p-4 text-white/50">
                No driver assigned yet.
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 text-lg font-bold">Actions</h3>

            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => void onAutoDispatch(booking.id)}
                className="rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-500"
              >
                Auto Dispatch
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
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 text-lg font-bold">Journey</h3>

            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-[#0b1728] p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-white/40">
                  Pickup
                </p>
                <p className="mt-2 text-sm text-white/85">{booking.pickup}</p>
                {booking.pickupLat != null && booking.pickupLng != null ? (
                  <p className="mt-2 text-xs text-white/45">
                    {booking.pickupLat}, {booking.pickupLng}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0b1728] p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-white/40">
                  Dropoff
                </p>
                <p className="mt-2 text-sm text-white/85">{booking.dropoff}</p>
                {booking.dropoffLat != null && booking.dropoffLng != null ? (
                  <p className="mt-2 text-xs text-white/45">
                    {booking.dropoffLat}, {booking.dropoffLng}
                  </p>
                ) : null}
              </div>
            </div>
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

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-white/50">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
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