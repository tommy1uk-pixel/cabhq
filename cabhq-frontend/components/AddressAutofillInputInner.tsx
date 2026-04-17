'use client';

import { useEffect, useRef, useState } from 'react';

export type SelectedAddress = {
  label: string;
  lat: number | null;
  lng: number | null;
  postcode?: string | null;
  placeName?: string | null;
};

type Suggestion = {
  id: string;
  label: string;
  lat: number | null;
  lng: number | null;
  postcode?: string | null;
  placeName?: string | null;
};

type AddressAutofillInputInnerProps = {
  label: string;
  value: string;
  placeholder: string;
  autoComplete: string;
  onChangeValue: (value: string) => void;
  onSelectAddress: (address: SelectedAddress) => void;
};

type MapboxContextItem = {
  id?: string;
  text?: string;
};

type MapboxFeature = {
  id?: string;
  place_name?: string;
  text?: string;
  center?: [number, number] | number[] | null;
  context?: MapboxContextItem[] | null;
  properties?: {
    full_address?: string;
  } | null;
};

type MapboxResponse = {
  features?: MapboxFeature[];
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

export default function AddressAutofillInputInner({
  label,
  value,
  placeholder,
  autoComplete,
  onChangeValue,
  onSelectAddress,
}: AddressAutofillInputInnerProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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

    if (!MAPBOX_TOKEN) {
      setItems([]);
      setOpen(false);
      setLoading(false);
      setError('Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN');
      return;
    }

    if (query.length < 3) {
      setItems([]);
      setOpen(false);
      setLoading(false);
      setError('');
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError('');

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const url = new URL(
          'https://api.mapbox.com/geocoding/v5/mapbox.places/' +
            encodeURIComponent(query) +
            '.json',
        );

        url.searchParams.set('access_token', MAPBOX_TOKEN);
        url.searchParams.set('autocomplete', 'true');
        url.searchParams.set('country', 'gb');
        url.searchParams.set('language', 'en');
        url.searchParams.set('limit', '8');
        url.searchParams.set(
          'types',
          'address,postcode,place,locality,neighborhood',
        );

        const response = await fetch(url.toString(), {
          method: 'GET',
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Mapbox ${response.status}: ${text || 'request failed'}`);
        }

        const data: MapboxResponse = await response.json();
        const features = Array.isArray(data.features) ? data.features : [];

        const nextItems: Suggestion[] = features.map((feature, index) => {
          const placeName =
            feature.place_name ||
            feature.text ||
            feature.properties?.full_address ||
            query;

          const center = Array.isArray(feature.center) ? feature.center : [null, null];
          const lng = typeof center[0] === 'number' ? center[0] : null;
          const lat = typeof center[1] === 'number' ? center[1] : null;

          const postcodeContext = Array.isArray(feature.context)
            ? feature.context.find((ctx) =>
                String(ctx?.id || '').startsWith('postcode'),
              )
            : null;

          return {
            id: feature.id || `${placeName}-${index}`,
            label: placeName,
            lat,
            lng,
            postcode: postcodeContext?.text ?? null,
            placeName,
          };
        });

        setItems(nextItems);
        setOpen(nextItems.length > 0);
        setHighlightedIndex(nextItems.length > 0 ? 0 : -1);

        if (nextItems.length === 0) {
          setError('No addresses found');
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

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

  function selectItem(item: Suggestion) {
    onChangeValue(item.label);
    onSelectAddress({
      label: item.label,
      lat: item.lat,
      lng: item.lng,
      postcode: item.postcode ?? null,
      placeName: item.placeName ?? null,
    });
    setItems([]);
    setOpen(false);
    setHighlightedIndex(-1);
    setError('');
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
        selectItem(items[highlightedIndex]);
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
        onChange={(e) => {
          onChangeValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (items.length > 0) {
            setOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white placeholder:text-white/30 outline-none transition focus:border-cyan-400"
      />

      {loading ? (
        <div className="mt-2 text-xs text-white/50">Searching addresses...</div>
      ) : null}

      {!loading && error ? (
        <div className="mt-2 text-xs text-amber-300">{error}</div>
      ) : null}

      {open && items.length > 0 ? (
        <div className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#07111f] shadow-2xl">
          {items.map((item, index) => {
            const active = index === highlightedIndex;

            return (
              <button
                key={item.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectItem(item);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`block w-full border-b border-white/5 px-4 py-3 text-left last:border-b-0 ${
                  active ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <div className="text-sm font-medium text-white">{item.label}</div>
                <div className="mt-1 text-xs text-white/45">
                  {item.postcode || 'Select address'}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}