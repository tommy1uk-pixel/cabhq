import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

type SocketUser = {
  sub: string;
  email?: string;
  role?: string;
  companyId?: string;
  driverId?: string;
  type?: string;
};

type DriverLocationBody = {
  driverId?: string;
  bookingId?: string;
  reference?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  heading?: number | null;
  speed?: number | null;
  etaMinutes?: number | null;
  distanceMiles?: number | null;
};

type TrackingRoomBody = {
  bookingId?: string;
  reference?: string;
};

type CompanyJoinBody = {
  companyId?: string;
};

type TrackingLookupResult = {
  bookingId: string;
  reference: string;
  companyId: string;
};

@Injectable()
@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: true,
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 20000,
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit() {
    this.logger.log('Realtime gateway initialised');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        this.extractBearer(client.handshake.headers.authorization);

      if (!token) {
        client.data.publicTracking = true;

        client.emit('system:connected', {
          ok: true,
          publicTracking: true,
          socketId: client.id,
          trackingEnabled: true,
          airportTrackingEnabled: true,
          ts: new Date().toISOString(),
        });

        this.logger.log(`Public tracking socket connected ${client.id}`);
        return;
      }

      const payload = this.jwtService.verify<SocketUser>(token);

      client.data.user = payload;
      client.data.publicTracking = false;

      const userId = payload.sub ?? null;
      const companyId = payload.companyId ?? null;
      const driverId = payload.driverId ?? null;

      if (userId) {
        await client.join(`user:${userId}`);
      }

      if (driverId) {
        await client.join(`driver:${driverId}`);
      }

      if (companyId) {
        await client.join(`company:${companyId}`);
      }

      client.emit('system:connected', {
        ok: true,
        userId,
        driverId,
        companyId,
        socketId: client.id,
        trackingEnabled: true,
        airportTrackingEnabled: true,
        ts: new Date().toISOString(),
      });

      this.logger.log(
        `Socket connected ${client.id} company=${
          companyId ?? 'none'
        } user=${userId ?? 'none'} driver=${driverId ?? 'none'}`,
      );
    } catch (error) {
      this.logger.warn(
        `Socket auth failed ${client.id} ${
          error instanceof Error ? error.message : ''
        }`,
      );

      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.user?.sub ?? 'public';
    const companyId = client.data?.user?.companyId ?? 'none';
    const driverId = client.data?.user?.driverId ?? 'none';

    this.logger.log(
      `Socket disconnected ${client.id} company=${companyId} user=${userId} driver=${driverId}`,
    );
  }

  @SubscribeMessage('company:join')
  async handleCompanyJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: CompanyJoinBody,
  ) {
    try {
      const socketCompanyId = client.data?.user?.companyId;

      if (!socketCompanyId) {
        client.emit('system:error', {
          message: 'No company assigned to socket',
        });

        return {
          ok: false,
          message: 'No company assigned to socket',
        };
      }

      if (body?.companyId !== socketCompanyId) {
        client.emit('system:error', {
          message: 'Unauthorised company room join',
        });

        return {
          ok: false,
          message: 'Unauthorised company room join',
        };
      }

      await client.join(`company:${socketCompanyId}`);

      client.emit('company:joined', {
        ok: true,
        companyId: socketCompanyId,
        ts: new Date().toISOString(),
      });

      this.logger.log(
        `Socket ${client.id} joined company room ${socketCompanyId}`,
      );

      return {
        ok: true,
        companyId: socketCompanyId,
      };
    } catch {
      client.emit('system:error', {
        message: 'Failed to join company room',
      });

      return {
        ok: false,
        message: 'Failed to join company room',
      };
    }
  }

  @SubscribeMessage('tracking:join')
  async handleTrackingJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: TrackingRoomBody,
  ) {
    const tracking = await this.resolveTrackingRoom(body);

    if (!tracking) {
      client.emit('tracking:error', {
        message: 'Tracking booking not found',
        ts: new Date().toISOString(),
      });

      return {
        ok: false,
        message: 'Tracking booking not found',
      };
    }

    if (!this.canJoinTracking(client, tracking.companyId)) {
      client.emit('tracking:error', {
        message: 'Unauthorised tracking room join',
        ts: new Date().toISOString(),
      });

      return {
        ok: false,
        message: 'Unauthorised tracking room join',
      };
    }

    await client.join(`tracking:${tracking.bookingId}`);
    await client.join(`tracking-ref:${tracking.reference}`);

    client.emit('tracking:joined', {
      ok: true,
      bookingId: tracking.bookingId,
      reference: tracking.reference,
      ts: new Date().toISOString(),
    });

    this.server.to(`company:${tracking.companyId}`).emit(
      'tracking:customer_viewed',
      {
        bookingId: tracking.bookingId,
        reference: tracking.reference,
        socketId: client.id,
        ts: new Date().toISOString(),
      },
    );

    return {
      ok: true,
      bookingId: tracking.bookingId,
      reference: tracking.reference,
    };
  }

  @SubscribeMessage('tracking:leave')
  async handleTrackingLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: TrackingRoomBody,
  ) {
    const tracking = await this.resolveTrackingRoom(body);

    if (!tracking) {
      return {
        ok: false,
        message: 'Tracking booking not found',
      };
    }

    await client.leave(`tracking:${tracking.bookingId}`);
    await client.leave(`tracking-ref:${tracking.reference}`);

    client.emit('tracking:left', {
      ok: true,
      bookingId: tracking.bookingId,
      reference: tracking.reference,
      ts: new Date().toISOString(),
    });

    return {
      ok: true,
      bookingId: tracking.bookingId,
      reference: tracking.reference,
    };
  }

  @SubscribeMessage('tracking:viewed')
  async handleTrackingViewed(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: TrackingRoomBody,
  ) {
    const tracking = await this.resolveTrackingRoom(body);

    if (!tracking) {
      return {
        ok: false,
        message: 'Tracking booking not found',
      };
    }

    if (!this.canJoinTracking(client, tracking.companyId)) {
      return {
        ok: false,
        message: 'Unauthorised tracking viewed event',
      };
    }

    this.server.to(`company:${tracking.companyId}`).emit(
      'tracking:customer_viewed',
      {
        bookingId: tracking.bookingId,
        reference: tracking.reference,
        socketId: client.id,
        ts: new Date().toISOString(),
      },
    );

    return {
      ok: true,
      bookingId: tracking.bookingId,
      reference: tracking.reference,
    };
  }

  @SubscribeMessage('driver:location')
  async handleDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: DriverLocationBody,
  ) {
    return this.updateDriverLocation(client, body, 'driver:location');
  }

  @SubscribeMessage('driver:location:update')
  async handleDriverLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: DriverLocationBody,
  ) {
    return this.updateDriverLocation(client, body, 'driver:location:update');
  }

  @SubscribeMessage('driver:update-location')
  async handleDriverUpdateLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: DriverLocationBody,
  ) {
    return this.updateDriverLocation(client, body, 'driver:update-location');
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', {
      ts: new Date().toISOString(),
      alive: true,
      socketId: client.id,
    });
  }

  emitToCompany(companyId: string, event: string, payload: unknown) {
    this.server.to(`company:${companyId}`).emit(event, payload);
  }

  emitToBookingTracking(bookingId: string, event: string, payload: unknown) {
    this.server.to(`tracking:${bookingId}`).emit(event, payload);
  }

  emitToBookingReference(reference: string, event: string, payload: unknown) {
    this.server.to(`tracking-ref:${reference}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  emitToDriver(driverId: string, event: string, payload: unknown) {
    this.server.to(`driver:${driverId}`).emit(event, payload);
  }

  emitToSocket(socketId: string, event: string, payload: unknown) {
    this.server.to(socketId).emit(event, payload);
  }

  private async updateDriverLocation(
    client: Socket,
    body: DriverLocationBody,
    sourceEvent: string,
  ) {
    try {
      const socketUser = client.data?.user as SocketUser | undefined;
      const companyId = socketUser?.companyId ?? null;

      if (!companyId) {
        client.emit('system:error', {
          message: 'No company assigned to socket',
        });

        return {
          ok: false,
          message: 'No company assigned to socket',
        };
      }

      const driverId =
        body?.driverId?.trim() ||
        socketUser?.driverId ||
        socketUser?.sub ||
        null;

      if (!driverId) {
        client.emit('system:error', {
          message: 'No driver id supplied for location update',
        });

        return {
          ok: false,
          message: 'No driver id supplied for location update',
        };
      }

      const latitude = this.toValidCoordinate(body.latitude ?? body.lat, -90, 90);
      const longitude = this.toValidCoordinate(
        body.longitude ?? body.lng,
        -180,
        180,
      );

      if (latitude === null || longitude === null) {
        client.emit('system:error', {
          message: 'Invalid driver location coordinates',
        });

        return {
          ok: false,
          message: 'Invalid driver location coordinates',
        };
      }

      const driver = await this.prisma.driver.findFirst({
        where: {
          id: driverId,
          companyId,
        },
        include: {
          vehicle: true,
        },
      });

      if (!driver) {
        client.emit('system:error', {
          message: 'Driver not found for location update',
        });

        return {
          ok: false,
          message: 'Driver not found for location update',
        };
      }

      const updatedDriver = await this.prisma.driver.update({
        where: {
          id: driver.id,
        },
        data: {
          latitude,
          longitude,
          heading: this.toNullableNumber(body.heading),
          speed: this.toNullableNumber(body.speed),
          lastLocationAt: new Date(),
        },
        include: {
          vehicle: true,
        },
      });

      const booking = await this.resolveDriverLocationBooking({
        companyId,
        driverId: driver.id,
        bookingId: body.bookingId ?? null,
        reference: body.reference ?? null,
      });

      const trackingDistanceMiles =
        booking && booking.pickupLat != null && booking.pickupLng != null
          ? Number(
              this.haversineMiles(
                latitude,
                longitude,
                Number(booking.pickupLat),
                Number(booking.pickupLng),
              ).toFixed(2),
            )
          : body.distanceMiles ?? null;

      const trackingEtaMinutes =
        body.etaMinutes ?? this.calculateEtaMinutes(trackingDistanceMiles);

      const lastLocationAt = updatedDriver.lastLocationAt?.toISOString();

      const driverPayload = {
        id: updatedDriver.id,
        companyId: updatedDriver.companyId,
        name: updatedDriver.name,
        phone: updatedDriver.phone ?? null,
        status: updatedDriver.status,
        latitude: updatedDriver.latitude ?? null,
        longitude: updatedDriver.longitude ?? null,
        heading: updatedDriver.heading ?? null,
        speed: updatedDriver.speed ?? null,
        lastLocationAt: updatedDriver.lastLocationAt ?? null,
        etaMinutes: trackingEtaMinutes,
        distanceMiles: trackingDistanceMiles,
        driverDistanceMiles: trackingDistanceMiles,
        bookingId: booking?.id ?? body.bookingId ?? null,
        reference: booking?.reference ?? body.reference ?? null,
        vehicle: updatedDriver.vehicle
          ? {
              id: updatedDriver.vehicle.id,
              reg: updatedDriver.vehicle.reg ?? null,
              plateNumber: updatedDriver.vehicle.plateNumber ?? null,
              make: updatedDriver.vehicle.make ?? null,
              model: updatedDriver.vehicle.model ?? null,
              colour: updatedDriver.vehicle.colour ?? null,
            }
          : null,
      };

      this.server.to(`company:${companyId}`).emit('driver:location', {
        driverId: updatedDriver.id,
        latitude,
        longitude,
        heading: updatedDriver.heading ?? null,
        speed: updatedDriver.speed ?? null,
        lastLocationAt,
        etaMinutes: trackingEtaMinutes,
        distanceMiles: trackingDistanceMiles,
        driverDistanceMiles: trackingDistanceMiles,
        bookingId: booking?.id ?? body.bookingId ?? null,
        reference: booking?.reference ?? body.reference ?? null,
      });

      this.server.to(`company:${companyId}`).emit('driver:updated', {
        driver: driverPayload,
      });

      this.server.to(`company:${companyId}`).emit('driver:map_updated', {
        driver: driverPayload,
      });

      if (booking) {
        const trackingPayload = {
          bookingId: booking.id,
          reference: booking.reference,
          driverId: updatedDriver.id,
          latitude,
          longitude,
          heading: updatedDriver.heading ?? null,
          speed: updatedDriver.speed ?? null,
          etaMinutes: trackingEtaMinutes,
          distanceMiles: trackingDistanceMiles,
          driverDistanceMiles: trackingDistanceMiles,
          etaConfidence: 'LIVE_GPS',
          driverGpsAgeSeconds: 0,
          lastLocationAt,
          ts: new Date().toISOString(),
        };

        this.server
          .to(`tracking:${booking.id}`)
          .emit('tracking:updated', trackingPayload);

        this.server
          .to(`tracking-ref:${booking.reference}`)
          .emit('tracking:updated', trackingPayload);

        this.server.to(`company:${companyId}`).emit(
          'tracking:updated',
          trackingPayload,
        );
      }

      this.server.to(`driver:${driver.id}`).emit('driver:location:saved', {
        ok: true,
        sourceEvent,
        driverId: driver.id,
        bookingId: booking?.id ?? null,
        reference: booking?.reference ?? null,
        latitude,
        longitude,
        etaMinutes: trackingEtaMinutes,
        distanceMiles: trackingDistanceMiles,
        ts: new Date().toISOString(),
      });

      client.emit('driver:location:saved', {
        ok: true,
        sourceEvent,
        driverId: driver.id,
        bookingId: booking?.id ?? null,
        reference: booking?.reference ?? null,
        latitude,
        longitude,
        etaMinutes: trackingEtaMinutes,
        distanceMiles: trackingDistanceMiles,
        ts: new Date().toISOString(),
      });

      this.logger.log(
        `Driver location updated driver=${driver.id} company=${companyId} lat=${latitude} lng=${longitude}`,
      );

      return {
        ok: true,
        driverId: driver.id,
        bookingId: booking?.id ?? null,
        reference: booking?.reference ?? null,
        latitude,
        longitude,
        etaMinutes: trackingEtaMinutes,
        distanceMiles: trackingDistanceMiles,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update driver location';

      this.logger.warn(`Driver location update failed: ${message}`);

      client.emit('system:error', {
        message: 'Failed to update driver location',
      });

      return {
        ok: false,
        message: 'Failed to update driver location',
      };
    }
  }

  private async resolveTrackingRoom(
    body: TrackingRoomBody,
  ): Promise<TrackingLookupResult | null> {
    const bookingId = body.bookingId?.trim() || null;
    const reference = body.reference?.trim() || null;

    if (!bookingId && !reference) return null;

    const booking = await this.prisma.booking.findFirst({
      where: bookingId
        ? {
            id: bookingId,
          }
        : {
            reference: reference as string,
          },
      select: {
        id: true,
        reference: true,
        companyId: true,
      },
    });

    if (!booking) return null;

    return {
      bookingId: booking.id,
      reference: booking.reference,
      companyId: booking.companyId,
    };
  }

  private async resolveDriverLocationBooking(input: {
    companyId: string;
    driverId: string;
    bookingId?: string | null;
    reference?: string | null;
  }) {
    if (input.bookingId || input.reference) {
      const booking = await this.prisma.booking.findFirst({
        where: {
          companyId: input.companyId,
          ...(input.bookingId
            ? { id: input.bookingId }
            : { reference: input.reference as string }),
        },
        select: {
          id: true,
          reference: true,
          pickupLat: true,
          pickupLng: true,
        },
      });

      if (booking) return booking;
    }

    return this.prisma.booking.findFirst({
      where: {
        companyId: input.companyId,
        driverId: input.driverId,
        status: {
          in: ['OFFERED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB'],
        },
      },
      orderBy: {
        pickupTime: 'asc',
      },
      select: {
        id: true,
        reference: true,
        pickupLat: true,
        pickupLng: true,
      },
    });
  }

  private canJoinTracking(client: Socket, companyId: string) {
    if (client.data?.publicTracking) return true;

    const socketCompanyId = client.data?.user?.companyId;

    return socketCompanyId === companyId;
  }

  private calculateEtaMinutes(distanceMiles: number | null) {
    if (distanceMiles == null) return null;

    if (distanceMiles <= 0.15) return 1;
    if (distanceMiles <= 0.5) return 2;
    if (distanceMiles <= 1) return 3;
    if (distanceMiles <= 2) return 5;
    if (distanceMiles <= 3) return 7;
    if (distanceMiles <= 5) return 11;
    if (distanceMiles <= 8) return 16;
    if (distanceMiles <= 12) return 23;

    return Math.max(25, Math.round(distanceMiles * 2.2));
  }

  private haversineMiles(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusMiles = 3958.8;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusMiles * c;
  }

  private toValidCoordinate(
    value: number | string | null | undefined,
    min: number,
    max: number,
  ) {
    const numberValue =
      typeof value === 'string'
        ? Number(value)
        : typeof value === 'number'
          ? value
          : NaN;

    if (!Number.isFinite(numberValue)) return null;
    if (numberValue < min || numberValue > max) return null;

    return numberValue;
  }

  private toNullableNumber(value: number | string | null | undefined) {
    if (value === null || value === undefined || value === '') return null;

    const numberValue = typeof value === 'string' ? Number(value) : value;

    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private extractBearer(authorization?: string | string[]) {
    if (!authorization || Array.isArray(authorization)) {
      return null;
    }

    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}
