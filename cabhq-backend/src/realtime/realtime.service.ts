import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  bookingCreated(companyId: string, booking: unknown) {
    this.gateway.emitToCompany(companyId, 'booking:created', {
      type: 'booking:created',
      booking,
      ts: new Date().toISOString(),
    });
  }

  bookingUpdated(companyId: string, booking: unknown) {
    this.gateway.emitToCompany(companyId, 'booking:updated', {
      type: 'booking:updated',
      booking,
      ts: new Date().toISOString(),
    });
  }

  bookingAssigned(companyId: string, booking: unknown) {
    this.gateway.emitToCompany(companyId, 'booking:assigned', {
      type: 'booking:assigned',
      booking,
      ts: new Date().toISOString(),
    });
  }

  bookingStatusChanged(companyId: string, booking: unknown) {
    this.gateway.emitToCompany(companyId, 'booking:status_changed', {
      type: 'booking:status_changed',
      booking,
      ts: new Date().toISOString(),
    });
  }

  bookingOfferCreated(companyId: string, booking: unknown) {
    this.gateway.emitToCompany(companyId, 'booking:offer_created', {
      type: 'booking:offer_created',
      booking,
      ts: new Date().toISOString(),
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
    this.gateway.emitToCompany(companyId, 'booking:offer_skipped', {
      type: 'booking:offer_skipped',
      ...payload,
      ts: new Date().toISOString(),
    });
  }

  bookingNoDriver(
    companyId: string,
    payload: {
      bookingId: string;
      reason: string;
    },
  ) {
    this.gateway.emitToCompany(companyId, 'booking:no_driver', {
      type: 'booking:no_driver',
      ...payload,
      ts: new Date().toISOString(),
    });
  }

  driverUpdated(companyId: string, driver: unknown) {
    this.gateway.emitToCompany(companyId, 'driver:updated', {
      type: 'driver:updated',
      driver,
      ts: new Date().toISOString(),
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
    this.gateway.emitToCompany(companyId, 'driver:location', {
      type: 'driver:location',
      ...payload,
      ts: new Date().toISOString(),
    });
  }
}