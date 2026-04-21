'use client';

import 'leaflet/dist/leaflet.css';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { DivIcon, LatLngTuple, Map as LeafletMap } from 'leaflet';
import { closeSocket, getSocket } from '@/lib/socket';
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
  createdAt?: string;
};

type TimelineEvent = {
  id: string;
  type?: string;
  note?: string | null;
  createdAt: string;
  message?: string | null;
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

function getDriverName(driver: Driver | null | undefined) {
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
    year: 'numeric',
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

function statusTone(status?: string) {
  const normalized = (status || '').toUpperCase();

  if (normalized === 'COMPLETED') {
    return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300';
  }

  if (normalized === 'CANCELLED' || normalized === 'NO_SHOW') {
    return 'border-red-500/25 bg-red-500/10 text-red-300';
  }

  if (normalized === 'BOOKED' || normalized === 'OFFERED') {
    return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
  }

  if (
    ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB', 'ALLOCATED'].includes(
      normalized,
    )
  ) {
    return 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300';
  }

  return 'border-slate-500/25 bg-slate-500/10 text-slate-300';
}

function bookingRowTone(status?: string) {
  const normalized = (status || '').toUpperCase();

  if (normalized === 'COMPLETED') {
    return 'border-emerald-500/15 bg-emerald-500/[0.05]';
  }

  if (normalized === 'CANCELLED' || normalized === 'NO_SHOW') {
    return 'border-red-500/15 bg-red-500/[0.05]';
  }

  if (['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB', 'ALLOCATED'].includes(normalized)) {
    return 'border-cyan-500/15 bg-cyan-500/[0.05]';
  }

  return 'border-white/10 bg-black/20';
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

function getAssignedDriverPosition(
  booking: Booking | null,
  drivers: Driver[],
): LatLngTuple | null {
  if (!booking?.driverId) return null;

  const driver = drivers.find((d) => d.id === booking.driverId);
  if (!driver || driver.latitude == null || driver.longitude == null) {
    return null;
  }

  return [driver.latitude, driver.longitude] as LatLngTuple;
}

function Card({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="text-sm text-white/55">{label}</div>
      <div className="mt-3 text-3xl font-bold text-white">{value}</div>
      {hint ? <div className="mt-2 text-xs text-white/35">{hint}</div> : null}
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
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [driverIconFactory, setDriverIconFactory] =
    useState<((driver: Driver) => DivIcon) | null>(null);
  const [bookingIconFactory, setBookingIconFactory] =
    useState<((color: string, label: string) => DivIcon) | null>(null);
  const [form, setForm] = useState<BookingFormState>(initialForm);
  const [search, setSearch] = useState('');

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
              ? '#10b981'
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
              min-width: 28px;
              height: 28px;
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
          iconSize: [28, 28],
          iconAnchor: [14, 14],
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

    mapRef.current.fitBounds(points, { padding: [40, 40] });
  }, [
    liveDrivers,
    selectedDriverPosition,
    selectedPickupPosition,
    selectedDropoffPosition,
  ]);

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
    const nextBookings = Array.isArray(data) ? data : [];
    setBookings(nextBookings);

    setSelectedBooking((current) => {
      if (!current) return current;
      return nextBookings.find((b) => b.id === current.id) ?? current;
    });
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
      void loadDrivers(false);
      void loadBookings();
    }, 10000);

    return () => clearInterval(interval);
  }, [token, loadDrivers, loadBookings]);

  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('booking:created', (p) => {
      setBookings((prev) => {
        const exists = prev.some((b) => b.id === p.booking.id);
        if (exists) {
          return prev.map((b) => (b.id === p.booking.id ? p.booking : b));
        }
        return [p.booking, ...prev];
      });
    });

    socket.on('booking:updated', (p) => {
      setBookings((prev) =>
        prev.map((b) => (b.id === p.booking.id ? p.booking : b)),
      );
      setSelectedBooking((prev) =>
        prev?.id === p.booking.id ? p.booking : prev,
      );
    });

    socket.on('booking:assigned', (p) => {
      setBookings((prev) =>
        prev.map((b) => (b.id === p.booking.id ? p.booking : b)),
      );
      setSelectedBooking((prev) =>
        prev?.id === p.booking.id ? p.booking : prev,
      );
    });

    socket.on('booking:status_changed', (p) => {
      setBookings((prev) =>
        prev.map((b) => (b.id === p.booking.id ? p.booking : b)),
      );
      setSelectedBooking((prev) =>
        prev?.id === p.booking.id ? p.booking : prev,
      );
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

  const autoDispatch = async (id: string) => {
    try {
      setAutoDispatchingId(id);

      const res = await fetch(`${API_URL}/bookings/${id}/auto-dispatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to auto dispatch');
      }

      await loadBookings();
      await loadDrivers(false);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Failed to auto dispatch');
    } finally {
      setAutoDispatchingId(null);
    }
  };

  const assignDriver = async (bookingId: string, driverId: string) => {
    try {
      setAssigningKey(`${bookingId}:${driverId}`);

      const res = await fetch(`${API_URL}/bookings/${bookingId}/assign-driver`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driverId }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to assign driver');
      }

      await Promise.all([loadBookings(), loadDrivers(false)]);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Failed to assign driver');
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
      await Promise.all([loadBookings(), loadDrivers(false)]);

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
    try {
      const res = await fetch(`${API_URL}/bookings/${bookingId}/timeline`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to load timeline (${res.status})`);
      }

      const data = (await res.json()) as TimelineEvent[];
      setTimeline(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setTimeline([]);
    }
  };

  const stats = useMemo(() => {
    return {
      bookings: bookings.length,
      live: bookings.filter((b) => isLive(b.status)).length,
      completed: bookings.filter((b) => (b.status || '').toUpperCase() === 'COMPLETED')
        .length,
      drivers: drivers.length,
      available: drivers.filter(
        (d) => d.isAvailable || d.status === 'AVAILABLE',
      ).length,
      liveGps: liveDrivers.length,
    };
  }, [bookings, drivers, liveDrivers.length]);

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    const ordered = [...bookings].sort((a, b) => {
      const aLive = isLive(a.status) ? 0 : 1;
      const bLive = isLive(b.status) ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;

      const aTime = new Date(getPickupTimeLabel(a) || a.createdAt || 0).getTime();
      const bTime = new Date(getPickupTimeLabel(b) || b.createdAt || 0).getTime();
      return aTime - bTime;
    });

    if (!q) return ordered;

    return ordered.filter((booking) =>
      [
        booking.reference,
        booking.customerName,
        booking.customerPhone,
        getPickupLabel(booking),
        getDropoffLabel(booking),
        getDriverName(booking.driver),
        booking.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [bookings, search]);

  const liveBookings = useMemo(
    () => filteredBookings.filter((b) => isLive(b.status)),
    [filteredBookings],
  );

  const completedBookings = useMemo(
    () => filteredBookings.filter((b) => !isLive(b.status)),
    [filteredBookings],
  );

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1850px]">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">
              Operations
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              Dispatch
            </h1>
            <p className="mt-2 text-sm text-white/55">
              Live bookings, quick booking entry, driver map and dispatch control.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              Socket:{' '}
              <span className={connected ? 'text-emerald-300' : 'text-red-300'}>
                {connected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>

            <button
              onClick={() => {
                void loadBookings();
                void loadDrivers(true);
              }}
              className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20"
            >
              Refresh Board
            </button>
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Card label="Bookings" value={stats.bookings} hint="Total jobs" />
          <Card label="Live Jobs" value={stats.live} hint="Dispatch active" />
          <Card label="Completed" value={stats.completed} hint="Finished jobs" />
          <Card label="Drivers" value={stats.drivers} hint="Driver records" />
          <Card label="Available" value={stats.available} hint="Dispatch ready" />
          <Card label="GPS Live" value={stats.liveGps} hint="Live positions" />
        </section>

        <div className="mb-8 grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-[#0b1220] p-5 xl:h-[640px] xl:overflow-y-auto">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-white">New Booking</h2>
              <p className="mt-1 text-sm text-white/55">
                Create and dispatch bookings quickly from one screen.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
                  placeholder="Booking notes, gate code, wheelchair, account info..."
                />
              </div>
            </div>

            {bookingError ? (
              <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {bookingError}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => void createBooking(false)}
                disabled={creatingBooking}
                className="rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
              >
                {creatingBooking ? 'Creating...' : 'Create Job'}
              </button>

              <button
                onClick={() => void createBooking(true)}
                disabled={creatingBooking}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {creatingBooking ? 'Creating...' : 'Create & Auto Dispatch'}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#0b1220] p-5 xl:h-[640px]">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Live Map</h2>
                <p className="mt-1 text-sm text-white/55">
                  Driver positions, pickups, dropoffs and route focus.
                </p>
              </div>

              <button
                onClick={() => void loadDrivers(true)}
                className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20"
              >
                Refresh Drivers
              </button>
            </div>

            {driversError ? (
              <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {driversError}
              </div>
            ) : null}

            <div className="h-[540px] overflow-hidden rounded-2xl border border-white/10 bg-black/20">
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
                          {selectedBooking
                            ? getPickupLabel(selectedBooking)
                            : '—'}
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
          </section>
        </div>

        <section className="rounded-3xl border border-white/10 bg-[#0b1220] p-5">
          <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Dispatch Board</h2>
              <p className="mt-1 text-sm text-white/55">
                Live jobs first, completed jobs compact below.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/65">
                Live {liveBookings.length} · Completed {completedBookings.length}
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ref, customer, route, phone, driver..."
                className="w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50 xl:w-[360px]"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">
                  Live Jobs
                </h3>
                <span className="text-xs text-white/35">{liveBookings.length} items</span>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/55">
                  Loading bookings...
                </div>
              ) : liveBookings.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/55">
                  No live bookings found.
                </div>
              ) : (
                <div className="space-y-3">
                  {liveBookings.map((b) => (
                    <div
                      key={b.id}
                      className={`rounded-2xl border px-4 py-4 ${bookingRowTone(
                        b.status,
                      )}`}
                    >
                      <div className="grid gap-4 xl:grid-cols-[120px_150px_1.8fr_150px_130px_auto] xl:items-center">
                        <div>
                          <div className="text-sm font-bold text-white">{b.reference}</div>
                          <div className="mt-1 text-xs text-white/45">
                            {b.customerName || 'No name'}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-semibold text-white">
                            {formatTimeOnly(getPickupTimeLabel(b))}
                          </div>
                          <div className="mt-1 text-xs text-white/45">
                            {formatDateTime(getPickupTimeLabel(b))}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-sm text-white">
                            {getPickupLabel(b)}
                          </div>
                          <div className="truncate text-sm text-white/55">
                            → {getDropoffLabel(b)}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/40">
                            <span>Phone: {b.customerPhone || '—'}</span>
                            <span>Passengers: {b.passengerCount ?? '—'}</span>
                            <span>Fare: {formatPrice(b.quotedPrice)}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <span
                            className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(
                              b.status,
                            )}`}
                          >
                            {(b.status || 'UNKNOWN').replace(/_/g, ' ')}
                          </span>
                          <div className="text-sm text-white/70">
                            {getDriverName(b.driver)}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {b.suggestedDrivers?.slice(0, 2).map((suggested, index) => {
                            const key = `${b.id}:${suggested.id}`;

                            return (
                              <button
                                key={suggested.id}
                                onClick={() => assignDriver(b.id, suggested.id)}
                                disabled={assigningKey === key}
                                className="block w-full rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-left text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                              >
                                <div className="font-semibold">
                                  #{index + 1} {suggested.name}
                                </div>
                                <div className="mt-1 text-[11px] text-emerald-100/70">
                                  {formatDistance(suggested.distanceMiles)} •{' '}
                                  {assigningKey === key ? 'Assigning...' : 'Assign'}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex flex-wrap gap-2 xl:justify-end">
                          <button
                            onClick={() => autoDispatch(b.id)}
                            disabled={autoDispatchingId === b.id}
                            className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            {autoDispatchingId === b.id ? 'Running...' : 'Auto Dispatch'}
                          </button>

                          <button
                            onClick={() => {
                              setSelectedBooking(b);
                              setTimelineOpen(true);
                              void loadTimeline(b.id);
                            }}
                            className="rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white"
                          >
                            Timeline
                          </button>

                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="rounded-xl bg-cyan-700 px-3 py-2 text-xs font-semibold text-white"
                          >
                            Show on Map
                          </button>
                        </div>
                      </div>

                      {b.notes ? (
                        <div className="mt-3 border-t border-white/5 pt-3 text-xs text-white/45">
                          {b.notes}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">
                  Completed / Cancelled
                </h3>
                <span className="text-xs text-white/35">{completedBookings.length} items</span>
              </div>

              {completedBookings.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/55">
                  No completed or cancelled bookings found.
                </div>
              ) : (
                <div className="space-y-2">
                  {completedBookings.map((b) => (
                    <div
                      key={b.id}
                      className={`rounded-2xl border px-4 py-3 ${bookingRowTone(
                        b.status,
                      )}`}
                    >
                      <div className="grid gap-3 xl:grid-cols-[130px_130px_1.8fr_150px_140px_auto] xl:items-center">
                        <div className="text-sm font-semibold text-white">
                          {b.reference}
                        </div>

                        <div className="text-sm text-white/60">
                          {formatTimeOnly(getPickupTimeLabel(b))}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-sm text-white/75">
                            {getPickupLabel(b)} → {getDropoffLabel(b)}
                          </div>
                        </div>

                        <div>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(
                              b.status,
                            )}`}
                          >
                            {(b.status || 'UNKNOWN').replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div className="text-sm text-white/60">
                          {getDriverName(b.driver)}
                        </div>

                        <div className="flex flex-wrap gap-2 xl:justify-end">
                          <button
                            onClick={() => {
                              setSelectedBooking(b);
                              setTimelineOpen(true);
                              void loadTimeline(b.id);
                            }}
                            className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
                          >
                            Timeline
                          </button>

                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/20"
                          >
                            Show on Map
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {selectedBooking && (
          <section className="mt-6 rounded-3xl border border-cyan-500/20 bg-cyan-500/[0.06] p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h3 className="text-xl font-bold text-cyan-200">
                  Selected Booking · {selectedBooking.reference}
                </h3>
                <div className="mt-3 grid gap-2 text-sm text-white/75 md:grid-cols-2 xl:grid-cols-4">
                  <div>Pickup: {getPickupLabel(selectedBooking)}</div>
                  <div>Dropoff: {getDropoffLabel(selectedBooking)}</div>
                  <div>Driver: {getDriverName(selectedBooking.driver)}</div>
                  <div>Status: {selectedBooking.status}</div>
                  <div>
                    Pickup coords:{' '}
                    {selectedBooking.pickupLatitude != null &&
                    selectedBooking.pickupLongitude != null
                      ? `${selectedBooking.pickupLatitude}, ${selectedBooking.pickupLongitude}`
                      : 'Not available'}
                  </div>
                  <div>
                    Dropoff coords:{' '}
                    {selectedBooking.dropoffLatitude != null &&
                    selectedBooking.dropoffLongitude != null
                      ? `${selectedBooking.dropoffLatitude}, ${selectedBooking.dropoffLongitude}`
                      : 'Not available'}
                  </div>
                  <div>
                    Driver coords:{' '}
                    {selectedDriverPosition
                      ? `${selectedDriverPosition[0]}, ${selectedDriverPosition[1]}`
                      : 'Not available'}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setTimelineOpen(true);
                    void loadTimeline(selectedBooking.id);
                  }}
                  className="rounded-2xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Open Timeline
                </button>

                <button
                  onClick={() => setSelectedBooking(null)}
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </section>
        )}

        {timelineOpen && selectedBooking ? (
          <div className="fixed inset-0 z-[1000] bg-black/80 p-4 md:p-8">
            <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#0b1220] p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Timeline · {selectedBooking.reference}
                  </h2>
                  <p className="mt-1 text-sm text-white/55">
                    Booking history, status changes and dispatch events.
                  </p>
                </div>

                <button
                  onClick={() => setTimelineOpen(false)}
                  className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                >
                  Close
                </button>
              </div>

              <div className="max-h-[70vh] space-y-3 overflow-y-auto">
                {timeline.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/55">
                    No timeline entries found.
                  </div>
                ) : (
                  timeline.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                        {formatDateTime(t.createdAt)}
                      </div>
                      <div className="mt-2 text-sm text-white">
                        {t.message || t.type || 'Event'}
                      </div>
                      {t.note ? (
                        <div className="mt-2 text-sm text-white/60">{t.note}</div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
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
      <span className="block text-sm text-white/70">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50"
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
      <span className="block text-sm text-white/70">{label}</span>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-white outline-none transition focus:border-cyan-500/50"
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
      <span className="block text-sm text-white/70">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-white outline-none transition focus:border-cyan-500/50"
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
      <span className="block text-sm text-white/70">{label}</span>
      <input
        type="datetime-local"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-white outline-none transition focus:border-cyan-500/50"
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
      <span className="block text-sm text-white/70">{label}</span>
      <div className="w-full rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-white">
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
      <span className="block text-sm text-white/70">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50"
      />
    </label>
  );
}