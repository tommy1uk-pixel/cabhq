import { BadRequestException, Injectable } from '@nestjs/common';

type PostcoderSuggestion = {
  id: string;
  summaryline?: string;
  summary?: string;
  type?: string;
};

type RouteInput = {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
};

type RetrievedAddress = {
  id: string;
  address: string;
  line1: string | null;
  line2: string | null;
  line3: string | null;
  town: string | null;
  county: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  raw: any;
};

type MapboxGeocodeResponse = {
  features?: Array<{
    center?: [number, number];
  }>;
};

type MapboxDirectionsResponse = {
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: {
      coordinates?: number[][];
    };
  }>;
};

const AIRPORTS = [
  {
    id: 'AIRPORT:HEATHROW',
    address: 'Heathrow Airport, Hounslow, TW6',
    postcode: 'TW6',
    latitude: 51.47,
    longitude: -0.4543,
    keywords: ['heathrow', 'lhr', 'heathrow airport'],
  },
  {
    id: 'AIRPORT:GATWICK',
    address: 'Gatwick Airport, Horley, RH6',
    postcode: 'RH6',
    latitude: 51.1537,
    longitude: -0.1821,
    keywords: ['gatwick', 'lgw', 'gatwick airport'],
  },
  {
    id: 'AIRPORT:BOURNEMOUTH',
    address: 'Bournemouth Airport, Christchurch, BH23',
    postcode: 'BH23',
    latitude: 50.78,
    longitude: -1.8425,
    keywords: ['bournemouth airport', 'bournemouth', 'boh'],
  },
  {
    id: 'AIRPORT:SOUTHAMPTON',
    address: 'Southampton Airport, Southampton, SO18',
    postcode: 'SO18',
    latitude: 50.9503,
    longitude: -1.3568,
    keywords: ['southampton airport', 'southampton', 'sou'],
  },
  {
    id: 'AIRPORT:BRISTOL',
    address: 'Bristol Airport, Bristol, BS48',
    postcode: 'BS48',
    latitude: 51.3837,
    longitude: -2.7191,
    keywords: ['bristol airport', 'bristol', 'brs'],
  },
  {
    id: 'AIRPORT:EXETER',
    address: 'Exeter Airport, Exeter, EX5',
    postcode: 'EX5',
    latitude: 50.7344,
    longitude: -3.4139,
    keywords: ['exeter airport', 'exeter', 'ext'],
  },
  {
    id: 'AIRPORT:LUTON',
    address: 'London Luton Airport, Luton, LU2',
    postcode: 'LU2',
    latitude: 51.8747,
    longitude: -0.3683,
    keywords: ['luton airport', 'luton', 'ltn'],
  },
  {
    id: 'AIRPORT:STANSTED',
    address: 'London Stansted Airport, Stansted, CM24',
    postcode: 'CM24',
    latitude: 51.885,
    longitude: 0.235,
    keywords: ['stansted airport', 'stansted', 'stn'],
  },
  {
    id: 'AIRPORT:BIRMINGHAM',
    address: 'Birmingham Airport, Birmingham, B26',
    postcode: 'B26',
    latitude: 52.4539,
    longitude: -1.748,
    keywords: ['birmingham airport', 'birmingham', 'bhx'],
  },
  {
    id: 'AIRPORT:MANCHESTER',
    address: 'Manchester Airport, Manchester, M90',
    postcode: 'M90',
    latitude: 53.365,
    longitude: -2.2722,
    keywords: ['manchester airport', 'manchester', 'man'],
  },
];

@Injectable()
export class LocationsService {
  private readonly retrieveCache = new Map<string, RetrievedAddress>();

  async searchMapbox(query: string) {
    if (!query?.trim()) {
      throw new BadRequestException('Query required');
    }

    const cleanQuery = query.trim();
    const queryNorm = cleanQuery.toLowerCase();

    const airportResults = AIRPORTS.filter((airport) =>
      airport.keywords.some(
        (keyword) => keyword.includes(queryNorm) || queryNorm.includes(keyword),
      ),
    ).map((airport) => ({
      id: airport.id,
      address: airport.address,
      latitude: airport.latitude,
      longitude: airport.longitude,
      type: 'AIRPORT',
    }));

    const apiKey = process.env.POSTCODER_API_KEY;

    if (!apiKey) {
      return airportResults;
    }

    const url =
      `https://ws.postcoder.com/pcw/autocomplete/find` +
      `?query=${encodeURIComponent(cleanQuery)}` +
      `&country=uk` +
      `&apikey=${encodeURIComponent(apiKey)}` +
      `&enablefacets=false`;

    const response = await fetch(url);
    const text = await response.text();

    if (!response.ok) {
      if (airportResults.length > 0) {
        return airportResults;
      }

      throw new Error(
        `Postcoder failed: ${response.status} ${response.statusText} - ${text}`,
      );
    }

    const data = JSON.parse(text);

    const postcoderResults = (data || []).map((item: PostcoderSuggestion) => ({
      id: item.id,
      address: item.summaryline || item.summary || '',
      latitude: null,
      longitude: null,
      type: item.type,
    }));

    return [...airportResults, ...postcoderResults];
  }

  async retrievePostcoderAddress(id: string) {
    if (!id?.trim()) {
      throw new BadRequestException('Address id required');
    }

    const cleanId = id.trim();

    const airport = AIRPORTS.find((item) => item.id === cleanId);

    if (airport) {
      return {
        id: airport.id,
        address: airport.address,
        line1: airport.address,
        line2: null,
        line3: null,
        town: null,
        county: null,
        postcode: airport.postcode,
        latitude: airport.latitude,
        longitude: airport.longitude,
        raw: airport,
      };
    }

    const cached = this.retrieveCache.get(cleanId);

    if (cached) {
      return cached;
    }

    const apiKey = process.env.POSTCODER_API_KEY;

    if (!apiKey) {
      throw new Error('POSTCODER_API_KEY missing from backend .env');
    }

    const url =
      `https://ws.postcoder.com/pcw/autocomplete/retrieve` +
      `?id=${encodeURIComponent(cleanId)}` +
      `&country=uk` +
      `&apikey=${encodeURIComponent(apiKey)}` +
      `&format=json` +
      `&lines=3` +
      `&include=coordinates`;

    const response = await fetch(url);
    const text = await response.text();

    if (!response.ok) {
      throw new Error(
        `Postcoder retrieve failed: ${response.status} ${response.statusText} - ${text}`,
      );
    }

    const data = JSON.parse(text);
    const address = Array.isArray(data) ? data[0] : data;

    const fullAddress = [
      address.addressline1,
      address.addressline2,
      address.addressline3,
      address.posttown,
      address.postcode,
    ]
      .filter(Boolean)
      .join(', ');

    const fallbackCoords = await this.geocodeWithMapbox(fullAddress);

    const result: RetrievedAddress = {
      id: cleanId,
      address: fullAddress,
      line1: address.addressline1 || null,
      line2: address.addressline2 || null,
      line3: address.addressline3 || null,
      town: address.posttown || null,
      county: address.county || null,
      postcode: address.postcode || null,
      latitude: address.latitude
        ? Number(address.latitude)
        : fallbackCoords.latitude,
      longitude: address.longitude
        ? Number(address.longitude)
        : fallbackCoords.longitude,
      raw: address,
    };

    this.retrieveCache.set(cleanId, result);

    return result;
  }

  async getRoute(input: RouteInput) {
    const token = process.env.MAPBOX_ACCESS_TOKEN;

    if (!token) {
      throw new Error('MAPBOX_ACCESS_TOKEN missing');
    }

    const coordinates =
      `${input.fromLng},${input.fromLat};${input.toLng},${input.toLat}`;

    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
      `${coordinates}` +
      `?access_token=${encodeURIComponent(token)}` +
      `&geometries=geojson` +
      `&overview=full`;

    const response = await fetch(url);
    const text = await response.text();

    if (!response.ok) {
      throw new Error(
        `Mapbox route failed: ${response.status} ${response.statusText} - ${text}`,
      );
    }

    const data = JSON.parse(text) as MapboxDirectionsResponse;
    const route = data.routes?.[0];

    if (!route) {
      throw new Error('No route returned');
    }

    return {
      distanceMiles: route.distance
        ? Number((route.distance / 1609.344).toFixed(2))
        : 0,
      durationMinutes: route.duration ? Math.round(route.duration / 60) : 0,
      coordinates:
        route.geometry?.coordinates?.map((coord) => [coord[1], coord[0]]) ||
        [],
    };
  }

  private async geocodeWithMapbox(address: string) {
    const token = process.env.MAPBOX_ACCESS_TOKEN;

    if (!token || !address.trim()) {
      return {
        latitude: null,
        longitude: null,
      };
    }

    try {
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
        `${encodeURIComponent(address)}.json` +
        `?access_token=${encodeURIComponent(token)}` +
        `&country=gb` +
        `&limit=1`;

      const response = await fetch(url);

      if (!response.ok) {
        return {
          latitude: null,
          longitude: null,
        };
      }

      const data = (await response.json()) as MapboxGeocodeResponse;
      const center = data.features?.[0]?.center;

      if (!center) {
        return {
          latitude: null,
          longitude: null,
        };
      }

      return {
        longitude: center[0],
        latitude: center[1],
      };
    } catch {
      return {
        latitude: null,
        longitude: null,
      };
    }
  }
}