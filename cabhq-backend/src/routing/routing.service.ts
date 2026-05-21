import { Injectable, Logger } from '@nestjs/common';

export type RoutePoint = {
  latitude: number;
  longitude: number;
};

export type RouteResult = {
  distanceMiles: number | null;
  durationMinutes: number | null;
  routeCoordinates: RoutePoint[];
};

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);

  async getRoute(input: {
    pickupLat: number | null;
    pickupLng: number | null;
    dropoffLat: number | null;
    dropoffLng: number | null;
  }): Promise<RouteResult> {
  const token =
    process.env.MAPBOX_ACCESS_TOKEN ||
    process.env.MAPBOX_TOKEN ||
    process.env.MAPBOX_API_KEY;

    if (!token) {
      return this.emptyRoute();
    }

    const { pickupLat, pickupLng, dropoffLat, dropoffLng } = input;

    if (
      pickupLat == null ||
      pickupLng == null ||
      dropoffLat == null ||
      dropoffLng == null
    ) {
      return this.emptyRoute();
    }

    try {
      const url =
        `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
        `${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}` +
        `?geometries=geojson&overview=full&access_token=${token}`;

      const response = await fetch(url);

      if (!response.ok) {
        this.logger.warn(`Mapbox route failed: ${response.status}`);
        return this.emptyRoute();
      }

      const data = await response.json();
      const route = data?.routes?.[0];

      if (!route) return this.emptyRoute();

      const routeCoordinates =
        route.geometry?.coordinates?.map((point: [number, number]) => ({
          latitude: Number(point[1]),
          longitude: Number(point[0]),
        })) ?? [];

      return {
        distanceMiles:
          route.distance != null ? Number((route.distance / 1609.344).toFixed(2)) : null,
        durationMinutes:
          route.duration != null ? Math.max(1, Math.round(route.duration / 60)) : null,
        routeCoordinates,
      };
    } catch (error) {
      this.logger.warn(`Mapbox routing error: ${String(error)}`);
      return this.emptyRoute();
    }
  }

  private emptyRoute(): RouteResult {
    return {
      distanceMiles: null,
      durationMinutes: null,
      routeCoordinates: [],
    };
  }
}