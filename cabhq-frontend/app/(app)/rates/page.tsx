'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { apiFetch } from '@/lib/api';

type RateCard = {
  id: string;
  name: string;
  active: boolean;
  baseFare: number;
  minimumFare: number;
  pricePerMile: number;
  pricePerMinute: number;
  waitingPerMinute: number;
  nightSurcharge: number;
  weekendSurcharge: number;
  airportPickupFee: number;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type RateForm = {
  name: string;
  active: boolean;
  baseFare: string;
  minimumFare: string;
  pricePerMile: string;
  pricePerMinute: string;
  waitingPerMinute: string;
  nightSurcharge: string;
  weekendSurcharge: string;
  airportPickupFee: string;
  notes: string;
};

const initialForm: RateForm = {
  name: '',
  active: true,
  baseFare: '3.00',
  minimumFare: '6.00',
  pricePerMile: '2.00',
  pricePerMinute: '0.25',
  waitingPerMinute: '0.30',
  nightSurcharge: '0.00',
  weekendSurcharge: '0.00',
  airportPickupFee: '0.00',
  notes: '',
};

function formatCurrency(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '£0.00';
  return `£${value.toFixed(2)}`;
}

export default function RatesPage() {
  const [rates, setRates] = useState<RateCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingRateId, setDeletingRateId] = useState<string | null>(null);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [form, setForm] = useState<RateForm>(initialForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const data = await apiFetch<RateCard[]>('/rates').catch(() => []);
        if (!mounted) return;
        setRates(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  function setField<K extends keyof RateForm>(key: K, value: RateForm[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (success) setSuccess('');
  }

  function resetForm() {
    setForm(initialForm);
    setEditingRateId(null);
  }

  function startEdit(rate: RateCard) {
    setEditingRateId(rate.id);
    setForm({
      name: rate.name ?? '',
      active: rate.active ?? true,
      baseFare: String(rate.baseFare ?? 0),
      minimumFare: String(rate.minimumFare ?? 0),
      pricePerMile: String(rate.pricePerMile ?? 0),
      pricePerMinute: String(rate.pricePerMinute ?? 0),
      waitingPerMinute: String(rate.waitingPerMinute ?? 0),
      nightSurcharge: String(rate.nightSurcharge ?? 0),
      weekendSurcharge: String(rate.weekendSurcharge ?? 0),
      airportPickupFee: String(rate.airportPickupFee ?? 0),
      notes: rate.notes ?? '',
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitRate(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload = {
        name: form.name.trim(),
        active: form.active,
        baseFare: Number(form.baseFare || 0),
        minimumFare: Number(form.minimumFare || 0),
        pricePerMile: Number(form.pricePerMile || 0),
        pricePerMinute: Number(form.pricePerMinute || 0),
        waitingPerMinute: Number(form.waitingPerMinute || 0),
        nightSurcharge: Number(form.nightSurcharge || 0),
        weekendSurcharge: Number(form.weekendSurcharge || 0),
        airportPickupFee: Number(form.airportPickupFee || 0),
        notes: form.notes.trim() || null,
      };

      if (!payload.name) {
        throw new Error('Rate name is required');
      }

      if (editingRateId) {
        await apiFetch(`/rates/${editingRateId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/rates', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      const refreshed = await apiFetch<RateCard[]>('/rates').catch(() => []);
      setRates(Array.isArray(refreshed) ? refreshed : []);
      setSuccess(editingRateId ? 'Rate updated' : 'Rate created');
      resetForm();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save rate');
    } finally {
      setSaving(false);
    }
  }

  async function deleteRate(rateId: string) {
    const confirmed = window.confirm('Delete this rate card?');
    if (!confirmed) return;

    try {
      setDeletingRateId(rateId);
      setError('');
      setSuccess('');

      await apiFetch(`/rates/${rateId}`, {
        method: 'DELETE',
      });

      setRates((current) => current.filter((rate) => rate.id !== rateId));
      if (editingRateId === rateId) {
        resetForm();
      }
      setSuccess('Rate deleted');
    } catch (err) {
      console.error(err);
      setError('Failed to delete rate');
    } finally {
      setDeletingRateId(null);
    }
  }

  const activeRates = useMemo(
    () => rates.filter((rate) => rate.active).length,
    [rates],
  );

  const averages = useMemo(() => {
    if (rates.length === 0) {
      return {
        baseFare: 0,
        perMile: 0,
        minimumFare: 0,
      };
    }

    return {
      baseFare:
        rates.reduce((sum, rate) => sum + (rate.baseFare ?? 0), 0) / rates.length,
      perMile:
        rates.reduce((sum, rate) => sum + (rate.pricePerMile ?? 0), 0) /
        rates.length,
      minimumFare:
        rates.reduce((sum, rate) => sum + (rate.minimumFare ?? 0), 0) /
        rates.length,
    };
  }, [rates]);

  return (
    <AdminShell
      title="Rates"
      subtitle="Fare cards, trip pricing rules and surcharge configuration"
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Rate Cards" value={String(rates.length)} hint="All pricing profiles" />
          <StatCard label="Active Rates" value={String(activeRates)} hint="Currently enabled" />
          <StatCard
            label="Avg Base Fare"
            value={formatCurrency(averages.baseFare)}
            hint="Across all rate cards"
          />
          <StatCard
            label="Avg Minimum Fare"
            value={formatCurrency(averages.minimumFare)}
            hint="Across all rate cards"
          />
        </section>

        {(error || success) && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              error
                ? 'border-red-500/30 bg-red-500/10 text-red-200'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
            }`}
          >
            {error || success}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">
                  {editingRateId ? 'Edit Rate' : 'Create Rate'}
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Set fare logic, mileage pricing and operational surcharges.
                </p>
              </div>

              {editingRateId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>

            <form onSubmit={submitRate} className="space-y-5">
              <Field
                label="Rate Name"
                input={
                  <input
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="Standard Tariff"
                    className={inputClassName}
                  />
                }
              />

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Field
                  label="Base Fare"
                  input={
                    <input
                      value={form.baseFare}
                      onChange={(e) => setField('baseFare', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Minimum Fare"
                  input={
                    <input
                      value={form.minimumFare}
                      onChange={(e) => setField('minimumFare', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Price Per Mile"
                  input={
                    <input
                      value={form.pricePerMile}
                      onChange={(e) => setField('pricePerMile', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Price Per Minute"
                  input={
                    <input
                      value={form.pricePerMinute}
                      onChange={(e) => setField('pricePerMinute', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Waiting Per Minute"
                  input={
                    <input
                      value={form.waitingPerMinute}
                      onChange={(e) =>
                        setField('waitingPerMinute', e.target.value)
                      }
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Night Surcharge"
                  input={
                    <input
                      value={form.nightSurcharge}
                      onChange={(e) =>
                        setField('nightSurcharge', e.target.value)
                      }
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Weekend Surcharge"
                  input={
                    <input
                      value={form.weekendSurcharge}
                      onChange={(e) =>
                        setField('weekendSurcharge', e.target.value)
                      }
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Airport Pickup Fee"
                  input={
                    <input
                      value={form.airportPickupFee}
                      onChange={(e) =>
                        setField('airportPickupFee', e.target.value)
                      }
                      className={inputClassName}
                    />
                  }
                />
              </div>

              <Field
                label="Notes"
                input={
                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                    className={`${inputClassName} resize-none`}
                    placeholder="Optional notes about this tariff..."
                  />
                }
              />

              <ToggleRow
                label="Active"
                description="Enable this rate card for use in pricing."
                checked={form.active}
                onChange={(checked) => setField('active', checked)}
              />

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-cyan-600 px-4 py-3 font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? editingRateId
                    ? 'Saving Rate...'
                    : 'Creating Rate...'
                  : editingRateId
                    ? 'Save Rate Changes'
                    : 'Create Rate'}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Rate Cards</h2>
                <p className="mt-1 text-sm text-white/60">
                  Manage active fare profiles and pricing structures.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0b1728] px-3 py-2 text-sm text-white/70">
                Avg per mile:{' '}
                <span className="font-semibold text-white">
                  {formatCurrency(averages.perMile)}
                </span>
              </div>
            </div>

            {loading ? (
              <LoadingBlock label="Loading rates..." />
            ) : rates.length === 0 ? (
              <LoadingBlock label="No rate cards created yet." />
            ) : (
              <div className="space-y-4">
                {rates.map((rate) => (
                  <div
                    key={rate.id}
                    className="rounded-2xl border border-white/10 bg-[#0b1728] p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-bold">{rate.name}</h3>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              rate.active
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                : 'border-slate-500/30 bg-slate-500/10 text-slate-300'
                            }`}
                          >
                            {rate.active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <MiniStat
                            label="Base Fare"
                            value={formatCurrency(rate.baseFare)}
                          />
                          <MiniStat
                            label="Minimum Fare"
                            value={formatCurrency(rate.minimumFare)}
                          />
                          <MiniStat
                            label="Per Mile"
                            value={formatCurrency(rate.pricePerMile)}
                          />
                          <MiniStat
                            label="Per Minute"
                            value={formatCurrency(rate.pricePerMinute)}
                          />
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <MiniStat
                            label="Waiting"
                            value={formatCurrency(rate.waitingPerMinute)}
                          />
                          <MiniStat
                            label="Night"
                            value={formatCurrency(rate.nightSurcharge)}
                          />
                          <MiniStat
                            label="Weekend"
                            value={formatCurrency(rate.weekendSurcharge)}
                          />
                        </div>

                        <div className="mt-3">
                          <MiniStat
                            label="Airport Pickup Fee"
                            value={formatCurrency(rate.airportPickupFee)}
                          />
                        </div>

                        {rate.notes ? (
                          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/65">
                            {rate.notes}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(rate)}
                          className="rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => void deleteRate(rate.id)}
                          disabled={deletingRateId === rate.id}
                          className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingRateId === rate.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm font-medium text-white/60">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-xs text-white/45">{hint}</p>
    </div>
  );
}

function Field({
  label,
  input,
}: {
  label: string;
  input: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-white/75">{label}</span>
      {input}
    </label>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-4">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="mt-1 text-xs text-white/50">{description}</p>
      </div>

      <label className="mt-1 inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span
          className={`relative h-6 w-11 rounded-full transition ${
            checked ? 'bg-cyan-500' : 'bg-white/10'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
              checked ? 'left-[22px]' : 'left-[2px]'
            }`}
          />
        </span>
      </label>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-sm text-white/60">
      {label}
    </div>
  );
}

const inputClassName =
  'w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50';