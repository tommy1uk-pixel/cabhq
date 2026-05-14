'use client';

import { useEffect, useRef, useState } from 'react';

type SelectedAddress = {
  label: string;
  lat: number | null;
  lng: number | null;
  postcode?: string | null;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelectAddress?: (address: SelectedAddress) => void;
  placeholder?: string;
};

type Suggestion = {
  id: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
};

type RetrievedAddress = {
  address: string;
  postcode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export default function AddressAutocomplete({
  value,
  onChange,
  onSelectAddress,
  placeholder,
}: Props) {
  const [results, setResults] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [skipNextSearch, setSkipNextSearch] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setResults([]);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setResults([]);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (skipNextSearch) {
      setSkipNextSearch(false);
      return;
    }

    if (!value || value.trim().length < 3) {
      setResults([]);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `http://localhost:3002/mapbox/search?q=${encodeURIComponent(value)}`,
        );

        if (!res.ok) {
          setResults([]);
          return;
        }

        const data: unknown = await res.json();
        setResults(Array.isArray(data) ? (data as Suggestion[]) : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, skipNextSearch]);

  async function selectAddress(result: Suggestion) {
    try {
      setResolving(true);
      setSkipNextSearch(true);

      const res = await fetch(
        `http://localhost:3002/mapbox/retrieve?id=${encodeURIComponent(
          result.id,
        )}`,
      );

      if (!res.ok) {
        onChange(result.address);

        onSelectAddress?.({
          label: result.address,
          lat: result.latitude ?? null,
          lng: result.longitude ?? null,
        });

        setResults([]);
        return;
      }

      const fullAddress = (await res.json()) as RetrievedAddress;

      const label = fullAddress.address || result.address;
      const lat = fullAddress.latitude ?? result.latitude ?? null;
      const lng = fullAddress.longitude ?? result.longitude ?? null;

      onChange(label);

      onSelectAddress?.({
        label,
        lat,
        lng,
        postcode: fullAddress.postcode ?? null,
      });

      setResults([]);
    } catch {
      onChange(result.address);

      onSelectAddress?.({
        label: result.address,
        lat: result.latitude ?? null,
        lng: result.longitude ?? null,
      });

      setResults([]);
    } finally {
      setResolving(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        value={value}
        onChange={(e) => {
          setSkipNextSearch(false);
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-500/50"
      />

      {results.length > 0 ? (
        <div className="absolute z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#07111f] shadow-2xl">
          {results.map((result, index) => (
            <button
              key={`${result.id}-${index}`}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                void selectAddress(result);
              }}
              className="block w-full border-b border-white/5 px-4 py-3 text-left text-sm text-white/80 transition hover:bg-cyan-500/10 hover:text-white"
            >
              <span className="block font-medium">{result.address}</span>
              <span className="mt-1 block text-xs text-white/35">
                Click to load full address
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-2 text-xs text-white/40">Searching addresses...</div>
      ) : null}

      {resolving ? (
        <div className="mt-2 text-xs text-cyan-300">
          Loading full address...
        </div>
      ) : null}
    </div>
  );
}