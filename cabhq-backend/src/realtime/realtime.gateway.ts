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

type SocketUser = {
  sub: string;
  email?: string;
  role?: string;
  companyId?: string;
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

  constructor(private readonly jwtService: JwtService) {}

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

      if (userId) {
        await client.join(`user:${userId}`);
      }

      if (companyId) {
        await client.join(`company:${companyId}`);
      }

      client.emit('system:connected', {
        ok: true,
        userId,
        companyId,
        socketId: client.id,
        ts: new Date().toISOString(),
      });

      this.logger.log(
        `Socket connected ${client.id} company=${companyId ?? 'none'} user=${userId ?? 'none'}`,
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

    this.logger.log(
      `Socket disconnected ${client.id} company=${companyId} user=${userId}`,
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
    } catch (error) {
      client.emit('system:error', {
        message: 'Failed to join company room',
      });
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', {
      ts: new Date().toISOString(),
    });
  }

  emitToCompany(companyId: string, event: string, payload: unknown) {
    this.server.to(`company:${companyId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  emitToSocket(socketId: string, event: string, payload: unknown) {
    this.server.to(socketId).emit(event, payload);
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