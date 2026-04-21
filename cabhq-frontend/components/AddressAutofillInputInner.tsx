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

type IdealSuggestion = {
  id: string;
  suggestion: string;
};

type IdealAutocompleteResponse = {
  result?: {
    hits?: IdealSuggestion[];
  };
};

type IdealResolvedAddress = {
  line_1?: string;
  line_2?: string;
  line_3?: string;
  post_town?: string;
  county?: string;
  postcode?: string;
  organisation_name?: string;
  udprn?: string;
};

type IdealResolveResponse = {
  result?: IdealResolvedAddress;
};

const IDEAL_API_KEY = process.env.NEXT_PUBLIC_IDEAL_POSTCODES_API_KEY ?? '';

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

    if (!IDEAL_API_KEY) {
      setItems([]);
      setOpen(false);
      setLoading(false);
      setError('Missing NEXT_PUBLIC_IDEAL_POSTCODES_API_KEY');
      return;
    }

    if (query.length < 3) {
      abortRef.current?.abort();
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

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const url = new URL(
          'https://api.ideal-postcodes.co.uk/v1/autocomplete/addresses',
        );

        url.searchParams.set('api_key', IDEAL_API_KEY);
        url.searchParams.set('query', query);

        const response = await fetch(url.toString(), {
          method: 'GET',
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(
            `Ideal Postcodes ${response.status}: ${text || 'request failed'}`,
          );
        }

        const data: IdealAutocompleteResponse = await response.json();
        const hits = Array.isArray(data.result?.hits) ? data.result!.hits! : [];

        const nextItems: Suggestion[] = hits.map((hit) => ({
          id: hit.id,
          label: hit.suggestion,
          postcode: extractPostcode(hit.suggestion),
          placeName: hit.suggestion,
        }));

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
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value]);

  async function selectItem(item: Suggestion) {
    try {
      setSelecting(true);
      setError('');

      const url = new URL(
        `https://api.ideal-postcodes.co.uk/v1/autocomplete/addresses/${encodeURIComponent(
          item.id,
        )}/gbr`,
      );

      url.searchParams.set('api_key', IDEAL_API_KEY);

      const response = await fetch(url.toString(), {
        method: 'GET',
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Ideal Postcodes ${response.status}: ${text || 'resolve failed'}`,
        );
      }

      const data: IdealResolveResponse = await response.json();
      const result = data.result;

      const fullAddress = formatResolvedAddress(result) || item.label;
      const postcode = result?.postcode?.trim() || item.postcode || null;

      onChangeValue(fullAddress);
      onSelectAddress({
        label: fullAddress,
        lat: null,
        lng: null,
        postcode,
        placeName: result?.organisation_name?.trim() || item.placeName || null,
      });

      setItems([]);
      setOpen(false);
      setHighlightedIndex(-1);
      setError('');
    } catch (err: unknown) {
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

      {selecting ? (
        <div className="mt-2 text-xs text-white/50">Loading selected address...</div>
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
                key={item.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  void selectItem(item);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`block w-full border-b border-white/5 px-4 py-3 text-left last:border-b-0 ${
                  active ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <div className="text-sm font-medium text-white">{item.label}</div>
                <div className="mt-1 text-xs text-cyan-300/80">
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

function formatResolvedAddress(address?: IdealResolvedAddress) {
  if (!address) return '';

  const parts = [
    address.line_1,
    address.line_2,
    address.line_3,
    address.post_town,
    address.county,
    address.postcode,
  ]
    .map((part) => part?.trim())
    .filter(Boolean);

  return parts.join(', ');
}

function extractPostcode(text: string) {
  const match = text.match(
    /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i,
  );

  return match ? match[0].toUpperCase() : null;
}