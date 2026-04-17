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
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<SocketUser>(token);

      client.data.user = payload;

      if (payload.sub) {
        await client.join(`user:${payload.sub}`);
      }

      if (payload.companyId) {
        await client.join(`company:${payload.companyId}`);
      }

      client.emit('system:connected', {
        ok: true,
        ts: new Date().toISOString(),
        companyId: payload.companyId ?? null,
        userId: payload.sub ?? null,
      });

      this.logger.log(
        `Socket connected ${client.id} company=${payload.companyId ?? 'none'} user=${payload.sub ?? 'none'}`,
      );
    } catch (error) {
      this.logger.warn(`Socket auth failed ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket disconnected ${client.id}`);
  }

  @SubscribeMessage('company:join')
  async handleCompanyJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { companyId?: string },
  ) {
    const socketCompanyId = client.data?.user?.companyId;

    if (!socketCompanyId || body?.companyId !== socketCompanyId) {
      client.emit('system:error', {
        message: 'Unauthorised company room join',
      });
      return;
    }

    await client.join(`company:${socketCompanyId}`);

    client.emit('company:joined', {
      companyId: socketCompanyId,
      ts: new Date().toISOString(),
    });
  }

  emitToCompany(companyId: string, event: string, payload: unknown) {
    this.server.to(`company:${companyId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
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