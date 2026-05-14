'use client';

import 'leaflet/dist/leaflet.css';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { DivIcon, LatLngTuple, Map as LeafletMap } from 'leaflet';
import { closeSocket, getSocket } from '@/lib/socket';
import { apiFetch } from '@/lib/api';
import AddressAutofillInput, {
  type SelectedAddress,
} from '@/components/AddressAutofillInput';

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
  heading?: number | null;
  speed?: number | null;
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

type Account = {
  id: string;
  name: string;
  code?: string | null;
  status?: string;
};

type Booking = {
  id: string;
  reference: string;
  customerName?: string | null;
  customerPhone?: string | null;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  pickup?: string | null;
  dropoff?: string | null;
  pickupAt?: string | null;
  pickupTime?: string | null;
  status: string;
  quotedPrice?: number | null;
  passengerCount?: number | null;
  notes?: string | null;
  driverId?: string | null;
  driver?: Driver | null;
  accountId?: string | null;
  account?: Account | null;
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
  accountId: string;
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

type PricingQuote = {
  pricingMode: 'FIXED' | 'TARIFF';
  tariffName: string | null;
  quotedPrice: number;
  calculatedFare: number;
  distanceMiles: number;
  durationMinutes: number;
  routeSource?: string;
  matchedRoute: {
    id: string;
    fromLabel: string;
    toLabel: string;
    fixedPrice: number;
  } | null;
};

type RouteResponse = {
  distanceMiles: number;
  durationMinutes: number;
  coordinates: LatLngTuple[];
};

type SocketBookingPayload = {
  booking: Booking;
};

type SocketDriverPayload = {
  driver: Driver;
};

type SocketDriverLocationPayload = {
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  lastLocationAt?: string | null;
};

const initialForm: BookingFormState = {
  customerName: '',
  customerPhone: '',
  accountId: '',
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

function getAccountLabel(booking: Booking) {
  return booking.account?.name || 'Private';
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

  if (
    ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB', 'ALLOCATED'].includes(
      normalized,
    )
  ) {
    return 'border-cyan-500/15 bg-cyan-500/[0.05]';
  }

  return 'border-white/10 bg-black/20';
}

function accountTone(hasAccount: boolean) {
  return hasAccount
    ? 'border-violet-500/25 bg-violet-500/10 text-violet-300'
    : 'border-slate-500/25 bg-slate-500/10 text-slate-300';
}

function isCompleted(status?: string) {
  return ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(
    (status || '').toUpperCase(),
  );
}

function isLive(status?: string) {
  return !isCompleted(status);
}

export default function DispatchPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingResult, setPricingResult] = useState<PricingQuote | null>(null);
  const [driverPickupRoute, setDriverPickupRoute] = useState<LatLngTuple[]>([]);
  const [pickupDropoffRoute, setPickupDropoffRoute] = useState<LatLngTuple[]>([]);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
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

    return (
      drivers.find((driver) => driver.id === selectedBooking.driverId) ??
      selectedBooking.driver ??
      null
    );
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

    const points: LatLngTuple[] = liveDrivers.map(
      (driver): LatLngTuple => [
        driver.latitude as number,
        driver.longitude as number,
      ],
    );

    if (selectedDriverPosition) points.push(selectedDriverPosition);
    if (selectedPickupPosition) points.push(selectedPickupPosition);
    if (selectedDropoffPosition) points.push(selectedDropoffPosition);

    driverPickupRoute.forEach((point) => points.push(point));
    pickupDropoffRoute.forEach((point) => points.push(point));

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
    driverPickupRoute,
    pickupDropoffRoute,
  ]);

  const syncBooking = useCallback((booking: Booking) => {
    setBookings((prev) => {
      const exists = prev.some((item) => item.id === booking.id);

      if (!exists) {
        return [booking, ...prev];
      }

      return prev.map((item) => (item.id === booking.id ? booking : item));
    });

    setSelectedBooking((current) =>
      current?.id === booking.id ? booking : current,
    );
  }, []);

  const syncDriver = useCallback((driver: Driver) => {
    setDrivers((prev) => {
      const exists = prev.some((item) => item.id === driver.id);

      if (!exists) {
        return [driver, ...prev];
      }

      return prev.map((item) => (item.id === driver.id ? driver : item));
    });

    setSelectedBooking((current) => {
      if (!current?.driverId || current.driverId !== driver.id) {
        return current;
      }

      return {
        ...current,
        driver,
      };
    });
  }, []);

  const syncDriverLocation = useCallback((payload: SocketDriverLocationPayload) => {
    setDrivers((prev) =>
      prev.map((driver) =>
        driver.id === payload.driverId
          ? {
              ...driver,
              latitude: payload.latitude,
              longitude: payload.longitude,
              heading: payload.heading ?? driver.heading ?? null,
              speed: payload.speed ?? driver.speed ?? null,
              lastLocationAt:
                payload.lastLocationAt ?? new Date().toISOString(),
            }
          : driver,
      ),
    );

    setSelectedBooking((current) => {
      if (!current?.driver || current.driver.id !== payload.driverId) {
        return current;
      }

      return {
        ...current,
        driver: {
          ...current.driver,
          latitude: payload.latitude,
          longitude: payload.longitude,
          heading: payload.heading ?? current.driver.heading ?? null,
          speed: payload.speed ?? current.driver.speed ?? null,
          lastLocationAt:
            payload.lastLocationAt ?? new Date().toISOString(),
        },
      };
    });
  }, []);

  const loadBookings = useCallback(async () => {
    const data = await apiFetch<Booking[]>('/bookings/dispatch-board');
    const nextBookings = Array.isArray(data) ? data : [];

    setBookings(nextBookings);

    setSelectedBooking((current) => {
      if (!current) return current;
      return (
        nextBookings.find((booking) => booking.id === current.id) ?? current
      );
    });
  }, []);

  const loadDrivers = useCallback(async (showSpinner = true) => {
    try {
      setDriversError('');

      if (showSpinner) {
        setDriversLoading(true);
      }

      const data = await apiFetch<Driver[]>('/drivers');
      setDrivers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setDriversError(
        error instanceof Error ? error.message : 'Failed to load drivers',
      );
    } finally {
      if (showSpinner) {
        setDriversLoading(false);
      }
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const data = await apiFetch<Account[]>('/accounts');
      const next = Array.isArray(data) ? data : [];

      setAccounts(
        next.filter((account) => (account.status || 'ACTIVE') !== 'CLOSED'),
      );
    } catch (error) {
      console.error(error);
      setAccounts([]);
    }
  }, []);

  const refreshBoard = useCallback(async () => {
    await Promise.all([loadBookings(), loadDrivers(true), loadAccounts()]);
  }, [loadBookings, loadDrivers, loadAccounts]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        await refreshBoard();
      } catch (error) {
        console.error(error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [refreshBoard]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadDrivers(false);
      void loadBookings();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [loadDrivers, loadBookings]);

  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    const handleBookingCreated = (payload: SocketBookingPayload) => {
      if (payload?.booking) {
        syncBooking(payload.booking);
      }
    };

    const handleBookingUpdated = (payload: SocketBookingPayload) => {
      if (payload?.booking) {
        syncBooking(payload.booking);
      }
    };

    const handleDriverUpdated = (payload: SocketDriverPayload) => {
      if (payload?.driver) {
        syncDriver(payload.driver);
      }
    };

    const handleDriverLocation = (payload: SocketDriverLocationPayload) => {
      if (
        payload?.driverId &&
        typeof payload.latitude === 'number' &&
        typeof payload.longitude === 'number'
      ) {
        syncDriverLocation(payload);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    socket.on('booking:created', handleBookingCreated);
    socket.on('booking:updated', handleBookingUpdated);
    socket.on('booking:assigned', handleBookingUpdated);
    socket.on('booking:status_changed', handleBookingUpdated);
    socket.on('booking:offer_created', handleBookingUpdated);

    socket.on('driver:updated', handleDriverUpdated);
    socket.on('driver:location', handleDriverLocation);

    if (socket.connected) {
      setConnected(true);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);

      socket.off('booking:created', handleBookingCreated);
      socket.off('booking:updated', handleBookingUpdated);
      socket.off('booking:assigned', handleBookingUpdated);
      socket.off('booking:status_changed', handleBookingUpdated);
      socket.off('booking:offer_created', handleBookingUpdated);

      socket.off('driver:updated', handleDriverUpdated);
      socket.off('driver:location', handleDriverLocation);

      closeSocket();
    };
  }, [token, syncBooking, syncDriver, syncDriverLocation]);

  async function fetchRoute(
    from: LatLngTuple | null,
    to: LatLngTuple | null,
  ): Promise<LatLngTuple[]> {
    if (!from || !to) return [];

    try {
      const route = await apiFetch<RouteResponse>(
        `/locations/route?fromLat=${encodeURIComponent(String(from[0]))}&fromLng=${encodeURIComponent(
          String(from[1]),
        )}&toLat=${encodeURIComponent(String(to[0]))}&toLng=${encodeURIComponent(String(to[1]))}`,
      );

      return Array.isArray(route.coordinates) ? route.coordinates : [];
    } catch (error) {
      console.error('Failed to load route:', error);
      return [];
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadRoutes() {
      const [driverToPickup, pickupToDropoff] = await Promise.all([
        fetchRoute(selectedDriverPosition, selectedPickupPosition),
        fetchRoute(selectedPickupPosition, selectedDropoffPosition),
      ]);

      if (cancelled) return;

      setDriverPickupRoute(driverToPickup);
      setPickupDropoffRoute(pickupToDropoff);
    }

    void loadRoutes();

    return () => {
      cancelled = true;
    };
  }, [selectedDriverPosition, selectedPickupPosition, selectedDropoffPosition]);

  async function autoDispatch(id: string) {
    try {
      setAutoDispatchingId(id);

      await apiFetch(`/bookings/${id}/auto-dispatch`, {
        method: 'POST',
      });

      await Promise.all([loadBookings(), loadDrivers(false)]);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Failed to auto dispatch');
    } finally {
      setAutoDispatchingId(null);
    }
  }

  async function assignDriver(bookingId: string, driverId: string) {
    try {
      setAssigningKey(`${bookingId}:${driverId}`);

      await apiFetch(`/bookings/${bookingId}/assign-driver`, {
        method: 'POST',
        body: JSON.stringify({ driverId }),
      });

      await Promise.all([loadBookings(), loadDrivers(false)]);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Failed to assign driver');
    } finally {
      setAssigningKey(null);
    }
  }

  async function updateBookingStatus(bookingId: string, status: string) {
    try {
      setStatusBusy(status);

      await apiFetch(`/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      await Promise.all([loadBookings(), loadDrivers(false)]);
      await loadTimeline(bookingId);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setStatusBusy(null);
    }
  }

  async function cancelBooking(bookingId: string) {
    const confirmed = window.confirm('Cancel this booking?');
    if (!confirmed) return;

    try {
      setStatusBusy('CANCELLED');

      await apiFetch(`/bookings/${bookingId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Cancelled from dispatch drawer' }),
      });

      await Promise.all([loadBookings(), loadDrivers(false)]);
      await loadTimeline(bookingId);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Failed to cancel booking');
    } finally {
      setStatusBusy(null);
    }
  }

  useEffect(() => {
  let cancelled = false;

  async function calculateQuote() {
    if (!form.pickupAddress.trim() || !form.dropoffAddress.trim()) {
      setPricingResult(null);
      return;
    }

    try {
      setPricingLoading(true);

      const pickupTime =
        form.whenType === 'SCHEDULED' && form.pickupAt
          ? new Date(form.pickupAt).toISOString()
          : new Date().toISOString();

      const quote = await apiFetch<PricingQuote>('/pricing/quote', {
        method: 'POST',
        body: JSON.stringify({
          pickup: form.pickupAddress,
          dropoff: form.dropoffAddress,
          pickupLat: form.pickupLatitude,
          pickupLng: form.pickupLongitude,
          dropoffLat: form.dropoffLatitude,
          dropoffLng: form.dropoffLongitude,
          pickupTime,
          passengerCount: form.passengerCount,
          isPreBooked: form.whenType === 'SCHEDULED',
        }),
      });

      if (cancelled) return;

      setPricingResult(quote);

      setForm((prev) => ({
        ...prev,
        quotedPrice: quote.quotedPrice.toFixed(2),
      }));
    } catch (error) {
      console.error('Quote failed:', error);

      if (!cancelled) {
        setPricingResult(null);
      }
    } finally {
      if (!cancelled) {
        setPricingLoading(false);
      }
    }
  }

  const timer = window.setTimeout(() => {
    void calculateQuote();
  }, 600);

  return () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
}, [
  form.pickupAddress,
  form.dropoffAddress,
  form.pickupLatitude,
  form.pickupLongitude,
  form.dropoffLatitude,
  form.dropoffLongitude,
  form.whenType,
  form.pickupAt,
  form.passengerCount,
]);

  async function createBooking(autoDispatchAfterCreate = false) {
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
        accountId: form.accountId || null,

        pickup: form.pickupAddress.trim(),
        dropoff: form.dropoffAddress.trim(),
        pickupTime: scheduledTime,

        pickupAddress: form.pickupAddress.trim(),
        dropoffAddress: form.dropoffAddress.trim(),
        pickupAt: scheduledTime,

        pickupLat: form.pickupLatitude,
        pickupLng: form.pickupLongitude,
        dropoffLat: form.dropoffLatitude,
        dropoffLng: form.dropoffLongitude,

        pickupLatitude: form.pickupLatitude,
        pickupLongitude: form.pickupLongitude,
        dropoffLatitude: form.dropoffLatitude,
        dropoffLongitude: form.dropoffLongitude,

        passengerCount: Number(form.passengerCount) || 1,
        quotedPrice: quotedPriceNumber,
        notes: form.notes.trim() || null,
        autoDispatch: autoDispatchAfterCreate,
      };

      const created = await apiFetch<Booking>('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (created?.id) {
        syncBooking(created);
      }

      setForm(initialForm);
      setPricingResult(null);
      await Promise.all([loadBookings(), loadDrivers(false)]);
    } catch (error) {
      setBookingError(
        error instanceof Error ? error.message : 'Failed to create booking',
      );
    } finally {
      setCreatingBooking(false);
    }
  }

  async function loadTimeline(bookingId: string) {
    try {
      const data = await apiFetch<TimelineEvent[]>(
        `/bookings/${bookingId}/timeline`,
      );

      setTimeline(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setTimeline([]);
    }
  }

  function openBookingDrawer(booking: Booking) {
    setSelectedBooking(booking);
    setDrawerOpen(true);
    void loadTimeline(booking.id);
  }

  const stats = useMemo(() => {
    return {
      bookings: bookings.length,
      live: bookings.filter((booking) => isLive(booking.status)).length,
      completed: bookings.filter(
        (booking) => (booking.status || '').toUpperCase() === 'COMPLETED',
      ).length,
      drivers: drivers.length,
      available: drivers.filter(
        (driver) =>
          driver.isAvailable ||
          (driver.status || '').toUpperCase() === 'AVAILABLE',
      ).length,
      liveGps: liveDrivers.length,
      accountLinked: bookings.filter((booking) =>
        Boolean(booking.accountId || booking.account),
      ).length,
    };
  }, [bookings, drivers, liveDrivers.length]);

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();

    const ordered = [...bookings].sort((a, b) => {
      const aLive = isLive(a.status) ? 0 : 1;
      const bLive = isLive(b.status) ? 0 : 1;

      if (aLive !== bLive) return aLive - bLive;

      const aTime = new Date(
        getPickupTimeLabel(a) || a.createdAt || 0,
      ).getTime();

      const bTime = new Date(
        getPickupTimeLabel(b) || b.createdAt || 0,
      ).getTime();

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
        booking.account?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [bookings, search]);

  const liveBookings = useMemo(
    () => filteredBookings.filter((booking) => isLive(booking.status)),
    [filteredBookings],
  );

  const completedBookings = useMemo(
    () => filteredBookings.filter((booking) => !isLive(booking.status)),
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
              Live bookings, quick booking entry, driver map and dispatch
              control.
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
              onClick={() => void refreshBoard()}
              className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20"
            >
              Refresh Board
            </button>
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
          <Card label="Bookings" value={stats.bookings} hint="Total jobs" />
          <Card label="Live Jobs" value={stats.live} hint="Dispatch active" />
          <Card label="Completed" value={stats.completed} hint="Finished jobs" />
          <Card label="Drivers" value={stats.drivers} hint="Driver records" />
          <Card label="Available" value={stats.available} hint="Dispatch ready" />
          <Card label="GPS Live" value={stats.liveGps} hint="Live positions" />
          <Card
            label="Account Jobs"
            value={stats.accountLinked}
            hint="Linked to accounts"
          />
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

              <SelectField
                label="Account"
                value={form.accountId}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, accountId: value }))
                }
                options={[
                  { label: 'Private / non-account booking', value: '' },
                  ...accounts.map((account) => ({
                    label: account.code
                      ? `${account.name} (${account.code})`
                      : account.name,
                    value: account.id,
                  })),
                ]}
              />

              <InfoField
                label="Account status"
                value={
                  form.accountId
                    ? accounts.find((account) => account.id === form.accountId)
                        ?.status || 'ACTIVE'
                    : 'Private booking'
                }
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
                      pickupLatitude: null,
                      pickupLongitude: null,
                      quotedPrice: '',
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
                      dropoffLatitude: null,
                      dropoffLongitude: null,
                      quotedPrice: '',
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

              <div>
                <Field
                  label="Quoted price"
                  value={form.quotedPrice}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, quotedPrice: value }))
                  }
                  placeholder="12.50"
                />

                {pricingLoading ? (
                  <div className="mt-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
                    Calculating quote...
                  </div>
                ) : pricingResult ? (
                  <div
                    className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${
                      pricingResult.pricingMode === 'FIXED'
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                        : 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200'
                    }`}
                  >
                    <div className="text-xs uppercase tracking-[0.18em] opacity-70">
                      {pricingResult.pricingMode === 'FIXED'
                        ? 'Fixed Route Fare'
                        : pricingResult.tariffName || 'Tariff Fare'}
                    </div>

                    <div className="mt-2 text-2xl font-black">
                      £{pricingResult.quotedPrice.toFixed(2)}
                    </div>

                    <div className="mt-2 text-xs opacity-75">
                      {pricingResult.distanceMiles.toFixed(2)} miles •{' '}
                      {pricingResult.durationMinutes} mins
                    </div>

                    {pricingResult.matchedRoute ? (
                      <div className="mt-1 text-[11px] opacity-70">
                        {pricingResult.matchedRoute.fromLabel} →{' '}
                        {pricingResult.matchedRoute.toLabel}
                      </div>
                    ) : null}

                    {pricingResult.routeSource ? (
                      <div className="mt-1 text-[11px] opacity-50">
                        Route: {pricingResult.routeSource}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

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
                disabled={driversLoading}
                className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
              >
                {driversLoading ? 'Loading...' : 'Refresh Drivers'}
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
                      position={
                        [
                          driver.latitude as number,
                          driver.longitude as number,
                        ] as LatLngTuple
                      }
                      icon={driverIconFactory(driver)}
                    >
                      <Popup>
                        <div className="min-w-[180px] text-black">
                          <div className="font-bold">
                            {getDriverName(driver)}
                          </div>

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

                {driverPickupRoute.length > 0 ? (
                  <Polyline
                    positions={driverPickupRoute}
                    pathOptions={{
                      color: '#22c55e',
                      weight: 4,
                      opacity: 0.85,
                    }}
                  />
                ) : selectedDriverPosition && selectedPickupPosition ? (
                  <Polyline
                    positions={[selectedDriverPosition, selectedPickupPosition]}
                    pathOptions={{
                      color: '#22c55e',
                      weight: 4,
                      opacity: 0.45,
                      dashArray: '8 8',
                    }}
                  />
                ) : null}

                {pickupDropoffRoute.length > 0 ? (
                  <Polyline
                    positions={pickupDropoffRoute}
                    pathOptions={{
                      color: '#8b5cf6',
                      weight: 4,
                      opacity: 0.85,
                    }}
                  />
                ) : selectedPickupPosition && selectedDropoffPosition ? (
                  <Polyline
                    positions={[selectedPickupPosition, selectedDropoffPosition]}
                    pathOptions={{
                      color: '#8b5cf6',
                      weight: 4,
                      opacity: 0.45,
                      dashArray: '8 8',
                    }}
                  />
                ) : null}
              </MapContainer>
            </div>
          </section>
        </div>

        <section className="mb-6 rounded-3xl border border-white/10 bg-[#0b1220] p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Dispatch Board</h2>
              <p className="mt-1 text-sm text-white/55">
                Search live, completed and cancelled bookings.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ref, customer, phone, route, driver, account..."
              className="w-full rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50 xl:w-[420px]"
            />
          </div>
        </section>

        <DispatchBoard
          title="Live Jobs"
          loading={loading}
          bookings={liveBookings}
          emptyLabel="No live bookings found."
          assigningKey={assigningKey}
          autoDispatchingId={autoDispatchingId}
          onAssignDriver={assignDriver}
          onAutoDispatch={autoDispatch}
          onOpenBooking={openBookingDrawer}
          onShowOnMap={(booking) => setSelectedBooking(booking)}
        />

        <div className="mt-6">
          <DispatchBoard
            title="Completed / Cancelled"
            loading={false}
            bookings={completedBookings}
            emptyLabel="No completed or cancelled bookings found."
            compact
            assigningKey={assigningKey}
            autoDispatchingId={autoDispatchingId}
            onAssignDriver={assignDriver}
            onAutoDispatch={autoDispatch}
            onOpenBooking={openBookingDrawer}
            onShowOnMap={(booking) => setSelectedBooking(booking)}
          />
        </div>

        {drawerOpen && selectedBooking ? (
          <BookingDrawer
            booking={selectedBooking}
            timeline={timeline}
            drivers={drivers}
            assigningKey={assigningKey}
            autoDispatchingId={autoDispatchingId}
            statusBusy={statusBusy}
            selectedDriverPosition={selectedDriverPosition}
            onClose={() => setDrawerOpen(false)}
            onTimeline={() => {
              setTimelineOpen(true);
              void loadTimeline(selectedBooking.id);
            }}
            onAutoDispatch={autoDispatch}
            onAssignDriver={assignDriver}
            onUpdateStatus={updateBookingStatus}
            onCancelBooking={cancelBooking}
          />
        ) : null}

        {timelineOpen && selectedBooking ? (
          <TimelineModal
            booking={selectedBooking}
            timeline={timeline}
            onClose={() => setTimelineOpen(false)}
          />
        ) : null}
      </div>
    </main>
  );
}

function DispatchBoard({
  title,
  loading,
  bookings,
  emptyLabel,
  compact = false,
  assigningKey,
  autoDispatchingId,
  onAssignDriver,
  onAutoDispatch,
  onOpenBooking,
  onShowOnMap,
}: {
  title: string;
  loading: boolean;
  bookings: Booking[];
  emptyLabel: string;
  compact?: boolean;
  assigningKey: string | null;
  autoDispatchingId: string | null;
  onAssignDriver: (bookingId: string, driverId: string) => void;
  onAutoDispatch: (bookingId: string) => void;
  onOpenBooking: (booking: Booking) => void;
  onShowOnMap: (booking: Booking) => void;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#0b1220] p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="mt-1 text-sm text-white/55">{bookings.length} items</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/55">
          Loading bookings...
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/55">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            return (
              <div
                key={booking.id}
                className={`rounded-2xl border px-4 py-4 ${bookingRowTone(
                  booking.status,
                )}`}
              >
                <div
                  className={
                    compact
                      ? 'grid gap-3 xl:grid-cols-[130px_130px_1.6fr_160px_150px_140px_auto] xl:items-center'
                      : 'grid gap-4 xl:grid-cols-[120px_150px_1.6fr_160px_150px_130px_auto] xl:items-center'
                  }
                >
                  <div>
                    <button
                      onClick={() => onOpenBooking(booking)}
                      className="text-left text-sm font-bold text-white hover:text-cyan-300"
                    >
                      {booking.reference}
                    </button>

                    {!compact ? (
                      <div className="mt-1 text-xs text-white/45">
                        {booking.customerName || 'No name'}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-white">
                      {formatTimeOnly(getPickupTimeLabel(booking))}
                    </div>

                    {!compact ? (
                      <div className="mt-1 text-xs text-white/45">
                        {formatDateTime(getPickupTimeLabel(booking))}
                      </div>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm text-white">
                      {getPickupLabel(booking)}
                    </div>

                    <div className="truncate text-sm text-white/55">
                      → {getDropoffLabel(booking)}
                    </div>

                    {!compact ? (
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/40">
                        <span>Phone: {booking.customerPhone || '—'}</span>
                        <span>Passengers: {booking.passengerCount ?? '—'}</span>
                        <span>Fare: {formatPrice(booking.quotedPrice)}</span>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${accountTone(
                        Boolean(booking.accountId || booking.account),
                      )}`}
                    >
                      {getAccountLabel(booking)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span
                      className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(
                        booking.status,
                      )}`}
                    >
                      {(booking.status || 'UNKNOWN').replace(/_/g, ' ')}
                    </span>

                    <div className="text-sm text-white/70">
                      {getDriverName(booking.driver)}
                    </div>
                  </div>

                  {!compact ? (
                    <div className="space-y-2">
                      {booking.suggestedDrivers
                        ?.slice(0, 2)
                        .map((suggested, index) => {
                          const key = `${booking.id}:${suggested.id}`;

                          return (
                            <button
                              key={suggested.id}
                              onClick={() =>
                                onAssignDriver(booking.id, suggested.id)
                              }
                              disabled={assigningKey === key}
                              className="block w-full rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-left text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                            >
                              <div className="font-semibold">
                                #{index + 1} {suggested.name}
                              </div>

                              <div className="mt-1 text-[11px] text-emerald-100/70">
                                {formatDistance(suggested.distanceMiles)} •{' '}
                                {assigningKey === key
                                  ? 'Assigning...'
                                  : 'Assign'}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-sm text-white/50">
                      {formatPrice(booking.quotedPrice)}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    {!compact ? (
                      <button
                        onClick={() => onAutoDispatch(booking.id)}
                        disabled={autoDispatchingId === booking.id}
                        className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {autoDispatchingId === booking.id ? 'Running...' : 'Auto'}
                      </button>
                    ) : null}

                    <button
                      onClick={() => onOpenBooking(booking)}
                      className="rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Open
                    </button>

                    <button
                      onClick={() => onShowOnMap(booking)}
                      className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/20"
                    >
                      Map
                    </button>
                  </div>
                </div>

                {booking.notes && !compact ? (
                  <div className="mt-3 border-t border-white/5 pt-3 text-xs text-white/45">
                    {booking.notes}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function BookingDrawer({
  booking,
  timeline,
  drivers,
  assigningKey,
  autoDispatchingId,
  statusBusy,
  selectedDriverPosition,
  onClose,
  onTimeline,
  onAutoDispatch,
  onAssignDriver,
  onUpdateStatus,
  onCancelBooking,
}: {
  booking: Booking;
  timeline: TimelineEvent[];
  drivers: Driver[];
  assigningKey: string | null;
  autoDispatchingId: string | null;
  statusBusy: string | null;
  selectedDriverPosition: LatLngTuple | null;
  onClose: () => void;
  onTimeline: () => void;
  onAutoDispatch: (bookingId: string) => void;
  onAssignDriver: (bookingId: string, driverId: string) => void;
  onUpdateStatus: (bookingId: string, status: string) => void;
  onCancelBooking: (bookingId: string) => void;
}) {
  const availableDrivers = drivers.filter(
    (driver) =>
      driver.isAvailable ||
      (driver.status || '').toUpperCase() === 'AVAILABLE',
  );

  const isFinalStatus = isCompleted(booking.status);

  return (
    <div className="fixed inset-0 z-[900] bg-black/70">
      <div className="absolute right-0 top-0 h-full w-full overflow-y-auto border-l border-white/10 bg-[#07101d] shadow-2xl md:w-[620px]">
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#07101d]/95 p-5 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-white/35">
                Booking Drawer
              </div>

              <h2 className="mt-2 text-2xl font-black text-white">
                {booking.reference}
              </h2>

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(
                    booking.status,
                  )}`}
                >
                  {(booking.status || 'UNKNOWN').replace(/_/g, ' ')}
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${accountTone(
                    Boolean(booking.accountId || booking.account),
                  )}`}
                >
                  {getAccountLabel(booking)}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <DrawerPanel title="Trip">
            <Detail label="Pickup" value={getPickupLabel(booking)} />
            <Detail label="Dropoff" value={getDropoffLabel(booking)} />
            <Detail
              label="Pickup Time"
              value={formatDateTime(getPickupTimeLabel(booking))}
            />
            <Detail
              label="Passengers"
              value={String(booking.passengerCount ?? '—')}
            />
            <Detail label="Fare" value={formatPrice(booking.quotedPrice)} />
          </DrawerPanel>

          <DrawerPanel title="Customer">
            <Detail label="Name" value={booking.customerName || '—'} />
            <Detail label="Phone" value={booking.customerPhone || '—'} />
            <Detail label="Account" value={getAccountLabel(booking)} />
            <Detail
              label="Account Status"
              value={booking.account?.status || '—'}
            />
          </DrawerPanel>

          <DrawerPanel title="Driver">
            <Detail
              label="Assigned Driver"
              value={getDriverName(booking.driver)}
            />
            <Detail
              label="Vehicle"
              value={getVehicleLabel(booking.driver?.vehicle ?? null)}
            />
            <Detail label="Driver Status" value={booking.driver?.status || '—'} />
            <Detail
              label="Driver GPS"
              value={
                selectedDriverPosition
                  ? `${selectedDriverPosition[0]}, ${selectedDriverPosition[1]}`
                  : 'Not available'
              }
            />
          </DrawerPanel>

          <DrawerPanel title="Dispatch Actions">
            <div className="grid gap-3 md:grid-cols-2">
              <button
                onClick={() => onAutoDispatch(booking.id)}
                disabled={autoDispatchingId === booking.id || isFinalStatus}
                className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {autoDispatchingId === booking.id
                  ? 'Running...'
                  : 'Auto Dispatch'}
              </button>

              <button
                onClick={onTimeline}
                className="rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-500"
              >
                Open Timeline
              </button>

              <button
                onClick={() => onUpdateStatus(booking.id, 'EN_ROUTE')}
                disabled={Boolean(statusBusy) || isFinalStatus}
                className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
              >
                {statusBusy === 'EN_ROUTE' ? 'Updating...' : 'Mark En Route'}
              </button>

              <button
                onClick={() => onUpdateStatus(booking.id, 'ARRIVED')}
                disabled={Boolean(statusBusy) || isFinalStatus}
                className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
              >
                {statusBusy === 'ARRIVED' ? 'Updating...' : 'Mark Arrived'}
              </button>

              <button
                onClick={() => onUpdateStatus(booking.id, 'ON_JOB')}
                disabled={Boolean(statusBusy) || isFinalStatus}
                className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-200 hover:bg-violet-500/20 disabled:opacity-50"
              >
                {statusBusy === 'ON_JOB' ? 'Updating...' : 'Mark On Job'}
              </button>

              <button
                onClick={() => onUpdateStatus(booking.id, 'COMPLETED')}
                disabled={Boolean(statusBusy) || isFinalStatus}
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {statusBusy === 'COMPLETED' ? 'Updating...' : 'Complete Job'}
              </button>

              <button
                onClick={() => onCancelBooking(booking.id)}
                disabled={Boolean(statusBusy) || isFinalStatus}
                className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50 md:col-span-2"
              >
                {statusBusy === 'CANCELLED'
                  ? 'Cancelling...'
                  : 'Cancel Booking'}
              </button>
            </div>
          </DrawerPanel>

          <DrawerPanel title="Assign Driver">
            {availableDrivers.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/55">
                No available drivers found.
              </div>
            ) : (
              <div className="space-y-2">
                {availableDrivers.map((driver) => {
                  const key = `${booking.id}:${driver.id}`;

                  return (
                    <button
                      key={driver.id}
                      onClick={() => onAssignDriver(booking.id, driver.id)}
                      disabled={assigningKey === key || isFinalStatus}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left hover:bg-white/10 disabled:opacity-50"
                    >
                      <div className="font-semibold text-white">
                        {getDriverName(driver)}
                      </div>

                      <div className="mt-1 text-xs text-white/45">
                        {driver.status || 'UNKNOWN'} ·{' '}
                        {getVehicleLabel(driver.vehicle ?? null)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </DrawerPanel>

          <DrawerPanel title="Notes">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
              {booking.notes || 'No notes added.'}
            </div>
          </DrawerPanel>

          <DrawerPanel title="Latest Timeline">
            {timeline.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/55">
                No timeline entries found.
              </div>
            ) : (
              <div className="space-y-3">
                {timeline.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                      {formatDateTime(event.createdAt)}
                    </div>

                    <div className="mt-2 text-sm text-white">
                      {event.message || event.type || 'Event'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DrawerPanel>
        </div>
      </div>
    </div>
  );
}

function TimelineModal({
  booking,
  timeline,
  onClose,
}: {
  booking: Booking;
  timeline: TimelineEvent[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 p-4 md:p-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#0b1220] p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Timeline · {booking.reference}
            </h2>

            <p className="mt-1 text-sm text-white/55">
              Booking history, status changes and dispatch events.
            </p>
          </div>

          <button
            onClick={onClose}
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
            timeline.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                  {formatDateTime(event.createdAt)}
                </div>

                <div className="mt-2 text-sm text-white">
                  {event.message || event.type || 'Event'}
                </div>

                {event.note ? (
                  <div className="mt-2 text-sm text-white/60">
                    {event.note}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
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

function DrawerPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <h3 className="mb-4 text-lg font-bold text-white">{title}</h3>
      {children}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-2 last:border-b-0">
      <span className="text-sm text-white/45">{label}</span>
      <span className="max-w-[62%] text-right text-sm text-white/85">
        {value}
      </span>
    </div>
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
        onChange={(event) => onChange(event.target.value)}
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
        onChange={(event) => onChange(Number(event.target.value))}
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
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-white outline-none transition focus:border-cyan-500/50"
      >
        {options.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
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
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-white outline-none transition focus:border-cyan-500/50"
      />
    </label>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
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
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50"
      />
    </label>
  );
}
