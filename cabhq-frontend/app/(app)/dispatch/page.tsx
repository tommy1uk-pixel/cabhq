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

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

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

type DriverDispatchState = {
  assignable: boolean;
  available?: boolean;
  blockedReasons: string[];
};

type Driver = {
  id: string;
  fullName?: string;
  name?: string;
  isOnDuty?: boolean;
  isAvailable?: boolean;
  isBusy?: boolean;
  status?: string;
  latitude?: number | null;
  longitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  lastLocationAt?: string | null;
  vehicle?: Vehicle;
  dispatch?: DriverDispatchState;
};

type DriverSuggestion = {
  id: string;
  name: string;
  status: string;
  distanceMiles?: number | null;
  score?: number | null;
  scoreBreakdown?: string[];
  lastLocationAt?: string | null;
  vehicle?: Vehicle;
};

type Account = {
  id: string;
  name: string;
  code?: string | null;
  status?: string;
};

type TimelineEvent = {
  id: string;
  type?: string;
  note?: string | null;
  createdAt: string;
  message?: string | null;
};

type BookingOfferMeta = {
  isActive?: boolean;
  timeoutSeconds?: number;
  offeredAt?: string | null;
  expiresAt?: string | null;
  secondsRemaining?: number;
  expired?: boolean;
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
  events?: TimelineEvent[];
  offer?: BookingOfferMeta;
  createdAt?: string;
  updatedAt?: string;

  trackingUrl?: string | null;
  driverDistanceMiles?: number | null;
  etaMinutes?: number | null;
  etaConfidence?: 'LIVE_GPS' | 'ESTIMATED' | 'UNAVAILABLE' | string | null;
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
  meetAndGreet?: boolean;
  airportNotes?: string | null;
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

  isAirportBooking: boolean;
  airportCode: string;
  airportName: string;
  airportTerminal: string;
  flightNumber: string;
  flightDirection: string;
  flightDateTime: string;
  airline: string;
  meetAndGreet: boolean;
  airportNotes: string;
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

type RouteResult = {
  distanceMiles: number | null;
  durationMinutes: number | null;
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

type AirportOption = {
  code: string;
  name: string;
  terminals: string[];
};

const OFFER_TIMEOUT_SECONDS = 20;

const AIRPORTS: AirportOption[] = [
  {
    code: 'LHR',
    name: 'Heathrow Airport',
    terminals: ['Terminal 2', 'Terminal 3', 'Terminal 4', 'Terminal 5'],
  },
  {
    code: 'LGW',
    name: 'Gatwick Airport',
    terminals: ['North Terminal', 'South Terminal'],
  },
  {
    code: 'BRS',
    name: 'Bristol Airport',
    terminals: ['Main Terminal'],
  },
  {
    code: 'SOU',
    name: 'Southampton Airport',
    terminals: ['Main Terminal'],
  },
  {
    code: 'BOH',
    name: 'Bournemouth Airport',
    terminals: ['Main Terminal'],
  },
  {
    code: 'EXT',
    name: 'Exeter Airport',
    terminals: ['Main Terminal'],
  },
  {
    code: 'LTN',
    name: 'London Luton Airport',
    terminals: ['Main Terminal'],
  },
  {
    code: 'STN',
    name: 'London Stansted Airport',
    terminals: ['Main Terminal'],
  },
  {
    code: 'BHX',
    name: 'Birmingham Airport',
    terminals: ['Main Terminal'],
  },
  {
    code: 'MAN',
    name: 'Manchester Airport',
    terminals: ['Terminal 1', 'Terminal 2', 'Terminal 3'],
  },
];

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

  isAirportBooking: false,
  airportCode: '',
  airportName: '',
  airportTerminal: '',
  flightNumber: '',
  flightDirection: '',
  flightDateTime: '',
  airline: '',
  meetAndGreet: false,
  airportNotes: '',
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

  if (normalized === 'NO_DRIVER') {
    return 'border-red-500/25 bg-red-500/10 text-red-200';
  }

  if (normalized === 'OFFERED') {
    return 'border-amber-400/40 bg-amber-500/15 text-amber-200';
  }

  if (normalized === 'BOOKED') {
    return 'border-yellow-500/25 bg-yellow-500/10 text-yellow-200';
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

  if (normalized === 'OFFERED') {
    return 'border-amber-400/40 bg-amber-500/[0.08] shadow-[0_0_30px_rgba(245,158,11,0.12)]';
  }

  if (normalized === 'NO_DRIVER') {
    return 'border-red-500/25 bg-red-500/[0.07]';
  }

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

function isDriverDispatchReady(driver: Driver) {
  const status = (driver.status || '').toUpperCase();

  if (driver.dispatch?.assignable === false) {
    return false;
  }

  return (
    driver.dispatch?.available === true ||
    driver.isAvailable === true ||
    driver.isOnDuty === true ||
    ['ONLINE', 'AVAILABLE', 'ON_DUTY'].includes(status)
  );
}

function getGpsAgeSeconds(value?: string | null, now = Date.now()) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;

  return Math.max(0, Math.round((now - date.getTime()) / 1000));
}

function formatGpsAge(value?: string | null, now = Date.now()) {
  const seconds = getGpsAgeSeconds(value, now);

  if (seconds === Number.MAX_SAFE_INTEGER) return 'No GPS';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function getLiveEtaMinutes(
  etaMinutes?: number | null,
  lastLocationAt?: string | null,
  now = Date.now(),
) {
  if (etaMinutes == null) return null;

  if (!lastLocationAt) return etaMinutes;

  const last = new Date(lastLocationAt).getTime();

  if (Number.isNaN(last)) return etaMinutes;

  const elapsedMinutes = Math.floor((now - last) / 60000);

  return Math.max(1, etaMinutes - elapsedMinutes);
}

function getDriverPickupInsight(
  etaMinutes?: number | null,
  distanceMiles?: number | null,
  lastLocationAt?: string | null,
  now = Date.now(),
) {
  const liveEta = getLiveEtaMinutes(etaMinutes, lastLocationAt, now);
  const gpsAge = getGpsAgeSeconds(lastLocationAt, now);

  if (liveEta != null && distanceMiles != null) {
    if (distanceMiles <= 0.1) {
      return {
        label: 'Driver at pickup',
        tone: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
      };
    }

    if (liveEta <= 3) {
      return {
        label: `Driver nearby · ${liveEta} min`,
        tone: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
      };
    }

    return {
      label: `ETA ${liveEta} mins · ${distanceMiles.toFixed(1)} mi`,
      tone: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-200',
    };
  }

  if (gpsAge <= 60) {
    return {
      label: 'GPS live',
      tone: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
    };
  }

  if (gpsAge <= 300) {
    return {
      label: `GPS ${formatGpsAge(lastLocationAt, now)}`,
      tone: 'border-amber-500/25 bg-amber-500/10 text-amber-200',
    };
  }

  return {
    label: 'GPS stale',
    tone: 'border-red-500/25 bg-red-500/10 text-red-200',
  };
}

function etaConfidenceTone(value?: string | null) {
  const normalised = (value || '').toUpperCase();

  if (normalised === 'LIVE_GPS') {
    return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200';
  }

  if (normalised === 'ESTIMATED') {
    return 'border-amber-500/25 bg-amber-500/10 text-amber-200';
  }

  return 'border-slate-500/25 bg-slate-500/10 text-slate-300';
}

function etaConfidenceLabel(value?: string | null) {
  const normalised = (value || '').toUpperCase();

  if (normalised === 'LIVE_GPS') return 'Live GPS ETA';
  if (normalised === 'ESTIMATED') return 'Estimated ETA';

  return 'ETA unavailable';
}

function getTrackingUrl(reference?: string | null, explicitUrl?: string | null) {
  if (explicitUrl?.trim()) return explicitUrl.trim();
  if (!reference) return '';

  if (typeof window === 'undefined') {
    return `/track/${encodeURIComponent(reference)}`;
  }

  return `${window.location.origin}/track/${encodeURIComponent(reference)}`;
}

async function copyTextToClipboard(value: string) {
  if (!value) return;

  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '-9999px';

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function normalisePhoneForWhatsApp(value?: string | null) {
  const raw = (value || '').trim();

  if (!raw) return '';

  const cleaned = raw.replace(/[^0-9+]/g, '');

  if (cleaned.startsWith('+')) {
    return cleaned.replace(/^\+/, '');
  }

  if (cleaned.startsWith('0')) {
    return `44${cleaned.slice(1)}`;
  }

  return cleaned;
}

function buildCustomerTrackingMessage(booking: Booking) {
  if (booking.customerTrackingMessage?.trim()) {
    return booking.customerTrackingMessage.trim();
  }

  const trackingUrl = getTrackingUrl(booking.reference, booking.trackingUrl);

  const lines = [
    `Hi ${booking.customerName || 'there'},`,
    '',
    `Your taxi booking ${booking.reference} is confirmed.`,
    '',
    `Pickup: ${getPickupLabel(booking)}`,
    `Dropoff: ${getDropoffLabel(booking)}`,
    `Pickup time: ${formatDateTime(getPickupTimeLabel(booking))}`,
  ];

  if (booking.etaMinutes != null && booking.driver) {
    lines.push('', `Driver ETA: approx ${booking.etaMinutes} mins`);
  }

  lines.push('', 'Live tracking link:', trackingUrl);

  return lines.join('\n');
}

function getOfferInfo(booking: Booking, now = Date.now()) {
  const status = (booking.status || '').toUpperCase();

  if (status !== 'OFFERED') {
    return {
      active: false,
      secondsRemaining: 0,
      expired: false,
      label: '—',
    };
  }

  if (booking.offer?.expiresAt) {
    const expiresAt = new Date(booking.offer.expiresAt).getTime();
    const secondsRemaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));

    return {
      active: true,
      secondsRemaining,
      expired: secondsRemaining <= 0,
      label: `${secondsRemaining}s`,
    };
  }

  if (booking.offer?.secondsRemaining != null) {
    const secondsRemaining = Math.max(0, booking.offer.secondsRemaining);

    return {
      active: true,
      secondsRemaining,
      expired: secondsRemaining <= 0,
      label: `${secondsRemaining}s`,
    };
  }

  const events = booking.events ?? [];
  const offeredEvent = [...events]
    .reverse()
    .find((event) =>
      typeof event.message === 'string' &&
      event.message.startsWith('AUTO DISPATCH OFFERED'),
    );

  const offeredAt = offeredEvent?.createdAt
    ? new Date(offeredEvent.createdAt).getTime()
    : booking.updatedAt
      ? new Date(booking.updatedAt).getTime()
      : null;

  if (!offeredAt || Number.isNaN(offeredAt)) {
    return {
      active: true,
      secondsRemaining: OFFER_TIMEOUT_SECONDS,
      expired: false,
      label: `${OFFER_TIMEOUT_SECONDS}s`,
    };
  }

  const expiresAt = offeredAt + OFFER_TIMEOUT_SECONDS * 1000;
  const secondsRemaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));

  return {
    active: true,
    secondsRemaining,
    expired: secondsRemaining <= 0,
    label: `${secondsRemaining}s`,
  };
}

function getCurrentJobLabel(booking: Booking) {
  const status = (booking.status || '').toUpperCase();

  if (status === 'OFFERED') return 'Waiting for driver response';
  if (status === 'ACCEPTED') return 'Accepted by driver';
  if (status === 'EN_ROUTE') return 'Driver en route';
  if (status === 'ARRIVED') return 'Driver arrived';
  if (status === 'ON_JOB') return 'Passenger on board';
  if (status === 'NO_DRIVER') return 'No driver accepted';
  if (status === 'BOOKED') return 'Ready to dispatch';

  return status.replace(/_/g, ' ');
}

function detectAirport(address: string) {
  const normalised = address.toLowerCase();

  return AIRPORTS.find((airport) => {
    const name = airport.name.toLowerCase();
    const code = airport.code.toLowerCase();

    return normalised.includes(name.replace(' airport', '')) ||
      normalised.includes(code) ||
      normalised.includes(name);
  });
}

function isAirportBookingFromData(booking: Booking) {
  return (
    booking.isAirportBooking === true ||
    Boolean(booking.airportCode) ||
    Boolean(booking.airportName) ||
    Boolean(booking.airportTerminal) ||
    Boolean(booking.flightNumber) ||
    Boolean(booking.flightDirection) ||
    Boolean(booking.meetAndGreet) ||
    Boolean(booking.airportNotes)
  );
}

function getAirportDirectionLabel(value?: string | null) {
  const normalised = (value || '').toUpperCase();

  if (normalised === 'ARRIVAL') return 'AIRPORT PICKUP';
  if (normalised === 'DEPARTURE') return 'AIRPORT DROPOFF';
  if (normalised === 'TRANSFER') return 'AIRPORT TRANSFER';

  return normalised || 'AIRPORT JOB';
}

function airportTone(direction?: string | null) {
  const normalised = (direction || '').toUpperCase();

  if (normalised === 'ARRIVAL') {
    return 'border-cyan-500/25 bg-cyan-500/10 text-cyan-200';
  }

  if (normalised === 'DEPARTURE') {
    return 'border-purple-500/25 bg-purple-500/10 text-purple-200';
  }

  return 'border-blue-500/25 bg-blue-500/10 text-blue-200';
}

function getAirportTerminalLabel(value?: string | null) {
  if (!value) return null;
  return value.toLowerCase().includes('terminal') ? value : `Terminal ${value}`;
}

function airportCodeFromName(name?: string | null) {
  if (!name) return null;

  const match = AIRPORTS.find(
    (airport) => airport.name.toLowerCase() === name.toLowerCase(),
  );

  return match?.code ?? null;
}

function selectedAirportFromCode(code: string) {
  return AIRPORTS.find((airport) => airport.code === code) ?? null;
}

function TrackingIntelligenceStrip({
  booking,
  now,
}: {
  booking: Booking;
  now: number;
}) {
  const liveEta = getLiveEtaMinutes(
    booking.etaMinutes,
    booking.driver?.lastLocationAt,
    now,
  );

  const hasTrackingMeta =
    booking.trackingUrl ||
    booking.driverDistanceMiles != null ||
    booking.etaMinutes != null ||
    booking.etaConfidence ||
    booking.driverGpsAgeSeconds != null;

  if (!hasTrackingMeta) return null;

  const insight = getDriverPickupInsight(
    booking.etaMinutes,
    booking.driverDistanceMiles,
    booking.driver?.lastLocationAt,
    now,
  );

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {liveEta != null ? (
        <span className={`rounded-full border px-3 py-1 text-xs font-black ${insight.tone}`}>
          {insight.label}
        </span>
      ) : null}

      {booking.etaConfidence ? (
        <span
          className={`rounded-full border px-3 py-1 text-xs font-black ${etaConfidenceTone(
            booking.etaConfidence,
          )}`}
        >
          {etaConfidenceLabel(booking.etaConfidence)}
        </span>
      ) : null}

      {booking.driverGpsAgeSeconds != null ? (
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/60">
          GPS {booking.driverGpsAgeSeconds}s old
        </span>
      ) : null}
    </div>
  );
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
  const [driverPickupEtaMinutes, setDriverPickupEtaMinutes] = useState<number | null>(null);
  const [driverPickupDistanceMiles, setDriverPickupDistanceMiles] = useState<number | null>(null);
  const [pickupDropoffEtaMinutes, setPickupDropoffEtaMinutes] = useState<number | null>(null);
  const [pickupDropoffDistanceMiles, setPickupDropoffDistanceMiles] = useState<number | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [driverIconFactory, setDriverIconFactory] =
    useState<((driver: Driver) => DivIcon) | null>(null);
  const [bookingIconFactory, setBookingIconFactory] =
    useState<((color: string, label: string) => DivIcon) | null>(null);
  const [form, setForm] = useState<BookingFormState>(initialForm);
  const [search, setSearch] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [alertsUnlocked, setAlertsUnlocked] = useState(false);
  const [latestDispatchAlert, setLatestDispatchAlert] = useState<string | null>(null);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);

  const mapRef = useRef<LeafletMap | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const alertedBookingIdsRef = useRef<Set<string>>(new Set());

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const selectedAirport = selectedAirportFromCode(form.airportCode);

  const airportBookingEnabled =
    form.isAirportBooking ||
    Boolean(detectAirport(form.pickupAddress)) ||
    Boolean(detectAirport(form.dropoffAddress)) ||
    Boolean(form.airportCode) ||
    Boolean(form.airportName);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const playDispatchAlert = useCallback(
    (message: string) => {
      setLatestDispatchAlert(message);

      window.setTimeout(() => {
        setLatestDispatchAlert((current) =>
          current === message ? null : current,
        );
      }, 9000);

      if (!soundEnabled || typeof window === 'undefined') return;

      try {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;

        if (!AudioCtor) return;

        const audioContext = audioContextRef.current ?? new AudioCtor();
        audioContextRef.current = audioContext;

        if (audioContext.state === 'suspended') {
          void audioContext.resume();
        }

        const firstOscillator = audioContext.createOscillator();
        const secondOscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const nowTime = audioContext.currentTime;

        firstOscillator.type = 'sine';
        firstOscillator.frequency.setValueAtTime(880, nowTime);
        firstOscillator.frequency.setValueAtTime(1046, nowTime + 0.16);

        secondOscillator.type = 'triangle';
        secondOscillator.frequency.setValueAtTime(440, nowTime);
        secondOscillator.frequency.setValueAtTime(523, nowTime + 0.16);

        gain.gain.setValueAtTime(0.0001, nowTime);
        gain.gain.exponentialRampToValueAtTime(0.18, nowTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, nowTime + 0.42);

        firstOscillator.connect(gain);
        secondOscillator.connect(gain);
        gain.connect(audioContext.destination);

        firstOscillator.start(nowTime);
        secondOscillator.start(nowTime);
        firstOscillator.stop(nowTime + 0.45);
        secondOscillator.stop(nowTime + 0.45);
      } catch (error) {
        console.error('Dispatch alert sound failed:', error);
      }
    },
    [soundEnabled],
  );

  const unlockDispatchAudio = useCallback(() => {
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;

      if (AudioCtor && !audioContextRef.current) {
        audioContextRef.current = new AudioCtor();
      }

      if (audioContextRef.current?.state === 'suspended') {
        void audioContextRef.current.resume();
      }

      setAlertsUnlocked(true);
      playDispatchAlert('Dispatch alerts enabled');
    } catch {
      setAlertsUnlocked(true);
    }
  }, [playDispatchAlert]);

  useEffect(() => {
    let mounted = true;

    async function loadLeaflet() {
      const L = await import('leaflet');

      if (!mounted) return;

      setDriverIconFactory(() => (driver: Driver) => {
        const status = (driver.status || '').toUpperCase();
        const available = isDriverDispatchReady(driver);
        const busy =
          status === 'BUSY' ||
          status === 'ON_JOB' ||
          status === 'EN_ROUTE' ||
          status === 'ARRIVED' ||
          status === 'OFFERED';
        const blocked = !available && !busy;
        const gpsAge = getGpsAgeSeconds(driver.lastLocationAt);
        const staleGps = gpsAge > 60;

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
              width: 22px;
              height: 22px;
              border-radius: 9999px;
              background: ${color};
              border: 3px solid white;
              box-shadow: 0 0 0 2px rgba(0,0,0,0.35), 0 0 22px ${color};
              opacity: ${staleGps ? '0.55' : '1'};
            "></div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
      });

      setBookingIconFactory(() => (color: string, label: string) =>
        L.divIcon({
          className: '',
          html: `
            <div style="
              min-width: 30px;
              height: 30px;
              border-radius: 9999px;
              background: ${color};
              color: white;
              border: 2px solid white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: 800;
              box-shadow: 0 0 0 2px rgba(0,0,0,0.35), 0 0 18px ${color};
              padding: 0 7px;
            ">${label}</div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
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
    }, 10000);

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

        if (!alertedBookingIdsRef.current.has(payload.booking.id)) {
          alertedBookingIdsRef.current.add(payload.booking.id);
          playDispatchAlert(
            `New booking ${payload.booking.reference || ''} created`,
          );
        }

        void loadBookings();
      }
    };

    const handleBookingUpdated = (payload: SocketBookingPayload) => {
      if (payload?.booking) {
        syncBooking(payload.booking);
        void loadBookings();
      }
    };

    const handleBookingOfferCreated = (payload: SocketBookingPayload) => {
      if (payload?.booking) {
        syncBooking(payload.booking);
        playDispatchAlert(
          `Driver offer sent for ${payload.booking.reference || 'booking'}`,
        );
        void loadBookings();
      }
    };

    const handleDriverUpdated = (payload: SocketDriverPayload) => {
      if (payload?.driver) {
        syncDriver(payload.driver);
        void loadDrivers(false);
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
    socket.on('booking:offer_created', handleBookingOfferCreated);

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
      socket.off('booking:offer_created', handleBookingOfferCreated);

      socket.off('driver:updated', handleDriverUpdated);
      socket.off('driver:location', handleDriverLocation);

      closeSocket();
    };
  }, [
    token,
    syncBooking,
    syncDriver,
    syncDriverLocation,
    loadBookings,
    loadDrivers,
    playDispatchAlert,
  ]);

  async function fetchRoute(
    from: LatLngTuple | null,
    to: LatLngTuple | null,
  ): Promise<RouteResult> {
    if (!from || !to) {
      return {
        coordinates: [],
        distanceMiles: null,
        durationMinutes: null,
      };
    }

    try {
      const route = await apiFetch<RouteResponse>(
        `/locations/route?fromLat=${encodeURIComponent(String(from[0]))}&fromLng=${encodeURIComponent(
          String(from[1]),
        )}&toLat=${encodeURIComponent(String(to[0]))}&toLng=${encodeURIComponent(String(to[1]))}`,
      );

      return {
        coordinates: Array.isArray(route.coordinates) ? route.coordinates : [],
        distanceMiles:
          typeof route.distanceMiles === 'number' ? route.distanceMiles : null,
        durationMinutes:
          typeof route.durationMinutes === 'number' ? route.durationMinutes : null,
      };
    } catch (error) {
      console.error('Failed to load route:', error);

      return {
        coordinates: [],
        distanceMiles: null,
        durationMinutes: null,
      };
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

      setDriverPickupRoute(driverToPickup.coordinates);
      setPickupDropoffRoute(pickupToDropoff.coordinates);
      setDriverPickupEtaMinutes(driverToPickup.durationMinutes);
      setDriverPickupDistanceMiles(driverToPickup.distanceMiles);
      setPickupDropoffEtaMinutes(pickupToDropoff.durationMinutes);
      setPickupDropoffDistanceMiles(pickupToDropoff.distanceMiles);
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

      const flightDate =
        form.flightDateTime.trim() !== ''
          ? new Date(form.flightDateTime).toISOString()
          : null;

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

        isAirportBooking: airportBookingEnabled,
        airportCode: airportBookingEnabled ? form.airportCode || null : null,
        airportName: airportBookingEnabled ? form.airportName || null : null,
        airportTerminal: airportBookingEnabled
          ? form.airportTerminal || null
          : null,
        flightNumber: airportBookingEnabled
          ? form.flightNumber.trim().toUpperCase() || null
          : null,
        flightDirection: airportBookingEnabled
          ? form.flightDirection || null
          : null,
        flightDateTime: airportBookingEnabled ? flightDate : null,
        airline: airportBookingEnabled ? form.airline.trim() || null : null,
        meetAndGreet: airportBookingEnabled ? form.meetAndGreet : false,
        airportNotes: airportBookingEnabled
          ? form.airportNotes.trim() || null
          : null,
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
      offered: bookings.filter(
        (booking) => (booking.status || '').toUpperCase() === 'OFFERED',
      ).length,
      completed: bookings.filter(
        (booking) => (booking.status || '').toUpperCase() === 'COMPLETED',
      ).length,
      drivers: drivers.length,
      available: drivers.filter(isDriverDispatchReady).length,
      liveGps: liveDrivers.length,
      accountLinked: bookings.filter((booking) =>
        Boolean(booking.accountId || booking.account),
      ).length,
      airportJobs: bookings.filter(isAirportBookingFromData).length,
      liveEta: bookings.filter((booking) => booking.etaMinutes != null).length,
    };
  }, [bookings, drivers, liveDrivers.length]);

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();

    const ordered = [...bookings].sort((a, b) => {
      const statusOrder: Record<string, number> = {
        OFFERED: 0,
        ACCEPTED: 1,
        EN_ROUTE: 2,
        ARRIVED: 3,
        ON_JOB: 4,
        BOOKED: 5,
        NO_DRIVER: 6,
        COMPLETED: 7,
        CANCELLED: 8,
        NO_SHOW: 9,
      };

      const aStatus = statusOrder[(a.status || '').toUpperCase()] ?? 20;
      const bStatus = statusOrder[(b.status || '').toUpperCase()] ?? 20;

      if (aStatus !== bStatus) return aStatus - bStatus;

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
        booking.airportCode,
        booking.airportName,
        booking.airportTerminal,
        booking.flightNumber,
        booking.flightDirection,
        booking.airline,
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
              Live bookings, driver map, airport work, offer timers and dispatch
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
              type="button"
              onClick={() => {
                if (!alertsUnlocked) {
                  unlockDispatchAudio();
                  return;
                }

                setSoundEnabled((current) => !current);
              }}
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                soundEnabled
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                  : 'border-slate-500/20 bg-slate-500/10 text-slate-300 hover:bg-slate-500/20'
              }`}
            >
              {!alertsUnlocked
                ? 'Enable Alerts'
                : soundEnabled
                  ? 'Alerts On'
                  : 'Alerts Muted'}
            </button>

            <button
              onClick={() => void refreshBoard()}
              className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20"
            >
              Refresh Board
            </button>
          </div>
        </div>

        {latestDispatchAlert ? (
          <div className="mb-6 rounded-3xl border border-amber-400/30 bg-amber-500/15 px-5 py-4 shadow-[0_0_35px_rgba(245,158,11,0.16)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-200">
                  Dispatch Alert
                </p>
                <p className="mt-1 text-sm font-bold text-white">
                  {latestDispatchAlert}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setLatestDispatchAlert(null)}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {copiedAction ? (
          <div className="mb-6 rounded-3xl border border-emerald-500/25 bg-emerald-500/10 px-5 py-4 text-sm font-bold text-emerald-200">
            {copiedAction}
          </div>
        ) : null}

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-10">
          <Card label="Bookings" value={stats.bookings} hint="Total jobs" />
          <Card label="Live Jobs" value={stats.live} hint="Dispatch active" />
          <Card
            label="Airport Jobs"
            value={stats.airportJobs}
            hint="Flight work"
          />
          <Card
            label="Offered"
            value={stats.offered}
            hint="Awaiting driver"
            urgent={stats.offered > 0}
          />
          <Card label="Completed" value={stats.completed} hint="Finished jobs" />
          <Card label="Drivers" value={stats.drivers} hint="Driver records" />
          <Card label="Available" value={stats.available} hint="Dispatch ready" />
          <Card label="GPS Live" value={stats.liveGps} hint="Live positions" />
          <Card label="Live ETAs" value={stats.liveEta} hint="Tracking ready" />
          <Card
            label="Account Jobs"
            value={stats.accountLinked}
            hint="Linked accounts"
          />
        </section>

        <div className="mb-8 grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-[#0b1220] p-5 xl:h-[640px] xl:overflow-y-auto">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-white">New Booking</h2>
              <p className="mt-1 text-sm text-white/55">
                Create standard, account, airport and dispatch-ready bookings.
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
                  onSelectAddress={(address: SelectedAddress) => {
                    const airport = detectAirport(address.label);

                    setForm((prev) => ({
                      ...prev,
                      pickupAddress: address.label,
                      pickupLatitude: address.lat,
                      pickupLongitude: address.lng,
                      isAirportBooking: prev.isAirportBooking || Boolean(airport),
                      airportCode: prev.airportCode || airport?.code || '',
                      airportName: prev.airportName || airport?.name || '',
                      flightDirection:
                        prev.flightDirection || (airport ? 'ARRIVAL' : ''),
                    }));
                  }}
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
                  onSelectAddress={(address: SelectedAddress) => {
                    const airport = detectAirport(address.label);

                    setForm((prev) => ({
                      ...prev,
                      dropoffAddress: address.label,
                      dropoffLatitude: address.lat,
                      dropoffLongitude: address.lng,
                      isAirportBooking: prev.isAirportBooking || Boolean(airport),
                      airportCode: prev.airportCode || airport?.code || '',
                      airportName: prev.airportName || airport?.name || '',
                      flightDirection:
                        prev.flightDirection || (airport ? 'DEPARTURE' : ''),
                    }));
                  }}
                />
              </div>

              <div className="md:col-span-2 rounded-3xl border border-cyan-500/20 bg-cyan-500/[0.06] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-white">
                      Airport Details
                    </h3>
                    <p className="mt-1 text-sm text-cyan-100/65">
                      Store terminal, flight number, flight time and meet & greet
                      against the booking.
                    </p>
                  </div>

                  <Toggle
                    label="Airport booking"
                    checked={form.isAirportBooking}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        isAirportBooking: value,
                      }))
                    }
                  />
                </div>

                {airportBookingEnabled ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <SelectField
                      label="Airport"
                      value={form.airportCode}
                      onChange={(value) => {
                        const airport = selectedAirportFromCode(value);

                        setForm((prev) => ({
                          ...prev,
                          airportCode: airport?.code || '',
                          airportName: airport?.name || '',
                          airportTerminal: '',
                          isAirportBooking: true,
                        }));
                      }}
                      options={[
                        { label: 'Select airport', value: '' },
                        ...AIRPORTS.map((airport) => ({
                          label: `${airport.name} (${airport.code})`,
                          value: airport.code,
                        })),
                      ]}
                    />

                    <SelectField
                      label="Terminal"
                      value={form.airportTerminal}
                      onChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          airportTerminal: value,
                        }))
                      }
                      options={[
                        { label: 'Select terminal', value: '' },
                        ...(selectedAirport?.terminals ?? []).map((terminal) => ({
                          label: terminal,
                          value: terminal,
                        })),
                      ]}
                    />

                    <SelectField
                      label="Direction"
                      value={form.flightDirection}
                      onChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          flightDirection: value,
                        }))
                      }
                      options={[
                        { label: 'Select direction', value: '' },
                        { label: 'Arrival / Airport Pickup', value: 'ARRIVAL' },
                        {
                          label: 'Departure / Airport Dropoff',
                          value: 'DEPARTURE',
                        },
                        { label: 'Transfer', value: 'TRANSFER' },
                      ]}
                    />

                    <Field
                      label="Flight number"
                      value={form.flightNumber}
                      onChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          flightNumber: value.toUpperCase(),
                        }))
                      }
                      placeholder="BA123"
                    />

                    <DateTimeField
                      label="Flight date & time"
                      value={form.flightDateTime}
                      onChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          flightDateTime: value,
                        }))
                      }
                    />

                    <Field
                      label="Airline"
                      value={form.airline}
                      onChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          airline: value,
                        }))
                      }
                      placeholder="British Airways"
                    />

                    <label className="flex min-h-[74px] items-center gap-3 rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3">
                      <input
                        type="checkbox"
                        checked={form.meetAndGreet}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            meetAndGreet: event.target.checked,
                          }))
                        }
                        className="h-5 w-5"
                      />

                      <span className="text-sm font-semibold text-white">
                        Meet & Greet required
                      </span>
                    </label>

                    <div className="md:col-span-2">
                      <TextAreaField
                        label="Airport notes"
                        value={form.airportNotes}
                        onChange={(value) =>
                          setForm((prev) => ({
                            ...prev,
                            airportNotes: value,
                          }))
                        }
                        placeholder="Meet inside arrivals, call once landed, name board, parking instructions..."
                      />
                    </div>
                  </div>
                ) : null}
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
                        <div className="min-w-[190px] text-black">
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
                            GPS: {formatGpsAge(driver.lastLocationAt, now)}
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
                      <div className="min-w-[190px] text-black">
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

                        <div className="mt-2 text-xs text-gray-600">
                          GPS: {formatGpsAge(selectedDriver.lastLocationAt, now)}
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
              placeholder="Search ref, customer, phone, route, driver, account, airport, flight..."
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
          now={now}
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
            now={now}
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
            selectedPickupPosition={selectedPickupPosition}
            selectedDropoffPosition={selectedDropoffPosition}
            driverPickupRoute={driverPickupRoute}
            pickupDropoffRoute={pickupDropoffRoute}
            driverPickupEtaMinutes={driverPickupEtaMinutes}
            driverPickupDistanceMiles={driverPickupDistanceMiles}
            pickupDropoffEtaMinutes={pickupDropoffEtaMinutes}
            pickupDropoffDistanceMiles={pickupDropoffDistanceMiles}
            driverIconFactory={driverIconFactory}
            bookingIconFactory={bookingIconFactory}
            now={now}
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

function OfferCountdown({ booking, now }: { booking: Booking; now: number }) {
  const offer = getOfferInfo(booking, now);

  if (!offer.active) return null;

  const urgent = offer.secondsRemaining <= 5;

  return (
    <div
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${
        urgent
          ? 'animate-pulse border-red-400/40 bg-red-500/15 text-red-200'
          : 'border-amber-400/40 bg-amber-500/15 text-amber-200'
      }`}
    >
      Offer: {offer.label}
    </div>
  );
}

function AirportBadges({ booking }: { booking: Booking }) {
  if (!isAirportBookingFromData(booking)) return null;

  const terminal = getAirportTerminalLabel(booking.airportTerminal);
  const direction = getAirportDirectionLabel(booking.flightDirection);
  const code = booking.airportCode || airportCodeFromName(booking.airportName);

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <span
        className={`rounded-full border px-3 py-1 text-[11px] font-black ${airportTone(
          booking.flightDirection,
        )}`}
      >
        {direction}
      </span>

      {booking.airportName || code ? (
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-white">
          {booking.airportName || 'Airport'} {code ? `(${code})` : ''}
        </span>
      ) : null}

      {terminal ? (
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-white">
          {terminal}
        </span>
      ) : null}

      {booking.flightNumber ? (
        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-black text-amber-200">
          ✈ {booking.flightNumber}
        </span>
      ) : null}

      {booking.flightDateTime ? (
        <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[11px] font-bold text-blue-200">
          {formatDateTime(booking.flightDateTime)}
        </span>
      ) : null}

      {booking.meetAndGreet ? (
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-black text-emerald-200">
          MEET & GREET
        </span>
      ) : null}
    </div>
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
  now,
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
  now: number;
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
            const status = (booking.status || '').toUpperCase();
            const offered = status === 'OFFERED';
            const noDriver = status === 'NO_DRIVER';
            const canDispatch = ['BOOKED', 'NO_DRIVER', 'OFFERED'].includes(
              status,
            );

            return (
              <div
                key={booking.id}
                className={`rounded-2xl border px-4 py-4 transition ${bookingRowTone(
                  booking.status,
                )} ${offered ? 'animate-pulse' : ''}`}
              >
                <div
                  className={
                    compact
                      ? 'grid gap-3 xl:grid-cols-[130px_130px_1.6fr_160px_150px_140px_auto] xl:items-center'
                      : 'grid gap-4 xl:grid-cols-[130px_150px_1.55fr_170px_170px_170px_auto] xl:items-center'
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

                    {!compact ? (
                      <div className="mt-2">
                        <OfferCountdown booking={booking} now={now} />
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

                    <AirportBadges booking={booking} />

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

                    <div className="text-xs text-white/50">
                      {getCurrentJobLabel(booking)}
                    </div>

                    <div className="text-sm text-white/75">
                      {getDriverName(booking.driver)}
                    </div>
                  </div>

                  {!compact ? (
                    <div className="space-y-2">
                      {booking.suggestedDrivers &&
                      booking.suggestedDrivers.length > 0 ? (
                        booking.suggestedDrivers
                          .slice(0, 2)
                          .map((suggested, index) => {
                            const key = `${booking.id}:${suggested.id}`;
                            const status = (suggested.status || 'UNKNOWN').replace(
                              /_/g,
                              ' ',
                            );

                            return (
                              <button
                                key={suggested.id}
                                onClick={() =>
                                  onAssignDriver(booking.id, suggested.id)
                                }
                                disabled={assigningKey === key || !canDispatch}
                                className="block w-full rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-left text-xs text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-50"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-white">
                                    #{index + 1} {suggested.name}
                                  </span>

                                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                                    Recommended
                                  </span>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  {suggested.distanceMiles != null ? (
                                    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold text-cyan-200">
                                      {suggested.distanceMiles.toFixed(1)} miles away
                                    </span>
                                  ) : (
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/50">
                                      Distance unknown
                                    </span>
                                  )}

                                  <span
                                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                                      suggested.status === 'AVAILABLE'
                                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                                        : 'border-amber-500/20 bg-amber-500/10 text-amber-200'
                                    }`}
                                  >
                                    {status}
                                  </span>

                                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/65">
                                    GPS {formatGpsAge(suggested.lastLocationAt, now)}
                                  </span>

                                  {suggested.vehicle ? (
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/65">
                                      {getVehicleLabel(suggested.vehicle)}
                                    </span>
                                  ) : null}
                                </div>

                                <div className="mt-3 text-[11px] font-semibold text-emerald-100/80">
                                  {assigningKey === key ? 'Assigning driver...' : 'Click to assign driver'}
                                </div>
                              </button>
                            );
                          })
                      ) : (
                        <div
                          className={`rounded-xl border px-3 py-2 text-xs ${
                            noDriver
                              ? 'border-red-500/20 bg-red-500/10 text-red-200'
                              : 'border-white/10 bg-black/20 text-white/40'
                          }`}
                        >
                          {noDriver ? 'No eligible drivers' : 'No suggestions'}
                        </div>
                      )}
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
                        disabled={
                          autoDispatchingId === booking.id || !canDispatch
                        }
                        className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {autoDispatchingId === booking.id
                          ? 'Running...'
                          : offered
                            ? 'Re-offer'
                            : 'Auto'}
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

                {(booking.notes || booking.airportNotes) && !compact ? (
                  <div className="mt-3 border-t border-white/5 pt-3 text-xs text-white/45">
                    {booking.airportNotes ? (
                      <div className="mb-2 rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-3 text-cyan-100/70">
                        Airport notes: {booking.airportNotes}
                      </div>
                    ) : null}

                    {booking.notes ? <div>{booking.notes}</div> : null}
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
  selectedPickupPosition,
  selectedDropoffPosition,
  driverPickupRoute,
  pickupDropoffRoute,
  driverPickupEtaMinutes,
  driverPickupDistanceMiles,
  pickupDropoffEtaMinutes,
  pickupDropoffDistanceMiles,
  driverIconFactory,
  bookingIconFactory,
  now,
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
  selectedPickupPosition: LatLngTuple | null;
  selectedDropoffPosition: LatLngTuple | null;
  driverPickupRoute: LatLngTuple[];
  pickupDropoffRoute: LatLngTuple[];
  driverPickupEtaMinutes: number | null;
  driverPickupDistanceMiles: number | null;
  pickupDropoffEtaMinutes: number | null;
  pickupDropoffDistanceMiles: number | null;
  driverIconFactory: ((driver: Driver) => DivIcon) | null;
  bookingIconFactory: ((color: string, label: string) => DivIcon) | null;
  now: number;
  onClose: () => void;
  onTimeline: () => void;
  onAutoDispatch: (bookingId: string) => void;
  onAssignDriver: (bookingId: string, driverId: string) => void;
  onUpdateStatus: (bookingId: string, status: string) => void;
  onCancelBooking: (bookingId: string) => void;
}) {
  const hasAssignedDriver = Boolean(booking.driver || booking.driverId);
  const availableDrivers = hasAssignedDriver
    ? []
    : drivers.filter(isDriverDispatchReady);
  const isFinalStatus = isCompleted(booking.status);
  const status = (booking.status || '').toUpperCase();
  const canDispatch =
    !hasAssignedDriver &&
    ['BOOKED', 'NO_DRIVER', 'OFFERED'].includes(status);
  const [trackingCopied, setTrackingCopied] = useState(false);
  const [customerMessageCopied, setCustomerMessageCopied] = useState(false);

  const trackingPath = `/track/${encodeURIComponent(booking.reference)}`;
  const trackingUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${trackingPath}`
      : trackingPath;

  const customerMessage = [
    `Hello ${booking.customerName || 'there'},`,
    '',
    `Your taxi booking ${booking.reference} is confirmed.`,
    '',
    `Pickup: ${getPickupLabel(booking)}`,
    `Dropoff: ${getDropoffLabel(booking)}`,
    `Pickup time: ${formatDateTime(getPickupTimeLabel(booking))}`,
    booking.quotedPrice != null ? `Fare: ${formatPrice(booking.quotedPrice)}` : '',
    '',
    `You can track your booking live here:`,
    trackingUrl,
  ]
    .filter((line) => line !== '')
    .join('\n');

  const customerPhoneForWhatsApp = (booking.customerPhone || '')
    .replace(/[^0-9+]/g, '')
    .replace(/^0/, '44')
    .replace(/^\+/, '');

  const whatsappUrl = customerPhoneForWhatsApp
    ? `https://wa.me/${customerPhoneForWhatsApp}?text=${encodeURIComponent(
        customerMessage,
      )}`
    : `https://wa.me/?text=${encodeURIComponent(customerMessage)}`;

  async function copyTextToClipboard(
    text: string,
    fallbackTitle: string,
    onCopied: (value: boolean) => void,
  ) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (typeof window !== 'undefined') {
        window.prompt(fallbackTitle, text);
      }

      onCopied(true);

      window.setTimeout(() => {
        onCopied(false);
      }, 2500);
    } catch (error) {
      console.error(`Failed to copy ${fallbackTitle}:`, error);

      if (typeof window !== 'undefined') {
        window.prompt(fallbackTitle, text);
      }
    }
  }

  async function copyTrackingLink() {
    await copyTextToClipboard(
      trackingUrl,
      'Copy tracking link',
      setTrackingCopied,
    );
  }

  async function copyCustomerMessage() {
    await copyTextToClipboard(
      customerMessage,
      'Copy customer message',
      setCustomerMessageCopied,
    );
  }

  const drawerMapPoints = [
    selectedDriverPosition,
    selectedPickupPosition,
    selectedDropoffPosition,
    ...driverPickupRoute,
    ...pickupDropoffRoute,
  ].filter(Boolean) as LatLngTuple[];

  const drawerMapCenter =
    selectedPickupPosition ||
    selectedDriverPosition ||
    selectedDropoffPosition ||
    ([51.5074, -0.1278] as LatLngTuple);

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

                <OfferCountdown booking={booking} now={now} />
              </div>

              <AirportBadges booking={booking} />
            </div>

            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-lg font-bold text-white">Journey</h3>

            <div className="mt-4 space-y-4">
              <Detail label="Pickup" value={getPickupLabel(booking)} />
              <Detail label="Dropoff" value={getDropoffLabel(booking)} />
              <Detail
                label="Pickup Time"
                value={formatDateTime(getPickupTimeLabel(booking))}
              />
              <Detail label="Customer" value={booking.customerName || '—'} />
              <Detail label="Phone" value={booking.customerPhone || '—'} />
              <Detail label="Fare" value={formatPrice(booking.quotedPrice)} />
              <Detail
                label="Driver"
                value={`${getDriverName(booking.driver)}${
                  selectedDriverPosition
                    ? ` • GPS ${selectedDriverPosition[0].toFixed(
                        5,
                      )}, ${selectedDriverPosition[1].toFixed(5)}`
                    : ''
                }`}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Customer Tracking & Message</h3>
                <p className="mt-1 text-sm text-emerald-100/65">
                  Share the live tracking link or send a ready-made customer message by SMS or WhatsApp.
                </p>
              </div>

              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
                Live Tracking
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-[#07111f] p-4 text-xs text-white/65 break-all">
              {trackingUrl}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
                Customer Message Preview
              </div>
              <pre className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-white/75">
                {customerMessage}
              </pre>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => void copyTrackingLink()}
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200 transition hover:bg-emerald-500/20"
              >
                {trackingCopied ? 'Tracking Link Copied' : 'Copy Tracking Link'}
              </button>

              <a
                href={trackingPath}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-center text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/20"
              >
                Open Tracking Page
              </a>

              <button
                type="button"
                onClick={() => void copyCustomerMessage()}
                className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200 transition hover:bg-amber-500/20"
              >
                {customerMessageCopied ? 'Message Copied' : 'Copy Customer Message'}
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-center text-sm font-bold text-green-200 transition hover:bg-green-500/20"
              >
                Open WhatsApp
              </a>
            </div>

            {trackingCopied || customerMessageCopied ? (
              <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200">
                {customerMessageCopied
                  ? 'Customer message copied. You can now paste it into SMS, WhatsApp or email.'
                  : 'Tracking link copied. You can now paste it into SMS, WhatsApp or email.'}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.06] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">Live Route Map</h3>
                <p className="mt-1 text-xs text-cyan-100/60">
                  Driver position, pickup, dropoff and route preview for this booking.
                </p>
              </div>

              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/60">
                {drawerMapPoints.length > 0 ? 'MAP READY' : 'NO GPS'}
              </span>
            </div>

            {drawerMapPoints.length > 0 ? (
              <div className="h-[300px] overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                <MapContainer
                  center={drawerMapCenter}
                  zoom={13}
                  scrollWheelZoom={false}
                  className="h-full w-full"
                  key={`${booking.id}-${selectedDriverPosition?.join(',') || 'no-driver'}-${selectedPickupPosition?.join(',') || 'no-pickup'}-${selectedDropoffPosition?.join(',') || 'no-dropoff'}-${driverPickupRoute.length}-${pickupDropoffRoute.length}`}
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {driverIconFactory && booking.driver && selectedDriverPosition ? (
                    <Marker
                      position={selectedDriverPosition}
                      icon={driverIconFactory(booking.driver)}
                    >
                      <Popup>
                        <div className="min-w-[180px] text-black">
                          <div className="font-bold">
                            Driver: {getDriverName(booking.driver)}
                          </div>
                          <div className="mt-1 text-sm">
                            {(booking.driver.status || 'UNKNOWN').replace(/_/g, ' ')}
                          </div>
                          <div className="mt-2 text-xs text-gray-600">
                            GPS: {formatGpsAge(booking.driver.lastLocationAt, now)}
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
                          <div className="mt-1 text-sm">{getPickupLabel(booking)}</div>
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
                          <div className="mt-1 text-sm">{getDropoffLabel(booking)}</div>
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
                        opacity: 0.9,
                      }}
                    />
                  ) : selectedDriverPosition && selectedPickupPosition ? (
                    <Polyline
                      positions={[selectedDriverPosition, selectedPickupPosition]}
                      pathOptions={{
                        color: '#22c55e',
                        weight: 4,
                        opacity: 0.5,
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
                        opacity: 0.9,
                      }}
                    />
                  ) : selectedPickupPosition && selectedDropoffPosition ? (
                    <Polyline
                      positions={[selectedPickupPosition, selectedDropoffPosition]}
                      pathOptions={{
                        color: '#8b5cf6',
                        weight: 4,
                        opacity: 0.5,
                        dashArray: '8 8',
                      }}
                    />
                  ) : null}
                </MapContainer>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                Map unavailable until this booking has pickup/dropoff coordinates or assigned driver GPS.
              </div>
            )}

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <MiniMapStat
                label="Driver GPS"
                value={selectedDriverPosition ? 'Live' : 'Missing'}
                tone={selectedDriverPosition ? 'green' : 'amber'}
              />
              <MiniMapStat
                label="Pickup ETA"
                value={
                  driverPickupEtaMinutes != null
                    ? `${driverPickupEtaMinutes} mins`
                    : selectedPickupPosition
                      ? 'Calculating'
                      : 'Missing'
                }
                tone={driverPickupEtaMinutes != null ? 'green' : 'amber'}
              />
              <MiniMapStat
                label="Trip Route"
                value={
                  pickupDropoffDistanceMiles != null
                    ? `${pickupDropoffDistanceMiles.toFixed(1)} mi`
                    : selectedDropoffPosition
                      ? 'Calculating'
                      : 'Missing'
                }
                tone={pickupDropoffDistanceMiles != null ? 'green' : 'amber'}
              />
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-[#07111f] p-4 text-xs text-white/55">
              Route refreshes automatically when driver GPS changes.
              {driverPickupDistanceMiles != null ? (
                <span className="text-cyan-200">
                  {' '}Driver to pickup: {driverPickupDistanceMiles.toFixed(2)} mi
                  {driverPickupEtaMinutes != null
                    ? ` / ${driverPickupEtaMinutes} mins`
                    : ''}
                  .
                </span>
              ) : null}
              {pickupDropoffEtaMinutes != null ? (
                <span className="text-purple-200">
                  {' '}Pickup to dropoff: {pickupDropoffEtaMinutes} mins.
                </span>
              ) : null}
            </div>
          </section>

          {isAirportBookingFromData(booking) ? (
            <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.06] p-5">
              <h3 className="text-lg font-bold text-white">Airport Details</h3>

              <div className="mt-4 space-y-4">
                <Detail
                  label="Airport"
                  value={
                    booking.airportName || booking.airportCode
                      ? `${booking.airportName || 'Airport'}${
                          booking.airportCode ? ` (${booking.airportCode})` : ''
                        }`
                      : '—'
                  }
                />
                <Detail
                  label="Terminal"
                  value={getAirportTerminalLabel(booking.airportTerminal) || '—'}
                />
                <Detail
                  label="Direction"
                  value={getAirportDirectionLabel(booking.flightDirection)}
                />
                <Detail label="Flight" value={booking.flightNumber || '—'} />
                <Detail label="Airline" value={booking.airline || '—'} />
                <Detail
                  label="Flight Time"
                  value={formatDateTime(booking.flightDateTime)}
                />
                <Detail
                  label="Meet & Greet"
                  value={booking.meetAndGreet ? 'Yes' : 'No'}
                />
                <Detail
                  label="Airport Notes"
                  value={booking.airportNotes || '—'}
                />
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-lg font-bold text-white">Actions</h3>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                disabled={!canDispatch || isFinalStatus}
                onClick={() => onAutoDispatch(booking.id)}
                className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-200 hover:bg-blue-500/20 disabled:opacity-50"
              >
                {autoDispatchingId === booking.id
                  ? 'Running...'
                  : 'Auto Dispatch'}
              </button>

              <button
                disabled={isFinalStatus}
                onClick={() => onCancelBooking(booking.id)}
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50"
              >
                Cancel Booking
              </button>

              {['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB'].includes(
                status,
              ) ? (
                <StatusButtons
                  booking={booking}
                  statusBusy={statusBusy}
                  onUpdateStatus={onUpdateStatus}
                />
              ) : null}

              <button
                onClick={onTimeline}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                View Timeline
              </button>
            </div>
          </section>

          {!hasAssignedDriver && !isFinalStatus ? (
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-bold text-white">Assign Driver</h3>

              <div className="mt-4 space-y-3">
                {availableDrivers.length === 0 ? (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                    No available drivers.
                  </div>
                ) : (
                  availableDrivers.map((driver) => {
                    const key = `${booking.id}:${driver.id}`;

                    return (
                      <button
                        key={driver.id}
                        disabled={assigningKey === key || isFinalStatus}
                        onClick={() => onAssignDriver(booking.id, driver.id)}
                        className="block w-full rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-left text-sm text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                      >
                        <div className="font-bold">{getDriverName(driver)}</div>
                        <div className="mt-1 text-xs text-emerald-100/70">
                          {(driver.status || 'UNKNOWN').replace(/_/g, ' ')} •{' '}
                          {getVehicleLabel(driver.vehicle ?? null)} • GPS{' '}
                          {formatGpsAge(driver.lastLocationAt, now)}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          ) : null}

          {(booking.notes || booking.airportNotes) ? (
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-bold text-white">Notes</h3>

              {booking.airportNotes ? (
                <p className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
                  {booking.airportNotes}
                </p>
              ) : null}

              {booking.notes ? (
                <p className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-[#0b1728] p-4 text-sm text-white/80">
                  {booking.notes}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}


function MiniMapStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'green' | 'amber';
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        tone === 'green'
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
          : 'border-amber-500/20 bg-amber-500/10 text-amber-200'
      }`}
    >
      <div className="text-[11px] font-black uppercase tracking-[0.18em] opacity-70">
        {label}
      </div>
      <div className="mt-1 text-sm font-black">{value}</div>
    </div>
  );
}

function StatusButtons({
  booking,
  statusBusy,
  onUpdateStatus,
}: {
  booking: Booking;
  statusBusy: string | null;
  onUpdateStatus: (bookingId: string, status: string) => void;
}) {
  const status = (booking.status || '').toUpperCase();

  const next =
    status === 'ACCEPTED'
      ? 'EN_ROUTE'
      : status === 'EN_ROUTE'
        ? 'ARRIVED'
        : status === 'ARRIVED'
          ? 'ON_JOB'
          : status === 'ON_JOB'
            ? 'COMPLETED'
            : null;

  if (!next) return null;

  return (
    <button
      disabled={statusBusy === next}
      onClick={() => onUpdateStatus(booking.id, next)}
      className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
    >
      {statusBusy === next ? 'Updating...' : `Mark ${next.replace(/_/g, ' ')}`}
    </button>
  );
}


function extractTimelineName(value: string, label: string) {
  return value
    .replace(new RegExp(`^${label}\\s*[·-]\\s*`, 'i'), '')
    .replace(/\s*\[[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]/gi, '')
    .replace(/\s*[·-]\s*score\s+\d+[\s\S]*$/i, '')
    .replace(/\s*[·-]\s*\d+(?:\.\d+)?\s*miles\s+away[\s\S]*$/i, '')
    .replace(/\s*\|\s*[+-]\d+\s+[A-Z0-9_<=]+[\s\S]*$/i, '')
    .replace(/\s*[·-]\s*[+-]\d+\s+[A-Z0-9_<=]+[\s\S]*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTimelineText(raw?: string | null) {
  const original = (raw || '').trim();

  if (!original) return 'Timeline event';

  const withoutIds = original
    .replace(/\s*\[[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const upper = withoutIds.toUpperCase();

  if (upper.startsWith('AUTO DISPATCH OFFERED')) {
    const driver = extractTimelineName(original, 'AUTO DISPATCH OFFERED');
    return driver
      ? `Auto dispatch offered to ${driver}`
      : 'Auto dispatch offered to nearest available driver';
  }

  if (upper.startsWith('OFFER ACCEPTED')) {
    const driver = extractTimelineName(original, 'OFFER ACCEPTED');
    return driver ? `${driver} accepted the booking` : 'Driver accepted the booking';
  }

  if (upper.startsWith('OFFER REJECTED')) {
    const driver = extractTimelineName(original, 'OFFER REJECTED');
    return driver ? `${driver} rejected the booking` : 'Driver rejected the booking';
  }

  if (upper.startsWith('OFFER EXPIRED')) {
    const driver = extractTimelineName(original, 'OFFER EXPIRED');
    return driver ? `${driver} did not respond in time` : 'Driver did not respond in time';
  }

  if (upper.startsWith('OFFER CANCELLED')) {
    return 'Offer cancelled by dispatcher';
  }

  if (upper.startsWith('AUTO DISPATCH FAILED')) {
    const reason = withoutIds.replace(/^AUTO DISPATCH FAILED\s*[·-]\s*/i, '').trim();
    return reason || 'Auto dispatch could not find an available driver';
  }

  if (upper.startsWith('DRIVER UPDATE')) {
    if (upper.includes('EN_ROUTE')) return 'Driver is en route to pickup';
    if (upper.includes('ARRIVED')) return 'Driver has arrived at pickup';
    if (upper.includes('ON_JOB')) return 'Passenger is on board';
    if (upper.includes('COMPLETED')) return 'Journey completed';
    return 'Driver updated the booking';
  }

  if (upper.startsWith('PRICING CAPTURED')) {
    const priceMatch = withoutIds.match(/£\s*\d+(?:\.\d{1,2})?/);
    return priceMatch ? `Price captured: ${priceMatch[0].replace(/\s/g, '')}` : 'Price captured';
  }

  if (upper.startsWith('PASSENGER CAPTURED')) {
    return withoutIds
      .replace(/^PASSENGER CAPTURED\s*[·-]\s*/i, 'Passenger captured: ')
      .trim();
  }

  if (upper.startsWith('CUSTOMER CAPTURED')) {
    return withoutIds
      .replace(/^CUSTOMER CAPTURED\s*[·-]\s*/i, 'Customer captured: ')
      .trim();
  }

  if (upper.startsWith('BOOKING CREATED')) {
    return withoutIds
      .replace(/^BOOKING CREATED\s*[·-]\s*/i, 'Booking created: ')
      .replace(/\s*[·-]\s*\d{1,2}\/\d{1,2}\/\d{4},?\s*\d{1,2}:\d{2}(?::\d{2})?$/i, '')
      .trim();
  }

  return withoutIds
    .replace(/\s*[·-]\s*score\s+\d+[\s\S]*$/i, '')
    .replace(/\s*\|\s*[+-]\d+\s+[A-Z0-9_<=]+[\s\S]*$/i, '')
    .replace(/_/g, ' ')
    .trim();
}

function getTimelineTitle(raw?: string | null) {
  const message = (raw || '').toUpperCase();

  if (message.startsWith('BOOKING CREATED')) return 'Booking created';
  if (message.startsWith('CUSTOMER CAPTURED')) return 'Customer captured';
  if (message.startsWith('PASSENGER CAPTURED')) return 'Passenger captured';
  if (message.startsWith('PRICING CAPTURED')) return 'Pricing captured';
  if (message.startsWith('AUTO DISPATCH OFFERED')) return 'Auto dispatch offered';
  if (message.startsWith('AUTO DISPATCH FAILED')) return 'Auto dispatch failed';
  if (message.startsWith('OFFER ACCEPTED')) return 'Offer accepted';
  if (message.startsWith('OFFER REJECTED')) return 'Offer rejected';
  if (message.startsWith('OFFER EXPIRED')) return 'Offer expired';
  if (message.startsWith('OFFER CANCELLED')) return 'Offer cancelled';
  if (message.startsWith('DRIVER UPDATE')) return 'Driver update';

  return 'Timeline update';
}

function getTimelineTone(raw?: string | null) {
  const message = (raw || '').toUpperCase();

  if (message.includes('FAILED') || message.includes('REJECTED') || message.includes('EXPIRED')) {
    return 'border-red-500/20 bg-red-500/10 text-red-200';
  }

  if (message.includes('ACCEPTED') || message.includes('COMPLETED')) {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200';
  }

  if (message.includes('AUTO DISPATCH') || message.includes('OFFER')) {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-200';
  }

  if (message.includes('DRIVER')) {
    return 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200';
  }

  return 'border-white/10 bg-white/5 text-white';
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
    <div className="fixed inset-0 z-[950] bg-black/70 p-4">
      <div className="mx-auto max-h-[90vh] max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#07101d] p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-white/35">
              Timeline
            </div>
            <h2 className="mt-2 text-2xl font-black">{booking.reference}</h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {timeline.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/55">
              No timeline events.
            </div>
          ) : (
            timeline.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className={`mb-3 inline-flex rounded-full border px-3 py-1 text-xs font-black ${getTimelineTone(event.message || event.note)}`}>
                  {getTimelineTitle(event.message || event.note)}
                </div>

                <div className="text-sm font-semibold text-white">
                  {cleanTimelineText(event.message || event.note)}
                </div>

                <div className="mt-2 text-xs text-white/40">
                  {formatDateTime(event.createdAt)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-white/5 pb-3 last:border-b-0">
      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function Card({
  label,
  value,
  hint,
  urgent,
}: {
  label: string;
  value: number;
  hint: string;
  urgent?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 ${
        urgent
          ? 'border-amber-400/40 bg-amber-500/10'
          : 'border-white/10 bg-[#0b1220]'
      }`}
    >
      <div className="text-xs uppercase tracking-[0.2em] text-white/35">
        {label}
      </div>
      <div className="mt-3 text-3xl font-black text-white">{value}</div>
      <div className="mt-1 text-xs text-white/45">{hint}</div>
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
    <label className="block">
      <div className="mb-2 text-sm font-medium text-white/70">{label}</div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50"
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
    <label className="block">
      <div className="mb-2 text-sm font-medium text-white/70">{label}</div>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50"
      />
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
    <label className="block">
      <div className="mb-2 text-sm font-medium text-white/70">{label}</div>
      <input
        type="datetime-local"
        value={value}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50"
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
    <label className="block">
      <div className="mb-2 text-sm font-medium text-white/70">{label}</div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500/50"
      >
        {options.map((option) => (
          <option key={`${option.label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-white/70">{label}</div>
      <div className="rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-sm text-white/60">
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
    <label className="block">
      <div className="mb-2 text-sm font-medium text-white/70">{label}</div>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`rounded-full border px-4 py-2 text-xs font-black ${
        checked
          ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
          : 'border-white/10 bg-white/5 text-white/50'
      }`}
    >
      {label}: {checked ? 'YES' : 'NO'}
    </button>
  );
}