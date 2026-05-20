import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';

type StoredLocation = {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  lastLocationAt?: string | null;
  name?: string | null;
  status?: string | null;
};

type StoredBookingAddress = {
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
};

type StoredBooking = {
  id: string;
  reference?: string;
  status?: string;

  pickup?: StoredBookingAddress;
  dropoff?: StoredBookingAddress;

  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;

  dropoffLat?: number | null;
  dropoffLng?: number | null;
  dropoffLatitude?: number | null;
  dropoffLongitude?: number | null;

  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  pickupTime?: string | null;

  routeCoordinates?:
    | Array<[number, number]>
    | Array<{ latitude: number; longitude: number }>;

  trackingUrl?: string | null;
  driverDistanceMiles?: number | null;
  etaMinutes?: number | null;
  etaConfidence?: string | null;
  driverGpsAgeSeconds?: number | null;
  customerTrackingMessage?: string | null;

  isAirportBooking?: boolean;
  airportCode?: string | null;
  airportName?: string | null;
  airportTerminal?: string | null;
  flightNumber?: string | null;
  flightDirection?: string | null;
  flightDateTime?: string | null;
  airline?: string | null;
  meetAndGreet?: boolean | null;
  airportNotes?: string | null;
};

type DriverMapState = {
  driver?: StoredLocation | null;
  activeJob?: StoredBooking | null;
  activeOffer?: StoredBooking | null;
  activeJobs?: StoredBooking[];
  updatedAt?: string;
};

type Coordinate = {
  latitude: number;
  longitude: number;
};

const DEFAULT_REGION: Region = {
  latitude: 50.857,
  longitude: -2.165,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const MAP_STATE_KEY = 'cabhq_driver_map_state';
const OLD_LOCATION_KEY = 'cabhq_driver_location';
const OLD_BOOKING_KEY = 'cabhq_active_booking';

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#020617' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#334155' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#111827' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#052e1b' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#334155' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#0e7490' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#082f49' }],
  },
];

function normaliseStatus(status?: string | null) {
  return (status || 'WAITING').toUpperCase().replace(/_/g, ' ');
}

function statusTone(status?: string | null) {
  const normalised = (status || '').toUpperCase();

  if (normalised === 'ON_JOB') {
    return {
      border: '#f59e0b',
      bg: '#1c1205',
      text: '#fcd34d',
      label: 'Passenger onboard',
    };
  }

  if (normalised === 'ARRIVED') {
    return {
      border: '#7c3aed',
      bg: '#1e103d',
      text: '#ddd6fe',
      label: 'At pickup',
    };
  }

  if (normalised === 'EN_ROUTE') {
    return {
      border: '#2563eb',
      bg: '#082f49',
      text: '#bfdbfe',
      label: 'Going to pickup',
    };
  }

  if (normalised === 'ACCEPTED') {
    return {
      border: '#06b6d4',
      bg: '#083344',
      text: '#a5f3fc',
      label: 'Job accepted',
    };
  }

  if (normalised === 'OFFERED') {
    return {
      border: '#f59e0b',
      bg: '#451a03',
      text: '#fde68a',
      label: 'Offer active',
    };
  }

  return {
    border: '#334155',
    bg: '#0f172a',
    text: '#cbd5e1',
    label: normaliseStatus(status),
  };
}

function isValidCoordinate(lat?: number | null, lng?: number | null) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function getBookingCoordinate(
  booking: StoredBooking | null,
  type: 'pickup' | 'dropoff',
): Coordinate | null {
  if (!booking) return null;

  const nested = type === 'pickup' ? booking.pickup : booking.dropoff;

  const lat =
    nested?.latitude ??
    (type === 'pickup'
      ? booking.pickupLat ?? booking.pickupLatitude
      : booking.dropoffLat ?? booking.dropoffLatitude) ??
    null;

  const lng =
    nested?.longitude ??
    (type === 'pickup'
      ? booking.pickupLng ?? booking.pickupLongitude
      : booking.dropoffLng ?? booking.dropoffLongitude) ??
    null;

  if (!isValidCoordinate(lat, lng)) return null;

  return {
    latitude: Number(lat),
    longitude: Number(lng),
  };
}

function getBookingAddress(
  booking: StoredBooking | null,
  type: 'pickup' | 'dropoff',
) {
  if (!booking) return '';

  if (type === 'pickup') {
    return booking.pickup?.address || booking.pickupAddress || '';
  }

  return booking.dropoff?.address || booking.dropoffAddress || '';
}

function getGpsAge(value?: string | null) {
  if (!value) return 'Waiting for GPS';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Waiting for GPS';

  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));

  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  return `${hours}h ago`;
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDistance(value?: number | null) {
  if (value == null) return '—';
  return `${Number(value).toFixed(1)} mi`;
}

function getRouteCoordinates(booking: StoredBooking | null): Coordinate[] {
  if (!booking?.routeCoordinates?.length) return [];

  return booking.routeCoordinates
    .map((point) => {
      if (Array.isArray(point)) {
        return {
          latitude: Number(point[0]),
          longitude: Number(point[1]),
        };
      }

      return {
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
      };
    })
    .filter((point) => isValidCoordinate(point.latitude, point.longitude));
}

function getNextDestination(
  booking: StoredBooking | null,
  pickupCoords: Coordinate | null,
  dropoffCoords: Coordinate | null,
) {
  const status = (booking?.status || '').toUpperCase();

  if (['ARRIVED', 'ON_JOB'].includes(status) && dropoffCoords) {
    return {
      label: 'dropoff',
      title: 'Navigate To Dropoff',
      googleLabel: 'Google Dropoff',
      wazeLabel: 'Waze Dropoff',
      address: getBookingAddress(booking, 'dropoff'),
      coords: dropoffCoords,
      color: '#7c3aed',
      bg: '#2e1065',
      text: '#ddd6fe',
    };
  }

  if (pickupCoords) {
    return {
      label: 'pickup',
      title: 'Navigate To Pickup',
      googleLabel: 'Google Pickup',
      wazeLabel: 'Waze Pickup',
      address: getBookingAddress(booking, 'pickup'),
      coords: pickupCoords,
      color: '#06b6d4',
      bg: '#082f49',
      text: '#bfdbfe',
    };
  }

  return null;
}

function regionForPoints(points: Coordinate[]): Region {
  if (points.length === 0) return DEFAULT_REGION;

  if (points.length === 1) {
    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      latitudeDelta: 0.025,
      longitudeDelta: 0.025,
    };
  }

  const lats = points.map((point) => point.latitude);
  const lngs = points.map((point) => point.longitude);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.025, (maxLat - minLat) * 1.8),
    longitudeDelta: Math.max(0.025, (maxLng - minLng) * 1.8),
  };
}

function getEtaLabel(booking: StoredBooking | null) {
  if (!booking) return 'ETA pending';

  if (booking.etaMinutes != null) {
    if (booking.etaMinutes <= 1) return 'Arriving now';
    return `ETA ${booking.etaMinutes} mins`;
  }

  if (booking.driverDistanceMiles != null) {
    return `${booking.driverDistanceMiles.toFixed(1)} mi away`;
  }

  return 'ETA pending';
}

function getEtaTone(booking: StoredBooking | null) {
  if (!booking) {
    return {
      bg: '#1e293b',
      text: '#cbd5e1',
      border: '#334155',
    };
  }

  const confidence = (booking.etaConfidence || '').toUpperCase();

  if (booking.etaMinutes != null && booking.etaMinutes <= 3) {
    return {
      bg: '#052e1b',
      text: '#6ee7b7',
      border: '#059669',
    };
  }

  if (confidence === 'LIVE_GPS') {
    return {
      bg: '#083344',
      text: '#67e8f9',
      border: '#06b6d4',
    };
  }

  if (confidence === 'ESTIMATED') {
    return {
      bg: '#451a03',
      text: '#fde68a',
      border: '#f59e0b',
    };
  }

  return {
    bg: '#1e293b',
    text: '#cbd5e1',
    border: '#334155',
  };
}

function isAirportBooking(booking: StoredBooking | null) {
  return Boolean(
    booking?.isAirportBooking ||
      booking?.airportCode ||
      booking?.airportName ||
      booking?.airportTerminal ||
      booking?.flightNumber ||
      booking?.flightDirection ||
      booking?.flightDateTime ||
      booking?.airline ||
      booking?.meetAndGreet ||
      booking?.airportNotes,
  );
}

function getAirportDirectionLabel(value?: string | null) {
  const normalised = (value || '').toUpperCase();

  if (normalised === 'ARRIVAL') return 'Airport pickup';
  if (normalised === 'DEPARTURE') return 'Airport dropoff';
  if (normalised === 'TRANSFER') return 'Airport transfer';

  return normalised ? normalised.replace(/_/g, ' ') : 'Airport job';
}

function getAirportSummary(booking: StoredBooking | null) {
  if (!booking) return 'Airport booking';

  const parts = [
    booking.airportName || booking.airportCode,
    booking.airportTerminal,
    booking.flightNumber ? `Flight ${booking.flightNumber}` : null,
    booking.airline,
  ].filter(Boolean);

  return parts.length ? parts.join(' · ') : 'Airport booking';
}

async function openGoogleNavigation(
  address: string,
  coords: Coordinate | null,
) {
  const destination = coords
    ? `${coords.latitude},${coords.longitude}`
    : encodeURIComponent(address);

  const url = Platform.select({
    ios: `comgooglemaps://?daddr=${destination}&directionsmode=driving`,
    android: `google.navigation:q=${destination}`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`,
  });

  const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

  try {
    if (url && (await Linking.canOpenURL(url))) {
      await Linking.openURL(url);
      return;
    }

    await Linking.openURL(fallbackUrl);
  } catch (error) {
    console.error('Failed to open Google navigation', error);
    await Linking.openURL(fallbackUrl);
  }
}

async function openWazeNavigation(address: string, coords: Coordinate | null) {
  const destination = coords
    ? `${coords.latitude},${coords.longitude}`
    : encodeURIComponent(address);

  const url = coords
    ? `https://waze.com/ul?ll=${destination}&navigate=yes`
    : `https://waze.com/ul?q=${destination}&navigate=yes`;

  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error('Failed to open Waze navigation', error);
  }
}

async function openTrackingLink(booking: StoredBooking | null) {
  if (!booking?.trackingUrl) return;

  try {
    await Linking.openURL(booking.trackingUrl);
  } catch (error) {
    console.error('Failed to open tracking link', error);
  }
}

function SmallPill({
  label,
  bg,
  text,
  border,
}: {
  label: string;
  bg: string;
  text: string;
  border: string;
}) {
  return (
    <View
      style={{
        backgroundColor: bg,
        borderColor: border,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 7,
      }}
    >
      <Text
        style={{
          color: text,
          fontSize: 12,
          fontWeight: '900',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function AddressCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  if (!value) return null;

  return (
    <View
      style={{
        marginTop: 10,
        padding: 12,
        borderRadius: 16,
        backgroundColor: '#020617',
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.22)',
      }}
    >
      <Text
        style={{
          color: accent,
          fontSize: 11,
          fontWeight: '900',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>

      <Text
        style={{
          color: '#f8fafc',
          marginTop: 6,
          fontSize: 14,
          fontWeight: '700',
          lineHeight: 20,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function CustomMarker({
  title,
  color,
  inner,
}: {
  title: string;
  color: string;
  inner: string;
}) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 3,
          borderColor: '#f8fafc',
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Text style={{ color: inner, fontSize: 14, fontWeight: '900' }}>
          {title}
        </Text>
      </View>
      <View
        style={{
          width: 3,
          height: 12,
          backgroundColor: color,
          borderRadius: 3,
          marginTop: -2,
        }}
      />
    </View>
  );
}

export default function DriverMapTab() {
  const mapRef = useRef<MapView | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const panelAnim = useRef(new Animated.Value(0)).current;

  const [driverLocation, setDriverLocation] =
    useState<StoredLocation | null>(null);

  const [booking, setBooking] = useState<StoredBooking | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [followDriver, setFollowDriver] = useState(true);

  async function loadMapState() {
    try {
      const [storedMapState, storedLocation, storedBooking] =
        await Promise.all([
          AsyncStorage.getItem(MAP_STATE_KEY),
          AsyncStorage.getItem(OLD_LOCATION_KEY),
          AsyncStorage.getItem(OLD_BOOKING_KEY),
        ]);

      if (storedMapState) {
        const parsed = JSON.parse(storedMapState) as DriverMapState;

        if (parsed.driver) {
          setDriverLocation(parsed.driver);
        }

        const activeJob =
          parsed.activeJob ||
          parsed.activeJobs?.find((job) =>
            ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB', 'OFFERED'].includes(
              (job.status || '').toUpperCase(),
            ),
          ) ||
          parsed.activeJobs?.[0] ||
          parsed.activeOffer ||
          null;

        setBooking(activeJob);
        setLastUpdatedAt(parsed.updatedAt || null);

        return;
      }

      if (storedLocation) {
        setDriverLocation(JSON.parse(storedLocation));
      }

      if (storedBooking) {
        setBooking(JSON.parse(storedBooking));
      }
    } catch (error) {
      console.error('Failed loading map state', error);
    }
  }

  useEffect(() => {
    void loadMapState();

    const interval = setInterval(() => {
      void loadMapState();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.timing(panelAnim, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [panelAnim, pulse]);

  const pickupCoords = useMemo(
    () => getBookingCoordinate(booking, 'pickup'),
    [booking],
  );

  const dropoffCoords = useMemo(
    () => getBookingCoordinate(booking, 'dropoff'),
    [booking],
  );

  const storedRoute = useMemo(() => getRouteCoordinates(booking), [booking]);

  const nextDestination = useMemo(
    () => getNextDestination(booking, pickupCoords, dropoffCoords),
    [booking, pickupCoords, dropoffCoords],
  );

  const mapPoints = useMemo(() => {
    return [
      driverLocation
        ? {
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
          }
        : null,
      pickupCoords,
      dropoffCoords,
      ...storedRoute,
    ].filter(Boolean) as Coordinate[];
  }, [driverLocation, pickupCoords, dropoffCoords, storedRoute]);

  useEffect(() => {
    if (!mapRef.current || mapPoints.length === 0) return;

    if (followDriver || booking) {
      mapRef.current.animateToRegion(regionForPoints(mapPoints), 650);
    }
  }, [mapPoints, followDriver, booking]);

  const driverToPickupLine =
    driverLocation && pickupCoords
      ? [
          {
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
          },
          pickupCoords,
        ]
      : [];

  const pickupToDropoffLine =
    pickupCoords && dropoffCoords ? [pickupCoords, dropoffCoords] : [];

  const tone = statusTone(booking?.status);
  const etaTone = getEtaTone(booking);
  const hasAirport = isAirportBooking(booking);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.8],
  });

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0],
  });

  const panelTranslate = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [36, 0],
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 10,
          backgroundColor: '#020617',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(148,163,184,0.14)',
        }}
      >
        <Text
          style={{
            color: 'white',
            fontSize: 27,
            fontWeight: '900',
            letterSpacing: -0.4,
          }}
          numberOfLines={1}
        >
          Live Driver Map
        </Text>

        <Text style={{ color: '#94a3b8', marginTop: 4, fontWeight: '600' }}>
          GPS, ETA, airport jobs and live navigation
        </Text>
      </View>

      <MapView
        ref={(ref) => {
          mapRef.current = ref;
        }}
        provider={PROVIDER_GOOGLE}
        customMapStyle={DARK_MAP_STYLE}
        style={{ flex: 1 }}
        initialRegion={DEFAULT_REGION}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        rotateEnabled
        onPanDrag={() => setFollowDriver(false)}
      >
        {driverLocation ? (
          <Marker
            coordinate={{
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude,
            }}
            title="Driver"
            description={`GPS ${getGpsAge(driverLocation.lastLocationAt)}`}
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={driverLocation.heading ?? 0}
          >
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Animated.View
                style={{
                  position: 'absolute',
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: '#06b6d4',
                  opacity: pulseOpacity,
                  transform: [{ scale: pulseScale }],
                }}
              />
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#06b6d4',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 3,
                  borderColor: '#ecfeff',
                }}
              >
                <Text style={{ color: '#020617', fontSize: 15, fontWeight: '900' }}>
                  ●
                </Text>
              </View>
            </View>
          </Marker>
        ) : null}

        {pickupCoords ? (
          <Marker
            coordinate={pickupCoords}
            title="Pickup"
            description={getBookingAddress(booking, 'pickup') || 'Pickup'}
          >
            <CustomMarker title="P" color="#22c55e" inner="#052e1b" />
          </Marker>
        ) : null}

        {dropoffCoords ? (
          <Marker
            coordinate={dropoffCoords}
            title="Dropoff"
            description={getBookingAddress(booking, 'dropoff') || 'Dropoff'}
          >
            <CustomMarker title="D" color="#ef4444" inner="#450a0a" />
          </Marker>
        ) : null}

        {storedRoute.length >= 2 ? (
          <>
            <Polyline
              coordinates={storedRoute}
              strokeWidth={9}
              strokeColor="rgba(2,6,23,0.85)"
            />
            <Polyline
              coordinates={storedRoute}
              strokeWidth={5}
              strokeColor={booking?.status === 'ON_JOB' ? '#22c55e' : '#06b6d4'}
            />
          </>
        ) : null}

        {storedRoute.length < 2 && driverToPickupLine.length >= 2 ? (
          <>
            <Polyline
              coordinates={driverToPickupLine}
              strokeWidth={8}
              strokeColor="rgba(2,6,23,0.85)"
            />
            <Polyline
              coordinates={driverToPickupLine}
              strokeWidth={4}
              strokeColor="#06b6d4"
              lineDashPattern={[10, 8]}
            />
          </>
        ) : null}

        {storedRoute.length < 2 && pickupToDropoffLine.length >= 2 ? (
          <>
            <Polyline
              coordinates={pickupToDropoffLine}
              strokeWidth={8}
              strokeColor="rgba(2,6,23,0.85)"
            />
            <Polyline
              coordinates={pickupToDropoffLine}
              strokeWidth={4}
              strokeColor="#22c55e"
            />
          </>
        ) : null}
      </MapView>

      <View
        style={{
          position: 'absolute',
          top: 92,
          right: 14,
          gap: 10,
        }}
      >
        <Pressable
          onPress={() => {
            setFollowDriver(true);
            if (mapPoints.length > 0) {
              mapRef.current?.animateToRegion(regionForPoints(mapPoints), 500);
            }
          }}
          style={{
            backgroundColor: '#020617',
            borderWidth: 1,
            borderColor: 'rgba(148,163,184,0.3)',
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: '#e2e8f0', fontWeight: '900', fontSize: 12 }}>
            RECENTER
          </Text>
        </Pressable>

        <View
          style={{
            backgroundColor: followDriver ? '#052e1b' : '#1e293b',
            borderWidth: 1,
            borderColor: followDriver ? '#059669' : '#334155',
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 9,
          }}
        >
          <Text
            style={{
              color: followDriver ? '#6ee7b7' : '#cbd5e1',
              fontWeight: '900',
              fontSize: 11,
            }}
          >
            {followDriver ? 'FOLLOW ON' : 'FREE MAP'}
          </Text>
        </View>
      </View>

      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: hasAirport ? 430 : 360,
          opacity: panelAnim,
          transform: [{ translateY: panelTranslate }],
        }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 46,
              height: 5,
              borderRadius: 999,
              backgroundColor: 'rgba(226,232,240,0.55)',
              marginBottom: 10,
            }}
          />

          <View
            style={{
              backgroundColor: 'rgba(7,17,31,0.97)',
              borderRadius: 26,
              padding: 16,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              shadowColor: '#000',
              shadowOpacity: 0.45,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 10 },
              elevation: 10,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: '#f8fafc',
                    fontSize: 19,
                    fontWeight: '900',
                  }}
                >
                  {booking?.reference || 'No Active Booking'}
                </Text>

                <Text
                  style={{
                    color: tone.text,
                    marginTop: 6,
                    fontWeight: '900',
                  }}
                >
                  {tone.label}
                </Text>
              </View>

              <SmallPill
                label={driverLocation ? 'GPS LIVE' : 'NO GPS'}
                bg={driverLocation ? '#052e1b' : '#3b0a0a'}
                text={driverLocation ? '#6ee7b7' : '#fca5a5'}
                border={driverLocation ? '#059669' : '#ef4444'}
              />
            </View>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 12,
              }}
            >
              <SmallPill
                label={getEtaLabel(booking)}
                bg={etaTone.bg}
                text={etaTone.text}
                border={etaTone.border}
              />

              {booking?.driverDistanceMiles != null ? (
                <SmallPill
                  label={`${formatDistance(booking.driverDistanceMiles)} to pickup`}
                  bg="#082f49"
                  text="#bfdbfe"
                  border="#2563eb"
                />
              ) : null}

              {booking?.driverGpsAgeSeconds != null ? (
                <SmallPill
                  label={`GPS ${booking.driverGpsAgeSeconds}s old`}
                  bg={booking.driverGpsAgeSeconds <= 90 ? '#052e1b' : '#451a03'}
                  text={
                    booking.driverGpsAgeSeconds <= 90 ? '#6ee7b7' : '#fde68a'
                  }
                  border={
                    booking.driverGpsAgeSeconds <= 90 ? '#059669' : '#f59e0b'
                  }
                />
              ) : null}
            </View>

            {lastUpdatedAt ? (
              <Text
                style={{
                  color: '#64748b',
                  marginTop: 8,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                Map updated {getGpsAge(lastUpdatedAt)}
              </Text>
            ) : null}

            {hasAirport ? (
              <View
                style={{
                  marginTop: 14,
                  backgroundColor: '#082f49',
                  borderRadius: 18,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#075985',
                }}
              >
                <Text
                  style={{
                    color: '#67e8f9',
                    fontSize: 12,
                    fontWeight: '900',
                  }}
                >
                  {getAirportDirectionLabel(
                    booking?.flightDirection,
                  ).toUpperCase()}
                </Text>

                <Text
                  style={{
                    color: 'white',
                    marginTop: 6,
                    fontSize: 15,
                    fontWeight: '900',
                  }}
                >
                  {getAirportSummary(booking)}
                </Text>

                {booking?.flightDateTime ? (
                  <Text
                    style={{
                      color: '#bfdbfe',
                      marginTop: 8,
                      fontSize: 13,
                      fontWeight: '700',
                    }}
                  >
                    Flight time: {formatDateTime(booking.flightDateTime)}
                  </Text>
                ) : null}

                {booking?.meetAndGreet ? (
                  <Text
                    style={{
                      color: '#fde68a',
                      marginTop: 8,
                      fontSize: 13,
                      fontWeight: '900',
                    }}
                  >
                    Meet & Greet required
                  </Text>
                ) : null}

                {booking?.airportNotes ? (
                  <Text
                    style={{
                      color: '#dbeafe',
                      marginTop: 8,
                      fontSize: 13,
                      lineHeight: 19,
                    }}
                  >
                    {booking.airportNotes}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <AddressCard
              label="Pickup"
              value={getBookingAddress(booking, 'pickup')}
              accent="#22c55e"
            />

            <AddressCard
              label="Dropoff"
              value={getBookingAddress(booking, 'dropoff')}
              accent="#ef4444"
            />

            {nextDestination ? (
              <View style={{ marginTop: 14, gap: 10 }}>
                <Pressable
                  onPress={() =>
                    void openGoogleNavigation(
                      nextDestination.address,
                      nextDestination.coords,
                    )
                  }
                  style={{
                    backgroundColor: nextDestination.color,
                    paddingVertical: 15,
                    borderRadius: 16,
                    alignItems: 'center',
                    shadowColor: nextDestination.color,
                    shadowOpacity: 0.25,
                    shadowRadius: 14,
                    shadowOffset: { width: 0, height: 5 },
                    elevation: 6,
                  }}
                >
                  <Text
                    style={{
                      color: '#020617',
                      fontWeight: '900',
                    }}
                  >
                    {nextDestination.googleLabel}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    void openWazeNavigation(
                      nextDestination.address,
                      nextDestination.coords,
                    )
                  }
                  style={{
                    backgroundColor: nextDestination.bg,
                    borderWidth: 1,
                    borderColor: nextDestination.color,
                    paddingVertical: 15,
                    borderRadius: 16,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: nextDestination.text,
                      fontWeight: '900',
                    }}
                  >
                    {nextDestination.wazeLabel}
                  </Text>
                </Pressable>

                {booking?.trackingUrl ? (
                  <Pressable
                    onPress={() => void openTrackingLink(booking)}
                    style={{
                      backgroundColor: '#083344',
                      borderWidth: 1,
                      borderColor: '#06b6d4',
                      paddingVertical: 15,
                      borderRadius: 16,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: '#a5f3fc',
                        fontWeight: '900',
                      }}
                    >
                      Open Customer Tracking
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <View
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 18,
                  backgroundColor: '#020617',
                  borderWidth: 1,
                  borderColor: 'rgba(148,163,184,0.18)',
                }}
              >
                <Text
                  style={{
                    color: '#e2e8f0',
                    fontWeight: '900',
                    fontSize: 14,
                  }}
                >
                  Standing by for next job
                </Text>

                <Text
                  style={{
                    color: '#94a3b8',
                    marginTop: 6,
                    lineHeight: 20,
                    fontWeight: '600',
                  }}
                >
                  Waiting for an active booking with pickup and dropoff
                  coordinates. New offers will appear here when assigned.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}