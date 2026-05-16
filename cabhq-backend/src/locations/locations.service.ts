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
    relevance?: number;
    place_name?: string;
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

    const cleanQuery = this.cleanSearchQuery(query);
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
      if (airportResults.length > 0) return airportResults;

      throw new Error(
        `Postcoder failed: ${response.status} ${response.statusText} - ${text}`,
      );
    }

    const data = JSON.parse(text);

    const postcoderResults = (Array.isArray(data) ? data : []).map(
      (item: PostcoderSuggestion) => ({
        id: item.id,
        address: item.summaryline || item.summary || '',
        latitude: null,
        longitude: null,
        type: item.type,
      }),
    );

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
    if (cached) return cached;

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

    const mapped = this.mapPostcoderAddress(cleanId, address);

    if (mapped.latitude === null || mapped.longitude === null) {
      const fallbackCoords = await this.geocodeAddress(mapped.address);
      mapped.latitude = fallbackCoords.latitude;
      mapped.longitude = fallbackCoords.longitude;
    }

    this.retrieveCache.set(cleanId, mapped);

    return mapped;
  }

  async geocodeAddress(address: string) {
    const cleanAddress = this.cleanSearchQuery(address);

    if (!cleanAddress) {
      return {
        latitude: null,
        longitude: null,
      };
    }

    const airport = this.findAirport(cleanAddress);

    if (airport) {
      return {
        latitude: airport.latitude,
        longitude: airport.longitude,
      };
    }

    const postcoderCoords = await this.geocodeWithPostcoder(cleanAddress);

    if (postcoderCoords.latitude !== null && postcoderCoords.longitude !== null) {
      return postcoderCoords;
    }

    const mapboxCoords = await this.geocodeWithMapbox(cleanAddress);

    if (mapboxCoords.latitude !== null && mapboxCoords.longitude !== null) {
      return mapboxCoords;
    }

    return {
      latitude: null,
      longitude: null,
    };
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

  private mapPostcoderAddress(id: string, address: any): RetrievedAddress {
    const line1 = this.firstText([
      address.addressline1,
      address.address_line_1,
      address.line1,
      address.line_1,
      address.summaryline,
      address.summary,
      address.organisation,
      address.organisationname,
      address.organisation_name,
      address.buildingname,
      address.building_name,
      address.premise,
    ]);

    const line2 = this.firstText([
      address.addressline2,
      address.address_line_2,
      address.line2,
      address.line_2,
      address.street,
      address.thoroughfare,
      address.dependentstreet,
      address.dependent_street,
    ]);

    const line3 = this.firstText([
      address.addressline3,
      address.address_line_3,
      address.line3,
      address.line_3,
      address.dependentlocality,
      address.dependent_locality,
      address.locality,
    ]);

    const town = this.firstText([
      address.posttown,
      address.post_town,
      address.town,
      address.city,
    ]);

    const county = this.firstText([address.county, address.traditional_county]);

    const postcode = this.firstText([
      address.postcode,
      address.post_code,
      address.postalcode,
      address.postal_code,
    ]);

    const fullAddressFromSummary = this.firstText([
      address.summaryline,
      address.summary,
    ]);

    const fullAddressFromParts = [
      line1,
      line2,
      line3,
      town,
      county,
      postcode,
    ]
      .filter(Boolean)
      .join(', ');

    const fullAddress =
      fullAddressFromParts.length >= fullAddressFromSummary.length
        ? fullAddressFromParts
        : fullAddressFromSummary;

    return {
      id,
      address: fullAddress,
      line1: line1 || null,
      line2: line2 || null,
      line3: line3 || null,
      town: town || null,
      county: county || null,
      postcode: postcode || null,
      latitude: this.toNumberOrNull(
        address.latitude ??
          address.lat ??
          address.geo?.lat ??
          address.location?.lat,
      ),
      longitude: this.toNumberOrNull(
        address.longitude ??
          address.lng ??
          address.lon ??
          address.geo?.lng ??
          address.geo?.lon ??
          address.location?.lng,
      ),
      raw: address,
    };
  }

  private async geocodeWithPostcoder(address: string) {
    const apiKey = process.env.POSTCODER_API_KEY;

    if (!apiKey) {
      return {
        latitude: null,
        longitude: null,
      };
    }

    try {
      const postcode = this.extractPostcode(address);
      const searchQuery = postcode || address;

      const searchUrl =
        `https://ws.postcoder.com/pcw/autocomplete/find` +
        `?query=${encodeURIComponent(searchQuery)}` +
        `&country=uk` +
        `&apikey=${encodeURIComponent(apiKey)}` +
        `&enablefacets=false`;

      const searchResponse = await fetch(searchUrl);
      const searchText = await searchResponse.text();

      if (!searchResponse.ok) {
        return {
          latitude: null,
          longitude: null,
        };
      }

      const suggestions = JSON.parse(searchText) as PostcoderSuggestion[];

      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        return {
          latitude: null,
          longitude: null,
        };
      }

      const normalisedPostcode = postcode
        ? this.normalisePostcode(postcode)
        : null;

      const bestSuggestion =
        suggestions.find((suggestion) => {
          const summary = suggestion.summaryline || suggestion.summary || '';

          if (normalisedPostcode) {
            return this
              .normalisePostcode(summary)
              .includes(normalisedPostcode);
          }

          return this.normalise(summary).includes(this.normalise(address));
        }) || suggestions[0];

      if (!bestSuggestion?.id) {
        return {
          latitude: null,
          longitude: null,
        };
      }

      const retrieved = await this.retrievePostcoderAddress(bestSuggestion.id);

      const lat = this.toNumberOrNull(retrieved.latitude);
      const lng = this.toNumberOrNull(retrieved.longitude);

      if (!this.isValidLatLng(lat, lng)) {
        return {
          latitude: null,
          longitude: null,
        };
      }

      return {
        latitude: lat,
        longitude: lng,
      };
    } catch {
      return {
        latitude: null,
        longitude: null,
      };
    }
  }

  private async geocodeWithMapbox(address: string) {
    const token = process.env.MAPBOX_ACCESS_TOKEN;

    if (!token) {
      return {
        latitude: null,
        longitude: null,
      };
    }

    try {
      const postcode = this.extractPostcode(address);
      const query = postcode || address;

      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
        `${encodeURIComponent(query)}.json` +
        `?access_token=${encodeURIComponent(token)}` +
        `&country=gb` +
        `&limit=1` +
        `&proximity=-2.1650,50.8570` +
        `&bbox=-4.2,50.0,-0.7,51.8`;

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

      const longitude = center[0];
      const latitude = center[1];

      if (!this.isValidLatLng(latitude, longitude)) {
        return {
          latitude: null,
          longitude: null,
        };
      }

      return {
        longitude,
        latitude,
      };
    } catch {
      return {
        latitude: null,
        longitude: null,
      };
    }
  }

  private findAirport(address: string) {
    const normalisedAddress = this.normalise(address);

    return AIRPORTS.find((item) =>
      item.keywords.some((keyword) => {
        const normalisedKeyword = this.normalise(keyword);

        return (
          normalisedAddress.includes(normalisedKeyword) ||
          normalisedKeyword.includes(normalisedAddress)
        );
      }),
    );
  }

  private cleanSearchQuery(value: string) {
    return value.trim().replace(/\s+/g, ' ');
  }

  private firstText(values: unknown[]) {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return '';
  }

  private extractPostcode(value: string) {
    const match = value
      .toUpperCase()
      .match(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/);

    return match?.[0] ? this.formatPostcode(match[0]) : null;
  }

  private formatPostcode(value: string) {
    const compact = value.toUpperCase().replace(/\s+/g, '');

    if (compact.length <= 3) return compact;

    return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
  }

  private normalisePostcode(value: string) {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  private normalise(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private toNumberOrNull(value: unknown) {
    if (value === null || value === undefined || value === '') return null;

    const numberValue =
      typeof value === 'number' ? value : Number(String(value).trim());

    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private isValidLatLng(lat: number | null, lng: number | null) {
    return (
      lat !== null &&
      lng !== null &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }
}