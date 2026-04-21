'use client';

import 'leaflet/dist/leaflet.css';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { DivIcon, LatLngTuple, Map as LeafletMap } from 'leaflet';
import { closeSocket, getSocket } from '../../lib/socket';
import AddressAutofillInput, {
  type SelectedAddress,
} from '@/components/AddressAutofillInput';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ||
  'http://localhost:3002';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false },
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false },
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false },
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false },
);

type Vehicle = {
  id: string;
  registration?: string;
  reg?: string;
  make?: string | null;
  model?: string | null;
} | null;

type Driver = {
  id: string;
  fullName?: string;
  name?: string;
  isOnDuty?: boolean;
  isAvailable?: boolean;
  status?: string;
  latitude?: number | null;
  longitude?: number | null;
  lastLocationAt?: string | null;
  vehicle?: Vehicle;
};

type DriverSuggestion = {
  id: string;
  name: string;
  status: string;
  distanceMiles?: number | null;
  score?: number | null;
  lastLocationAt?: string | null;
  vehicle?: Vehicle;
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
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  dropoffLatitude?: number | null;
  dropoffLongitude?: number | null;
  suggestedDrivers?: DriverSuggestion[];
};

type TimelineEvent = {
  id: string;
  type: string;
  note?: string | null;
  createdAt: string;
};

type BookingFormState = {
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  dropoffAddress: string;
  whenType: 'ASAP' | 'SCHEDULED';
  pickupAt: string;
  passengerCount: number;
  quotedPrice: string;
  notes: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  dropoffLatitude: number | null;
  dropoffLongitude: number | null;
};

type BookingTab = 'LIVE' | 'COMPLETED';

const initialForm: BookingFormState = {
  customerName: '',
  customerPhone: '',
  pickupAddress: '',
  dropoffAddress: '',
  whenType: 'ASAP',
  pickupAt: '',
  passengerCount: 1,
  quotedPrice: '',
  notes: '',
  pickupLatitude: null,
  pickupLongitude: null,
  dropoffLatitude: null,
  dropoffLongitude: null,
};

function getDriverName(driver: Driver) {
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

function getVehicleLabel(vehicle: Vehicle) {
  if (!vehicle) return 'No vehicle assigned';

  const reg = vehicle.registration || vehicle.reg || '';
  const details = [vehicle.make, vehicle.model].filter(Boolean).join(' ');

  if (reg && details) return `${reg} • ${details}`;
  if (reg) return reg;
  if (details) return details;

  return 'Vehicle assigned';
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeOnly(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDistance(value?: number | null) {
  if (value == null) return '—';
  return `${value.toFixed(2)} mi`;
}

function formatPrice(value?: number | null) {
  if (value == null) return '—';
  return `£${value.toFixed(2)}`;
}

function toDateTimeLocalValue(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function isCompletedStatus(status?: string) {
  return ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(
    (status || '').toUpperCase(),
  );
}

function isLiveStatus(status?: string) {
  return !isCompletedStatus(status);
}

function statusTone(status?: string) {
  const normalized = (status || '').toUpperCase();

  if (normalized === 'COMPLETED') {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
  }

  if (normalized === 'CANCELLED' || normalized === 'NO_SHOW') {
    return 'bg-rose-500/15 text-rose-300 border-rose-500/25';
  }

  if (normalized === 'OFFERED' || normalized === 'BOOKED') {
    return 'bg-amber-500/15 text-amber-300 border-amber-500/25';
  }

  if (
    ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB', 'ALLOCATED'].includes(
      normalized,
    )
  ) {
    return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25';
  }

  return 'bg-slate-500/15 text-slate-300 border-slate-500/25';
}

function Card({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
    </div>
  );
}

export default function DispatchPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driversError, setDriversError] = useState('');
  const [connected, setConnected] = useState(false);
  const [assigningKey, setAssigningKey] = useState<string | null>(null);
  const [autoDispatchingId, setAutoDispatchingId] = useState<string | null>(
    null,
  );
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [driverIconFactory, setDriverIconFactory] =
    useState<((driver: Driver) => DivIcon) | null>(null);
  const [bookingIconFactory, setBookingIconFactory] =
    useState<((color: string, label: string) => DivIcon) | null>(null);
  const [form, setForm] = useState<BookingFormState>(initialForm);
  const [activeTab, setActiveTab] = useState<BookingTab>('LIVE');

  const mapRef = useRef<LeafletMap | null>(null);

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    let mounted = true;

    async function loadLeaflet() {
      const L = await import('leaflet');
      if (!mounted) return;

      setDriverIconFactory(() => (driver: Driver) => {
        const status = (driver.status || '').toUpperCase();
        const available = driver.isAvailable || status === 'AVAILABLE';
        const busy =
          status === 'BUSY' || status === 'ON_JOB' || status === 'EN_ROUTE';
        const blocked = status === 'OFF_DUTY';

        const color = blocked
          ? '#ef4444'
          : busy
            ? '#f59e0b'
            : available
              ? '#22c55e'
              : '#06b6d4';

        return L.divIcon({
          className: '',
          html: `
            <div style="
              width: 18px;
              height: 18px;
              border-radius: 9999px;
              background: ${color};
              border: 3px solid white;
              box-shadow: 0 0 0 2px rgba(0,0,0,0.35);
            "></div>
          `,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
      });

      setBookingIconFactory(() => (color: string, label: string) =>
        L.divIcon({
          className: '',
          html: `
            <div style="
              min-width: 26px;
              height: 26px;
              border-radius: 9999px;
              background: ${color};
              color: white;
              border: 2px solid white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: 700;
              box-shadow: 0 0 0 2px rgba(0,0,0,0.35);
              padding: 0 6px;
            ">${label}</div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
      );
    }

    void loadLeaflet();
    return () => {
      mounted = false;
    };
  }, []);

  const liveDrivers = useMemo(
    () =>
      drivers.filter(
        (driver) =>
          typeof driver.latitude === 'number' &&
          typeof driver.longitude === 'number',
      ),
    [drivers],
  );

  const selectedDriver = useMemo<Driver | null>(() => {
    if (!selectedBooking?.driverId) return null;
    return drivers.find((d) => d.id === selectedBooking.driverId) ?? null;
  }, [selectedBooking, drivers]);

  const selectedDriverPosition = useMemo<LatLngTuple | null>(() => {
    if (
      !selectedDriver ||
      selectedDriver.latitude == null ||
      selectedDriver.longitude == null
    ) {
      return null;
    }

    return [selectedDriver.latitude, selectedDriver.longitude] as LatLngTuple;
  }, [selectedDriver]);

  const selectedPickupPosition = useMemo<LatLngTuple | null>(() => {
    if (
      selectedBooking?.pickupLatitude == null ||
      selectedBooking?.pickupLongitude == null
    ) {
      return null;
    }
    return [
      selectedBooking.pickupLatitude,
      selectedBooking.pickupLongitude,
    ] as LatLngTuple;
  }, [selectedBooking]);

  const selectedDropoffPosition = useMemo<LatLngTuple | null>(() => {
    if (
      selectedBooking?.dropoffLatitude == null ||
      selectedBooking?.dropoffLongitude == null
    ) {
      return null;
    }
    return [
      selectedBooking.dropoffLatitude,
      selectedBooking.dropoffLongitude,
    ] as LatLngTuple;
  }, [selectedBooking]);

  const mapCenter = useMemo<LatLngTuple>(() => {
    if (selectedPickupPosition) return selectedPickupPosition;
    if (selectedDriverPosition) return selectedDriverPosition;
    if (liveDrivers.length > 0) {
      return [
        liveDrivers[0].latitude as number,
        liveDrivers[0].longitude as number,
      ] as LatLngTuple;
    }
    return [51.5074, -0.1278] as LatLngTuple;
  }, [liveDrivers, selectedPickupPosition, selectedDriverPosition]);

  const stats = useMemo(() => {
    const liveBookings = bookings.filter((booking) => isLiveStatus(booking.status));
    const completedBookings = bookings.filter(
      (booking) => (booking.status || '').toUpperCase() === 'COMPLETED',
    );
    const availableDrivers = drivers.filter(
      (d) => d.isAvailable || d.status === 'AVAILABLE',
    );
    const busyDrivers = drivers.filter(
      (d) =>
        ['BUSY', 'ON_JOB', 'EN_ROUTE', 'ARRIVED', 'ACCEPTED'].includes(
          (d.status || '').toUpperCase(),
        ),
    );

    return {
      bookings: bookings.length,
      liveBookings: liveBookings.length,
      completed: completedBookings.length,
      drivers: drivers.length,
      available: availableDrivers.length,
      busy: busyDrivers.length,
      liveGps: liveDrivers.length,
    };
  }, [bookings, drivers, liveDrivers.length]);

  const liveBookingRows = useMemo(
    () => bookings.filter((booking) => isLiveStatus(booking.status)),
    [bookings],
  );

  const completedBookingRows = useMemo(
    () => bookings.filter((booking) => isCompletedStatus(booking.status)),
    [bookings],
  );

  const displayedBookings = activeTab === 'LIVE' ? liveBookingRows : completedBookingRows;

  const nearestDrivers = useMemo(() => {
    if (!selectedBooking?.suggestedDrivers?.length) return [];
    return selectedBooking.suggestedDrivers.slice(0, 5);
  }, [selectedBooking]);

  const loadBookings = useCallback(async () => {
    if (!token) return;

    const response = await fetch(`${API_URL}/bookings/dispatch-board`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to load bookings (${response.status})`);
    }

    const data = (await response.json()) as Booking[];
    setBookings(Array.isArray(data) ? data : []);
  }, [token]);

  const loadDrivers = useCallback(
    async (showSpinner = true) => {
      if (!token) return;

      try {
        setDriversError('');
        if (showSpinner) setDriversLoading(true);

        const response = await fetch(`${API_URL}/drivers`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Failed to load drivers (${response.status})`);
        }

        const data = (await response.json()) as Driver[];
        setDrivers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        setDriversError(
          error instanceof Error ? error.message : 'Failed to load drivers',
        );
      } finally {
        if (showSpinner) setDriversLoading(false);
      }
    },
    [token],
  );

  const hardRefresh = useCallback(async () => {
    await Promise.all([loadBookings(), loadDrivers(false)]);
  }, [loadBookings, loadDrivers]);

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      try {
        setLoading(true);
        await Promise.all([loadBookings(), loadDrivers(true)]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token, loadBookings, loadDrivers]);

  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      void hardRefresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [token, hardRefresh]);

  useEffect(() => {
    const onFocus = () => {
      void hardRefresh();
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [hardRefresh]);

  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('booking:created', (p) => {
      setBookings((prev) => [p.booking, ...prev]);
    });

    socket.on('booking:updated', (p) => {
      setBookings((prev) =>
        prev.map((b) => (b.id === p.booking.id ? p.booking : b)),
      );
      setSelectedBooking((prev) => (prev?.id === p.booking.id ? p.booking : prev));
    });

    socket.on('booking:assigned', (p) => {
      setBookings((prev) =>
        prev.map((b) => (b.id === p.booking.id ? p.booking : b)),
      );
      setSelectedBooking((prev) => (prev?.id === p.booking.id ? p.booking : prev));
    });

    socket.on('booking:status_changed', (p) => {
      setBookings((prev) =>
        prev.map((b) => (b.id === p.booking.id ? p.booking : b)),
      );
      setSelectedBooking((prev) => (prev?.id === p.booking.id ? p.booking : prev));
    });

    socket.on('driver:updated', (p) => {
      setDrivers((prev) => {
        const existing = prev.some((d) => d.id === p.driver.id);
        if (!existing) return [p.driver, ...prev];
        return prev.map((d) => (d.id === p.driver.id ? p.driver : d));
      });
    });

    return () => closeSocket();
  }, [token]);

  useEffect(() => {
    if (!mapRef.current) return;

    const points: LatLngTuple[] = [
      ...liveDrivers.map(
        (driver): LatLngTuple => [
          driver.latitude as number,
          driver.longitude as number,
        ],
      ),
    ];

    if (selectedDriverPosition) points.push(selectedDriverPosition);
    if (selectedPickupPosition) points.push(selectedPickupPosition);
    if (selectedDropoffPosition) points.push(selectedDropoffPosition);

    if (points.length === 0) return;

    if (points.length === 1) {
      mapRef.current.setView(points[0], 13);
      return;
    }

    mapRef.current.fitBounds(points, { padding: [24, 24] });
  }, [
    liveDrivers,
    selectedDriverPosition,
    selectedPickupPosition,
    selectedDropoffPosition,
  ]);

  const autoDispatch = async (id: string) => {
    try {
      setAutoDispatchingId(id);
      await fetch(`${API_URL}/bookings/${id}/auto-dispatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await hardRefresh();
    } finally {
      setAutoDispatchingId(null);
    }
  };

  const assignDriver = async (bookingId: string, driverId: string) => {
    try {
      setAssigningKey(`${bookingId}:${driverId}`);
      await fetch(`${API_URL}/bookings/${bookingId}/assign-driver`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driverId }),
      });
      await hardRefresh();
    } finally {
      setAssigningKey(null);
    }
  };

  const createBooking = async (autoDispatchAfterCreate = false) => {
    try {
      setCreatingBooking(true);
      setBookingError('');

      if (!form.customerName.trim()) {
        throw new Error('Customer name is required');
      }

      if (!form.pickupAddress.trim()) {
        throw new Error('Pickup address is required');
      }

      if (!form.dropoffAddress.trim()) {
        throw new Error('Dropoff address is required');
      }

      if (form.whenType === 'SCHEDULED' && !form.pickupAt) {
        throw new Error('Scheduled bookings need a date and time');
      }

      const scheduledTime =
        form.whenType === 'SCHEDULED'
          ? new Date(form.pickupAt).toISOString()
          : new Date().toISOString();

      const quotedPriceNumber =
        form.quotedPrice.trim() !== '' ? Number(form.quotedPrice) : null;

      if (quotedPriceNumber != null && Number.isNaN(quotedPriceNumber)) {
        throw new Error('Quoted price must be a valid number');
      }

      const payload = {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim() || null,
        pickup: form.pickupAddress.trim(),
        dropoff: form.dropoffAddress.trim(),
        pickupTime: scheduledTime,
        pickupLat: form.pickupLatitude,
        pickupLng: form.pickupLongitude,
        dropoffLat: form.dropoffLatitude,
        dropoffLng: form.dropoffLongitude,
        pickupAddress: form.pickupAddress.trim(),
        dropoffAddress: form.dropoffAddress.trim(),
        pickupAt: scheduledTime,
        pickupLatitude: form.pickupLatitude,
        pickupLongitude: form.pickupLongitude,
        dropoffLatitude: form.dropoffLatitude,
        dropoffLongitude: form.dropoffLongitude,
        passengerCount: Number(form.passengerCount) || 1,
        quotedPrice: quotedPriceNumber,
        notes: form.notes.trim() || null,
      };

      const res = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to create booking');
      }

      const createdBooking = data as Booking;

      setForm(initialForm);
      await hardRefresh();

      if (autoDispatchAfterCreate && createdBooking?.id) {
        await autoDispatch(createdBooking.id);
      }
    } catch (err) {
      setBookingError(
        err instanceof Error ? err.message : 'Failed to create booking',
      );
    } finally {
      setCreatingBooking(false);
    }
  };

  const loadTimeline = async (bookingId: string) => {
    const res = await fetch(`${API_URL}/bookings/${bookingId}/timeline`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setTimeline(await res.json());
  };

  return (
    <main className="min-h-screen bg-[#05070c] p-4 text-white md:p-6">
      <div className="mx-auto max-w-[1800px]">
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#101427] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/70">
              CabHQ Operator
            </div>
            <h1 className="mt-1 text-2xl font-bold">Dispatch Dashboard</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div
              className={`rounded-full border px-3 py-1 font-semibold ${
                connected
                  ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                  : 'border-rose-500/30 bg-rose-500/15 text-rose-300'
              }`}
            >
              {connected ? 'LIVE' : 'OFFLINE'}
            </div>
            <button
              onClick={() => void hardRefresh()}
              className="rounded-full border border-cyan-500/30 bg-cyan-500/15 px-3 py-1 font-semibold text-cyan-200"
            >
              Refresh Now
            </button>
          </div>
        </div>

        <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Card label="Live Jobs" value={stats.liveBookings} />
          <Card label="Completed" value={stats.completed} />
          <Card label="Drivers" value={stats.drivers} />
          <Card label="Available" value={stats.available} />
          <Card label="Busy" value={stats.busy} />
          <Card label="GPS Live" value={stats.liveGps} />
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-[1.15fr_0.72fr_1.15fr]">
          <section className="rounded-2xl border border-white/10 bg-[#0d1120] p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">New Booking</h2>
              <p className="mt-1 text-sm text-slate-400">
                Create and dispatch directly from operator view.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="Customer name"
                value={form.customerName}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, customerName: value }))
                }
                placeholder="John Smith"
              />

              <Field
                label="Customer phone"
                value={form.customerPhone}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, customerPhone: value }))
                }
                placeholder="07..."
              />

              <div className="md:col-span-2">
                <AddressAutofillInput
                  label="Pickup address"
                  value={form.pickupAddress}
                  placeholder="Search pickup address"
                  autoComplete="off"
                  onChangeValue={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      pickupAddress: value,
                    }))
                  }
                  onSelectAddress={(address: SelectedAddress) =>
                    setForm((prev) => ({
                      ...prev,
                      pickupAddress: address.label,
                      pickupLatitude: address.lat,
                      pickupLongitude: address.lng,
                    }))
                  }
                />
              </div>

              <div className="md:col-span-2">
                <AddressAutofillInput
                  label="Dropoff address"
                  value={form.dropoffAddress}
                  placeholder="Search dropoff address"
                  autoComplete="off"
                  onChangeValue={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      dropoffAddress: value,
                    }))
                  }
                  onSelectAddress={(address: SelectedAddress) =>
                    setForm((prev) => ({
                      ...prev,
                      dropoffAddress: address.label,
                      dropoffLatitude: address.lat,
                      dropoffLongitude: address.lng,
                    }))
                  }
                />
              </div>

              <SelectField
                label="When"
                value={form.whenType}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    whenType: value as 'ASAP' | 'SCHEDULED',
                    pickupAt:
                      value === 'ASAP'
                        ? ''
                        : prev.pickupAt || toDateTimeLocalValue(),
                  }))
                }
                options={[
                  { label: 'ASAP', value: 'ASAP' },
                  { label: 'Scheduled', value: 'SCHEDULED' },
                ]}
              />

              {form.whenType === 'SCHEDULED' ? (
                <DateTimeField
                  label="Pickup date & time"
                  value={form.pickupAt}
                  min={toDateTimeLocalValue()}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, pickupAt: value }))
                  }
                />
              ) : (
                <InfoField label="Pickup date & time" value="ASAP" />
              )}

              <NumberField
                label="Passenger count"
                value={form.passengerCount}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, passengerCount: value }))
                }
              />

              <Field
                label="Quoted price"
                value={form.quotedPrice}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, quotedPrice: value }))
                }
                placeholder="12.50"
              />

              <div className="md:col-span-2">
                <TextAreaField
                  label="Notes"
                  value={form.notes}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, notes: value }))
                  }
                  placeholder="Gate code, wheelchair, account note, etc."
                />
              </div>
            </div>

            {bookingError ? (
              <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {bookingError}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => void createBooking(false)}
                disabled={creatingBooking}
                className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold hover:bg-cyan-600 disabled:opacity-50"
              >
                {creatingBooking ? 'Creating...' : 'Create Job'}
              </button>

              <button
                onClick={() => void createBooking(true)}
                disabled={creatingBooking}
                className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50"
              >
                {creatingBooking ? 'Creating...' : 'Create & Auto Dispatch'}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d1120] p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Dispatch Overview</h2>
              <p className="mt-1 text-sm text-slate-400">
                Live buckets and selected booking context.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Driver Buckets
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-emerald-500/10 p-3">
                    <div className="text-slate-400">Available</div>
                    <div className="mt-1 text-2xl font-bold text-emerald-300">
                      {stats.available}
                    </div>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 p-3">
                    <div className="text-slate-400">Busy</div>
                    <div className="mt-1 text-2xl font-bold text-amber-300">
                      {stats.busy}
                    </div>
                  </div>
                  <div className="rounded-lg bg-cyan-500/10 p-3">
                    <div className="text-slate-400">GPS Live</div>
                    <div className="mt-1 text-2xl font-bold text-cyan-300">
                      {stats.liveGps}
                    </div>
                  </div>
                  <div className="rounded-lg bg-violet-500/10 p-3">
                    <div className="text-slate-400">Live Jobs</div>
                    <div className="mt-1 text-2xl font-bold text-violet-300">
                      {stats.liveBookings}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Selected Booking
                </div>
                {selectedBooking ? (
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="font-semibold text-white">
                      {selectedBooking.reference}
                    </div>
                    <div className="text-slate-300">
                      {getPickupLabel(selectedBooking)}
                    </div>
                    <div className="text-slate-400">
                      → {getDropoffLabel(selectedBooking)}
                    </div>
                    <div className="text-slate-400">
                      Time: {formatDateTime(getPickupTimeLabel(selectedBooking))}
                    </div>
                    <div className="text-slate-400">
                      Driver:{' '}
                      {selectedBooking.driver ? getDriverName(selectedBooking.driver) : 'Unassigned'}
                    </div>
                    <div className="text-slate-400">
                      Fare: {formatPrice(selectedBooking.quotedPrice)}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-slate-400">
                    Select a booking to view map route and dispatch context.
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Nearest Suggestions
                </div>
                {nearestDrivers.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {nearestDrivers.map((driver, index) => (
                      <div
                        key={driver.id}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">
                            #{index + 1} {driver.name}
                          </div>
                          <div className="truncate text-xs text-slate-400">
                            {formatDistance(driver.distanceMiles)} •{' '}
                            {(driver.status || 'UNKNOWN').replace(/_/g, ' ')}
                          </div>
                        </div>
                        {selectedBooking ? (
                          <button
                            onClick={() => assignDriver(selectedBooking.id, driver.id)}
                            disabled={
                              assigningKey === `${selectedBooking.id}:${driver.id}`
                            }
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            {assigningKey === `${selectedBooking.id}:${driver.id}`
                              ? '...'
                              : 'Assign'}
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-slate-400">
                    No suggestions yet.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d1120] p-4">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Live Map</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Drivers, selected pickup, dropoff and route lines.
                </p>
              </div>

              <button
                onClick={() => void loadDrivers(true)}
                className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold hover:bg-cyan-600"
              >
                Refresh Drivers
              </button>
            </div>

            {driversError ? (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {driversError}
              </div>
            ) : null}

            <div className="overflow-hidden rounded-2xl border border-white/10">
              <div className="h-[520px] w-full bg-gray-900">
                <MapContainer
                  center={mapCenter}
                  zoom={12}
                  scrollWheelZoom
                  className="h-full w-full"
                  ref={(map) => {
                    if (map) mapRef.current = map;
                  }}
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {driverIconFactory &&
                    liveDrivers.map((driver) => (
                      <Marker
                        key={driver.id}
                        position={[
                          driver.latitude as number,
                          driver.longitude as number,
                        ] as LatLngTuple}
                        icon={driverIconFactory(driver)}
                      >
                        <Popup>
                          <div className="min-w-[180px] text-black">
                            <div className="font-bold">{getDriverName(driver)}</div>
                            <div className="mt-1 text-sm">
                              {(driver.status || 'UNKNOWN').replace(/_/g, ' ')}
                            </div>
                            <div className="mt-1 text-sm">
                              {getVehicleLabel(driver.vehicle ?? null)}
                            </div>
                            <div className="mt-2 text-xs text-gray-600">
                              GPS: {formatDateTime(driver.lastLocationAt)}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}

                  {driverIconFactory && selectedDriver && selectedDriverPosition ? (
                    <Marker
                      position={selectedDriverPosition}
                      icon={driverIconFactory(selectedDriver)}
                    >
                      <Popup>
                        <div className="min-w-[180px] text-black">
                          <div className="font-bold">
                            Assigned Driver: {getDriverName(selectedDriver)}
                          </div>
                          <div className="mt-1 text-sm">
                            {(selectedDriver.status || 'UNKNOWN').replace(
                              /_/g,
                              ' ',
                            )}
                          </div>
                          <div className="mt-1 text-sm">
                            {getVehicleLabel(selectedDriver.vehicle ?? null)}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ) : null}

                  {bookingIconFactory && selectedPickupPosition ? (
                    <Marker
                      position={selectedPickupPosition}
                      icon={bookingIconFactory('#2563eb', 'P')}
                    >
                      <Popup>
                        <div className="text-black">
                          <div className="font-bold">Pickup</div>
                          <div className="mt-1 text-sm">
                            {selectedBooking ? getPickupLabel(selectedBooking) : '—'}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ) : null}

                  {bookingIconFactory && selectedDropoffPosition ? (
                    <Marker
                      position={selectedDropoffPosition}
                      icon={bookingIconFactory('#7c3aed', 'D')}
                    >
                      <Popup>
                        <div className="text-black">
                          <div className="font-bold">Dropoff</div>
                          <div className="mt-1 text-sm">
                            {selectedBooking
                              ? getDropoffLabel(selectedBooking)
                              : '—'}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ) : null}

                  {selectedDriverPosition && selectedPickupPosition ? (
                    <Polyline
                      positions={[selectedDriverPosition, selectedPickupPosition]}
                      pathOptions={{
                        color: '#22c55e',
                        weight: 4,
                        opacity: 0.85,
                      }}
                    />
                  ) : null}

                  {selectedPickupPosition && selectedDropoffPosition ? (
                    <Polyline
                      positions={[selectedPickupPosition, selectedDropoffPosition]}
                      pathOptions={{
                        color: '#8b5cf6',
                        weight: 4,
                        opacity: 0.85,
                      }}
                    />
                  ) : null}
                </MapContainer>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#0d1120] p-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Dispatch Board</h2>
              <p className="mt-1 text-sm text-slate-400">
                Compact operator strips for live and completed work.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <TabButton
                active={activeTab === 'LIVE'}
                onClick={() => setActiveTab('LIVE')}
                label={`Live (${liveBookingRows.length})`}
              />
              <TabButton
                active={activeTab === 'COMPLETED'}
                onClick={() => setActiveTab('COMPLETED')}
                label={`Completed (${completedBookingRows.length})`}
              />
            </div>
          </div>

          <div className="hidden grid-cols-[110px_90px_1.8fr_130px_150px_120px_320px] gap-3 border-b border-white/10 px-3 pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 xl:grid">
            <div>Reference</div>
            <div>Time</div>
            <div>Route</div>
            <div>Status</div>
            <div>Driver</div>
            <div>Fare</div>
            <div>Actions</div>
          </div>

          <div className="mt-3 space-y-2">
            {loading ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                Loading bookings...
              </div>
            ) : displayedBookings.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                No bookings in this view.
              </div>
            ) : (
              displayedBookings.map((booking) => {
                const rowKey = booking.id;
                return (
                  <div
                    key={rowKey}
                    className={`rounded-xl border px-3 py-3 transition ${
                      selectedBooking?.id === booking.id
                        ? 'border-cyan-500/40 bg-cyan-500/8'
                        : 'border-white/10 bg-black/20'
                    }`}
                  >
                    <div className="grid gap-3 xl:grid-cols-[110px_90px_1.8fr_130px_150px_120px_320px] xl:items-center">
                      <div>
                        <div className="text-sm font-bold text-white">
                          {booking.reference}
                        </div>
                        <div className="text-xs text-slate-500">
                          {booking.customerName || 'No name'}
                        </div>
                      </div>

                      <div className="text-sm text-slate-300">
                        {formatTimeOnly(getPickupTimeLabel(booking))}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-sm text-white">
                          {getPickupLabel(booking)}
                        </div>
                        <div className="truncate text-sm text-slate-400">
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

                      <div className="text-sm text-slate-300">
                        {booking.driver ? getDriverName(booking.driver) : 'Unassigned'}
                      </div>

                      <div className="text-sm font-semibold text-white">
                        {formatPrice(booking.quotedPrice)}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {activeTab === 'LIVE' ? (
                          <>
                            <button
                              onClick={() => void autoDispatch(booking.id)}
                              disabled={autoDispatchingId === booking.id}
                              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              {autoDispatchingId === booking.id
                                ? 'Running...'
                                : 'Auto Dispatch'}
                            </button>

                            {nearestDrivers.length > 0 && selectedBooking?.id === booking.id
                              ? null
                              : drivers.slice(0, 3).map((driver) => (
                                  <button
                                    key={driver.id}
                                    onClick={() => assignDriver(booking.id, driver.id)}
                                    disabled={
                                      assigningKey === `${booking.id}:${driver.id}`
                                    }
                                    className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                  >
                                    {assigningKey === `${booking.id}:${driver.id}`
                                      ? 'Assigning...'
                                      : getDriverName(driver)}
                                  </button>
                                ))}
                          </>
                        ) : null}

                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            void loadTimeline(booking.id);
                          }}
                          className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white"
                        >
                          Timeline
                        </button>

                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            void loadTimeline(booking.id);
                          }}
                          className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-white"
                        >
                          Show on Map
                        </button>
                      </div>
                    </div>

                    {booking.suggestedDrivers?.length && activeTab === 'LIVE' ? (
                      <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                          Suggested Drivers
                        </div>
                        <div className="grid gap-2 lg:grid-cols-3">
                          {booking.suggestedDrivers.slice(0, 3).map((suggested) => {
                            const key = `${booking.id}:${suggested.id}`;
                            return (
                              <div
                                key={suggested.id}
                                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-white">
                                    {suggested.name}
                                  </div>
                                  <div className="truncate text-xs text-slate-400">
                                    {formatDistance(suggested.distanceMiles)} •{' '}
                                    {(suggested.status || 'UNKNOWN').replace(
                                      /_/g,
                                      ' ',
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    assignDriver(booking.id, suggested.id)
                                  }
                                  disabled={assigningKey === key}
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                                >
                                  {assigningKey === key ? '...' : 'Assign'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {selectedBooking ? (
          <section className="mt-6 rounded-2xl border border-white/10 bg-[#0d1120] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Timeline · {selectedBooking.reference}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Pickup: {getPickupLabel(selectedBooking)} →{' '}
                  {getDropoffLabel(selectedBooking)}
                </p>
              </div>

              <button
                onClick={() => setSelectedBooking(null)}
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              {timeline.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                  No timeline items yet.
                </div>
              ) : (
                timeline.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
                  >
                    <div className="font-semibold text-white">
                      {new Date(item.createdAt).toLocaleTimeString()}
                    </div>
                    <div className="mt-1 text-slate-300">{item.type}</div>
                    {item.note ? (
                      <div className="mt-1 text-slate-400">{item.note}</div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        ) : null}
      </div>
    </main>
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
      className={`rounded-full px-4 py-2 text-sm font-semibold ${
        active
          ? 'bg-cyan-600 text-white'
          : 'bg-white/5 text-slate-300 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-sm text-slate-300">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-cyan-500"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-sm text-slate-300">{label}</span>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-cyan-500"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-sm text-slate-300">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-cyan-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateTimeField({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-sm text-slate-300">{label}</span>
      <input
        type="datetime-local"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-cyan-500"
      />
    </label>
  );
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <span className="block text-sm text-slate-300">{label}</span>
      <div className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white">
        {value}
      </div>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-sm text-slate-300">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-cyan-500"
      />
    </label>
  );
}