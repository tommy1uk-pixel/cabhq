import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

type DriverLocationPayload = {
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  lastLocationAt?: string | null;
  bookingId?: string | null;
  etaMinutes?: number | null;
  distanceMiles?: number | null;
};

type TrackingUpdatedPayload = {
  bookingId: string;
  reference?: string | null;
  status?: string | null;
  driverId?: string | null;
  etaMinutes?: number | null;
  driverDistanceMiles?: number | null;
  etaConfidence?: string | null;
  driverGpsAgeSeconds?: number | null;
  trackingUrl?: string | null;
};

type AirportTrackingPayload = {
  bookingId: string;
  reference?: string | null;
  airportCode?: string | null;
  airportName?: string | null;
  airportTerminal?: string | null;
  flightNumber?: string | null;
  flightDirection?: string | null;
  flightDateTime?: string | null;
  airline?: string | null;
  meetAndGreet?: boolean | null;
};

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  private emit(companyId: string, event: string, payload: unknown = {}) {
    this.gateway.emitToCompany(companyId, event, {
      type: event,
      ...((payload as object) || {}),
      ts: new Date().toISOString(),
    });
  }

  private emitBookingEvent(companyId: string, event: string, booking: unknown) {
    this.emit(companyId, event, {
      booking,
    });

    this.trackingUpdatedFromBooking(companyId, booking);
  }

  private getValue(source: unknown, key: string) {
    if (!source || typeof source !== 'object') return undefined;

    return (source as Record<string, unknown>)[key];
  }

  private trackingUpdatedFromBooking(companyId: string, booking: unknown) {
    if (!booking || typeof booking !== 'object') return;

    const id = this.getValue(booking, 'id');
    const reference = this.getValue(booking, 'reference');

    if (!id || typeof id !== 'string') return;

    const driver = this.getValue(booking, 'driver') as
      | Record<string, unknown>
      | null
      | undefined;

    this.trackingUpdated(companyId, {
      bookingId: id,
      reference: typeof reference === 'string' ? reference : null,
      status:
        typeof this.getValue(booking, 'status') === 'string'
          ? (this.getValue(booking, 'status') as string)
          : null,
      driverId:
        typeof this.getValue(booking, 'driverId') === 'string'
          ? (this.getValue(booking, 'driverId') as string)
          : driver && typeof driver.id === 'string'
            ? driver.id
            : null,
      etaMinutes:
        typeof this.getValue(booking, 'etaMinutes') === 'number'
          ? (this.getValue(booking, 'etaMinutes') as number)
          : null,
      driverDistanceMiles:
        typeof this.getValue(booking, 'driverDistanceMiles') === 'number'
          ? (this.getValue(booking, 'driverDistanceMiles') as number)
          : null,
      etaConfidence:
        typeof this.getValue(booking, 'etaConfidence') === 'string'
          ? (this.getValue(booking, 'etaConfidence') as string)
          : null,
      driverGpsAgeSeconds:
        typeof this.getValue(booking, 'driverGpsAgeSeconds') === 'number'
          ? (this.getValue(booking, 'driverGpsAgeSeconds') as number)
          : null,
      trackingUrl:
        typeof this.getValue(booking, 'trackingUrl') === 'string'
          ? (this.getValue(booking, 'trackingUrl') as string)
          : null,
    });

    const isAirport =
      Boolean(this.getValue(booking, 'isAirportBooking')) ||
      Boolean(this.getValue(booking, 'airportCode')) ||
      Boolean(this.getValue(booking, 'airportName')) ||
      Boolean(this.getValue(booking, 'flightNumber'));

    if (isAirport) {
      this.airportTrackingUpdated(companyId, {
        bookingId: id,
        reference: typeof reference === 'string' ? reference : null,
        airportCode:
          typeof this.getValue(booking, 'airportCode') === 'string'
            ? (this.getValue(booking, 'airportCode') as string)
            : null,
        airportName:
          typeof this.getValue(booking, 'airportName') === 'string'
            ? (this.getValue(booking, 'airportName') as string)
            : null,
        airportTerminal:
          typeof this.getValue(booking, 'airportTerminal') === 'string'
            ? (this.getValue(booking, 'airportTerminal') as string)
            : null,
        flightNumber:
          typeof this.getValue(booking, 'flightNumber') === 'string'
            ? (this.getValue(booking, 'flightNumber') as string)
            : null,
        flightDirection:
          typeof this.getValue(booking, 'flightDirection') === 'string'
            ? (this.getValue(booking, 'flightDirection') as string)
            : null,
        flightDateTime:
          this.getValue(booking, 'flightDateTime') instanceof Date
            ? (this.getValue(booking, 'flightDateTime') as Date).toISOString()
            : typeof this.getValue(booking, 'flightDateTime') === 'string'
              ? (this.getValue(booking, 'flightDateTime') as string)
              : null,
        airline:
          typeof this.getValue(booking, 'airline') === 'string'
            ? (this.getValue(booking, 'airline') as string)
            : null,
        meetAndGreet:
          typeof this.getValue(booking, 'meetAndGreet') === 'boolean'
            ? (this.getValue(booking, 'meetAndGreet') as boolean)
            : null,
      });
    }
  }

  bookingCreated(companyId: string, booking: unknown) {
    this.emitBookingEvent(companyId, 'booking:created', booking);
  }

  bookingUpdated(companyId: string, booking: unknown) {
    this.emitBookingEvent(companyId, 'booking:updated', booking);
  }

  bookingAssigned(companyId: string, booking: unknown) {
    this.emitBookingEvent(companyId, 'booking:assigned', booking);
  }

  bookingStatusChanged(companyId: string, booking: unknown) {
    this.emitBookingEvent(companyId, 'booking:status_changed', booking);
  }

  bookingOfferCreated(companyId: string, booking: unknown) {
    this.emitBookingEvent(companyId, 'booking:offer_created', booking);
  }

  bookingOfferAccepted(companyId: string, booking: unknown) {
    this.emitBookingEvent(companyId, 'booking:offer_accepted', booking);
  }

  bookingOfferRejected(companyId: string, booking: unknown) {
    this.emitBookingEvent(companyId, 'booking:offer_rejected', booking);
  }

  bookingOfferExpired(companyId: string, booking: unknown) {
    this.emitBookingEvent(companyId, 'booking:offer_expired', booking);
  }

  bookingOfferSkipped(
    companyId: string,
    payload: {
      bookingId: string;
      driverId: string;
      driverName: string;
      reasons: string[];
    },
  ) {
    this.emit(companyId, 'booking:offer_skipped', payload);
  }

  bookingNoDriver(
    companyId: string,
    payload: {
      bookingId: string;
      reason: string;
    },
  ) {
    this.emit(companyId, 'booking:no_driver', payload);
    this.trackingUpdated(companyId, {
      bookingId: payload.bookingId,
      status: 'NO_DRIVER',
    });
  }

  autoDispatchStarted(
    companyId: string,
    payload: {
      bookingId: string;
    },
  ) {
    this.emit(companyId, 'autodispatch:started', payload);
    this.dispatchIntelligence(companyId, {
      bookingId: payload.bookingId,
      state: 'STARTED',
      message: 'Auto dispatch started',
    });
  }

  autoDispatchCompleted(
    companyId: string,
    payload: {
      bookingId: string;
      driverId: string;
    },
  ) {
    this.emit(companyId, 'autodispatch:completed', payload);
    this.dispatchIntelligence(companyId, {
      bookingId: payload.bookingId,
      driverId: payload.driverId,
      state: 'COMPLETED',
      message: 'Auto dispatch completed',
    });
  }

  autoDispatchFailed(
    companyId: string,
    payload: {
      bookingId: string;
      reason: string;
    },
  ) {
    this.emit(companyId, 'autodispatch:failed', payload);
    this.dispatchIntelligence(companyId, {
      bookingId: payload.bookingId,
      state: 'FAILED',
      message: payload.reason,
    });
  }

  driverUpdated(companyId: string, driver: unknown) {
    this.emit(companyId, 'driver:updated', {
      driver,
    });

    this.driverMapUpdated(companyId, driver);
  }

  driverLocation(companyId: string, payload: DriverLocationPayload) {
    this.emit(companyId, 'driver:location', payload);

    this.emit(companyId, 'driver:location:saved', {
      ...payload,
      gpsLive: true,
    });

    this.driverMapUpdated(companyId, {
      id: payload.driverId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      heading: payload.heading ?? null,
      speed: payload.speed ?? null,
      lastLocationAt: payload.lastLocationAt ?? new Date().toISOString(),
    });

    if (payload.bookingId || payload.etaMinutes != null || payload.distanceMiles != null) {
      this.trackingUpdated(companyId, {
        bookingId: payload.bookingId ?? '',
        driverId: payload.driverId,
        etaMinutes: payload.etaMinutes ?? null,
        driverDistanceMiles: payload.distanceMiles ?? null,
        etaConfidence: 'LIVE_GPS',
      });
    }
  }

  driverMapUpdated(companyId: string, driver: unknown) {
    this.emit(companyId, 'driver:map_updated', {
      driver,
    });
  }

  trackingUpdated(companyId: string, payload: Partial<TrackingUpdatedPayload>) {
    if (!payload.bookingId) return;

    this.emit(companyId, 'tracking:updated', payload);
  }

  airportTrackingUpdated(companyId: string, payload: AirportTrackingPayload) {
    this.emit(companyId, 'tracking:airport_updated', payload);
  }

  customerTrackingViewed(
    companyId: string,
    payload: {
      bookingId: string;
      reference?: string | null;
    },
  ) {
    this.emit(companyId, 'tracking:customer_viewed', payload);
  }

  dispatchIntelligence(
    companyId: string,
    payload: {
      bookingId?: string;
      driverId?: string;
      state: string;
      message?: string;
      score?: number;
      confidence?: string;
    },
  ) {
    this.emit(companyId, 'dispatch:intelligence', payload);
  }

  dispatchBoardRefresh(companyId: string) {
    this.emit(companyId, 'dispatch:refresh', {});
  }
}
