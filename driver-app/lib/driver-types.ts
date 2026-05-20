export type DriverShift = {
  id: string;
  driverId: string;
  companyId: string;
  startedAt: string;
  endedAt?: string | null;
  startStatus?: string | null;
  endStatus?: string | null;
  notes?: string | null;
  active: boolean;
  durationMinutes: number;
  summary: {
    totalJobs: number;
    completedJobs: number;
    cancelledJobs?: number;
    activeJobs: number;
  };
};

export type Driver = {
  id: string;
  name: string;
  username?: string | null;
  phone?: string | null;
  email?: string | null;
  status: string;
  pin?: string | null;
  licenceNumber?: string | null;
  badgeExpiry?: string | null;
  dbsExpiry?: string | null;
  licenceExpiry?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  lastLocationAt?: string | null;

  dispatch?: {
    assignable: boolean;
    available?: boolean;
    blockedReasons: string[];
  };

  compliance?: {
    blocked: boolean;
    overallStatus: string;
  };

  shift?: DriverShift | null;
};

export type BookingEvent = {
  id: string;
  message: string;
  createdAt: string;
};

export type BookingOffer = {
  isActive?: boolean;
  timeoutSeconds?: number;
  offeredAt?: string | null;
  expiresAt?: string | null;
  secondsRemaining?: number;
  expired?: boolean;
};

export type Booking = {
  id: string;
  reference: string;

  pickup: string;
  dropoff: string;

  pickupLat?: number | null;
  pickupLng?: number | null;

  dropoffLat?: number | null;
  dropoffLng?: number | null;

  pickupLatitude?: number | null;
  pickupLongitude?: number | null;

  dropoffLatitude?: number | null;
  dropoffLongitude?: number | null;

  routeCoordinates?:
    | Array<[number, number]>
    | Array<{ latitude: number; longitude: number }>;

  pickupTime: string;
  status: string;

  quotedPrice?: number | null;
  pricingMode?: string | null;

  trackingUrl?: string | null;

  driverDistanceMiles?: number | null;
  etaMinutes?: number | null;

  etaConfidence?:
    | 'LIVE_GPS'
    | 'ESTIMATED'
    | 'UNAVAILABLE'
    | string
    | null;

  driverGpsAgeSeconds?: number | null;

  customerTrackingMessage?: string | null;

  isAirportBooking?: boolean;

  airportCode?: string | null;
  airportName?: string | null;
  airportTerminal?: string | null;

  flightNumber?: string | null;
  flightDirection?: string | null;
  flightDateTime?: string | null;

  airline?: string | null;

  meetAndGreet?: boolean | null;

  airportNotes?: string | null;

  driverId?: string | null;

  pricing?: {
    quotedPrice?: number | null;
  };

  events?: BookingEvent[];

  offer?: BookingOffer;
};

export type BootstrapResponse = {
  driver: Driver;
  offer: Booking | null;
  activeJobs: Booking[];
  completedJobs?: Booking[];
  currentJob?: Booking | null;

  map?: {
    driver?: Driver | null;
    activeJob?: Booking | null;
    activeOffer?: Booking | null;
    activeJobs?: Booking[];
    updatedAt?: string;
  };

  home?: {
    hasActiveOffer?: boolean;
    hasActiveJob?: boolean;
    activeOfferSecondsRemaining?: number;
    activeOfferExpiresAt?: string | null;
    onShift?: boolean;
    shiftStartedAt?: string | null;
  };

  currentShift?: {
    shift: DriverShift | null;
  } | null;
};

export type DriverLoginResponse = {
  token?: string;
  accessToken?: string;
  access_token?: string;
  driverToken?: string;
  driver?: Driver;
};

export type DriverMapState = {
  driver: Driver | null;
  activeJob: Booking | null;
  activeOffer: Booking | null;
  activeJobs: Booking[];
  updatedAt: string;
};

export type LocationPayload = {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
};