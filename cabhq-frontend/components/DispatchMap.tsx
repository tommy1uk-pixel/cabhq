'use client';

import 'mapbox-gl/dist/mapbox-gl.css';

import { useEffect, useMemo, useState } from 'react';
import Map, { Layer, Marker, Source } from 'react-map-gl/mapbox';

type Driver = {
  id: string;
  name: string;
  phone?: string | null;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  lastLocationAt?: string | null;
};

type Booking = {
  id: string;
  reference: string;
  pickup: string;
  dropoff: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  status: string;
  pickupTime: string;
  quotedPrice?: number | null;
  driver?: Driver | null;
  driverId?: string | null;
};

type DispatchMapProps = {
  bookings: Booking[];
  drivers: Driver[];
  selectedBooking?: Booking | null;
  onEtaUpdate?: (minutes: number | null) => void;
};

type GeoJsonFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'LineString';
      coordinates: number[][];
    };
    properties: Record<string, unknown>;
  }>;
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

const EMPTY_GEOJSON: GeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

const driverToPickupLayer = {
  id: 'driver-to-pickup-line',
  type: 'line' as const,
  paint: {
    'line-color': '#22c55e',
    'line-width': 4,
    'line-opacity': 0.9,
  },
};

const pickupToDropoffLayer = {
  id: 'pickup-to-dropoff-line',
  type: 'line' as const,
  paint: {
    'line-color': '#38bdf8',
    'line-width': 4,
    'line-opacity': 0.85,
  },
};

function getDriverMarkerColor(status: string) {
  if (status === 'BUSY') return '#f59e0b';
  if (status === 'OFF_DUTY') return '#6b7280';
  return '#10b981';
}

function getBookingMarkerColor(status: string) {
  if (status === 'BOOKED') return '#38bdf8';
  if (status === 'OFFERED') return '#f59e0b';
  if (status === 'ACCEPTED') return '#22c55e';
  if (status === 'EN_ROUTE') return '#8b5cf6';
  if (status === 'ARRIVED') return '#6366f1';
  if (status === 'ON_JOB') return '#d946ef';
  if (status === 'COMPLETED') return '#94a3b8';
  if (status === 'CANCELLED') return '#f43f5e';
  return '#38bdf8';
}

export default function DispatchMap({
  bookings,
  drivers,
  selectedBooking,
  onEtaUpdate,
}: DispatchMapProps) {
  const [driverToPickupGeoJson, setDriverToPickupGeoJson] =
    useState<GeoJsonFeatureCollection>(EMPTY_GEOJSON);
  const [pickupToDropoffGeoJson, setPickupToDropoffGeoJson] =
    useState<GeoJsonFeatureCollection>(EMPTY_GEOJSON);

  const initialViewState = useMemo(() => {
    const points: Array<{ lat: number; lng: number }> = [];

    bookings.forEach((booking) => {
      if (booking.pickupLat != null && booking.pickupLng != null) {
        points.push({ lat: booking.pickupLat, lng: booking.pickupLng });
      }
    });

    drivers.forEach((driver) => {
      if (driver.latitude != null && driver.longitude != null) {
        points.push({ lat: driver.latitude, lng: driver.longitude });
      }
    });

    if (points.length === 0) {
      return {
        longitude: -2.163,
        latitude: 50.861,
        zoom: 9,
      };
    }

    const avgLat =
      points.reduce((sum, point) => sum + point.lat, 0) / points.length;
    const avgLng =
      points.reduce((sum, point) => sum + point.lng, 0) / points.length;

    return {
      longitude: avgLng,
      latitude: avgLat,
      zoom: 9.5,
    };
  }, [bookings, drivers]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoutes() {
      if (!MAPBOX_TOKEN || !selectedBooking) {
        setDriverToPickupGeoJson(EMPTY_GEOJSON);
        setPickupToDropoffGeoJson(EMPTY_GEOJSON);
        onEtaUpdate?.(null);
        return;
      }

      const pickupLat = selectedBooking.pickupLat ?? null;
      const pickupLng = selectedBooking.pickupLng ?? null;
      const dropoffLat = selectedBooking.dropoffLat ?? null;
      const dropoffLng = selectedBooking.dropoffLng ?? null;
      const driverLat = selectedBooking.driver?.latitude ?? null;
      const driverLng = selectedBooking.driver?.longitude ?? null;

      if (pickupLat == null || pickupLng == null || dropoffLat == null || dropoffLng == null) {
        setDriverToPickupGeoJson(EMPTY_GEOJSON);
        setPickupToDropoffGeoJson(EMPTY_GEOJSON);
        onEtaUpdate?.(null);
        return;
      }

      try {
        const pickupToDropoffUrl =
          `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
          `${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}` +
          `?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

        const pickupToDropoffResponse = await fetch(pickupToDropoffUrl);
        const pickupToDropoffData = await pickupToDropoffResponse.json();

        const tripRoute = pickupToDropoffData?.routes?.[0];

        if (!cancelled && tripRoute?.geometry?.coordinates) {
          setPickupToDropoffGeoJson({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: tripRoute.geometry.coordinates,
                },
                properties: {},
              },
            ],
          });
        }

        if (driverLat != null && driverLng != null) {
          const driverToPickupUrl =
            `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
            `${driverLng},${driverLat};${pickupLng},${pickupLat}` +
            `?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

          const driverToPickupResponse = await fetch(driverToPickupUrl);
          const driverToPickupData = await driverToPickupResponse.json();

          const approachRoute = driverToPickupData?.routes?.[0];

          if (!cancelled && approachRoute?.geometry?.coordinates) {
            setDriverToPickupGeoJson({
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: approachRoute.geometry.coordinates,
                  },
                  properties: {},
                },
              ],
            });

            onEtaUpdate?.(
              typeof approachRoute.duration === 'number'
                ? Math.max(1, Math.round(approachRoute.duration / 60))
                : null,
            );
          } else if (!cancelled) {
            setDriverToPickupGeoJson(EMPTY_GEOJSON);
            onEtaUpdate?.(null);
          }
        } else {
          setDriverToPickupGeoJson(EMPTY_GEOJSON);
          onEtaUpdate?.(null);
        }
      } catch (error) {
        console.error('Failed to load directions', error);

        if (!cancelled) {
          setDriverToPickupGeoJson(EMPTY_GEOJSON);
          setPickupToDropoffGeoJson(EMPTY_GEOJSON);
          onEtaUpdate?.(null);
        }
      }
    }

    void loadRoutes();

    return () => {
      cancelled = true;
    };
  }, [selectedBooking, onEtaUpdate]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-sm text-amber-200">
        Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
      </div>
    );
  }

  return (
    <div className="h-[420px] overflow-hidden rounded-2xl border border-white/10">
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={initialViewState}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        reuseMaps
        style={{ width: '100%', height: '100%' }}
      >
        {driverToPickupGeoJson.features.length > 0 ? (
          <Source id="driver-to-pickup-source" type="geojson" data={driverToPickupGeoJson}>
            <Layer {...driverToPickupLayer} />
          </Source>
        ) : null}

        {pickupToDropoffGeoJson.features.length > 0 ? (
          <Source id="pickup-to-dropoff-source" type="geojson" data={pickupToDropoffGeoJson}>
            <Layer {...pickupToDropoffLayer} />
          </Source>
        ) : null}

        {bookings
          .filter((booking) => booking.pickupLat != null && booking.pickupLng != null)
          .map((booking) => {
            const isSelected = selectedBooking?.id === booking.id;

            return (
              <Marker
                key={`booking-${booking.id}`}
                longitude={booking.pickupLng as number}
                latitude={booking.pickupLat as number}
                anchor="bottom"
              >
                <div className="group relative">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 shadow-lg ${
                      isSelected ? 'scale-125 border-cyan-300' : 'border-white'
                    }`}
                    style={{
                      backgroundColor: getBookingMarkerColor(booking.status),
                    }}
                    title={`${booking.reference} · ${booking.status}`}
                  />
                  <div className="pointer-events-none absolute bottom-7 left-1/2 z-10 hidden w-64 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-950/95 p-3 text-left text-xs text-white shadow-2xl group-hover:block">
                    <p className="font-semibold">{booking.reference}</p>
                    <p className="mt-1 text-white/70">{booking.pickup}</p>
                    <p className="mt-1 text-white/50">→ {booking.dropoff}</p>
                    <p className="mt-2 text-cyan-300">
                      {new Date(booking.pickupTime).toLocaleString()}
                    </p>
                    <p className="mt-1 text-white/60">Status: {booking.status}</p>
                    <p className="mt-1 text-white/60">
                      Driver: {booking.driver?.name || 'Unassigned'}
                    </p>
                  </div>
                </div>
              </Marker>
            );
          })}

        {drivers
          .filter((driver) => driver.latitude != null && driver.longitude != null)
          .map((driver) => {
            const isSelectedDriver = selectedBooking?.driver?.id === driver.id;

            return (
              <Marker
                key={`driver-${driver.id}`}
                longitude={driver.longitude as number}
                latitude={driver.latitude as number}
                anchor="center"
              >
                <div className="group relative">
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full border-2 shadow-lg ${
                      isSelectedDriver ? 'scale-125 border-cyan-300' : 'border-white'
                    }`}
                    style={{
                      backgroundColor: getDriverMarkerColor(driver.status),
                    }}
                    title={`${driver.name} · ${driver.status}`}
                  />
                  <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 hidden w-56 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-950/95 p-3 text-left text-xs text-white shadow-2xl group-hover:block">
                    <p className="font-semibold">{driver.name}</p>
                    <p className="mt-1 text-white/60">Status: {driver.status}</p>
                    {driver.phone ? (
                      <p className="mt-1 text-white/50">{driver.phone}</p>
                    ) : null}
                    <p className="mt-1 text-white/40">
                      {driver.latitude?.toFixed(5)}, {driver.longitude?.toFixed(5)}
                    </p>
                  </div>
                </div>
              </Marker>
            );
          })}
      </Map>
    </div>
  );
}