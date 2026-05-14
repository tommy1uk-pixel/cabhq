import { Injectable } from '@nestjs/common';

@Injectable()
export class MapboxService {
  async search(query: string) {
    if (!query?.trim()) {
      return [];
    }

    const token = process.env.MAPBOX_TOKEN;

    if (!token) {
      throw new Error('MAPBOX_TOKEN missing');
    }

    const url =
      `https://api.mapbox.com/search/searchbox/v1/suggest` +
      `?q=${encodeURIComponent(query)}` +
      `&language=en` +
      `&country=gb` +
      `&limit=8` +
      `&types=address,street,place,poi` +
      `&session_token=cabhq` +
      `&access_token=${token}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Mapbox search failed');
    }

    const data = await response.json();

    return data?.suggestions || [];
  }

  async retrieve(mapboxId: string) {
    const token = process.env.MAPBOX_TOKEN;

    const url =
      `https://api.mapbox.com/search/searchbox/v1/retrieve/${mapboxId}` +
      `?session_token=cabhq` +
      `&access_token=${token}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Mapbox retrieve failed');
    }

    return response.json();
  }
}