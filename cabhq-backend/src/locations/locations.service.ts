import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class LocationsService {
  private readonly accessToken = process.env.MAPBOX_ACCESS_TOKEN;

  async suggest(query: string) {
    if (!this.accessToken) {
      throw new Error('MAPBOX_ACCESS_TOKEN is not set');
    }

    if (!query || query.trim().length < 3) {
      return [];
    }

    const response = await axios.get(
      'https://api.mapbox.com/search/geocode/v6/forward',
      {
        params: {
          q: query,
          access_token: this.accessToken,
          country: 'GB',
          language: 'en',
          limit: 5,
          autocomplete: true,
          permanent: true,
        },
      },
    );

    return (response.data.features || []).map((feature: any) => ({
      mapbox_id: feature.properties?.mapbox_id || feature.id,
      label:
        feature.properties?.full_address ||
        feature.properties?.name ||
        feature.properties?.place_formatted ||
        '',
      lat:
        feature.properties?.coordinates?.latitude ??
        feature.geometry?.coordinates?.[1],
      lng:
        feature.properties?.coordinates?.longitude ??
        feature.geometry?.coordinates?.[0],
    }));
  }
}