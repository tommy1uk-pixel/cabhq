'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { apiFetch } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';

type AccountProfile = {
  id?: string;
  companyName: string;
  tradingName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  supportEmail: string;
  billingEmail: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postcode: string;
  country: string;
  logoUrl: string;
  primaryColor: string;
  timezone: string;
  currency: string;
  bookingPrefix: string;
  vatNumber: string;
  companyNumber: string;
};

const initialForm: AccountProfile = {
  companyName: '',
  tradingName: '',
  contactName: '',
  email: '',
  phone: '',
  website: '',
  supportEmail: '',
  billingEmail: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  postcode: '',
  country: 'United Kingdom',
  logoUrl: '',
  primaryColor: '#06b6d4',
  timezone: 'Europe/London',
  currency: 'GBP',
  bookingPrefix: 'CAB',
  vatNumber: '',
  companyNumber: '',
};

export default function AccountsPage() {
  const user = getStoredUser();

  const [form, setForm] = useState<AccountProfile>(initialForm);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadAccount() {
      try {
        setLoading(true);
        setError('');

        const data = await apiFetch<Partial<AccountProfile>>('/companies/me');

        if (!mounted) return;

        setForm({
          ...initialForm,
          ...data,
          companyName: data.companyName ?? '',
          tradingName: data.tradingName ?? '',
          contactName: data.contactName ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
          website: data.website ?? '',
          supportEmail: data.supportEmail ?? '',
          billingEmail: data.billingEmail ?? '',
          addressLine1: data.addressLine1 ?? '',
          addressLine2: data.addressLine2 ?? '',
          city: data.city ?? '',
          postcode: data.postcode ?? '',
          country: data.country ?? 'United Kingdom',
          logoUrl: data.logoUrl ?? '',
          primaryColor: data.primaryColor ?? '#06b6d4',
          timezone: data.timezone ?? 'Europe/London',
          currency: data.currency ?? 'GBP',
          bookingPrefix: data.bookingPrefix ?? 'CAB',
          vatNumber: data.vatNumber ?? '',
          companyNumber: data.companyNumber ?? '',
        });
      } catch (err) {
        console.error(err);
        setError('Failed to load account settings');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadAccount();

    return () => {
      mounted = false;
    };
  }, []);

  function setField<K extends keyof AccountProfile>(
    key: K,
    value: AccountProfile[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (success) setSuccess('');
  }

  async function saveSection(
    section: 'profile' | 'branding' | 'business',
    payload: Partial<AccountProfile>,
  ) {
    try {
      setError('');
      setSuccess('');

      if (section === 'profile') setSavingProfile(true);
      if (section === 'branding') setSavingBranding(true);
      if (section === 'business') setSavingBusiness(true);

      await apiFetch('/companies/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setSuccess('Account settings saved');
    } catch (err) {
      console.error(err);
      setError('Failed to save account settings');
    } finally {
      if (section === 'profile') setSavingProfile(false);
      if (section === 'branding') setSavingBranding(false);
      if (section === 'business') setSavingBusiness(false);
    }
  }

  const completion = useMemo(() => {
    const required = [
      form.companyName,
      form.contactName,
      form.email,
      form.phone,
      form.addressLine1,
      form.city,
      form.postcode,
      form.bookingPrefix,
    ];

    const filled = required.filter((value) => value.trim().length > 0).length;
    return Math.round((filled / required.length) * 100);
  }, [
    form.addressLine1,
    form.bookingPrefix,
    form.city,
    form.companyName,
    form.contactName,
    form.email,
    form.phone,
    form.postcode,
  ]);

  return (
    <AdminShell
      title="Accounts"
      subtitle="Company profile, branding, billing contacts and platform settings"
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Company"
            value={form.companyName || '—'}
            hint="Main operator account"
          />
          <StatCard
            label="Profile Completion"
            value={`${completion}%`}
            hint="Core account fields"
          />
          <StatCard
            label="Timezone"
            value={form.timezone || '—'}
            hint="Dispatch operating timezone"
          />
          <StatCard
            label="Currency"
            value={form.currency || '—'}
            hint="Pricing display currency"
          />
          <StatCard
            label="Booking Prefix"
            value={form.bookingPrefix || '—'}
            hint="Reference prefix"
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

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">Company Profile</h2>
                  <p className="mt-1 text-sm text-white/60">
                    Main account details used across dispatch, reporting and contact screens.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void saveSection('profile', {
                      companyName: form.companyName,
                      tradingName: form.tradingName,
                      contactName: form.contactName,
                      email: form.email,
                      phone: form.phone,
                      website: form.website,
                      supportEmail: form.supportEmail,
                      billingEmail: form.billingEmail,
                    })
                  }
                  disabled={loading || savingProfile}
                  className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>

              {loading ? (
                <LoadingBlock label="Loading company profile..." />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Company Name"
                    input={
                      <input
                        value={form.companyName}
                        onChange={(e) => setField('companyName', e.target.value)}
                        className={inputClassName}
                        placeholder="CabHQ Cars Ltd"
                      />
                    }
                  />

                  <Field
                    label="Trading Name"
                    input={
                      <input
                        value={form.tradingName}
                        onChange={(e) => setField('tradingName', e.target.value)}
                        className={inputClassName}
                        placeholder="CabHQ"
                      />
                    }
                  />

                  <Field
                    label="Primary Contact"
                    input={
                      <input
                        value={form.contactName}
                        onChange={(e) => setField('contactName', e.target.value)}
                        className={inputClassName}
                        placeholder="Operations Manager"
                      />
                    }
                  />

                  <Field
                    label="Main Email"
                    input={
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setField('email', e.target.value)}
                        className={inputClassName}
                        placeholder="ops@company.com"
                      />
                    }
                  />

                  <Field
                    label="Phone"
                    input={
                      <input
                        value={form.phone}
                        onChange={(e) => setField('phone', e.target.value)}
                        className={inputClassName}
                        placeholder="020..."
                      />
                    }
                  />

                  <Field
                    label="Website"
                    input={
                      <input
                        value={form.website}
                        onChange={(e) => setField('website', e.target.value)}
                        className={inputClassName}
                        placeholder="https://..."
                      />
                    }
                  />

                  <Field
                    label="Support Email"
                    input={
                      <input
                        type="email"
                        value={form.supportEmail}
                        onChange={(e) => setField('supportEmail', e.target.value)}
                        className={inputClassName}
                        placeholder="support@company.com"
                      />
                    }
                  />

                  <Field
                    label="Billing Email"
                    input={
                      <input
                        type="email"
                        value={form.billingEmail}
                        onChange={(e) => setField('billingEmail', e.target.value)}
                        className={inputClassName}
                        placeholder="billing@company.com"
                      />
                    }
                  />
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">Business Details</h2>
                  <p className="mt-1 text-sm text-white/60">
                    Legal and operational settings used across your platform.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void saveSection('business', {
                      addressLine1: form.addressLine1,
                      addressLine2: form.addressLine2,
                      city: form.city,
                      postcode: form.postcode,
                      country: form.country,
                      timezone: form.timezone,
                      currency: form.currency,
                      bookingPrefix: form.bookingPrefix,
                      vatNumber: form.vatNumber,
                      companyNumber: form.companyNumber,
                    })
                  }
                  disabled={loading || savingBusiness}
                  className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingBusiness ? 'Saving...' : 'Save Business'}
                </button>
              </div>

              {loading ? (
                <LoadingBlock label="Loading business settings..." />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Address Line 1"
                    input={
                      <input
                        value={form.addressLine1}
                        onChange={(e) => setField('addressLine1', e.target.value)}
                        className={inputClassName}
                        placeholder="123 High Street"
                      />
                    }
                  />

                  <Field
                    label="Address Line 2"
                    input={
                      <input
                        value={form.addressLine2}
                        onChange={(e) => setField('addressLine2', e.target.value)}
                        className={inputClassName}
                        placeholder="Suite / Floor / Unit"
                      />
                    }
                  />

                  <Field
                    label="City"
                    input={
                      <input
                        value={form.city}
                        onChange={(e) => setField('city', e.target.value)}
                        className={inputClassName}
                        placeholder="London"
                      />
                    }
                  />

                  <Field
                    label="Postcode"
                    input={
                      <input
                        value={form.postcode}
                        onChange={(e) => setField('postcode', e.target.value)}
                        className={inputClassName}
                        placeholder="SW1A 1AA"
                      />
                    }
                  />

                  <Field
                    label="Country"
                    input={
                      <input
                        value={form.country}
                        onChange={(e) => setField('country', e.target.value)}
                        className={inputClassName}
                        placeholder="United Kingdom"
                      />
                    }
                  />

                  <Field
                    label="Timezone"
                    input={
                      <select
                        value={form.timezone}
                        onChange={(e) => setField('timezone', e.target.value)}
                        className={inputClassName}
                      >
                        <option value="Europe/London">Europe/London</option>
                        <option value="Europe/Dublin">Europe/Dublin</option>
                        <option value="Europe/Paris">Europe/Paris</option>
                        <option value="UTC">UTC</option>
                      </select>
                    }
                  />

                  <Field
                    label="Currency"
                    input={
                      <select
                        value={form.currency}
                        onChange={(e) => setField('currency', e.target.value)}
                        className={inputClassName}
                      >
                        <option value="GBP">GBP</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                      </select>
                    }
                  />

                  <Field
                    label="Booking Prefix"
                    input={
                      <input
                        value={form.bookingPrefix}
                        onChange={(e) =>
                          setField('bookingPrefix', e.target.value.toUpperCase())
                        }
                        className={inputClassName}
                        placeholder="CAB"
                      />
                    }
                  />

                  <Field
                    label="VAT Number"
                    input={
                      <input
                        value={form.vatNumber}
                        onChange={(e) => setField('vatNumber', e.target.value)}
                        className={inputClassName}
                        placeholder="GB..."
                      />
                    }
                  />

                  <Field
                    label="Company Number"
                    input={
                      <input
                        value={form.companyNumber}
                        onChange={(e) => setField('companyNumber', e.target.value)}
                        className={inputClassName}
                        placeholder="12345678"
                      />
                    }
                  />
                </div>
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">Branding</h2>
                  <p className="mt-1 text-sm text-white/60">
                    Basic branding shown across the platform and customer-facing touchpoints.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void saveSection('branding', {
                      logoUrl: form.logoUrl,
                      primaryColor: form.primaryColor,
                    })
                  }
                  disabled={loading || savingBranding}
                  className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingBranding ? 'Saving...' : 'Save Branding'}
                </button>
              </div>

              {loading ? (
                <LoadingBlock label="Loading branding..." />
              ) : (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-5">
                    <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">
                      Preview
                    </p>

                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 text-lg font-bold text-white"
                        style={{ backgroundColor: form.primaryColor || '#06b6d4' }}
                      >
                        {form.companyName?.trim()?.slice(0, 2).toUpperCase() || 'CH'}
                      </div>

                      <div>
                        <p className="text-lg font-semibold text-white">
                          {form.companyName || 'Your Company'}
                        </p>
                        <p className="text-sm text-white/50">
                          {form.tradingName || 'Trading name'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Field
                    label="Logo URL"
                    input={
                      <input
                        value={form.logoUrl}
                        onChange={(e) => setField('logoUrl', e.target.value)}
                        className={inputClassName}
                        placeholder="https://yourdomain.com/logo.png"
                      />
                    }
                  />

                  <Field
                    label="Primary Brand Colour"
                    input={
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={form.primaryColor}
                          onChange={(e) => setField('primaryColor', e.target.value)}
                          className="h-12 w-16 rounded-xl border border-white/10 bg-[#0b1728]"
                        />
                        <input
                          value={form.primaryColor}
                          onChange={(e) => setField('primaryColor', e.target.value)}
                          className={inputClassName}
                          placeholder="#06b6d4"
                        />
                      </div>
                    }
                  />
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-2xl font-bold">Account Snapshot</h2>
              <p className="mt-1 text-sm text-white/60">
                Quick view of the current signed-in operator account.
              </p>

              <div className="mt-5 space-y-3">
                <DetailRow label="User Email" value={user?.email || '—'} />
                <DetailRow label="Role" value={user?.role || '—'} />
                <DetailRow
                  label="Company ID"
                  value={user?.companyId || '—'}
                />
                <DetailRow
                  label="Platform"
                  value="CabHQ Operator Portal"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-2xl font-bold">Recommended Next Steps</h2>
              <p className="mt-1 text-sm text-white/60">
                Useful account setup items to complete.
              </p>

              <div className="mt-5 grid gap-3">
                <ChecklistItem
                  label="Complete company contact details"
                  complete={Boolean(
                    form.companyName && form.contactName && form.email && form.phone,
                  )}
                />
                <ChecklistItem
                  label="Set business address"
                  complete={Boolean(form.addressLine1 && form.city && form.postcode)}
                />
                <ChecklistItem
                  label="Set booking prefix"
                  complete={Boolean(form.bookingPrefix)}
                />
                <ChecklistItem
                  label="Set billing email"
                  complete={Boolean(form.billingEmail)}
                />
                <ChecklistItem
                  label="Choose brand colour"
                  complete={Boolean(form.primaryColor)}
                />
              </div>
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
      <p className="mt-3 truncate text-2xl font-bold text-white">{value}</p>
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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-2 last:border-b-0">
      <span className="text-sm text-white/50">{label}</span>
      <span className="text-right text-sm text-white/85">{value}</span>
    </div>
  );
}

function ChecklistItem({
  label,
  complete,
}: {
  label: string;
  complete: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3">
      <span className="text-sm text-white/80">{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          complete
            ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
        }`}
      >
        {complete ? 'Done' : 'Pending'}
      </span>
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