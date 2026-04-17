import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

type DriverAppJwtPayload = {
  sub: string;
  driverId: string;
  companyId: string;
  role: string;
  type: string;
  iat?: number;
  exp?: number;
};

type DriverAppRequest = Request & {
  user?: DriverAppJwtPayload;
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

      if (payload.role !== 'DRIVER' || payload.type !== 'driver_app') {
        throw new UnauthorizedException('Invalid driver app token');
      }

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}