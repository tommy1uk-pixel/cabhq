'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';

export type SelectedAddress = {
  label: string;
  lat: number | null;
  lng: number | null;
  postcode?: string | null;
  placeName?: string | null;
};

type Suggestion = {
  id: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  type?: string;
  source?: 'ideal-postcodes' | 'backend-mapbox';
  retrieveUrl?: string | null;
};

type RetrievedAddress = {
  id?: string;
  address?: string;
  line1?: string | null;
  line2?: string | null;
  line3?: string | null;
  town?: string | null;
  county?: string | null;
  postcode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type IdealAutocompleteHit = {
  suggestion?: string;
  urls?: {
    udprn?: string;
  };
  udprn?: number | string;
};

type IdealAutocompleteResponse = {
  result?: {
    hits?: IdealAutocompleteHit[];
  };
};

type IdealAddressResult = {
  line_1?: string | null;
  line_2?: string | null;
  line_3?: string | null;
  post_town?: string | null;
  county?: string | null;
  postcode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  formatted_address?: string[];
};

type IdealRetrieveResponse = {
  result?: IdealAddressResult;
};

type AddressAutofillInputInnerProps = {
  label: string;
  value: string;
  placeholder: string;
  autoComplete: string;
  onChangeValue: (value: string) => void;
  onSelectAddress: (address: SelectedAddress) => void;
};

const IDEAL_POSTCODES_API_KEY =
  process.env.NEXT_PUBLIC_IDEAL_POSTCODES_API_KEY || '';

function normalisePostcodeQuery(query: string) {
  return query.trim().replace(/\s+/g, ' ').toUpperCase();
}

function formatIdealAddress(address: IdealAddressResult) {
  const formatted = Array.isArray(address.formatted_address)
    ? address.formatted_address.filter(Boolean)
    : [];

  if (formatted.length > 0) {
    return formatted.join(', ');
  }

  return [
    address.line_1,
    address.line_2,
    address.line_3,
    address.post_town,
    address.county,
    address.postcode,
  ]
    .filter(Boolean)
    .join(', ');
}

async function searchIdealPostcodes(query: string): Promise<Suggestion[]> {
  if (!IDEAL_POSTCODES_API_KEY) {
    return [];
  }

  const url = new URL('https://api.ideal-postcodes.co.uk/v1/autocomplete/addresses');
  url.searchParams.set('api_key', IDEAL_POSTCODES_API_KEY);
  url.searchParams.set('query', normalisePostcodeQuery(query));
  url.searchParams.set('limit', '10');

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Ideal Postcodes search failed (${response.status})`);
  }

  const data = (await response.json()) as IdealAutocompleteResponse;
  const hits = data.result?.hits ?? [];

  return hits
    .map((hit, index): Suggestion | null => {
      const address = hit.suggestion?.trim();
      const retrieveUrl = hit.urls?.udprn ?? null;
      const fallbackId = hit.udprn ? String(hit.udprn) : String(index);

      if (!address) return null;

      return {
        id: retrieveUrl || fallbackId,
        address,
        latitude: null,
        longitude: null,
        type: 'address',
        source: 'ideal-postcodes',
        retrieveUrl,
      };
    })
    .filter(Boolean) as Suggestion[];
}

async function retrieveIdealAddress(item: Suggestion): Promise<RetrievedAddress | null> {
  if (!IDEAL_POSTCODES_API_KEY || item.source !== 'ideal-postcodes') {
    return null;
  }

  if (!item.retrieveUrl) {
    return null;
  }

  const url = item.retrieveUrl.startsWith('http')
    ? new URL(item.retrieveUrl)
    : new URL(`https://api.ideal-postcodes.co.uk${item.retrieveUrl}`);

  url.searchParams.set('api_key', IDEAL_POSTCODES_API_KEY);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Ideal Postcodes retrieve failed (${response.status})`);
  }

  const data = (await response.json()) as IdealRetrieveResponse;
  const result = data.result;

  if (!result) {
    return null;
  }

  const address = formatIdealAddress(result) || item.address;

  return {
    id: item.id,
    address,
    line1: result.line_1 ?? null,
    line2: result.line_2 ?? null,
    line3: result.line_3 ?? null,
    town: result.post_town ?? null,
    county: result.county ?? null,
    postcode: result.postcode ?? null,
    latitude: result.latitude ?? null,
    longitude: result.longitude ?? null,
  };
}

async function searchBackendMapbox(query: string): Promise<Suggestion[]> {
  const data = await apiFetch<Suggestion[]>(
    `/mapbox/search?q=${encodeURIComponent(query)}`,
  );

  const items = Array.isArray(data) ? data : [];

  return items.map((item) => ({
    ...item,
    source: 'backend-mapbox',
  }));
}

async function retrieveBackendMapbox(item: Suggestion): Promise<RetrievedAddress | null> {
  const selected = await apiFetch<RetrievedAddress>(
    `/mapbox/retrieve?id=${encodeURIComponent(item.id)}`,
  );

  return selected ?? null;
}

export default function AddressAutofillInputInner({
  label,
  value,
  placeholder,
  autoComplete,
  onChangeValue,
  onSelectAddress,
}: AddressAutofillInputInnerProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [error, setError] = useState('');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;

      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const query = value.trim();

    if (query.length < 3) {
      setItems([]);
      setOpen(false);
      setLoading(false);
      setHighlightedIndex(-1);
      setError('');
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError('');

        let nextItems: Suggestion[] = [];

        try {
          nextItems = await searchIdealPostcodes(query);
        } catch (idealError) {
          console.warn('Ideal Postcodes lookup failed, falling back to backend Mapbox:', idealError);
        }

        if (nextItems.length === 0) {
          try {
            nextItems = await searchBackendMapbox(query);
          } catch (mapboxError) {
            console.warn('Backend Mapbox lookup failed:', mapboxError);
          }
        }

        setItems(nextItems);
        setOpen(nextItems.length > 0);
        setHighlightedIndex(nextItems.length > 0 ? 0 : -1);

        if (nextItems.length === 0) {
          setError('No addresses found');
        }
      } catch (err) {
        console.error('Address lookup failed:', err);
        setItems([]);
        setOpen(false);
        setHighlightedIndex(-1);
        setError(err instanceof Error ? err.message : 'Address lookup failed');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value]);

  async function selectItem(item: Suggestion) {
    try {
      setSelecting(true);
      setError('');

      let selected: RetrievedAddress | null = null;

      try {
        if (item.source === 'ideal-postcodes') {
          selected = await retrieveIdealAddress(item);
        } else {
          selected = await retrieveBackendMapbox(item);
        }
      } catch (err) {
        console.warn('Address retrieve failed, using suggestion fallback:', err);
      }

      const label = selected?.address || item.address;
      const lat = selected?.latitude ?? item.latitude ?? null;
      const lng = selected?.longitude ?? item.longitude ?? null;

      onChangeValue(label);

      onSelectAddress({
        label,
        lat,
        lng,
        postcode: selected?.postcode ?? null,
        placeName: selected?.line1 ?? item.address,
      });

      setItems([]);
      setOpen(false);
      setHighlightedIndex(-1);
      setError('');
    } catch (err) {
      console.error('Address resolve failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to select address');
    } finally {
      setSelecting(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((prev) => {
        if (prev >= items.length - 1) return 0;
        return prev + 1;
      });
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((prev) => {
        if (prev <= 0) return items.length - 1;
        return prev - 1;
      });
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      if (highlightedIndex >= 0 && highlightedIndex < items.length) {
        void selectItem(items[highlightedIndex]);
      }
    }

    if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-2 block text-sm font-medium text-white">
        {label}
      </label>

      <input
        type="text"
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => {
          onChangeValue(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (items.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400"
      />

      {loading ? (
        <div className="mt-2 text-xs text-white/50">Searching addresses...</div>
      ) : null}

      {selecting ? (
        <div className="mt-2 text-xs text-white/50">
          Loading full address...
        </div>
      ) : null}

      {!loading && !selecting && error ? (
        <div className="mt-2 text-xs text-amber-300">{error}</div>
      ) : null}

      {open && items.length > 0 ? (
        <div className="absolute z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#07111f] shadow-2xl">
          {items.map((item, index) => {
            const active = index === highlightedIndex;

            return (
              <button
                key={`${item.source}-${item.id}-${index}`}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  void selectItem(item);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`block w-full border-b border-white/5 px-4 py-3 text-left last:border-b-0 ${
                  active ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <div className="text-sm font-medium text-white">
                  {item.address}
                </div>

                <div className="mt-1 text-xs text-cyan-300/80">
                  {item.latitude != null && item.longitude != null
                    ? `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}`
                    : item.source === 'ideal-postcodes'
                      ? 'UK address result'
                      : 'Click to load full address'}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
