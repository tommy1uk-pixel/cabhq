'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  lat?: number | null;
  lng?: number | null;
  type?: string;
  postcode?: string | null;
  placeName?: string | null;
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
  lat?: number | null;
  lng?: number | null;
};

type AddressAutofillInputInnerProps = {
  label: string;
  value: string;
  placeholder: string;
  autoComplete: string;
  onChangeValue: (value: string) => void;
  onSelectAddress: (address: SelectedAddress) => void;
};

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;
const RECENT_STORAGE_KEY = 'cabhq_recent_address_selections';
const MAX_RECENTS = 8;

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;

  const numberValue =
    typeof value === 'number' ? value : Number(String(value).trim());

  return Number.isFinite(numberValue) ? numberValue : null;
}

function getValidLatLng(
  lat: number | null,
  lng: number | null,
): { lat: number; lng: number } | null {
  if (lat === null || lng === null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lng < -180 || lng > 180) return null;

  return { lat, lng };
}

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function cleanLabel(value?: string | null) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function getTypeLabel(type?: string | null) {
  const normalised = (type || '').toUpperCase();

  if (normalised.includes('AIRPORT')) return 'Airport';
  if (normalised.includes('POSTCODER')) return 'UK address';
  if (normalised.includes('SEARCHBOX')) return 'POI / place';
  if (normalised.includes('MAPBOX')) return 'Map result';
  if (normalised.includes('KNOWN')) return 'Saved place';
  if (normalised.includes('POI')) return 'Point of interest';
  if (normalised.includes('ADDRESS')) return 'Address';
  if (normalised.includes('STREET')) return 'Street';
  if (normalised.includes('POSTCODE')) return 'Postcode';

  return 'Address result';
}

function getTypeTone(type?: string | null) {
  const normalised = (type || '').toUpperCase();

  if (normalised.includes('AIRPORT')) {
    return 'border-blue-400/30 bg-blue-500/10 text-blue-200';
  }

  if (normalised.includes('POSTCODER')) {
    return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200';
  }

  if (normalised.includes('SEARCHBOX') || normalised.includes('POI')) {
    return 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200';
  }

  if (normalised.includes('KNOWN')) {
    return 'border-violet-400/30 bg-violet-500/10 text-violet-200';
  }

  return 'border-white/10 bg-white/5 text-white/65';
}

function buildRetrievedLabel(selected: RetrievedAddress | null) {
  if (!selected) return '';

  const fromAddress = cleanLabel(selected.address);

  const fromParts = [
    selected.line1,
    selected.line2,
    selected.line3,
    selected.town,
    selected.county,
    selected.postcode,
  ]
    .map((item) => cleanLabel(item))
    .filter(Boolean)
    .join(', ')
    .trim();

  if (fromAddress && fromParts) {
    return fromAddress.length >= fromParts.length ? fromAddress : fromParts;
  }

  return fromAddress || fromParts || '';
}

function chooseBestLabel(itemAddress: string, selected: RetrievedAddress | null) {
  const dropdownLabel = cleanLabel(itemAddress);
  const retrievedLabel = buildRetrievedLabel(selected);

  if (!dropdownLabel) return retrievedLabel;
  if (!retrievedLabel) return dropdownLabel;

  const postcodeRegex = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i;
  const dropdownHasPostcode = postcodeRegex.test(dropdownLabel);
  const retrievedHasPostcode = postcodeRegex.test(retrievedLabel);

  if (dropdownHasPostcode && !retrievedHasPostcode) return dropdownLabel;
  if (retrievedHasPostcode && !dropdownHasPostcode) return retrievedLabel;

  return dropdownLabel.length >= retrievedLabel.length
    ? dropdownLabel
    : retrievedLabel;
}

function getSuggestionCoords(item: Suggestion) {
  return getValidLatLng(
    toNumberOrNull(item.latitude ?? item.lat),
    toNumberOrNull(item.longitude ?? item.lng),
  );
}

function getRetrievedCoords(
  selected: RetrievedAddress | null,
  item: Suggestion,
) {
  return getValidLatLng(
    toNumberOrNull(selected?.latitude ?? selected?.lat ?? item.latitude ?? item.lat),
    toNumberOrNull(selected?.longitude ?? selected?.lng ?? item.longitude ?? item.lng),
  );
}

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

function loadRecentSelections(): SelectedAddress[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        label: cleanLabel(item?.label),
        lat: toNumberOrNull(item?.lat),
        lng: toNumberOrNull(item?.lng),
        postcode: item?.postcode ?? null,
        placeName: item?.placeName ?? null,
      }))
      .filter((item) => item.label && getValidLatLng(item.lat, item.lng));
  } catch {
    return [];
  }
}

function saveRecentSelection(address: SelectedAddress) {
  if (typeof window === 'undefined') return;

  try {
    const current = loadRecentSelections();
    const key = normalise(address.label);

    const next = [
      address,
      ...current.filter((item) => normalise(item.label) !== key),
    ].slice(0, MAX_RECENTS);

    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore localStorage failures
  }
}

function recentToSuggestion(item: SelectedAddress, index: number): Suggestion {
  return {
    id: `RECENT:${index}:${encodeURIComponent(item.label)}`,
    address: item.label,
    latitude: item.lat,
    longitude: item.lng,
    lat: item.lat,
    lng: item.lng,
    postcode: item.postcode,
    placeName: item.placeName,
    type: 'RECENT',
  };
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
  const selectingRef = useRef(false);
  const requestIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [items, setItems] = useState<Suggestion[]>([]);
  const [recentSelections, setRecentSelections] = useState<SelectedAddress[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [error, setError] = useState('');

  const query = value.trim();

  const recentMatches = useMemo(() => {
    if (query.length < 1) {
      return recentSelections.slice(0, 5).map(recentToSuggestion);
    }

    const queryNorm = normalise(query);

    return recentSelections
      .filter((item) => normalise(item.label).includes(queryNorm))
      .slice(0, 5)
      .map(recentToSuggestion);
  }, [recentSelections, query]);

  const displayItems = useMemo(() => {
    const seen = new Set<string>();
    const combined = [...recentMatches, ...items];

    return combined.filter((item) => {
      const key = normalise(item.address || item.id);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [recentMatches, items]);

  useEffect(() => {
    setRecentSelections(loadRecentSelections());
  }, []);

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
    if (selectingRef.current) return;

    if (query.length < MIN_SEARCH_LENGTH) {
      requestIdRef.current += 1;
      setItems([]);
      setLoading(false);
      setHighlightedIndex(recentMatches.length > 0 ? 0 : -1);
      setError('');
      return;
    }

    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;

    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError('');

        const nextItems = await searchBackendAddresses(query);

        if (requestIdRef.current !== currentRequestId) return;

        setItems(nextItems);
        setOpen(true);
        setHighlightedIndex(
          [...recentMatches, ...nextItems].length > 0 ? 0 : -1,
        );

        if (nextItems.length === 0 && recentMatches.length === 0) {
          setError(
            'No results yet. Try a venue, postcode, street, town, stadium, station or airport terminal.',
          );
        }
      } catch (err) {
        if (requestIdRef.current !== currentRequestId) return;

        console.error('Address lookup failed:', err);
        setItems([]);
        setOpen(false);
        setHighlightedIndex(-1);
        setError(err instanceof Error ? err.message : 'Address lookup failed');
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query, recentMatches.length]);

  const selectItem = useCallback(
    async (item: Suggestion) => {
      try {
        selectingRef.current = true;
        requestIdRef.current += 1;
        setSelecting(true);
        setError('');

        let selected: RetrievedAddress | null = null;

        if (!item.id.startsWith('RECENT:')) {
          try {
            selected = await retrieveBackendAddress(item);
          } catch (err) {
            console.warn(
              'Address retrieve failed, using suggestion fallback:',
              err,
            );
          }
        }

        const resolvedLabel = chooseBestLabel(item.address, selected);
        const coords = getRetrievedCoords(selected, item);

        if (!coords) {
          throw new Error(
            'This result has no reliable GPS coordinates. Please select a fuller result, postcode, venue, station, airport terminal or street from the dropdown.',
          );
        }

        const selectedAddress: SelectedAddress = {
          label: resolvedLabel,
          lat: coords.lat,
          lng: coords.lng,
          postcode: selected?.postcode ?? item.postcode ?? null,
          placeName: selected?.line1 ?? item.placeName ?? item.address,
        };

        onChangeValue(resolvedLabel);
        onSelectAddress(selectedAddress);

        saveRecentSelection(selectedAddress);
        setRecentSelections(loadRecentSelections());

        setItems([]);
        setOpen(false);
        setHighlightedIndex(-1);
        setError('');
      } catch (err) {
        console.error('Address resolve failed:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to select address',
        );
      } finally {
        window.setTimeout(() => {
          selectingRef.current = false;
        }, 0);

        setSelecting(false);
      }
    },
    [onChangeValue, onSelectAddress],
  );

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || displayItems.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((prev) =>
        prev >= displayItems.length - 1 ? 0 : prev + 1,
      );
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((prev) =>
        prev <= 0 ? displayItems.length - 1 : prev - 1,
      );
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      if (highlightedIndex >= 0 && highlightedIndex < displayItems.length) {
        void selectItem(displayItems[highlightedIndex]);
      }
    }

    if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  const showDropdown = open && displayItems.length > 0;

  return (
    <div ref={wrapperRef} className="relative">
      {label ? (
        <label className="mb-2 block text-sm font-medium text-white">
          {label}
        </label>
      ) : null}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(event) => {
            selectingRef.current = false;
            onChangeValue(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setRecentSelections(loadRecentSelections());
            if (displayItems.length > 0 || query.length < MIN_SEARCH_LENGTH) {
              setOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 pr-24 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400"
        />

        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <span className="text-xs font-bold text-cyan-300">Searching</span>
          ) : selecting ? (
            <span className="text-xs font-bold text-emerald-300">Selecting</span>
          ) : value ? (
            <span className="text-xs font-bold text-white/35">
              {displayItems.length > 0 ? `${displayItems.length} found` : 'Search'}
            </span>
          ) : null}
        </div>
      </div>

      {!loading && !selecting && error ? (
        <div className="mt-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200">
          {error}
        </div>
      ) : null}

      {query.length > 0 && query.length < MIN_SEARCH_LENGTH ? (
        <div className="mt-2 text-xs text-white/40">
          Type at least {MIN_SEARCH_LENGTH} characters to search everywhere in the UK.
        </div>
      ) : null}

      {showDropdown ? (
        <div className="absolute z-50 mt-2 max-h-96 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#07111f] shadow-2xl">
          <div className="border-b border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
            {query.length < MIN_SEARCH_LENGTH
              ? 'Recent addresses'
              : 'Best UK matches'}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {displayItems.map((item, index) => {
              const active = index === highlightedIndex;
              const itemCoords = getSuggestionCoords(item);
              const isRecent = item.id.startsWith('RECENT:');

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
                    active ? 'bg-cyan-500/10' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm font-bold leading-5 text-white">
                        {item.address}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-1 text-[11px] font-black ${getTypeTone(
                            item.type,
                          )}`}
                        >
                          {isRecent ? 'Recent' : getTypeLabel(item.type)}
                        </span>

                        {itemCoords ? (
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-200">
                            GPS ready
                          </span>
                        ) : (
                          <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-200">
                            Select to resolve GPS
                          </span>
                        )}

                        {item.postcode ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-bold text-white/60">
                            {item.postcode}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="shrink-0 pt-1 text-xs font-black text-white/35">
                      ↵
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="border-t border-white/10 bg-black/20 px-4 py-2 text-[11px] font-semibold text-white/35">
            Search supports streets, postcodes, stadiums, airports, terminals,
            stations, hotels, pubs, hospitals and businesses.
          </div>
        </div>
      ) : null}
    </div>
  );
}
