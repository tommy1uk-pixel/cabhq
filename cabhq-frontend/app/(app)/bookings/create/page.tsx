'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import AddressAutofillInput, {
  type SelectedAddress,
} from '@/components/AddressAutofillInput';
import { apiFetch } from '@/lib/api';

type Account = {
  id: string;
  name: string;
  code?: string | null;
  status?: string;
};

type BookingResponse = {
  id: string;
  reference: string;
};

type FormState = {
  pickup: string;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoff: string;
  dropoffLat: number | null;
  dropoffLng: number | null;
  pickupTime: string;
  quotedPrice: string;
  passengerCount: string;
  notes: string;
  accountId: string;
  customerName: string;
  customerPhone: string;
  isThirdPartyBooking: boolean;
  bookerName: string;
  bookerPhone: string;
  bookerEmail: string;
  passengerName: string;
  passengerPhone: string;
  passengerNotes: string;
  autoDispatch: boolean;
};

const initialForm: FormState = {
  pickup: '',
  pickupLat: null,
  pickupLng: null,
  dropoff: '',
  dropoffLat: null,
  dropoffLng: null,
  pickupTime: '',
  quotedPrice: '',
  passengerCount: '1',
  notes: '',
  accountId: '',
  customerName: '',
  customerPhone: '',
  isThirdPartyBooking: false,
  bookerName: '',
  bookerPhone: '',
  bookerEmail: '',
  passengerName: '',
  passengerPhone: '',
  passengerNotes: '',
  autoDispatch: false,
};

const inputClassName =
  'w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-500/50';

export default function CreateBookingPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(initialForm);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAccounts() {
      const data = await apiFetch<Account[]>('/accounts').catch(() => []);
      setAccounts(Array.isArray(data) ? data : []);
    }

    void loadAccounts();
  }, []);

  const activeAccounts = useMemo(() => {
    return accounts.filter((account) => account.status !== 'CLOSED');
  }, [accounts]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function setPickupAddress(address: SelectedAddress) {
    setForm((prev) => ({
      ...prev,
      pickup: address.label,
      pickupLat: address.lat,
      pickupLng: address.lng,
    }));
  }

  function setDropoffAddress(address: SelectedAddress) {
    setForm((prev) => ({
      ...prev,
      dropoff: address.label,
      dropoffLat: address.lat,
      dropoffLng: address.lng,
    }));
  }

  function validate() {
    if (!form.pickup.trim()) return 'Pickup is required';
    if (!form.dropoff.trim()) return 'Dropoff is required';
    if (!form.pickupTime.trim()) return 'Pickup time is required';

    if (form.pickupLat == null || form.pickupLng == null) {
      return 'Please select a pickup address from the dropdown so GPS coordinates are saved';
    }

    if (form.dropoffLat == null || form.dropoffLng == null) {
      return 'Please select a dropoff address from the dropdown so GPS coordinates are saved';
    }

    if (form.isThirdPartyBooking) {
      if (!form.bookerName.trim()) return 'Booker name is required';
      if (!form.bookerPhone.trim()) return 'Booker phone is required';
      if (!form.passengerName.trim()) return 'Passenger name is required';
      if (!form.passengerPhone.trim()) return 'Passenger phone is required';
    } else {
      if (!form.customerName.trim()) return 'Customer name is required';
      if (!form.customerPhone.trim()) return 'Customer phone is required';
    }

    return '';
  }

  async function createBooking() {
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError('');

      const pickupTime = new Date(form.pickupTime);

      if (Number.isNaN(pickupTime.getTime())) {
        setError('Pickup time is invalid');
        return;
      }

      const payload = {
        pickup: form.pickup.trim(),
        dropoff: form.dropoff.trim(),

        pickupAddress: form.pickup.trim(),
        dropoffAddress: form.dropoff.trim(),

        pickupLat: form.pickupLat,
        pickupLng: form.pickupLng,
        dropoffLat: form.dropoffLat,
        dropoffLng: form.dropoffLng,

        pickupLatitude: form.pickupLat,
        pickupLongitude: form.pickupLng,
        dropoffLatitude: form.dropoffLat,
        dropoffLongitude: form.dropoffLng,

        pickupTime: pickupTime.toISOString(),
        pickupAt: pickupTime.toISOString(),

        quotedPrice: form.quotedPrice.trim() ? Number(form.quotedPrice) : null,
        passengerCount: form.passengerCount.trim()
          ? Number(form.passengerCount)
          : null,
        notes: form.notes.trim() || null,
        accountId: form.accountId || null,

        customerName: form.isThirdPartyBooking
          ? form.bookerName.trim()
          : form.customerName.trim(),

        customerPhone: form.isThirdPartyBooking
          ? form.bookerPhone.trim()
          : form.customerPhone.trim(),

        isThirdPartyBooking: form.isThirdPartyBooking,

        bookerName: form.isThirdPartyBooking
          ? form.bookerName.trim()
          : form.customerName.trim(),

        bookerPhone: form.isThirdPartyBooking
          ? form.bookerPhone.trim()
          : form.customerPhone.trim(),

        bookerEmail: form.bookerEmail.trim() || null,

        passengerName: form.isThirdPartyBooking
          ? form.passengerName.trim()
          : form.customerName.trim(),

        passengerPhone: form.isThirdPartyBooking
          ? form.passengerPhone.trim()
          : form.customerPhone.trim(),

        passengerNotes: form.passengerNotes.trim() || null,
        autoDispatch: form.autoDispatch,
      };

      await apiFetch<BookingResponse>('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      router.push('/bookings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Create Booking"
      subtitle="Create direct, account or third-party bookings"
      actions={
        <button
          type="button"
          onClick={() => router.push('/bookings')}
          className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
        >
          Back to Bookings
        </button>
      }
    >
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.10),transparent_30%),linear-gradient(135deg,#081120_0%,#0c1527_55%,#07101c_100%)] p-6 md:p-8">
          <div className="max-w-4xl">
            <div className="inline-flex rounded-full border border-cyan-500/25 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              New CabHQ Booking
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight text-white md:text-5xl">
              Create a booking
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              Add the journey, customer details, passenger details, account
              link, price and dispatch preference from one clean screen.
            </p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="space-y-6">
            <Panel
              title="Journey Details"
              subtitle="Pickup, destination, time and account link."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Pickup Address"
                  input={
                    <AddressAutofillInput
                      label=""
                      value={form.pickup}
                      placeholder="Start typing pickup address"
                      autoComplete="off"
                      onChangeValue={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          pickup: value,
                          pickupLat: null,
                          pickupLng: null,
                        }))
                      }
                      onSelectAddress={setPickupAddress}
                    />
                  }
                />

                <Field
                  label="Dropoff Address"
                  input={
                    <AddressAutofillInput
                      label=""
                      value={form.dropoff}
                      placeholder="Start typing dropoff address"
                      autoComplete="off"
                      onChangeValue={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          dropoff: value,
                          dropoffLat: null,
                          dropoffLng: null,
                        }))
                      }
                      onSelectAddress={setDropoffAddress}
                    />
                  }
                />

                <Field
                  label="Pickup Date / Time"
                  input={
                    <input
                      type="datetime-local"
                      value={form.pickupTime}
                      onChange={(e) => setField('pickupTime', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Account"
                  input={
                    <select
                      value={form.accountId}
                      onChange={(e) => setField('accountId', e.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Non-account booking</option>
                      {activeAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                          {account.code ? ` (${account.code})` : ''}
                        </option>
                      ))}
                    </select>
                  }
                />
              </div>
            </Panel>

            <Panel
              title="Booking Type"
              subtitle="Choose whether the passenger is booking for themselves or someone else is booking on their behalf."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <ChoiceCard
                  title="Direct Booking"
                  text="The person booking is the passenger."
                  active={!form.isThirdPartyBooking}
                  onClick={() => setField('isThirdPartyBooking', false)}
                />

                <ChoiceCard
                  title="Booking For Someone Else"
                  text="Capture both booker and passenger details."
                  active={form.isThirdPartyBooking}
                  onClick={() => setField('isThirdPartyBooking', true)}
                />
              </div>
            </Panel>

            {!form.isThirdPartyBooking ? (
              <Panel
                title="Customer Details"
                subtitle="Details for the person travelling."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Customer Name"
                    input={
                      <input
                        value={form.customerName}
                        onChange={(e) =>
                          setField('customerName', e.target.value)
                        }
                        className={inputClassName}
                        placeholder="Customer name"
                      />
                    }
                  />

                  <Field
                    label="Customer Phone"
                    input={
                      <input
                        value={form.customerPhone}
                        onChange={(e) =>
                          setField('customerPhone', e.target.value)
                        }
                        className={inputClassName}
                        placeholder="Customer phone"
                      />
                    }
                  />
                </div>
              </Panel>
            ) : (
              <>
                <Panel
                  title="Booker Details"
                  subtitle="The person making the booking."
                >
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field
                      label="Booker Name"
                      input={
                        <input
                          value={form.bookerName}
                          onChange={(e) =>
                            setField('bookerName', e.target.value)
                          }
                          className={inputClassName}
                          placeholder="Booker name"
                        />
                      }
                    />

                    <Field
                      label="Booker Phone"
                      input={
                        <input
                          value={form.bookerPhone}
                          onChange={(e) =>
                            setField('bookerPhone', e.target.value)
                          }
                          className={inputClassName}
                          placeholder="Booker phone"
                        />
                      }
                    />

                    <Field
                      label="Booker Email"
                      input={
                        <input
                          value={form.bookerEmail}
                          onChange={(e) =>
                            setField('bookerEmail', e.target.value)
                          }
                          className={inputClassName}
                          placeholder="Optional"
                        />
                      }
                    />
                  </div>
                </Panel>

                <Panel
                  title="Passenger Details"
                  subtitle="The person actually travelling."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Passenger Name"
                      input={
                        <input
                          value={form.passengerName}
                          onChange={(e) =>
                            setField('passengerName', e.target.value)
                          }
                          className={inputClassName}
                          placeholder="Passenger name"
                        />
                      }
                    />

                    <Field
                      label="Passenger Phone"
                      input={
                        <input
                          value={form.passengerPhone}
                          onChange={(e) =>
                            setField('passengerPhone', e.target.value)
                          }
                          className={inputClassName}
                          placeholder="Passenger phone"
                        />
                      }
                    />
                  </div>

                  <div className="mt-4">
                    <Field
                      label="Passenger Notes"
                      input={
                        <textarea
                          rows={4}
                          value={form.passengerNotes}
                          onChange={(e) =>
                            setField('passengerNotes', e.target.value)
                          }
                          className={`${inputClassName} resize-none`}
                          placeholder="Example: call on arrival, elderly passenger, hotel room number..."
                        />
                      }
                    />
                  </div>
                </Panel>
              </>
            )}

            <Panel
              title="Pricing & Notes"
              subtitle="Manual quoted price and any operational booking notes."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Quoted Price"
                  input={
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.quotedPrice}
                      onChange={(e) => setField('quotedPrice', e.target.value)}
                      className={inputClassName}
                      placeholder="0.00"
                    />
                  }
                />

                <Field
                  label="Passenger Count"
                  input={
                    <input
                      type="number"
                      min="1"
                      value={form.passengerCount}
                      onChange={(e) =>
                        setField('passengerCount', e.target.value)
                      }
                      className={inputClassName}
                    />
                  }
                />
              </div>

              <div className="mt-4">
                <Field
                  label="Booking Notes"
                  input={
                    <textarea
                      rows={5}
                      value={form.notes}
                      onChange={(e) => setField('notes', e.target.value)}
                      className={`${inputClassName} resize-none`}
                      placeholder="General booking notes"
                    />
                  }
                />
              </div>
            </Panel>

            {error ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={createBooking}
              disabled={saving}
              className="w-full rounded-2xl bg-cyan-500 px-5 py-4 text-sm font-bold text-black hover:bg-cyan-400 disabled:opacity-50"
            >
              {saving ? 'Creating Booking...' : 'Create Booking'}
            </button>
          </div>

          <aside className="space-y-6">
            <div className="sticky top-6 space-y-6">
              <Panel title="Booking Summary" subtitle="Live preview before saving.">
                <div className="space-y-3">
                  <SummaryRow
                    label="Type"
                    value={
                      form.isThirdPartyBooking
                        ? 'Booked for someone else'
                        : 'Direct booking'
                    }
                  />
                  <SummaryRow
                    label="Booker"
                    value={
                      form.isThirdPartyBooking
                        ? form.bookerName || '—'
                        : form.customerName || '—'
                    }
                  />
                  <SummaryRow
                    label="Passenger"
                    value={
                      form.isThirdPartyBooking
                        ? form.passengerName || '—'
                        : form.customerName || '—'
                    }
                  />
                  <SummaryRow label="Pickup" value={form.pickup || '—'} />
                  <SummaryRow label="Dropoff" value={form.dropoff || '—'} />
                  <SummaryRow
                    label="Pickup GPS"
                    value={
                      form.pickupLat != null && form.pickupLng != null
                        ? `${form.pickupLat.toFixed(5)}, ${form.pickupLng.toFixed(
                            5,
                          )}`
                        : 'Not selected'
                    }
                  />
                  <SummaryRow
                    label="Dropoff GPS"
                    value={
                      form.dropoffLat != null && form.dropoffLng != null
                        ? `${form.dropoffLat.toFixed(
                            5,
                          )}, ${form.dropoffLng.toFixed(5)}`
                        : 'Not selected'
                    }
                  />
                  <SummaryRow
                    label="Pickup Time"
                    value={
                      form.pickupTime
                        ? formatLocalDateTime(form.pickupTime)
                        : '—'
                    }
                  />
                  <SummaryRow
                    label="Account"
                    value={
                      activeAccounts.find(
                        (account) => account.id === form.accountId,
                      )?.name || 'Non-account'
                    }
                  />
                  <SummaryRow
                    label="Price"
                    value={form.quotedPrice ? `£${form.quotedPrice}` : '—'}
                  />
                  <SummaryRow
                    label="Passengers"
                    value={form.passengerCount || '—'}
                  />
                </div>
              </Panel>

              <Panel
                title="Dispatch Options"
                subtitle="Choose whether to start dispatch immediately."
              >
                <Toggle
                  label="Auto dispatch after creation"
                  checked={form.autoDispatch}
                  onChange={(value) => setField('autoDispatch', value)}
                />
              </Panel>

              <Panel
                title="Address Search"
                subtitle="Powered by CabHQ Mapbox search."
              >
                <div className="space-y-3 text-sm text-white/60">
                  <p>• Search and select addresses from dropdown</p>
                  <p>• GPS coordinates are required</p>
                  <p>• Pickup/dropoff pins appear on live tracking</p>
                  <p>• Route lines use saved coordinates</p>
                </div>
              </Panel>
            </div>
          </aside>
        </section>
      </div>
    </AdminShell>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#07111f] p-6">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {subtitle ? (
          <p className="mt-2 text-sm leading-6 text-white/50">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
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
      {label ? (
        <div className="mb-2 text-sm font-medium text-white/70">{label}</div>
      ) : null}
      {input}
    </label>
  );
}

function ChoiceCard({
  title,
  text,
  active,
  onClick,
}: {
  title: string;
  text: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition ${
        active
          ? 'border-cyan-500/40 bg-cyan-500/10'
          : 'border-white/10 bg-black/20 hover:bg-white/5'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-bold text-white">{title}</h3>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            active ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white/60'
          }`}
        >
          {active ? 'SELECTED' : 'SELECT'}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-white/55">{text}</p>
    </button>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
        checked
          ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
          : 'border-white/10 bg-black/20 text-white/70 hover:bg-white/5'
      }`}
    >
      <span>{label}</span>
      <span>{checked ? 'YES' : 'NO'}</span>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3 last:border-b-0">
      <span className="text-sm text-white/50">{label}</span>
      <span className="max-w-[230px] text-right text-sm font-semibold text-white">
        {value}
      </span>
    </div>
  );
}

function formatLocalDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}