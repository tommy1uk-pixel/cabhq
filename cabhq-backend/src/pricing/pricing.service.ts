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

type TariffName = 'TARIFF_1' | 'TARIFF_2' | 'TARIFF_3';

type RouteMetrics = {
  distanceMiles: number;
  durationMinutes: number;
  source: 'MAPBOX' | 'HAVERSINE' | 'NONE';
};

type MapboxDirectionsResponse = {
  routes?: Array<{
    distance?: number;
    duration?: number;
  }>;
};

type DorsetTariffRates = {
  initialCharge: number;
  firstMile: number;
  additionalMile: number;
};

const DEFAULT_AIRPORT_ROUTES = [
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

const DORSET_TARIFF_RATES: Record<TariffName, DorsetTariffRates> = {
  TARIFF_1: {
    initialCharge: 3.0,
    firstMile: 4.8,
    additionalMile: 3.0,
  },
  TARIFF_2: {
    initialCharge: 4.5,
    firstMile: 7.2,
    additionalMile: 4.5,
  },
  TARIFF_3: {
    initialCharge: 6.0,
    firstMile: 9.6,
    additionalMile: 6.0,
  },
};

const PRE_BOOKING_FEE = 0.9;

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoutes(companyId: string) {
    await this.ensureDefaultAirportRoutes(companyId);

    return this.prisma.routePrice.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
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
    await this.ensureDefaultAirportRoutes(companyId);
    return this.getRoutes(companyId);
  }

  async quote(input: QuoteInput) {
    await this.ensureDefaultAirportRoutes(input.companyId);

    const routes = await this.prisma.routePrice.findMany({
      where: { companyId: input.companyId },
    });

    const pickupNorm = this.normaliseLabel(input.pickup);
    const dropoffNorm = this.normaliseLabel(input.dropoff);

    const matchedRoute =
      routes.find((route) =>
        this.routeMatches(route.fromLabel, route.toLabel, pickupNorm, dropoffNorm),
      ) ||
      routes.find((route) =>
        this.routeMatches(route.fromLabel, route.toLabel, dropoffNorm, pickupNorm),
      ) ||
      null;

    const routeMetrics = await this.getRouteMetrics(input);

    if (matchedRoute) {
      return {
        pricingMode: 'FIXED' as const,
        tariffName: null,
        quotedPrice: matchedRoute.fixedPrice,
        calculatedFare: matchedRoute.fixedPrice,
        distanceMiles: Number(routeMetrics.distanceMiles.toFixed(2)),
        durationMinutes: routeMetrics.durationMinutes,
        routeSource: routeMetrics.source,
        bookingFee: 0,
        matchedRoute: {
          id: matchedRoute.id,
          fromLabel: matchedRoute.fromLabel,
          toLabel: matchedRoute.toLabel,
          fixedPrice: matchedRoute.fixedPrice,
        },
      };
    }

    const pickupDate = new Date(input.pickupTime);
    const tariffName = this.getDorsetTariffName(pickupDate);
    const tariffRates = DORSET_TARIFF_RATES[tariffName];

    const bookingFee = input.isPreBooked ? PRE_BOOKING_FEE : 0;

    const calculatedFare =
      routeMetrics.distanceMiles > 0
        ? this.calculateDorsetFare(routeMetrics.distanceMiles, tariffRates) +
          bookingFee
        : tariffRates.initialCharge + bookingFee;

    const roundedFare = Number(calculatedFare.toFixed(2));

    return {
      pricingMode: 'TARIFF' as const,
      tariffName,
      quotedPrice: roundedFare,
      calculatedFare: roundedFare,
      distanceMiles: Number(routeMetrics.distanceMiles.toFixed(2)),
      durationMinutes: routeMetrics.durationMinutes,
      routeSource: routeMetrics.source,
      bookingFee,
      matchedRoute: null,
    };
  }

  private async getRouteMetrics(input: QuoteInput): Promise<RouteMetrics> {
    const hasCoords =
      input.pickupLat != null &&
      input.pickupLng != null &&
      input.dropoffLat != null &&
      input.dropoffLng != null;

    if (!hasCoords) {
      return {
        distanceMiles: 0,
        durationMinutes: 0,
        source: 'NONE',
      };
    }

    const mapboxMetrics = await this.getMapboxRouteMetrics(
      input.pickupLat as number,
      input.pickupLng as number,
      input.dropoffLat as number,
      input.dropoffLng as number,
    );

    if (mapboxMetrics) {
      return mapboxMetrics;
    }

    const distanceMiles = this.haversineMiles(
      input.pickupLat as number,
      input.pickupLng as number,
      input.dropoffLat as number,
      input.dropoffLng as number,
    );

    return {
      distanceMiles,
      durationMinutes:
        distanceMiles > 0 ? Math.max(10, Math.round(distanceMiles * 2.2)) : 0,
      source: 'HAVERSINE',
    };
  }

  private async getMapboxRouteMetrics(
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number,
  ): Promise<RouteMetrics | null> {
    const token = process.env.MAPBOX_ACCESS_TOKEN;

    if (!token) {
      return null;
    }

    try {
      const coordinates =
        `${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}`;

      const url =
        `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
        `${coordinates}` +
        `?access_token=${encodeURIComponent(token)}` +
        `&geometries=geojson` +
        `&overview=false` +
        `&alternatives=false`;

      const response = await fetch(url);

      if (!response.ok) {
        const text = await response.text();
        console.warn(
          `Mapbox Directions failed: ${response.status} ${response.statusText} - ${text}`,
        );
        return null;
      }

      const data = (await response.json()) as MapboxDirectionsResponse;
      const route = data.routes?.[0];

      if (!route?.distance || !route?.duration) {
        return null;
      }

      return {
        distanceMiles: route.distance / 1609.344,
        durationMinutes: Math.max(1, Math.round(route.duration / 60)),
        source: 'MAPBOX',
      };
    } catch (error) {
      console.warn('Mapbox Directions request failed:', error);
      return null;
    }
  }

  private getDorsetTariffName(date: Date): TariffName {
    const hour = date.getHours();
    const month = date.getMonth(); // January = 0
    const day = date.getDate();
    const dayOfWeek = date.getDay(); // Sunday = 0

    const isChristmasDay = month === 11 && day === 25;
    const isBoxingDay = month === 11 && day === 26;
    const isNewYearsDay = month === 0 && day === 1;
    const isChristmasEveEvening = month === 11 && day === 24 && hour >= 18;
    const isNewYearsEveEvening = month === 11 && day === 31 && hour >= 18;

    if (
      isChristmasDay ||
      isBoxingDay ||
      isNewYearsDay ||
      isChristmasEveEvening ||
      isNewYearsEveEvening
    ) {
      return 'TARIFF_3';
    }

    const isSunday = dayOfWeek === 0;
    const isNight = hour >= 22 || hour < 7;

    if (isSunday || isNight || this.isEnglandBankHoliday(date)) {
      return 'TARIFF_2';
    }

    return 'TARIFF_1';
  }

  private calculateDorsetFare(miles: number, rates: DorsetTariffRates) {
    if (miles <= 0) {
      return rates.initialCharge;
    }

    if (miles <= 1) {
      return rates.firstMile;
    }

    return Number(
      (rates.firstMile + (miles - 1) * rates.additionalMile).toFixed(2),
    );
  }

  private isEnglandBankHoliday(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    const fixedBankHolidays = [
      { month: 0, day: 1 }, // New Year's Day
      { month: 4, day: 1 }, // Temporary placeholder only if matched by actual first Monday below
      { month: 11, day: 25 },
      { month: 11, day: 26 },
    ];

    if (
      fixedBankHolidays.some(
        (holiday) => holiday.month === month && holiday.day === day,
      )
    ) {
      return true;
    }

    const easterSunday = this.getEasterSunday(year);
    const goodFriday = this.addDays(easterSunday, -2);
    const easterMonday = this.addDays(easterSunday, 1);

    if (this.sameDate(date, goodFriday) || this.sameDate(date, easterMonday)) {
      return true;
    }

    const firstMondayInMay = this.nthWeekdayOfMonth(year, 4, 1, 1);
    const lastMondayInMay = this.lastWeekdayOfMonth(year, 4, 1);
    const lastMondayInAugust = this.lastWeekdayOfMonth(year, 7, 1);

    if (
      this.sameDate(date, firstMondayInMay) ||
      this.sameDate(date, lastMondayInMay) ||
      this.sameDate(date, lastMondayInAugust)
    ) {
      return true;
    }

    return false;
  }

  private getEasterSunday(year: number) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    return new Date(year, month, day);
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private sameDate(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  private nthWeekdayOfMonth(
    year: number,
    month: number,
    weekday: number,
    n: number,
  ) {
    const date = new Date(year, month, 1);
    let count = 0;

    while (date.getMonth() === month) {
      if (date.getDay() === weekday) {
        count += 1;

        if (count === n) {
          return new Date(date);
        }
      }

      date.setDate(date.getDate() + 1);
    }

    return new Date(year, month, 1);
  }

  private lastWeekdayOfMonth(year: number, month: number, weekday: number) {
    const date = new Date(year, month + 1, 0);

    while (date.getDay() !== weekday) {
      date.setDate(date.getDate() - 1);
    }

    return date;
  }

  private async ensureDefaultAirportRoutes(companyId: string) {
    const existing = await this.prisma.routePrice.findMany({
      where: { companyId },
      select: {
        fromLabel: true,
        toLabel: true,
      },
    });

    const existingSet = new Set(
      existing.map(
        (route) =>
          `${this.normaliseLabel(route.fromLabel)}__${this.normaliseLabel(
            route.toLabel,
          )}`,
      ),
    );

    const toCreate = DEFAULT_AIRPORT_ROUTES.filter(
      (route) =>
        !existingSet.has(
          `${this.normaliseLabel(route.fromLabel)}__${this.normaliseLabel(
            route.toLabel,
          )}`,
        ),
    );

    if (toCreate.length === 0) return;

    await this.prisma.routePrice.createMany({
      data: toCreate.map((route) => ({
        companyId,
        fromLabel: route.fromLabel,
        toLabel: route.toLabel,
        fixedPrice: route.fixedPrice,
      })),
    });
  }

  private routeMatches(
    routeFrom: string,
    routeTo: string,
    pickupNorm: string,
    dropoffNorm: string,
  ) {
    const fromNorm = this.normaliseLabel(routeFrom);
    const toNorm = this.normaliseLabel(routeTo);

    return (
      this.locationMatches(fromNorm, pickupNorm) &&
      this.locationMatches(toNorm, dropoffNorm)
    );
  }

  private locationMatches(routeLabel: string, actualAddress: string) {
    if (!routeLabel || !actualAddress) return false;

    if (actualAddress.includes(routeLabel)) return true;
    if (routeLabel.includes(actualAddress)) return true;

    if (routeLabel === 'blandford forum') {
      return (
        actualAddress.includes('blandford') ||
        actualAddress.includes('dt11') ||
        actualAddress.includes('pimperne') ||
        actualAddress.includes('bryanston') ||
        actualAddress.includes('lady baden powell') ||
        actualAddress.includes('the oak')
      );
    }

    if (routeLabel.includes('heathrow')) return actualAddress.includes('heathrow');
    if (routeLabel.includes('gatwick')) return actualAddress.includes('gatwick');
    if (routeLabel.includes('bournemouth')) {
      return actualAddress.includes('bournemouth airport');
    }
    if (routeLabel.includes('southampton')) {
      return actualAddress.includes('southampton airport');
    }
    if (routeLabel.includes('bristol')) return actualAddress.includes('bristol');
    if (routeLabel.includes('exeter')) return actualAddress.includes('exeter');
    if (routeLabel.includes('luton')) return actualAddress.includes('luton');
    if (routeLabel.includes('stansted')) return actualAddress.includes('stansted');
    if (routeLabel.includes('birmingham')) {
      return actualAddress.includes('birmingham');
    }
    if (routeLabel.includes('manchester')) {
      return actualAddress.includes('manchester');
    }

    return false;
  }

  private normaliseLabel(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/,/g, ' ')
      .replace(/\s+/g, ' ');
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