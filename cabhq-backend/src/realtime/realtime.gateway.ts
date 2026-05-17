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
};

type DriverLocationBody = {
  driverId?: string;
  bookingId?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  heading?: number | null;
  speed?: number | null;
  etaMinutes?: number | null;
  distanceMiles?: number | null;
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
        this.logger.warn(`Socket rejected ${client.id} missing token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<SocketUser>(token);

      client.data.user = payload;

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
    const userId = client.data?.user?.sub ?? 'unknown';
    const companyId = client.data?.user?.companyId ?? 'unknown';
    const driverId = client.data?.user?.driverId ?? 'unknown';

    this.logger.log(
      `Socket disconnected ${client.id} company=${companyId} user=${userId} driver=${driverId}`,
    );
  }

  @SubscribeMessage('company:join')
  async handleCompanyJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { companyId?: string },
  ) {
    try {
      const socketCompanyId = client.data?.user?.companyId;

      if (!socketCompanyId) {
        client.emit('system:error', {
          message: 'No company assigned to socket',
        });

        return;
      }

      if (body?.companyId !== socketCompanyId) {
        client.emit('system:error', {
          message: 'Unauthorised company room join',
        });

        return;
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
    } catch {
      client.emit('system:error', {
        message: 'Failed to join company room',
      });
    }
  }

  @SubscribeMessage('tracking:join')
  async handleTrackingJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      bookingId?: string;
    },
  ) {
    if (!body?.bookingId) {
      return;
    }

    await client.join(`tracking:${body.bookingId}`);

    client.emit('tracking:joined', {
      bookingId: body.bookingId,
      ts: new Date().toISOString(),
    });
  }

  @SubscribeMessage('tracking:leave')
  async handleTrackingLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      bookingId?: string;
    },
  ) {
    if (!body?.bookingId) {
      return;
    }

    await client.leave(`tracking:${body.bookingId}`);

    client.emit('tracking:left', {
      bookingId: body.bookingId,
      ts: new Date().toISOString(),
    });
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

  @SubscribeMessage('tracking:viewed')
  async handleTrackingViewed(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      bookingId?: string;
    },
  ) {
    if (!body?.bookingId) {
      return;
    }

    const socketCompanyId = client.data?.user?.companyId;

    if (!socketCompanyId) {
      return;
    }

    this.server
      .to(`company:${socketCompanyId}`)
      .emit('tracking:customer_viewed', {
        bookingId: body.bookingId,
        ts: new Date().toISOString(),
      });
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', {
      ts: new Date().toISOString(),
      alive: true,
    });
  }

  emitToCompany(companyId: string, event: string, payload: unknown) {
    this.server.to(`company:${companyId}`).emit(event, payload);
  }

  emitToBookingTracking(
    bookingId: string,
    event: string,
    payload: unknown,
  ) {
    this.server.to(`tracking:${bookingId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
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

      const payload = {
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
        etaMinutes: body.etaMinutes ?? null,
        distanceMiles: body.distanceMiles ?? null,
        bookingId: body.bookingId ?? null,
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

      this.server.to(`company:${companyId}`).emit('driver:location', payload);

      this.server.to(`company:${companyId}`).emit('driver:updated', payload);

      this.server
        .to(`company:${companyId}`)
        .emit('driver:map_updated', payload);

      if (body.bookingId) {
        this.server.to(`tracking:${body.bookingId}`).emit(
          'tracking:updated',
          {
            bookingId: body.bookingId,
            driverId: updatedDriver.id,
            latitude,
            longitude,
            etaMinutes: body.etaMinutes ?? null,
            distanceMiles: body.distanceMiles ?? null,
            ts: new Date().toISOString(),
          },
        );
      }

      this.server.to(`driver:${driver.id}`).emit('driver:location:saved', {
        ok: true,
        sourceEvent,
        driverId: driver.id,
        latitude,
        longitude,
        ts: new Date().toISOString(),
      });

      client.emit('driver:location:saved', {
        ok: true,
        sourceEvent,
        driverId: driver.id,
        latitude,
        longitude,
        ts: new Date().toISOString(),
      });

      this.logger.log(
        `Driver location updated driver=${driver.id} company=${companyId} lat=${latitude} lng=${longitude}`,
      );

      return {
        ok: true,
        driverId: driver.id,
        latitude,
        longitude,
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