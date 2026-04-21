'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { apiFetch } from '@/lib/api';

type SettingsForm = {
  dispatchAutoRefreshSeconds: number;
  driverTrackingIntervalSeconds: number;
  autoDispatchEnabled: boolean;
  autoDispatchOfferTimeoutSeconds: number;
  allowManualDispatchOverride: boolean;
  notifyDriversForNewJobs: boolean;
  notifyOperatorsForCancelledJobs: boolean;
  requireDriverPinLogin: boolean;
  allowDriverShiftStartWithoutDocs: boolean;
  defaultTimezone: string;
  defaultCurrency: string;
  defaultCountry: string;
  bookingsRequireQuotedPrice: boolean;
  bookingsRequirePassengerCount: boolean;
  showCompletedJobsOnDispatch: boolean;
  completedJobsCompactMode: boolean;
};

const initialForm: SettingsForm = {
  dispatchAutoRefreshSeconds: 10,
  driverTrackingIntervalSeconds: 10,
  autoDispatchEnabled: true,
  autoDispatchOfferTimeoutSeconds: 20,
  allowManualDispatchOverride: true,
  notifyDriversForNewJobs: true,
  notifyOperatorsForCancelledJobs: true,
  requireDriverPinLogin: true,
  allowDriverShiftStartWithoutDocs: false,
  defaultTimezone: 'Europe/London',
  defaultCurrency: 'GBP',
  defaultCountry: 'United Kingdom',
  bookingsRequireQuotedPrice: false,
  bookingsRequirePassengerCount: true,
  showCompletedJobsOnDispatch: true,
  completedJobsCompactMode: true,
};

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [savingOperations, setSavingOperations] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingBookingRules, setSavingBookingRules] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const data = await apiFetch<Partial<SettingsForm>>('/settings').catch(
          () => ({}),
        );

        if (!mounted) return;

        setForm({
          ...initialForm,
          ...data,
        });
      } catch (err) {
        console.error(err);
        if (mounted) setError('Failed to load settings');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  function setField<K extends keyof SettingsForm>(
    key: K,
    value: SettingsForm[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (success) setSuccess('');
  }

  async function saveSection(
    type: 'operations' | 'notifications' | 'bookingRules',
    payload: Partial<SettingsForm>,
  ) {
    try {
      setError('');
      setSuccess('');

      if (type === 'operations') setSavingOperations(true);
      if (type === 'notifications') setSavingNotifications(true);
      if (type === 'bookingRules') setSavingBookingRules(true);

      await apiFetch('/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setSuccess('Settings saved');
    } catch (err) {
      console.error(err);
      setError('Failed to save settings');
    } finally {
      if (type === 'operations') setSavingOperations(false);
      if (type === 'notifications') setSavingNotifications(false);
      if (type === 'bookingRules') setSavingBookingRules(false);
    }
  }

  const summary = useMemo(() => {
    return {
      refresh: `${form.dispatchAutoRefreshSeconds}s`,
      tracking: `${form.driverTrackingIntervalSeconds}s`,
      autoDispatch: form.autoDispatchEnabled ? 'Enabled' : 'Disabled',
      offerTimeout: `${form.autoDispatchOfferTimeoutSeconds}s`,
    };
  }, [
    form.autoDispatchEnabled,
    form.autoDispatchOfferTimeoutSeconds,
    form.dispatchAutoRefreshSeconds,
    form.driverTrackingIntervalSeconds,
  ]);

  return (
    <AdminShell
      title="Settings"
      subtitle="Dispatch behaviour, notification rules and booking defaults"
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Dispatch Refresh"
            value={summary.refresh}
            hint="Board reload interval"
          />
          <StatCard
            label="GPS Tracking"
            value={summary.tracking}
            hint="Driver update interval"
          />
          <StatCard
            label="Auto Dispatch"
            value={summary.autoDispatch}
            hint="Offer automation"
          />
          <StatCard
            label="Offer Timeout"
            value={summary.offerTimeout}
            hint="Before re-offer"
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

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Operations</h2>
                <p className="mt-1 text-sm text-white/60">
                  Core dispatch and live operations behaviour.
                </p>
              </div>

              <button
                type="button"
                disabled={loading || savingOperations}
                onClick={() =>
                  void saveSection('operations', {
                    dispatchAutoRefreshSeconds: form.dispatchAutoRefreshSeconds,
                    driverTrackingIntervalSeconds:
                      form.driverTrackingIntervalSeconds,
                    autoDispatchEnabled: form.autoDispatchEnabled,
                    autoDispatchOfferTimeoutSeconds:
                      form.autoDispatchOfferTimeoutSeconds,
                    allowManualDispatchOverride:
                      form.allowManualDispatchOverride,
                    requireDriverPinLogin: form.requireDriverPinLogin,
                    allowDriverShiftStartWithoutDocs:
                      form.allowDriverShiftStartWithoutDocs,
                    defaultTimezone: form.defaultTimezone,
                    defaultCurrency: form.defaultCurrency,
                    defaultCountry: form.defaultCountry,
                  })
                }
                className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingOperations ? 'Saving...' : 'Save Operations'}
              </button>
            </div>

            {loading ? (
              <LoadingBlock label="Loading operations settings..." />
            ) : (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Dispatch auto refresh (seconds)"
                    input={
                      <input
                        type="number"
                        min={3}
                        value={form.dispatchAutoRefreshSeconds}
                        onChange={(e) =>
                          setField(
                            'dispatchAutoRefreshSeconds',
                            Number(e.target.value),
                          )
                        }
                        className={inputClassName}
                      />
                    }
                  />

                  <Field
                    label="Driver tracking interval (seconds)"
                    input={
                      <input
                        type="number"
                        min={3}
                        value={form.driverTrackingIntervalSeconds}
                        onChange={(e) =>
                          setField(
                            'driverTrackingIntervalSeconds',
                            Number(e.target.value),
                          )
                        }
                        className={inputClassName}
                      />
                    }
                  />

                  <Field
                    label="Auto dispatch offer timeout (seconds)"
                    input={
                      <input
                        type="number"
                        min={5}
                        value={form.autoDispatchOfferTimeoutSeconds}
                        onChange={(e) =>
                          setField(
                            'autoDispatchOfferTimeoutSeconds',
                            Number(e.target.value),
                          )
                        }
                        className={inputClassName}
                      />
                    }
                  />

                  <Field
                    label="Timezone"
                    input={
                      <select
                        value={form.defaultTimezone}
                        onChange={(e) =>
                          setField('defaultTimezone', e.target.value)
                        }
                        className={inputClassName}
                      >
                        <option value="Europe/London">Europe/London</option>
                        <option value="Europe/Dublin">Europe/Dublin</option>
                        <option value="UTC">UTC</option>
                      </select>
                    }
                  />

                  <Field
                    label="Currency"
                    input={
                      <select
                        value={form.defaultCurrency}
                        onChange={(e) =>
                          setField('defaultCurrency', e.target.value)
                        }
                        className={inputClassName}
                      >
                        <option value="GBP">GBP</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                      </select>
                    }
                  />

                  <Field
                    label="Country"
                    input={
                      <input
                        value={form.defaultCountry}
                        onChange={(e) =>
                          setField('defaultCountry', e.target.value)
                        }
                        className={inputClassName}
                        placeholder="United Kingdom"
                      />
                    }
                  />
                </div>

                <div className="grid gap-3">
                  <ToggleRow
                    label="Enable auto dispatch"
                    description="Automatically offer jobs to nearby eligible drivers."
                    checked={form.autoDispatchEnabled}
                    onChange={(checked) =>
                      setField('autoDispatchEnabled', checked)
                    }
                  />

                  <ToggleRow
                    label="Allow manual dispatch override"
                    description="Operators can still manually assign over auto-dispatch logic."
                    checked={form.allowManualDispatchOverride}
                    onChange={(checked) =>
                      setField('allowManualDispatchOverride', checked)
                    }
                  />

                  <ToggleRow
                    label="Require driver PIN login"
                    description="Drivers must log in using their PIN in the driver app."
                    checked={form.requireDriverPinLogin}
                    onChange={(checked) =>
                      setField('requireDriverPinLogin', checked)
                    }
                  />

                  <ToggleRow
                    label="Allow shift start without compliance clearance"
                    description="Lets drivers start shift even if docs are incomplete."
                    checked={form.allowDriverShiftStartWithoutDocs}
                    onChange={(checked) =>
                      setField('allowDriverShiftStartWithoutDocs', checked)
                    }
                  />
                </div>
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">Notifications</h2>
                  <p className="mt-1 text-sm text-white/60">
                    Operator and driver alert behaviour.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={loading || savingNotifications}
                  onClick={() =>
                    void saveSection('notifications', {
                      notifyDriversForNewJobs: form.notifyDriversForNewJobs,
                      notifyOperatorsForCancelledJobs:
                        form.notifyOperatorsForCancelledJobs,
                    })
                  }
                  className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingNotifications ? 'Saving...' : 'Save Notifications'}
                </button>
              </div>

              {loading ? (
                <LoadingBlock label="Loading notification settings..." />
              ) : (
                <div className="grid gap-3">
                  <ToggleRow
                    label="Notify drivers for new jobs"
                    description="Send job offer alerts to drivers when dispatch creates an offer."
                    checked={form.notifyDriversForNewJobs}
                    onChange={(checked) =>
                      setField('notifyDriversForNewJobs', checked)
                    }
                  />

                  <ToggleRow
                    label="Notify operators for cancelled jobs"
                    description="Show alerts when a booking gets cancelled or marked no-show."
                    checked={form.notifyOperatorsForCancelledJobs}
                    onChange={(checked) =>
                      setField('notifyOperatorsForCancelledJobs', checked)
                    }
                  />
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">Booking Rules</h2>
                  <p className="mt-1 text-sm text-white/60">
                    Defaults for job creation and dispatch board display.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={loading || savingBookingRules}
                  onClick={() =>
                    void saveSection('bookingRules', {
                      bookingsRequireQuotedPrice: form.bookingsRequireQuotedPrice,
                      bookingsRequirePassengerCount:
                        form.bookingsRequirePassengerCount,
                      showCompletedJobsOnDispatch: form.showCompletedJobsOnDispatch,
                      completedJobsCompactMode: form.completedJobsCompactMode,
                    })
                  }
                  className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingBookingRules ? 'Saving...' : 'Save Booking Rules'}
                </button>
              </div>

              {loading ? (
                <LoadingBlock label="Loading booking rules..." />
              ) : (
                <div className="grid gap-3">
                  <ToggleRow
                    label="Require quoted price on bookings"
                    description="Operators must enter a fare before saving the booking."
                    checked={form.bookingsRequireQuotedPrice}
                    onChange={(checked) =>
                      setField('bookingsRequireQuotedPrice', checked)
                    }
                  />

                  <ToggleRow
                    label="Require passenger count"
                    description="Passenger count field must be filled on each booking."
                    checked={form.bookingsRequirePassengerCount}
                    onChange={(checked) =>
                      setField('bookingsRequirePassengerCount', checked)
                    }
                  />

                  <ToggleRow
                    label="Show completed jobs on dispatch"
                    description="Completed and cancelled jobs stay visible on dispatch board."
                    checked={form.showCompletedJobsOnDispatch}
                    onChange={(checked) =>
                      setField('showCompletedJobsOnDispatch', checked)
                    }
                  />

                  <ToggleRow
                    label="Completed jobs compact mode"
                    description="Shows completed jobs as smaller strips to save space."
                    checked={form.completedJobsCompactMode}
                    onChange={(checked) =>
                      setField('completedJobsCompactMode', checked)
                    }
                  />
                </div>
              )}
            </div>
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

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-sm text-white/60">
      {label}
    </div>
  );
}

const inputClassName =
  'w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50';