import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { PricingService } from './pricing.service';

type AuthRequest = {
  user: {
    sub: string;
    email: string;
    role: string;
    companyId: string;
  };
};

@Controller('pricing')
@UseGuards(JwtAuthGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('routes')
  async getRoutes(@Req() req: AuthRequest) {
    return this.pricingService.getRoutes(req.user.companyId);
  }

  @Post('routes')
  async createRoute(
    @Req() req: AuthRequest,
    @Body()
    body: {
      fromLabel: string;
      toLabel: string;
      fixedPrice: number;
    },
  ) {
    return this.pricingService.createRoute({
      companyId: req.user.companyId,
      fromLabel: body.fromLabel,
      toLabel: body.toLabel,
      fixedPrice: Number(body.fixedPrice),
    });
  }

  @Post('routes/seed-airports')
  async seedAirports(@Req() req: AuthRequest) {
    return this.pricingService.seedAirportRoutes(req.user.companyId);
  }

  @Post('quote')
  async quote(
    @Req() req: AuthRequest,
    @Body()
    body: {
      pickup: string;
      dropoff: string;
      pickupLat?: number | null;
      pickupLng?: number | null;
      dropoffLat?: number | null;
      dropoffLng?: number | null;
      pickupTime: string;
      passengerCount?: number;
      isPreBooked?: boolean;
    },
  ) {
    return this.pricingService.quote({
      companyId: req.user.companyId,
      pickup: body.pickup,
      dropoff: body.dropoff,
      pickupLat: body.pickupLat ?? null,
      pickupLng: body.pickupLng ?? null,
      dropoffLat: body.dropoffLat ?? null,
      dropoffLng: body.dropoffLng ?? null,
      pickupTime: body.pickupTime,
      passengerCount: body.passengerCount ?? 1,
      isPreBooked: body.isPreBooked ?? true,
    });
  }
}