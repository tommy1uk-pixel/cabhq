import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

type DriverAppJwtPayload = {
  sub: string;
  driverId?: string;
  companyId: string;
  role: string;
  type: string;
  username?: string | null;
  iat?: number;
  exp?: number;
};

type DriverAppRequest = Request & {
  user?: DriverAppJwtPayload & {
    driverId: string;
  };
  headers: {
    authorization?: string;
  };
};

@Injectable()
export class DriverAppAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<DriverAppRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    try {
      const payload = await this.jwtService.verifyAsync<DriverAppJwtPayload>(
        token,
        {
          secret: process.env.JWT_SECRET || 'change-me',
        },
      );

      const isDriverToken =
        payload.role === 'DRIVER' &&
        (payload.type === 'DRIVER' || payload.type === 'driver_app');

      if (!isDriverToken) {
        throw new UnauthorizedException('Invalid driver app token');
      }

      const driverId = payload.driverId || payload.sub;

      if (!driverId) {
        throw new UnauthorizedException('Driver ID missing from token');
      }

      request.user = {
        ...payload,
        driverId,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}