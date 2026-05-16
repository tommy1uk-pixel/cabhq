import { Injectable } from '@nestjs/common';

type PostcoderSuggestion = {
  id?: string | number;
  udprn?: string | number;
  address?: string;
  summaryline?: string;
  line_1?: string;
  line_2?: string;
  line_3?: string;
  posttown?: string;
  county?: string;
  postcode?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  type?: string;
};

type AddressSuggestion = {
  id: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  type: string;
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
};

@Injectable()
export class MapboxService {
  async search(query: string): Promise<AddressSuggestion[]> {
    const cleanQuery = query?.trim();

    if (!cleanQuery) {
      return [];
    }

    const postcoderResults = await this.searchPostcoder(cleanQuery);

    if (postcoderResults.length > 0) {
      return postcoderResults;
    }

    return this.searchMapbox(cleanQuery);
  }

  async retrieve(id: string): Promise<RetrievedAddress> {
    const cleanId = id?.trim();

    if (!cleanId) {
      throw new Error('Address id missing');
    }

    if (this.looksLikePostcoderId(cleanId)) {
      return this.retrievePostcoder(cleanId);
    }

    return this.retrieveMapbox(cleanId);
  }

  private async searchPostcoder(query: string): Promise<AddressSuggestion[]> {
    const apiKey = process.env.POSTCODER_API_KEY;

    if (!apiKey) {
      return [];
    }

    const url =
      `https://ws.postcoder.com/pcw/${encodeURIComponent(
        apiKey,
      )}/address/uk/${encodeURIComponent(query)}` +
      `?format=json&lines=3&addtags=latitude,longitude`;

    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Postcoder search failed (${response.status})`);
      return [];
    }

    const data = (await response.json()) as PostcoderSuggestion[];

    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .map((item, index) => {
        const id = String(item.id ?? item.udprn ?? index);
        const address = this.formatPostcoderAddress(item);

        if (!address) {
          return null;
        }

        return {
          id,
          address,
          latitude: this.toNumberOrNull(item.latitude),
          longitude: this.toNumberOrNull(item.longitude),
          type: item.type ?? 'ADD',
        };
      })
      .filter(Boolean) as AddressSuggestion[];
  }

  private async retrievePostcoder(id: string): Promise<RetrievedAddress> {
    const apiKey = process.env.POSTCODER_API_KEY;

    if (!apiKey) {
      throw new Error('POSTCODER_API_KEY missing');
    }

    const url =
      `https://ws.postcoder.com/pcw/${encodeURIComponent(
        apiKey,
      )}/address/uk/id/${encodeURIComponent(id)}` +
      `?format=json&lines=3&addtags=latitude,longitude`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Postcoder retrieve failed (${response.status})`);
    }

    const data = (await response.json()) as PostcoderSuggestion[];
    const item = Array.isArray(data) ? data[0] : null;

    if (!item) {
      throw new Error('Postcoder address not found');
    }

    return {
      id,
      address: this.formatPostcoderAddress(item),
      line1: item.line_1 ?? null,
      line2: item.line_2 ?? null,
      line3: item.line_3 ?? null,
      town: item.posttown ?? null,
      county: item.county ?? null,
      postcode: item.postcode ?? null,
      latitude: this.toNumberOrNull(item.latitude),
      longitude: this.toNumberOrNull(item.longitude),
    };
  }

  private async searchMapbox(query: string): Promise<AddressSuggestion[]> {
    const token = process.env.MAPBOX_TOKEN;

    if (!token) {
      return [];
    }

    const url =
      `https://api.mapbox.com/search/searchbox/v1/suggest` +
      `?q=${encodeURIComponent(query)}` +
      `&language=en` +
      `&country=gb` +
      `&limit=8` +
      `&types=address,street,place,poi` +
      `&session_token=cabhq` +
      `&access_token=${encodeURIComponent(token)}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Mapbox search failed (${response.status})`);
      return [];
    }

    const data = await response.json();
    const suggestions = Array.isArray(data?.suggestions)
      ? data.suggestions
      : [];

    return suggestions
      .map((item: any) => {
        const id = String(item.mapbox_id ?? item.id ?? '');

        const address =
          item.full_address ||
          item.place_formatted ||
          item.name ||
          item.address ||
          '';

        if (!id || !address) {
          return null;
        }

        const coords = item?.coordinates;

        return {
          id,
          address,
          latitude: this.toNumberOrNull(coords?.latitude),
          longitude: this.toNumberOrNull(coords?.longitude),
          type: item.feature_type ?? 'address',
        };
      })
      .filter(Boolean) as AddressSuggestion[];
  }

  private async retrieveMapbox(id: string): Promise<RetrievedAddress> {
    const token = process.env.MAPBOX_TOKEN;

    if (!token) {
      throw new Error('MAPBOX_TOKEN missing');
    }

    const url =
      `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(
        id,
      )}` +
      `?session_token=cabhq` +
      `&access_token=${encodeURIComponent(token)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mapbox retrieve failed (${response.status})`);
    }

    const data = await response.json();
    const feature = Array.isArray(data?.features) ? data.features[0] : null;

    if (!feature) {
      throw new Error('Mapbox address not found');
    }

    const props = feature.properties ?? {};
    const coords = Array.isArray(feature.geometry?.coordinates)
      ? feature.geometry.coordinates
      : [];

    const address =
      props.full_address ||
      props.place_formatted ||
      props.name ||
      props.address ||
      '';

    return {
      id,
      address,
      line1: props.address ?? props.name ?? null,
      line2: null,
      line3: null,
      town: props.context?.place?.name ?? null,
      county: props.context?.region?.name ?? null,
      postcode: props.context?.postcode?.name ?? null,
      latitude: this.toNumberOrNull(coords[1]),
      longitude: this.toNumberOrNull(coords[0]),
    };
  }

  private formatPostcoderAddress(item: PostcoderSuggestion) {
    if (item.summaryline?.trim()) {
      return item.summaryline.trim();
    }

    if (item.address?.trim()) {
      return item.address.trim();
    }

    return [
      item.line_1,
      item.line_2,
      item.line_3,
      item.posttown,
      item.county,
      item.postcode,
    ]
      .filter(Boolean)
      .join(', ');
  }

  private looksLikePostcoderId(id: string) {
    return /^[0-9]+$/.test(id);
  }

  private toNumberOrNull(value: unknown) {
    if (value == null || value === '') {
      return null;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
  }
}