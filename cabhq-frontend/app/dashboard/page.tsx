'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { closeSocket, getSocket } from '@/lib/socket';
import AddressAutofillInput, {
  type SelectedAddress,
} from '@/components/AddressAutofillInput';
import DispatchMap from '@/components/DispatchMap';
import BookingDetailsDrawer from '@/components/BookingDetailsDrawer';

type User = {
  id: string;
  email: string;
  role: string;
  companyId?: string;
  company?: {
    name: string;
  };
};

type DriverDispatchState = {
  assignable: boolean;
  blockedReasons: string[];
};

type DriverComplianceState = {
  blocked: boolean;
  overallStatus: 'VALID' | 'EXPIRING' | 'EXPIRED' | string;
};

type Driver = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  pin?: string | null;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  lastLocationAt?: string | null;
  dispatch?: DriverDispatchState;
  compliance?: DriverComplianceState;
};

type VehicleDispatchState = {
  assignable: boolean;
  blockedReasons: string[];
};

type VehicleComplianceState = {
  blocked: boolean;
  overallStatus: 'VALID' | 'EXPIRING' | 'EXPIRED' | string;
};

type Vehicle = {
  id: string;
  reg: string;
  make?: string | null;
  model?: string | null;
  colour?: string | null;
  status: string;
  driverId?: string | null;
  dispatch: VehicleDispatchState;
  compliance: VehicleComplianceState;
};

type VehiclesDashboard = {
  totalVehicles: number;
  activeVehicles: number;
  offRoadVehicles: number;
  inactiveVehicles: number;
  expiredCoreItems: number;
  expiringSoonCoreItems: number;
  expiredDocuments: number;
  expiringSoonDocuments: number;
  blockedVehicles: number;
  alerts: {
    total: number;
    expired: number;
    expiring: number;
  };
  vehicles: Vehicle[];
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

type PricingQuote = {
  pricingMode: 'FIXED' | 'TARIFF';
  tariffName: 'TARIFF_1' | 'TARIFF_2' | 'TARIFF_3' | null;
  quotedPrice: number;
  calculatedFare: number;
  distanceMiles: number;
  durationMinutes: number;
  matchedRoute: {
    id: string;
    fromLabel: string;
    toLabel: string;
    fixedPrice: number;
  } | null;
};

type RoutePrice = {
  id: string;
  fromLabel: string;
  toLabel: string;
  fixedPrice: number;
  createdAt: string;
};

type BookingSocketPayload = {
  type: string;
  booking: Booking;
  ts: string;
};

type DriverSocketPayload = {
  type: string;
  driver: Driver;
  ts: string;
};

type DriverLocationPayload = {
  type: string;
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  lastLocationAt?: string | null;
  ts: string;
};

const STATUS_COLUMNS = [
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

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehiclesDashboard, setVehiclesDashboard] =
    useState<VehiclesDashboard | null>(null);
  const [routePrices, setRoutePrices] = useState<RoutePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [connected, setConnected] = useState(false);

  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [creating, setCreating] = useState(false);

  const [selectedPickup, setSelectedPickup] = useState<SelectedAddress | null>(
    null,
  );
  const [selectedDropoff, setSelectedDropoff] =
    useState<SelectedAddress | null>(null);

  const [quote, setQuote] = useState<PricingQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [passengerCount, setPassengerCount] = useState('4');

  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPin, setDriverPin] = useState('');
  const [creatingDriver, setCreatingDriver] = useState(false);

  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editStatus, setEditStatus] = useState('AVAILABLE');
  const [savingDriver, setSavingDriver] = useState(false);

  const [routeFromLabel, setRouteFromLabel] = useState('');
  const [routeToLabel, setRouteToLabel] = useState('');
  const [routeFixedPrice, setRouteFixedPrice] = useState('');
  const [creatingRoute, setCreatingRoute] = useState(false);
  const [seedingRoutes, setSeedingRoutes] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [driverFilter, setDriverFilter] = useState('ALL');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedBookingEtaMinutes, setSelectedBookingEtaMinutes] = useState<
    number | null
  >(null);

  const vehicles = useMemo(
    () => vehiclesDashboard?.vehicles ?? [],
    [vehiclesDashboard],
  );

  const getErrorMessage = useCallback(
    (error: unknown, fallback: string) => {
      if (error instanceof Error) {
        return error.message || fallback;
      }

      if (typeof error === 'string' && error.trim()) {
        return error;
      }

      return fallback;
    },
    [],
  );

  const clearActionError = useCallback(() => {
    setActionError('');
  }, []);

  const sortBookings = useCallback((list: Booking[]) => {
    return [...list].sort(
      (a, b) => new Date(a.pickupTime).getTime() - new Date(b.pickupTime).getTime(),
    );
  }, []);

  const upsertBooking = useCallback(
    (booking: Booking) => {
      setBookings((current) => {
        const exists = current.some((b) => b.id === booking.id);
        if (!exists) {
          return sortBookings([...current, booking]);
        }

        return sortBookings(
          current.map((b) => (b.id === booking.id ? booking : b)),
        );
      });

      setSelectedBooking((current) =>
        current?.id === booking.id ? booking : current,
      );
    },
    [sortBookings],
  );

  const upsertDriver = useCallback((driver: Driver) => {
    setDrivers((current) => {
      const exists = current.some((d) => d.id === driver.id);
      const next = exists
        ? current.map((d) => (d.id === driver.id ? { ...d, ...driver } : d))
        : [...current, driver];

      return [...next].sort((a, b) => a.name.localeCompare(b.name));
    });

    setBookings((current) =>
      current.map((booking) =>
        booking.driver?.id === driver.id
          ? {
              ...booking,
              driver: {
                ...booking.driver,
                ...driver,
              },
            }
          : booking,
      ),
    );

    setSelectedBooking((current) =>
      current?.driver?.id === driver.id
        ? {
            ...current,
            driver: {
              ...current.driver,
              ...driver,
            },
          }
        : current,
    );
  }, []);

  const refreshDriversOnly = useCallback(async () => {
    try {
      const driversResult = await apiFetch<Driver[]>('/drivers');
      setDrivers(Array.isArray(driversResult) ? driversResult : []);
    } catch (error) {
      console.error('Failed refreshing drivers', error);
    }
  }, []);

  const refreshVehiclesOnly = useCallback(async () => {
    try {
      const vehiclesResult = await apiFetch<VehiclesDashboard>(
        '/vehicles/dashboard',
      );
      setVehiclesDashboard(vehiclesResult ?? null);
    } catch (error) {
      console.error('Failed refreshing vehicles dashboard', error);
    }
  }, []);

  const refreshCompliancePanels = useCallback(async () => {
    await Promise.all([refreshDriversOnly(), refreshVehiclesOnly()]);
  }, [refreshDriversOnly, refreshVehiclesOnly]);

  const loadDashboard = useCallback(async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      router.push('/login');
      return;
    }

    setLoadError('');
    setLoading(true);

    try {
      const userResult = await apiFetch<User>('/auth/me');
      setUser(userResult);
    } catch (error) {
      console.error('Failed loading /auth/me', error);
      setLoadError(
        error instanceof Error ? `/auth/me failed: ${error.message}` : '/auth/me failed',
      );
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
      return;
    }

    try {
      const bookingsResult = await apiFetch<Booking[]>('/bookings/dispatch-board');
      setBookings(Array.isArray(bookingsResult) ? bookingsResult : []);
    } catch (error) {
      console.error('Failed loading /bookings/dispatch-board', error);
      setLoadError(
        error instanceof Error
          ? `/bookings/dispatch-board failed: ${error.message}`
          : '/bookings/dispatch-board failed',
      );
      setBookings([]);
    }

    try {
      const driversResult = await apiFetch<Driver[]>('/drivers');
      setDrivers(Array.isArray(driversResult) ? driversResult : []);
    } catch (error) {
      console.error('Failed loading /drivers', error);
      setLoadError((current) =>
        current
          ? `${current} | ${
              error instanceof Error ? `/drivers failed: ${error.message}` : '/drivers failed'
            }`
          : error instanceof Error
            ? `/drivers failed: ${error.message}`
            : '/drivers failed',
      );
      setDrivers([]);
    }

    try {
      const vehiclesResult = await apiFetch<VehiclesDashboard>(
        '/vehicles/dashboard',
      );
      setVehiclesDashboard(vehiclesResult ?? null);
    } catch (error) {
      console.error('Failed loading /vehicles/dashboard', error);
      setLoadError((current) =>
        current
          ? `${current} | ${
              error instanceof Error
                ? `/vehicles/dashboard failed: ${error.message}`
                : '/vehicles/dashboard failed'
            }`
          : error instanceof Error
            ? `/vehicles/dashboard failed: ${error.message}`
            : '/vehicles/dashboard failed',
      );
      setVehiclesDashboard(null);
    }

    try {
      const routesResult = await apiFetch<RoutePrice[]>('/pricing/routes');
      setRoutePrices(Array.isArray(routesResult) ? routesResult : []);
    } catch (error) {
      console.error('Failed loading /pricing/routes', error);
      setLoadError((current) =>
        current
          ? `${current} | ${
              error instanceof Error
                ? `/pricing/routes failed: ${error.message}`
                : '/pricing/routes failed'
            }`
          : error instanceof Error
            ? `/pricing/routes failed: ${error.message}`
            : '/pricing/routes failed',
      );
      setRoutePrices([]);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = getSocket(token);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('booking:created', (payload: BookingSocketPayload) => {
      upsertBooking(payload.booking);
    });

    socket.on('booking:updated', (payload: BookingSocketPayload) => {
      upsertBooking(payload.booking);
    });

    socket.on('booking:offer_created', (payload: BookingSocketPayload) => {
      upsertBooking(payload.booking);
    });

    socket.on('booking:assigned', (payload: BookingSocketPayload) => {
      upsertBooking(payload.booking);
    });

    socket.on('booking:status_changed', (payload: BookingSocketPayload) => {
      upsertBooking(payload.booking);
    });

    socket.on('driver:updated', (payload: DriverSocketPayload) => {
      upsertDriver(payload.driver);
    });

    socket.on('driver:location', (payload: DriverLocationPayload) => {
      setDrivers((current) =>
        current.map((driver) =>
          driver.id === payload.driverId
            ? {
                ...driver,
                latitude: payload.latitude,
                longitude: payload.longitude,
                heading: payload.heading ?? null,
                speed: payload.speed ?? null,
                lastLocationAt: payload.lastLocationAt ?? null,
              }
            : driver,
        ),
      );

      setSelectedBooking((current) =>
        current?.driver?.id === payload.driverId
          ? {
              ...current,
              driver: {
                ...current.driver,
                latitude: payload.latitude,
                longitude: payload.longitude,
                heading: payload.heading ?? null,
                speed: payload.speed ?? null,
                lastLocationAt: payload.lastLocationAt ?? null,
              },
            }
          : current,
      );
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('booking:created');
      socket.off('booking:updated');
      socket.off('booking:offer_created');
      socket.off('booking:assigned');
      socket.off('booking:status_changed');
      socket.off('driver:updated');
      socket.off('driver:location');
      closeSocket();
    };
  }, [upsertBooking, upsertDriver]);

  const assignableDrivers = useMemo(() => {
    return drivers.filter(
      (driver) =>
        ['AVAILABLE', 'ON_DUTY', 'ONLINE'].includes(driver.status) &&
        driver.dispatch?.assignable !== false,
    );
  }, [drivers]);

  const blockedDrivers = useMemo(() => {
    return drivers.filter((driver) => driver.dispatch?.assignable === false);
  }, [drivers]);

  const expiringDrivers = useMemo(() => {
    return drivers.filter(
      (driver) =>
        driver.dispatch?.assignable !== false &&
        driver.compliance?.overallStatus === 'EXPIRING',
    );
  }, [drivers]);

  const blockedVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => vehicle.dispatch?.assignable === false);
  }, [vehicles]);

  const expiringVehicles = useMemo(() => {
    return vehicles.filter(
      (vehicle) =>
        vehicle.dispatch?.assignable !== false &&
        vehicle.compliance?.overallStatus === 'EXPIRING',
    );
  }, [vehicles]);

  const filteredBookings = useMemo(() => {
    const term = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesSearch =
        !term ||
        booking.reference.toLowerCase().includes(term) ||
        booking.pickup.toLowerCase().includes(term) ||
        booking.dropoff.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === 'ALL' || booking.status === statusFilter;

      const matchesDriver =
        driverFilter === 'ALL' ||
        (driverFilter === 'UNASSIGNED' && !booking.driver?.id) ||
        booking.driver?.id === driverFilter;

      return matchesSearch && matchesStatus && matchesDriver;
    });
  }, [bookings, search, statusFilter, driverFilter]);

  const groupedBookings = useMemo(() => {
    return STATUS_COLUMNS.reduce<Record<string, Booking[]>>((acc, status) => {
      acc[status] = filteredBookings.filter(
        (booking) => booking.status === status,
      );
      return acc;
    }, {});
  }, [filteredBookings]);

  const todayAndFuture = useMemo(() => {
    const now = new Date();
    const today: Booking[] = [];
    const future: Booking[] = [];

    filteredBookings.forEach((booking) => {
      const bookingDate = new Date(booking.pickupTime);

      const sameDay =
        bookingDate.getFullYear() === now.getFullYear() &&
        bookingDate.getMonth() === now.getMonth() &&
        bookingDate.getDate() === now.getDate();

      if (sameDay) {
        today.push(booking);
      } else if (bookingDate > now) {
        future.push(booking);
      }
    });

    return { today, future };
  }, [filteredBookings]);

  const calculateQuote = useCallback(
    async (
      pickupLocation: SelectedAddress | null,
      dropoffLocation: SelectedAddress | null,
      when: string,
      passengers: string,
    ) => {
      if (
        !pickupLocation ||
        !dropoffLocation ||
        pickupLocation.lat == null ||
        pickupLocation.lng == null ||
        dropoffLocation.lat == null ||
        dropoffLocation.lng == null ||
        !when
      ) {
        setQuote(null);
        return;
      }

      try {
        setQuoteLoading(true);

        const result = await apiFetch<PricingQuote>('/pricing/quote', {
          method: 'POST',
          body: JSON.stringify({
            pickup: pickupLocation.label,
            dropoff: dropoffLocation.label,
            pickupLat: pickupLocation.lat,
            pickupLng: pickupLocation.lng,
            dropoffLat: dropoffLocation.lat,
            dropoffLng: dropoffLocation.lng,
            pickupTime: when,
            passengerCount: Number(passengers),
            isPreBooked: true,
          }),
        });

        setQuote(result);
      } catch (error) {
        console.error(error);
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    },
    [],
  );

  const handleCreateBooking = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setCreating(true);
      clearActionError();

      try {
        const created = await apiFetch<Booking>('/bookings', {
          method: 'POST',
          body: JSON.stringify({
            pickup,
            dropoff,
            pickupLat: selectedPickup?.lat ?? null,
            pickupLng: selectedPickup?.lng ?? null,
            dropoffLat: selectedDropoff?.lat ?? null,
            dropoffLng: selectedDropoff?.lng ?? null,
            pickupTime,
            pricingMode: quote?.pricingMode ?? null,
            quotedPrice: quote?.quotedPrice ?? null,
            calculatedFare: quote?.calculatedFare ?? null,
            distanceMiles: quote?.distanceMiles ?? null,
            durationMinutes: quote?.durationMinutes ?? null,
            autoDispatch: false,
          }),
        });

        upsertBooking(created);

        setPickup('');
        setDropoff('');
        setPickupTime('');
        setPassengerCount('4');
        setSelectedPickup(null);
        setSelectedDropoff(null);
        setQuote(null);
      } catch (error) {
        console.error(error);
        setActionError(getErrorMessage(error, 'Failed to create booking'));
      } finally {
        setCreating(false);
      }
    },
    [
      clearActionError,
      dropoff,
      getErrorMessage,
      pickup,
      pickupTime,
      quote,
      selectedDropoff,
      selectedPickup,
      upsertBooking,
    ],
  );

  const handleCreateDriver = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setCreatingDriver(true);
      clearActionError();

      try {
        await apiFetch('/drivers', {
          method: 'POST',
          body: JSON.stringify({
            name: driverName,
            phone: driverPhone,
            email: driverEmail,
            pin: driverPin,
          }),
        });

        setDriverName('');
        setDriverPhone('');
        setDriverEmail('');
        setDriverPin('');
        await refreshCompliancePanels();
      } catch (error) {
        console.error(error);
        setActionError(getErrorMessage(error, 'Failed to create driver'));
      } finally {
        setCreatingDriver(false);
      }
    },
    [
      clearActionError,
      driverEmail,
      driverName,
      driverPhone,
      driverPin,
      getErrorMessage,
      refreshCompliancePanels,
    ],
  );

  const openEditDriver = useCallback((driver: Driver) => {
    setEditingDriverId(driver.id);
    setEditName(driver.name || '');
    setEditPhone(driver.phone || '');
    setEditEmail(driver.email || '');
    setEditPin(driver.pin || '');
    setEditStatus(driver.status || 'AVAILABLE');
  }, []);

  const closeEditDriver = useCallback(() => {
    setEditingDriverId(null);
    setEditName('');
    setEditPhone('');
    setEditEmail('');
    setEditPin('');
    setEditStatus('AVAILABLE');
  }, []);

  const handleSaveDriver = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!editingDriverId) return;

      setSavingDriver(true);
      clearActionError();

      try {
        await apiFetch(`/drivers/${editingDriverId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: editName,
            phone: editPhone,
            email: editEmail,
            pin: editPin,
            status: editStatus,
          }),
        });

        closeEditDriver();
        await refreshCompliancePanels();
      } catch (error) {
        console.error(error);
        setActionError(getErrorMessage(error, 'Failed to save driver'));
      } finally {
        setSavingDriver(false);
      }
    },
    [
      clearActionError,
      closeEditDriver,
      editEmail,
      editName,
      editPhone,
      editPin,
      editStatus,
      editingDriverId,
      getErrorMessage,
      refreshCompliancePanels,
    ],
  );

  const handleDeleteDriver = useCallback(
    async (driverId: string) => {
      const confirmed = window.confirm('Delete this driver?');
      if (!confirmed) return;

      clearActionError();

      try {
        await apiFetch(`/drivers/${driverId}`, {
          method: 'DELETE',
        });

        if (editingDriverId === driverId) {
          closeEditDriver();
        }

        await refreshCompliancePanels();
      } catch (error) {
        console.error(error);
        setActionError(getErrorMessage(error, 'Failed to delete driver'));
      }
    },
    [
      clearActionError,
      closeEditDriver,
      editingDriverId,
      getErrorMessage,
      refreshCompliancePanels,
    ],
  );

  const handleCreateRoutePrice = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setCreatingRoute(true);
      clearActionError();

      try {
        const created = await apiFetch<RoutePrice>('/pricing/routes', {
          method: 'POST',
          body: JSON.stringify({
            fromLabel: routeFromLabel,
            toLabel: routeToLabel,
            fixedPrice: Number(routeFixedPrice),
          }),
        });

        setRoutePrices((prev) => [created, ...prev]);
        setRouteFromLabel('');
        setRouteToLabel('');
        setRouteFixedPrice('');
      } catch (error) {
        console.error(error);
        setActionError(getErrorMessage(error, 'Failed to create fixed route price'));
      } finally {
        setCreatingRoute(false);
      }
    },
    [
      clearActionError,
      getErrorMessage,
      routeFixedPrice,
      routeFromLabel,
      routeToLabel,
    ],
  );

  const handleSeedAirports = useCallback(async () => {
    setSeedingRoutes(true);
    clearActionError();

    try {
      await apiFetch('/pricing/routes/seed-airports', {
        method: 'POST',
      });

      const routesResult = await apiFetch<RoutePrice[]>('/pricing/routes');
      setRoutePrices(Array.isArray(routesResult) ? routesResult : []);
    } catch (error) {
      console.error(error);
      setActionError(getErrorMessage(error, 'Failed to seed airport routes'));
    } finally {
      setSeedingRoutes(false);
    }
  }, [clearActionError, getErrorMessage]);

  const handleAssignDriver = useCallback(
    async (bookingId: string, driverId: string) => {
      clearActionError();

      try {
        const updated = await apiFetch<Booking>(
          `/bookings/${bookingId}/assign-driver`,
          {
            method: 'POST',
            body: JSON.stringify({ driverId }),
          },
        );

        upsertBooking(updated);
        await refreshCompliancePanels();
      } catch (error) {
        console.error(error);
        setActionError(getErrorMessage(error, 'Failed to assign driver'));
        throw error;
      }
    },
    [
      clearActionError,
      getErrorMessage,
      refreshCompliancePanels,
      upsertBooking,
    ],
  );

  const handleUnassignDriver = useCallback(
    async (bookingId: string) => {
      clearActionError();

      try {
        const updated = await apiFetch<Booking>(
          `/bookings/${bookingId}/unassign-driver`,
          {
            method: 'POST',
          },
        );

        upsertBooking(updated);
        await refreshCompliancePanels();
      } catch (error) {
        console.error(error);
        setActionError(getErrorMessage(error, 'Failed to unassign driver'));
        throw error;
      }
    },
    [
      clearActionError,
      getErrorMessage,
      refreshCompliancePanels,
      upsertBooking,
    ],
  );

  const handleAutoDispatch = useCallback(
    async (bookingId: string) => {
      clearActionError();

      try {
        const updated = await apiFetch<Booking>(
          `/bookings/${bookingId}/auto-dispatch`,
          {
            method: 'POST',
          },
        );

        upsertBooking(updated);
        await refreshCompliancePanels();
      } catch (error) {
        console.error(error);
        setActionError(getErrorMessage(error, 'Failed to auto-dispatch booking'));
        throw error;
      }
    },
    [
      clearActionError,
      getErrorMessage,
      refreshCompliancePanels,
      upsertBooking,
    ],
  );

  const handleStatusChange = useCallback(
    async (bookingId: string, status: string) => {
      clearActionError();

      try {
        const updated = await apiFetch<Booking>(`/bookings/${bookingId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });

        upsertBooking(updated);
        await refreshCompliancePanels();
      } catch (error) {
        console.error(error);
        setActionError(getErrorMessage(error, 'Failed to update status'));
        throw error;
      }
    },
    [
      clearActionError,
      getErrorMessage,
      refreshCompliancePanels,
      upsertBooking,
    ],
  );

  const handleDriverStatusChange = useCallback(
    async (driverId: string, status: string) => {
      clearActionError();

      try {
        await apiFetch(`/drivers/${driverId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });

        await refreshCompliancePanels();
      } catch (error) {
        console.error(error);
        setActionError(getErrorMessage(error, 'Failed to update driver status'));
      }
    },
    [clearActionError, getErrorMessage, refreshCompliancePanels],
  );

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  }, [router]);

  const openDriverCompliance = useCallback(
    (driverId: string) => {
      router.push(`/drivers?driverId=${driverId}`);
    },
    [router],
  );

  const openVehicleCompliance = useCallback(
    (vehicleId: string) => {
      router.push(`/vehicles?vehicleId=${vehicleId}`);
    },
    [router],
  );

  useEffect(() => {
    if (selectedPickup && selectedDropoff && pickupTime) {
      void calculateQuote(
        selectedPickup,
        selectedDropoff,
        pickupTime,
        passengerCount,
      );
    }
  }, [
    calculateQuote,
    passengerCount,
    pickupTime,
    selectedDropoff,
    selectedPickup,
  ]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07111f] text-white">
        <p className="text-white/60">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-[1700px] px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.2em] text-white/40">
              CabHQ Dispatch Board
            </p>
            <h1 className="text-4xl font-bold">Control Centre</h1>
            <p className="mt-2 text-white/60">
              Welcome back{user?.company?.name ? ` · ${user.company.name}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                connected
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-amber-500/15 text-amber-300'
              }`}
            >
              {connected ? 'Live connected' : 'Realtime offline'}
            </span>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-white/15 px-5 py-3 font-semibold text-white transition hover:bg-white/5"
            >
              Logout
            </button>
          </div>
        </div>

        {loadError ? (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {loadError}
          </div>
        ) : null}

        {actionError ? (
          <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {actionError}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="mb-2 text-sm text-white/50">Role</p>
            <p className="text-2xl font-bold">{user?.role || 'Unknown'}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="mb-2 text-sm text-white/50">Company</p>
            <p className="text-2xl font-bold">
              {user?.company?.name || 'No company'}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="mb-2 text-sm text-white/50">Today</p>
            <p className="text-2xl font-bold">{todayAndFuture.today.length}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="mb-2 text-sm text-white/50">Future</p>
            <p className="text-2xl font-bold">{todayAndFuture.future.length}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="mb-2 text-sm text-white/50">Blocked Drivers</p>
            <p className="text-2xl font-bold">{blockedDrivers.length}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="mb-5 text-2xl font-bold">Create Booking</h2>

              <form onSubmit={handleCreateBooking} className="space-y-4">
                <AddressAutofillInput
                  label="Pickup"
                  value={pickup}
                  placeholder="Pickup address"
                  autoComplete="shipping address-line1"
                  onChangeValue={(value) => {
                    setPickup(value);
                    setSelectedPickup(null);
                    setQuote(null);
                  }}
                  onSelectAddress={(address) => {
                    setPickup(address.label);
                    setSelectedPickup(address);
                  }}
                />

                <AddressAutofillInput
                  label="Dropoff"
                  value={dropoff}
                  placeholder="Dropoff address"
                  autoComplete="billing address-line1"
                  onChangeValue={(value) => {
                    setDropoff(value);
                    setSelectedDropoff(null);
                    setQuote(null);
                  }}
                  onSelectAddress={(address) => {
                    setDropoff(address.label);
                    setSelectedDropoff(address);
                  }}
                />

                <input
                  type="datetime-local"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white"
                />

                <select
                  value={passengerCount}
                  onChange={(e) => setPassengerCount(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white"
                >
                  <option value="1">1 passenger</option>
                  <option value="2">2 passengers</option>
                  <option value="3">3 passengers</option>
                  <option value="4">4 passengers</option>
                  <option value="5">5 passengers</option>
                  <option value="6">6 passengers</option>
                  <option value="7">7 passengers</option>
                  <option value="8">8 passengers</option>
                </select>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold">Pricing</p>
                    {quoteLoading && (
                      <span className="text-xs text-white/50">Calculating...</span>
                    )}
                  </div>

                  {quote ? (
                    <div className="space-y-2 text-sm text-white/75">
                      <p>
                        Mode:{' '}
                        <span className="font-semibold text-cyan-300">
                          {quote.pricingMode}
                        </span>
                      </p>
                      {quote.tariffName && (
                        <p>
                          Tariff:{' '}
                          <span className="font-semibold text-amber-300">
                            {quote.tariffName}
                          </span>
                        </p>
                      )}
                      <p>
                        Price:{' '}
                        <span className="font-semibold text-green-400">
                          £{quote.quotedPrice.toFixed(2)}
                        </span>
                      </p>
                      <p>Distance: {quote.distanceMiles.toFixed(2)} miles</p>
                      <p>Duration: {quote.durationMinutes} mins</p>
                      {quote.matchedRoute ? (
                        <p className="text-amber-300">Fixed route matched</p>
                      ) : (
                        <p className="text-white/50">Tariff pricing applied</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-white/45">
                      Select exact addresses, time and passengers to calculate price
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-70"
                >
                  {creating ? 'Creating...' : 'Create Booking'}
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-bold">Fixed Route Prices</h2>
                <button
                  type="button"
                  onClick={() => void handleSeedAirports()}
                  disabled={seedingRoutes}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-70"
                >
                  {seedingRoutes ? 'Seeding...' : 'Seed Airports'}
                </button>
              </div>

              <form onSubmit={handleCreateRoutePrice} className="space-y-4">
                <input
                  type="text"
                  value={routeFromLabel}
                  onChange={(e) => setRouteFromLabel(e.target.value)}
                  placeholder="From label"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white placeholder:text-white/30"
                />
                <input
                  type="text"
                  value={routeToLabel}
                  onChange={(e) => setRouteToLabel(e.target.value)}
                  placeholder="To label"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white placeholder:text-white/30"
                />
                <input
                  type="number"
                  step="0.01"
                  value={routeFixedPrice}
                  onChange={(e) => setRouteFixedPrice(e.target.value)}
                  placeholder="Fixed price"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white placeholder:text-white/30"
                />
                <button
                  type="submit"
                  disabled={creatingRoute}
                  className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-70"
                >
                  {creatingRoute ? 'Saving...' : 'Save Route Price'}
                </button>
              </form>

              <div className="mt-5 space-y-3">
                {routePrices.length === 0 ? (
                  <p className="text-sm text-white/45">No fixed route prices yet</p>
                ) : (
                  routePrices.slice(0, 8).map((route) => (
                    <div
                      key={route.id}
                      className="rounded-2xl border border-white/10 bg-[#0b1728] p-4"
                    >
                      <p className="font-semibold">
                        {route.fromLabel} → {route.toLabel}
                      </p>
                      <p className="mt-1 text-sm text-green-400">
                        £{route.fixedPrice.toFixed(2)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="mb-5 text-2xl font-bold">Create Driver</h2>

              <form onSubmit={handleCreateDriver} className="space-y-4">
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Driver name"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white placeholder:text-white/30"
                />
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="Driver phone"
                  className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white placeholder:text-white/30"
                />
                <input
                  type="email"
                  value={driverEmail}
                  onChange={(e) => setDriverEmail(e.target.value)}
                  placeholder="Driver email"
                  className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white placeholder:text-white/30"
                />
                <input
                  type="text"
                  value={driverPin}
                  onChange={(e) => setDriverPin(e.target.value)}
                  placeholder="Driver PIN"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white placeholder:text-white/30"
                />
                <button
                  type="submit"
                  disabled={creatingDriver}
                  className="w-full rounded-xl bg-cyan-600 px-5 py-3 font-semibold text-white hover:bg-cyan-500 disabled:opacity-70"
                >
                  {creatingDriver ? 'Creating...' : 'Create Driver'}
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-bold">Driver Management</h2>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">
                  Edit, PIN reset, delete
                </span>
              </div>

              <div className="space-y-3">
                {drivers.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4 text-white/50">
                    No drivers yet
                  </div>
                ) : (
                  drivers.map((driver) => (
                    <div
                      key={driver.id}
                      className="rounded-2xl border border-white/10 bg-[#0b1728] p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{driver.name}</p>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                driver.dispatch?.assignable === false
                                  ? 'bg-red-500/15 text-red-300'
                                  : driver.compliance?.overallStatus === 'EXPIRING'
                                    ? 'bg-amber-500/15 text-amber-300'
                                    : 'bg-emerald-500/15 text-emerald-300'
                              }`}
                            >
                              {driver.dispatch?.assignable === false
                                ? 'BLOCKED'
                                : driver.compliance?.overallStatus === 'EXPIRING'
                                  ? 'EXPIRING'
                                  : 'CLEAR'}
                            </span>
                          </div>
                          <p className="text-xs text-white/45">
                            {driver.phone || 'No phone'}
                          </p>
                          <p className="text-xs text-white/45">
                            {driver.email || 'No email'}
                          </p>
                        </div>

                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70">
                          {driver.status}
                        </span>
                      </div>

                      <p className="mb-2 text-[11px] text-amber-300">
                        PIN: {driver.pin || 'No PIN'}
                      </p>

                      {driver.dispatch?.blockedReasons?.length ? (
                        <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-red-200">
                            Blocked reasons
                          </p>
                          <div className="space-y-1">
                            {driver.dispatch.blockedReasons.slice(0, 3).map((reason) => (
                              <p key={reason} className="text-[11px] text-red-100/90">
                                {reason}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {driver.latitude != null && driver.longitude != null ? (
                        <p className="mb-2 text-[11px] text-cyan-300">
                          {driver.latitude.toFixed(5)}, {driver.longitude.toFixed(5)}
                        </p>
                      ) : null}

                      {driver.lastLocationAt ? (
                        <p className="mb-3 text-[11px] text-white/40">
                          Last update: {new Date(driver.lastLocationAt).toLocaleString()}
                        </p>
                      ) : null}

                      <div className="grid gap-2 md:grid-cols-4">
                        <button
                          type="button"
                          onClick={() => openEditDriver(driver)}
                          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDriverStatusChange(driver.id, 'ONLINE')}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                        >
                          Online
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDriverStatusChange(driver.id, 'OFF_DUTY')}
                          className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
                        >
                          Off Duty
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDeleteDriver(driver.id)}
                          className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Live Dispatch Map</h2>
                <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                  Drivers + active jobs
                </span>
              </div>

              <DispatchMap
                bookings={filteredBookings}
                drivers={drivers}
                selectedBooking={selectedBooking}
                onEtaUpdate={setSelectedBookingEtaMinutes}
              />
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">Dispatch Board</h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      connected
                        ? 'bg-emerald-500/10 text-emerald-300'
                        : 'bg-amber-500/10 text-amber-300'
                    }`}
                  >
                    {connected ? 'Real-time live' : 'Realtime reconnecting'}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search ref / pickup / dropoff"
                    className="rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none"
                  />

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="ALL">All statuses</option>
                    {STATUS_COLUMNS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <select
                    value={driverFilter}
                    onChange={(e) => setDriverFilter(e.target.value)}
                    className="rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="ALL">All drivers</option>
                    <option value="UNASSIGNED">Unassigned</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <p className="text-sm text-white/50">Dispatchable drivers</p>
                  <p className="mt-2 text-2xl font-bold">{assignableDrivers.length}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <p className="text-sm text-white/50">Blocked from dispatch</p>
                  <p className="mt-2 text-2xl font-bold">{blockedDrivers.length}</p>
                </div>
              </div>

              <div className="mb-5 grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                      Blocked Drivers
                    </h3>
                    <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs text-red-300">
                      {blockedDrivers.length}
                    </span>
                  </div>

                  {blockedDrivers.length === 0 ? (
                    <p className="text-sm text-white/45">No blocked drivers.</p>
                  ) : (
                    <div className="space-y-3">
                      {blockedDrivers.slice(0, 5).map((driver) => (
                        <div
                          key={driver.id}
                          className="rounded-xl border border-red-500/20 bg-red-500/10 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-white">{driver.name}</p>
                            <button
                              type="button"
                              onClick={() => openDriverCompliance(driver.id)}
                              className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-white/80 transition hover:bg-white/10"
                            >
                              Open record
                            </button>
                          </div>

                          <div className="mt-2 space-y-1">
                            {(driver.dispatch?.blockedReasons ?? []).slice(0, 3).map((reason) => (
                              <p key={reason} className="text-xs text-red-100/90">
                                {reason}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                      Blocked Vehicles
                    </h3>
                    <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs text-red-300">
                      {blockedVehicles.length}
                    </span>
                  </div>

                  {blockedVehicles.length === 0 ? (
                    <p className="text-sm text-white/45">No blocked vehicles.</p>
                  ) : (
                    <div className="space-y-3">
                      {blockedVehicles.slice(0, 5).map((vehicle) => (
                        <div
                          key={vehicle.id}
                          className="rounded-xl border border-red-500/20 bg-red-500/10 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-white">
                              {vehicle.reg}
                              {vehicle.make || vehicle.model
                                ? ` · ${[vehicle.make, vehicle.model].filter(Boolean).join(' ')}`
                                : ''}
                            </p>
                            <button
                              type="button"
                              onClick={() => openVehicleCompliance(vehicle.id)}
                              className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-white/80 transition hover:bg-white/10"
                            >
                              Open record
                            </button>
                          </div>

                          <div className="mt-2 space-y-1">
                            {(vehicle.dispatch?.blockedReasons ?? []).slice(0, 3).map((reason) => (
                              <p key={reason} className="text-xs text-red-100/90">
                                {reason}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                      Drivers Expiring Soon
                    </h3>
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                      {expiringDrivers.length}
                    </span>
                  </div>

                  {expiringDrivers.length === 0 ? (
                    <p className="text-sm text-white/45">No drivers expiring soon.</p>
                  ) : (
                    <div className="space-y-3">
                      {expiringDrivers.slice(0, 5).map((driver) => (
                        <div
                          key={driver.id}
                          className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-white">{driver.name}</p>
                            <button
                              type="button"
                              onClick={() => openDriverCompliance(driver.id)}
                              className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-white/80 transition hover:bg-white/10"
                            >
                              Open record
                            </button>
                          </div>

                          <p className="mt-2 text-xs text-amber-100/90">
                            Compliance is approaching expiry.
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                      Vehicles Expiring Soon
                    </h3>
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                      {expiringVehicles.length}
                    </span>
                  </div>

                  {expiringVehicles.length === 0 ? (
                    <p className="text-sm text-white/45">No vehicles expiring soon.</p>
                  ) : (
                    <div className="space-y-3">
                      {expiringVehicles.slice(0, 5).map((vehicle) => (
                        <div
                          key={vehicle.id}
                          className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-white">
                              {vehicle.reg}
                              {vehicle.make || vehicle.model
                                ? ` · ${[vehicle.make, vehicle.model].filter(Boolean).join(' ')}`
                                : ''}
                            </p>
                            <button
                              type="button"
                              onClick={() => openVehicleCompliance(vehicle.id)}
                              className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-white/80 transition hover:bg-white/10"
                            >
                              Open record
                            </button>
                          </div>

                          <p className="mt-2 text-xs text-amber-100/90">
                            Vehicle compliance is approaching expiry.
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-4">
                {STATUS_COLUMNS.map((status) => (
                  <div
                    key={status}
                    className="rounded-2xl border border-white/10 bg-[#0b1728] p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white/80">{status}</h3>
                      <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-white/50">
                        {groupedBookings[status]?.length || 0}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {groupedBookings[status]?.length ? (
                        groupedBookings[status].map((booking) => (
                          <div
                            key={booking.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedBooking(booking);
                              setSelectedBookingEtaMinutes(null);
                              clearActionError();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedBooking(booking);
                                setSelectedBookingEtaMinutes(null);
                                clearActionError();
                              }
                            }}
                            className="block w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-cyan-400/40 hover:bg-white/10"
                          >
                            <p className="font-semibold">{booking.reference}</p>
                            <p className="mt-1 text-xs text-white/60">
                              {booking.pickup} → {booking.dropoff}
                            </p>
                            <p className="mt-1 text-xs text-cyan-300">
                              {new Date(booking.pickupTime).toLocaleString()}
                            </p>
                            <p className="mt-1 text-xs text-green-400">
                              {booking.quotedPrice != null
                                ? `£${booking.quotedPrice.toFixed(2)}`
                                : 'No price'}
                            </p>
                            {booking.pricingMode && (
                              <p className="mt-1 text-[11px] text-white/45">
                                {booking.pricingMode}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-white/45">
                              Driver: {booking.driver?.name || 'Unassigned'}
                            </p>

                            <div className="mt-3 space-y-2">
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await handleAutoDispatch(booking.id);
                                  } catch {}
                                }}
                                className="w-full rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-500"
                              >
                                Auto Dispatch
                              </button>

                              <select
                                defaultValue=""
                                onClick={(e) => e.stopPropagation()}
                                onChange={async (e) => {
                                  if (e.target.value) {
                                    try {
                                      await handleAssignDriver(
                                        booking.id,
                                        e.target.value,
                                      );
                                      e.currentTarget.value = '';
                                    } catch {}
                                  }
                                }}
                                className="w-full rounded-lg border border-white/10 bg-[#07111f] px-2 py-2 text-xs text-white"
                              >
                                <option value="">Assign dispatchable driver</option>
                                {assignableDrivers.map((driver) => (
                                  <option key={driver.id} value={driver.id}>
                                    {driver.name}
                                  </option>
                                ))}
                                {blockedDrivers.length > 0 && (
                                  <option value="" disabled>
                                    ── Blocked drivers ──
                                  </option>
                                )}
                                {blockedDrivers.map((driver) => (
                                  <option key={driver.id} value="" disabled>
                                    {driver.name} · BLOCKED
                                  </option>
                                ))}
                              </select>

                              {booking.driverId ? (
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await handleUnassignDriver(booking.id);
                                    } catch {}
                                  }}
                                  className="w-full rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-600"
                                >
                                  Unassign Driver
                                </button>
                              ) : null}

                              {blockedDrivers.length > 0 ? (
                                <p className="text-[10px] text-amber-300">
                                  Blocked drivers are excluded from dispatch assignment
                                </p>
                              ) : null}

                              <select
                                value={booking.status}
                                onClick={(e) => e.stopPropagation()}
                                onChange={async (e) => {
                                  try {
                                    await handleStatusChange(
                                      booking.id,
                                      e.target.value,
                                    );
                                  } catch {}
                                }}
                                className="w-full rounded-lg border border-white/10 bg-[#07111f] px-2 py-2 text-xs text-white"
                              >
                                <option value="BOOKED">BOOKED</option>
                                <option value="OFFERED">OFFERED</option>
                                <option value="NO_DRIVER">NO_DRIVER</option>
                                <option value="ACCEPTED">ACCEPTED</option>
                                <option value="EN_ROUTE">EN_ROUTE</option>
                                <option value="ARRIVED">ARRIVED</option>
                                <option value="ON_JOB">ON_JOB</option>
                                <option value="COMPLETED">COMPLETED</option>
                                <option value="CANCELLED">CANCELLED</option>
                              </select>
                            </div>

                            {booking.events?.length ? (
                              <div className="mt-3 rounded-lg border border-white/10 bg-[#07111f] p-2">
                                <p className="mb-2 text-[10px] uppercase tracking-[0.15em] text-white/35">
                                  History
                                </p>
                                <div className="space-y-1">
                                  {booking.events.slice(0, 3).map((event) => (
                                    <p
                                      key={event.id}
                                      className="text-[11px] text-white/55"
                                    >
                                      {event.message}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-white/35">
                          No jobs
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="mb-4 text-2xl font-bold">Today</h2>
                <div className="space-y-3">
                  {todayAndFuture.today.length ? (
                    todayAndFuture.today.map((booking) => (
                      <div
                        key={booking.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedBooking(booking);
                          setSelectedBookingEtaMinutes(null);
                          clearActionError();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedBooking(booking);
                            setSelectedBookingEtaMinutes(null);
                            clearActionError();
                          }
                        }}
                        className="block w-full cursor-pointer rounded-2xl border border-white/10 bg-[#0b1728] p-4 text-left transition hover:border-cyan-400/40"
                      >
                        <p className="font-semibold">{booking.reference}</p>
                        <p className="text-sm text-white/60">
                          {booking.pickup} → {booking.dropoff}
                        </p>
                        <p className="mt-1 text-xs text-cyan-300">
                          {new Date(booking.pickupTime).toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-green-400">
                          {booking.quotedPrice != null
                            ? `£${booking.quotedPrice.toFixed(2)}`
                            : 'No price'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4 text-white/50">
                      No bookings today
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="mb-4 text-2xl font-bold">Future</h2>
                <div className="space-y-3">
                  {todayAndFuture.future.length ? (
                    todayAndFuture.future.map((booking) => (
                      <div
                        key={booking.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedBooking(booking);
                          setSelectedBookingEtaMinutes(null);
                          clearActionError();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedBooking(booking);
                            setSelectedBookingEtaMinutes(null);
                            clearActionError();
                          }
                        }}
                        className="block w-full cursor-pointer rounded-2xl border border-white/10 bg-[#0b1728] p-4 text-left transition hover:border-cyan-400/40"
                      >
                        <p className="font-semibold">{booking.reference}</p>
                        <p className="text-sm text-white/60">
                          {booking.pickup} → {booking.dropoff}
                        </p>
                        <p className="mt-1 text-xs text-cyan-300">
                          {new Date(booking.pickupTime).toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-green-400">
                          {booking.quotedPrice != null
                            ? `£${booking.quotedPrice.toFixed(2)}`
                            : 'No price'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4 text-white/50">
                      No future bookings
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {(selectedPickup || selectedDropoff || quote) && (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h3 className="mb-3 text-xl font-bold">Selected Pickup</h3>
              {selectedPickup ? (
                <div className="space-y-2 text-sm text-white/70">
                  <p>{selectedPickup.label}</p>
                  <p>Lat: {selectedPickup.lat}</p>
                  <p>Lng: {selectedPickup.lng}</p>
                </div>
              ) : (
                <p className="text-white/40">No pickup selected</p>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h3 className="mb-3 text-xl font-bold">Selected Dropoff</h3>
              {selectedDropoff ? (
                <div className="space-y-2 text-sm text-white/70">
                  <p>{selectedDropoff.label}</p>
                  <p>Lat: {selectedDropoff.lat}</p>
                  <p>Lng: {selectedDropoff.lng}</p>
                </div>
              ) : (
                <p className="text-white/40">No dropoff selected</p>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h3 className="mb-3 text-xl font-bold">Live Quote</h3>
              {quote ? (
                <div className="space-y-2 text-sm text-white/70">
                  <p>Mode: {quote.pricingMode}</p>
                  <p>Tariff: {quote.tariffName || 'Fixed route'}</p>
                  <p>Price: £{quote.quotedPrice.toFixed(2)}</p>
                  <p>Distance: {quote.distanceMiles.toFixed(2)} miles</p>
                  <p>Duration: {quote.durationMinutes} mins</p>
                  <p>Route match: {quote.matchedRoute ? 'Yes' : 'No'}</p>
                </div>
              ) : (
                <p className="text-white/40">No quote yet</p>
              )}
            </div>
          </div>
        )}
      </div>

      {editingDriverId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#07111f] p-6 text-white shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Edit Driver</h2>
              <button
                type="button"
                onClick={closeEditDriver}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveDriver} className="space-y-4">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Driver name"
                required
                className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white"
              />

              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Driver phone"
                className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white"
              />

              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Driver email"
                className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white"
              />

              <input
                type="text"
                value={editPin}
                onChange={(e) => setEditPin(e.target.value)}
                placeholder="Driver PIN"
                required
                className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white"
              />

              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white"
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="BUSY">BUSY</option>
                <option value="ON_DUTY">ON_DUTY</option>
                <option value="ONLINE">ONLINE</option>
                <option value="OFF_DUTY">OFF_DUTY</option>
              </select>

              <button
                type="submit"
                disabled={savingDriver}
                className="w-full rounded-xl bg-cyan-600 px-5 py-3 font-semibold text-white hover:bg-cyan-500 disabled:opacity-70"
              >
                {savingDriver ? 'Saving...' : 'Save Driver'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <BookingDetailsDrawer
        booking={selectedBooking}
        etaMinutes={selectedBookingEtaMinutes}
        actionError={actionError}
        onClearError={clearActionError}
        onClose={() => {
          setSelectedBooking(null);
          setSelectedBookingEtaMinutes(null);
          clearActionError();
        }}
        onStatusChange={handleStatusChange}
        onAutoDispatch={handleAutoDispatch}
        onUnassignDriver={handleUnassignDriver}
      />
    </main>
  );
}