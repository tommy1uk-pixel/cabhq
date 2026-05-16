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

type AddressAutofillInputInnerProps = {
  label: string;
  value: string;
  placeholder: string;
  autoComplete: string;
  onChangeValue: (value: string) => void;
  onSelectAddress: (address: SelectedAddress) => void;
};

async function searchBackendAddresses(query: string): Promise<Suggestion[]> {
  const data = await apiFetch<Suggestion[]>(
    `/mapbox/search?q=${encodeURIComponent(query)}`,
  );

  return Array.isArray(data) ? data : [];
}

async function retrieveBackendAddress(
  item: Suggestion,
): Promise<RetrievedAddress | null> {
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

        const nextItems = await searchBackendAddresses(query);

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
        selected = await retrieveBackendAddress(item);
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
                key={`${item.id}-${index}`}
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