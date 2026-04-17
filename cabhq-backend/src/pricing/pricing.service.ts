import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CreateRouteInput = {
  companyId: string;
  fromLabel: string;
  toLabel: string;
  fixedPrice: number;
};

type QuoteInput = {
  companyId: string;
  pickup: string;
  dropoff: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  pickupTime: string | Date;
  passengerCount?: number;
  isPreBooked?: boolean;
};

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoutes(companyId: string) {
    return this.prisma.routePrice.findMany({
      where: {
        companyId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createRoute(input: CreateRouteInput) {
    return this.prisma.routePrice.create({
      data: {
        companyId: input.companyId,
        fromLabel: input.fromLabel.trim(),
        toLabel: input.toLabel.trim(),
        fixedPrice: Number(input.fixedPrice),
      },
    });
  }

  async seedAirportRoutes(companyId: string) {
    const routes = [
      { fromLabel: 'Blandford Forum', toLabel: 'Heathrow Airport', fixedPrice: 170 },
      { fromLabel: 'Blandford Forum', toLabel: 'Gatwick Airport', fixedPrice: 220 },
      { fromLabel: 'Blandford Forum', toLabel: 'Bournemouth Airport', fixedPrice: 50 },
      { fromLabel: 'Blandford Forum', toLabel: 'Southampton Airport', fixedPrice: 100 },
      { fromLabel: 'Blandford Forum', toLabel: 'Bristol Airport', fixedPrice: 150 },
      { fromLabel: 'Blandford Forum', toLabel: 'Exeter Airport', fixedPrice: 140 },
      { fromLabel: 'Blandford Forum', toLabel: 'Luton Airport', fixedPrice: 230 },
      { fromLabel: 'Blandford Forum', toLabel: 'Stansted Airport', fixedPrice: 260 },
      { fromLabel: 'Blandford Forum', toLabel: 'Birmingham Airport', fixedPrice: 230 },
      { fromLabel: 'Blandford Forum', toLabel: 'Manchester Airport', fixedPrice: 320 },
    ];

    const existing = await this.prisma.routePrice.findMany({
      where: {
        companyId,
      },
      select: {
        fromLabel: true,
        toLabel: true,
      },
    });

    const existingSet = new Set(
      existing.map((route) => `${route.fromLabel.toLowerCase()}__${route.toLabel.toLowerCase()}`),
    );

    const toCreate = routes.filter(
      (route) =>
        !existingSet.has(`${route.fromLabel.toLowerCase()}__${route.toLabel.toLowerCase()}`),
    );

    if (toCreate.length > 0) {
      await this.prisma.routePrice.createMany({
        data: toCreate.map((route) => ({
          companyId,
          fromLabel: route.fromLabel,
          toLabel: route.toLabel,
          fixedPrice: route.fixedPrice,
        })),
      });
    }

    return this.getRoutes(companyId);
  }

  async quote(input: QuoteInput) {
    const routes = await this.prisma.routePrice.findMany({
      where: {
        companyId: input.companyId,
      },
    });

    const pickupNorm = this.normaliseLabel(input.pickup);
    const dropoffNorm = this.normaliseLabel(input.dropoff);

    const matchedRoute =
      routes.find(
        (route) =>
          this.normaliseLabel(route.fromLabel) === pickupNorm &&
          this.normaliseLabel(route.toLabel) === dropoffNorm,
      ) ||
      routes.find(
        (route) =>
          pickupNorm.includes(this.normaliseLabel(route.fromLabel)) &&
          dropoffNorm.includes(this.normaliseLabel(route.toLabel)),
      ) ||
      null;

    const distanceMiles =
      input.pickupLat != null &&
      input.pickupLng != null &&
      input.dropoffLat != null &&
      input.dropoffLng != null
        ? this.haversineMiles(
            input.pickupLat,
            input.pickupLng,
            input.dropoffLat,
            input.dropoffLng,
          )
        : 0;

    const durationMinutes =
      distanceMiles > 0 ? Math.max(10, Math.round(distanceMiles * 2.2)) : 0;

    if (matchedRoute) {
      return {
        pricingMode: 'FIXED' as const,
        tariffName: null,
        quotedPrice: matchedRoute.fixedPrice,
        calculatedFare: matchedRoute.fixedPrice,
        distanceMiles: Number(distanceMiles.toFixed(2)),
        durationMinutes,
        matchedRoute: {
          id: matchedRoute.id,
          fromLabel: matchedRoute.fromLabel,
          toLabel: matchedRoute.toLabel,
          fixedPrice: matchedRoute.fixedPrice,
        },
      };
    }

    const hour = new Date(input.pickupTime).getHours();
    const tariffName =
      hour >= 0 && hour < 6
        ? 'TARIFF_3'
        : hour >= 18
          ? 'TARIFF_2'
          : 'TARIFF_1';

    const baseFare =
      tariffName === 'TARIFF_3'
        ? 4.8
        : tariffName === 'TARIFF_2'
          ? 4.2
          : 3.8;

    const perMile =
      tariffName === 'TARIFF_3'
        ? 3.4
        : tariffName === 'TARIFF_2'
          ? 3.0
          : 2.6;

    const minimumFare = 8;
    const calculatedFare =
      distanceMiles > 0
        ? Math.max(minimumFare, Number((baseFare + distanceMiles * perMile).toFixed(2)))
        : minimumFare;

    return {
      pricingMode: 'TARIFF' as const,
      tariffName,
      quotedPrice: calculatedFare,
      calculatedFare,
      distanceMiles: Number(distanceMiles.toFixed(2)),
      durationMinutes,
      matchedRoute: null,
    };
  }

  private normaliseLabel(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
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
}