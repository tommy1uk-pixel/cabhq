export type DriverLite = {
  id: string;
  fullName?: string | null;
  name?: string | null;
  status?: string | null;
};

export type BookingLite = {
  id: string;
  reference: string;
  status: string;
  quotedPrice?: number | null;
  createdAt?: string | null;
  pickupAt?: string | null;
  pickupTime?: string | null;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  pickup?: string | null;
  dropoff?: string | null;
  driverId?: string | null;
  driver?: DriverLite | null;
};

export type DriverRecordLite = {
  id: string;
  name?: string | null;
  fullName?: string | null;
  status?: string | null;
  shift?: {
    active?: boolean | null;
  } | null;
};

export type VehicleRecordLite = {
  id: string;
  reg: string;
  status: string;
};

export type RangeKey = 'TODAY' | '7D' | '30D' | 'ALL';

export function getDriverName(driver?: DriverLite | null) {
  if (!driver) return 'Unassigned';
  return driver.fullName || driver.name || 'Unknown driver';
}

export function getPickupLabel(booking: BookingLite) {
  return booking.pickupAddress || booking.pickup || '—';
}

export function getDropoffLabel(booking: BookingLite) {
  return booking.dropoffAddress || booking.dropoff || '—';
}

export function getPickupTimeLabel(booking: BookingLite) {
  return booking.pickupAt || booking.pickupTime || '';
}

export function formatCurrency(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '£0.00';
  return `£${value.toFixed(2)}`;
}

export function formatDateTime(value?: string | null) {
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

export function isCompleted(status?: string) {
  return (status || '').toUpperCase() === 'COMPLETED';
}

export function isCancelled(status?: string) {
  return ['CANCELLED', 'NO_SHOW'].includes((status || '').toUpperCase());
}

export function isLive(status?: string) {
  return ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB', 'ALLOCATED'].includes(
    (status || '').toUpperCase(),
  );
}

export function isScheduled(status?: string) {
  return ['BOOKED', 'OFFERED'].includes((status || '').toUpperCase());
}

export function isToday(value?: string | null) {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();

  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

export function inRange(dateValue: string | undefined | null, range: RangeKey) {
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

export function filterBookingsByRange(
  bookings: BookingLite[],
  range: RangeKey,
) {
  return bookings.filter((booking) =>
    inRange(getPickupTimeLabel(booking) || booking.createdAt, range),
  );
}

export function calculateBookingTotals(bookings: BookingLite[]) {
  const completed = bookings.filter((booking) => isCompleted(booking.status));
  const cancelled = bookings.filter((booking) => isCancelled(booking.status));
  const live = bookings.filter((booking) => isLive(booking.status));
  const scheduled = bookings.filter((booking) => isScheduled(booking.status));

  const revenue = completed.reduce(
    (sum, booking) => sum + (booking.quotedPrice ?? 0),
    0,
  );

  const avgFare = completed.length > 0 ? revenue / completed.length : 0;

  return {
    total: bookings.length,
    completed: completed.length,
    cancelled: cancelled.length,
    live: live.length,
    scheduled: scheduled.length,
    revenue,
    avgFare,
    completionRate:
      bookings.length > 0
        ? Math.round((completed.length / bookings.length) * 100)
        : 0,
    cancellationRate:
      bookings.length > 0
        ? Math.round((cancelled.length / bookings.length) * 100)
        : 0,
  };
}

export function getBookingsByStatus(bookings: BookingLite[]) {
  const map = new Map<string, number>();

  for (const booking of bookings) {
    const key = (booking.status || 'UNKNOWN').replace(/_/g, ' ');
    map.set(key, (map.get(key) || 0) + 1);
  }

  return Array.from(map.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

export function getTopDrivers(bookings: BookingLite[]) {
  const counts = new Map<
    string,
    { driverName: string; completed: number; live: number; revenue: number }
  >();

  for (const booking of bookings) {
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
}

export function getLatestBookings(bookings: BookingLite[], limit = 8) {
  return [...bookings]
    .sort((a, b) => {
      const aTime = new Date(
        getPickupTimeLabel(a) || a.createdAt || 0,
      ).getTime();
      const bTime = new Date(
        getPickupTimeLabel(b) || b.createdAt || 0,
      ).getTime();

      return bTime - aTime;
    })
    .slice(0, limit);
}

export function getDriverSnapshot(drivers: DriverRecordLite[]) {
  const onShift = drivers.filter((driver) => Boolean(driver.shift?.active)).length;
  const available = drivers.filter((driver) =>
    ['AVAILABLE', 'ONLINE', 'ON_DUTY'].includes(
      (driver.status || '').toUpperCase(),
    ),
  ).length;
  const busy = drivers.filter(
    (driver) => (driver.status || '').toUpperCase() === 'BUSY',
  ).length;

  return {
    total: drivers.length,
    onShift,
    available,
    busy,
    offDuty: Math.max(drivers.length - available - busy, 0),
  };
}

export function getVehicleSnapshot(vehicles: VehicleRecordLite[]) {
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
}

export function getDashboardStats(
  bookings: BookingLite[],
  drivers: DriverRecordLite[],
  vehicles: VehicleRecordLite[],
) {
  const todaysBookings = bookings.filter((booking) =>
    isToday(getPickupTimeLabel(booking) || booking.createdAt),
  );

  const jobsToday = todaysBookings.length;
  const pendingJobs = todaysBookings.filter((booking) =>
    isScheduled(booking.status),
  ).length;
  const completedJobs = todaysBookings.filter((booking) =>
    isCompleted(booking.status),
  ).length;
  const cancelledJobs = todaysBookings.filter((booking) =>
    isCancelled(booking.status),
  ).length;
  const liveJobs = todaysBookings.filter((booking) => isLive(booking.status)).length;

  const estimatedRevenue = todaysBookings.reduce((sum, booking) => {
    if (!isCompleted(booking.status)) return sum;
    return sum + (booking.quotedPrice ?? 0);
  }, 0);

  const driverSnapshot = getDriverSnapshot(drivers);
  const vehicleSnapshot = getVehicleSnapshot(vehicles);

  return {
    jobsToday,
    pendingJobs,
    completedJobs,
    cancelledJobs,
    liveJobs,
    estimatedRevenue,
    driversOnline: driverSnapshot.available + driverSnapshot.busy,
    driversAvailable: driverSnapshot.available,
    driversBusy: driverSnapshot.busy,
    driversOffDuty: driverSnapshot.offDuty,
    vehiclesActive: vehicleSnapshot.active,
    totalDrivers: drivers.length,
    totalVehicles: vehicles.length,
  };
}