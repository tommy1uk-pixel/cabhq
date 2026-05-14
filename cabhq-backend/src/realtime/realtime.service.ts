import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  private emit(companyId: string, event: string, payload: unknown) {
    this.gateway.emitToCompany(companyId, event, {
      type: event,
      ...((payload as object) || {}),
      ts: new Date().toISOString(),
    });
  }

  bookingCreated(companyId: string, booking: unknown) {
    this.emit(companyId, 'booking:created', {
      booking,
    });
  }

  bookingUpdated(companyId: string, booking: unknown) {
    this.emit(companyId, 'booking:updated', {
      booking,
    });
  }

  bookingAssigned(companyId: string, booking: unknown) {
    this.emit(companyId, 'booking:assigned', {
      booking,
    });
  }

  bookingStatusChanged(companyId: string, booking: unknown) {
    this.emit(companyId, 'booking:status_changed', {
      booking,
    });
  }

  bookingOfferCreated(companyId: string, booking: unknown) {
    this.emit(companyId, 'booking:offer_created', {
      booking,
    });
  }

  bookingOfferAccepted(companyId: string, booking: unknown) {
    this.emit(companyId, 'booking:offer_accepted', {
      booking,
    });
  }

  bookingOfferRejected(companyId: string, booking: unknown) {
    this.emit(companyId, 'booking:offer_rejected', {
      booking,
    });
  }

  bookingOfferExpired(companyId: string, booking: unknown) {
    this.emit(companyId, 'booking:offer_expired', {
      booking,
    });
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
  }

  autoDispatchStarted(
    companyId: string,
    payload: {
      bookingId: string;
    },
  ) {
    this.emit(companyId, 'autodispatch:started', payload);
  }

  autoDispatchCompleted(
    companyId: string,
    payload: {
      bookingId: string;
      driverId: string;
    },
  ) {
    this.emit(companyId, 'autodispatch:completed', payload);
  }

  driverUpdated(companyId: string, driver: unknown) {
    this.emit(companyId, 'driver:updated', {
      driver,
    });
  }

  driverLocation(
    companyId: string,
    payload: {
      driverId: string;
      latitude: number;
      longitude: number;
      heading?: number | null;
      speed?: number | null;
      lastLocationAt?: string | null;
    },
  ) {
    this.emit(companyId, 'driver:location', payload);
  }

  dispatchBoardRefresh(companyId: string) {
    this.emit(companyId, 'dispatch:refresh', {});
  }
}