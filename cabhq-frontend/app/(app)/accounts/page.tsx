'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { apiFetch } from '@/lib/api';

type AccountStatus = 'ACTIVE' | 'ON_HOLD' | 'CLOSED';

type AccountType =
  | 'BUSINESS'
  | 'SCHOOL'
  | 'NHS'
  | 'HOTEL'
  | 'AGENCY'
  | 'CORPORATE';

type Account = {
  id: string;
  name: string;
  code?: string | null;
  email?: string | null;
  phone?: string | null;
  contactName?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  postcode?: string | null;
  vatNumber?: string | null;
  paymentTerms?: number;
  creditLimit?: number | null;
  status: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  bookings?: Array<{ id: string }>;
  invoices?: Array<{
    id: string;
    total?: number | null;
    balanceDue?: number | null;
  }>;
  payments?: Array<{
    id: string;
    amount?: number | null;
  }>;
};

type UiAccount = Account & {
  uiType: AccountType;
  uiStatus: AccountStatus;
  paymentTermsDays: number;
  creditLimitValue: number;
  currentBalance: number;
  invoiceCount: number;
  tripsThisMonth: number;
  monthlyRevenue: number;
  billingAddress: string;
};

type AccountFormState = {
  name: string;
  code: string;
  status: AccountStatus;
  contactName: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  postcode: string;
  paymentTerms: string;
  creditLimit: string;
  vatNumber: string;
  notes: string;
};

const initialForm: AccountFormState = {
  name: '',
  code: '',
  status: 'ACTIVE',
  contactName: '',
  email: '',
  phone: '',
  address1: '',
  address2: '',
  city: '',
  postcode: '',
  paymentTerms: '30',
  creditLimit: '0',
  vatNumber: '',
  notes: '',
};

function formatCurrency(value: number) {
  return `£${value.toFixed(2)}`;
}

function statusClasses(status: string) {
  if (status === 'ACTIVE') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (status === 'ON_HOLD') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function typeClasses(type: AccountType) {
  const map: Record<AccountType, string> = {
    BUSINESS: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    SCHOOL: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
    NHS: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    HOTEL: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300',
    AGENCY: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
    CORPORATE: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  };

  return map[type];
}

function inferAccountType(name: string): AccountType {
  const normalized = name.toLowerCase();

  if (normalized.includes('school')) return 'SCHOOL';
  if (
    normalized.includes('nhs') ||
    normalized.includes('medical') ||
    normalized.includes('hospital') ||
    normalized.includes('clinic')
  ) {
    return 'NHS';
  }
  if (normalized.includes('hotel')) return 'HOTEL';
  if (normalized.includes('agency')) return 'AGENCY';
  if (normalized.includes('corporate') || normalized.includes('company')) {
    return 'CORPORATE';
  }

  return 'BUSINESS';
}

function normaliseStatus(status?: string): AccountStatus {
  const value = (status || 'ACTIVE').toUpperCase();

  if (value === 'ON_HOLD') return 'ON_HOLD';
  if (value === 'CLOSED') return 'CLOSED';

  return 'ACTIVE';
}

function parseBillingAddress(account: Account) {
  return [account.address1, account.address2, account.city, account.postcode]
    .filter(Boolean)
    .join(', ');
}

function toUiAccount(account: Account): UiAccount {
  const invoices = account.invoices ?? [];
  const bookings = account.bookings ?? [];

  const invoiceCount = invoices.length;

  const currentBalance = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.balanceDue ?? 0),
    0,
  );

  const monthlyRevenue = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total ?? 0),
    0,
  );

  return {
    ...account,
    uiType: inferAccountType(account.name),
    uiStatus: normaliseStatus(account.status),
    paymentTermsDays: Number(account.paymentTerms ?? 30),
    creditLimitValue: Number(account.creditLimit ?? 0),
    currentBalance,
    invoiceCount,
    tripsThisMonth: bookings.length,
    monthlyRevenue,
    billingAddress: parseBillingAddress(account),
  };
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountFormState>(initialForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadAccounts() {
    setLoading(true);
    setError('');

    try {
      const data = await apiFetch<Account[]>('/accounts');
      const next = Array.isArray(data) ? data : [];

      setAccounts(next);
      setSelectedAccountId((current) => current ?? next[0]?.id ?? null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts();
  }, []);

  const enrichedAccounts = useMemo(
    () => accounts.map((account) => toUiAccount(account)),
    [accounts],
  );

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enrichedAccounts;

    return enrichedAccounts.filter((account) =>
      [
        account.name,
        account.code,
        account.uiType,
        account.uiStatus,
        account.contactName,
        account.email,
        account.phone,
        account.postcode,
        account.city,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [enrichedAccounts, search]);

  const stats = useMemo(() => {
    const active = enrichedAccounts.filter((a) => a.uiStatus === 'ACTIVE').length;
    const onHold = enrichedAccounts.filter((a) => a.uiStatus === 'ON_HOLD').length;
    const revenue = enrichedAccounts.reduce((sum, a) => sum + a.monthlyRevenue, 0);
    const outstanding = enrichedAccounts.reduce(
      (sum, a) => sum + a.currentBalance,
      0,
    );

    return {
      total: enrichedAccounts.length,
      active,
      onHold,
      revenue,
      outstanding,
    };
  }, [enrichedAccounts]);

  function setField<K extends keyof AccountFormState>(
    key: K,
    value: AccountFormState[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingAccountId(null);
  }

  function setNotice(message: string) {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 2500);
  }

  async function submitAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        contactName: form.contactName.trim() || null,
        address1: form.address1.trim() || null,
        address2: form.address2.trim() || null,
        city: form.city.trim() || null,
        postcode: form.postcode.trim() || null,
        vatNumber: form.vatNumber.trim() || null,
        paymentTerms: Number(form.paymentTerms || 30),
        creditLimit: Number(form.creditLimit || 0),
        status: form.status,
        notes: form.notes.trim() || null,
      };

      if (!payload.name) {
        throw new Error('Account name is required');
      }

      let savedAccount: Account;

      if (editingAccountId) {
        savedAccount = await apiFetch<Account>(`/accounts/${editingAccountId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });

        setAccounts((prev) =>
          prev.map((account) =>
            account.id === editingAccountId ? savedAccount : account,
          ),
        );

        setNotice('Account updated');
      } else {
        savedAccount = await apiFetch<Account>('/accounts', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setAccounts((prev) => [savedAccount, ...prev]);
        setNotice('Account created');
      }

      setSelectedAccountId(savedAccount.id);
      resetForm();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save account');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(account: UiAccount) {
    setEditingAccountId(account.id);
    setSelectedAccountId(account.id);

    setForm({
      name: account.name,
      code: account.code ?? '',
      status: account.uiStatus,
      contactName: account.contactName ?? '',
      email: account.email ?? '',
      phone: account.phone ?? '',
      address1: account.address1 ?? '',
      address2: account.address2 ?? '',
      city: account.city ?? '',
      postcode: account.postcode ?? '',
      paymentTerms: String(account.paymentTermsDays),
      creditLimit: String(account.creditLimitValue),
      vatNumber: account.vatNumber ?? '',
      notes: account.notes ?? '',
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteAccount(accountId: string) {
    const confirmed = window.confirm('Delete this account?');
    if (!confirmed) return;

    setDeletingId(accountId);
    setError('');
    setSuccess('');

    try {
      await apiFetch(`/accounts/${accountId}`, {
        method: 'DELETE',
      });

      const remaining = accounts.filter((account) => account.id !== accountId);
      setAccounts(remaining);

      if (selectedAccountId === accountId) {
        setSelectedAccountId(remaining[0]?.id ?? null);
      }

      if (editingAccountId === accountId) {
        resetForm();
      }

      setNotice('Account deleted');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AdminShell
      title="Accounts"
      subtitle="Account customers, billing terms, balances, contract work and invoice clients"
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.10),transparent_30%),linear-gradient(135deg,#081120_0%,#0c1527_55%,#07101c_100%)] p-6 md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-cyan-500/25 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                CabHQ Account Customers
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight text-white md:text-5xl">
                Manage account work and billing relationships
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                Keep track of contract customers, invoice terms, outstanding
                balances, monthly usage and account-level trading status.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadAccounts()}
              className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20"
            >
              Refresh Accounts
            </button>
          </div>
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

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total Accounts" value={stats.total} hint="All account customers" tone="slate" />
          <StatCard label="Active" value={stats.active} hint="Currently trading" tone="emerald" />
          <StatCard label="On Hold" value={stats.onHold} hint="Payment or ops hold" tone="amber" />
          <StatCard label="Revenue" value={formatCurrency(stats.revenue)} hint="Linked invoice totals" tone="cyan" />
          <StatCard label="Outstanding" value={formatCurrency(stats.outstanding)} hint="Open balance" tone="violet" />
        </section>

        <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">
                  {editingAccountId ? 'Edit Account' : 'Create Account'}
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Add account customers for invoicing, contracts and priority work.
                </p>
              </div>

              {editingAccountId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>

            <form onSubmit={submitAccount} className="space-y-5">
              <Field
                label="Account Name *"
                input={
                  <input
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="Northside Medical Centre"
                    required
                    className={inputClassName}
                  />
                }
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Account Code"
                  input={
                    <input
                      value={form.code}
                      onChange={(e) => setField('code', e.target.value)}
                      placeholder="NSMC"
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Status"
                  input={
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setField('status', e.target.value as AccountStatus)
                      }
                      className={inputClassName}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="ON_HOLD">ON_HOLD</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  }
                />
              </div>

              <Field
                label="Contact Name"
                input={
                  <input
                    value={form.contactName}
                    onChange={(e) => setField('contactName', e.target.value)}
                    placeholder="Sarah Malik"
                    className={inputClassName}
                  />
                }
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Email"
                  input={
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setField('email', e.target.value)}
                      placeholder="accounts@company.co.uk"
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Phone"
                  input={
                    <input
                      value={form.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                      placeholder="0207..."
                      className={inputClassName}
                    />
                  }
                />
              </div>

              <Field
                label="Address Line 1"
                input={
                  <input
                    value={form.address1}
                    onChange={(e) => setField('address1', e.target.value)}
                    placeholder="12 High Street"
                    className={inputClassName}
                  />
                }
              />

              <Field
                label="Address Line 2"
                input={
                  <input
                    value={form.address2}
                    onChange={(e) => setField('address2', e.target.value)}
                    placeholder="Business Park"
                    className={inputClassName}
                  />
                }
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="City"
                  input={
                    <input
                      value={form.city}
                      onChange={(e) => setField('city', e.target.value)}
                      placeholder="Blandford Forum"
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Postcode"
                  input={
                    <input
                      value={form.postcode}
                      onChange={(e) => setField('postcode', e.target.value)}
                      placeholder="DT11..."
                      className={inputClassName}
                    />
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Payment Terms"
                  input={
                    <input
                      type="number"
                      min="0"
                      value={form.paymentTerms}
                      onChange={(e) => setField('paymentTerms', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Credit Limit"
                  input={
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.creditLimit}
                      onChange={(e) => setField('creditLimit', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
              </div>

              <Field
                label="VAT Number"
                input={
                  <input
                    value={form.vatNumber}
                    onChange={(e) => setField('vatNumber', e.target.value)}
                    placeholder="GB123456789"
                    className={inputClassName}
                  />
                }
              />

              <Field
                label="Notes"
                input={
                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                    placeholder="Invoice notes, contract notes, restrictions..."
                    className={`${inputClassName} resize-none`}
                  />
                }
              />

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? editingAccountId
                    ? 'Saving Account...'
                    : 'Creating Account...'
                  : editingAccountId
                    ? 'Save Account Changes'
                    : 'Create Account'}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Accounts</h2>
                <p className="mt-1 text-sm text-white/60">
                  Account customer list with balances, terms and invoice visibility.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search accounts..."
                className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50 lg:w-[300px]"
              />
            </div>

            {loading ? (
              <div className="rounded-2xl bg-[#0b1728] p-6 text-white/60">
                Loading accounts...
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="rounded-2xl bg-[#0b1728] p-6 text-white/60">
                No accounts found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAccounts.map((account) => {
                  const isSelected = selectedAccountId === account.id;

                  return (
                    <div
                      key={account.id}
                      className={`rounded-2xl border p-5 transition ${
                        isSelected
                          ? 'border-cyan-500/50 bg-[#0c1b2c]'
                          : 'border-white/10 bg-[#0b1728]'
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <button
                          type="button"
                          className="min-w-0 text-left"
                          onClick={() =>
                            setSelectedAccountId((current) =>
                              current === account.id ? null : account.id,
                            )
                          }
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-bold">{account.name}</h3>

                            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${typeClasses(account.uiType)}`}>
                              {account.uiType}
                            </span>

                            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(account.uiStatus)}`}>
                              {account.uiStatus.replace('_', ' ')}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-white/70">
                            {account.contactName || 'No contact'} · {account.email || 'No email'} · {account.phone || 'No phone'}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/50">
                            <span>Invoices: {account.invoiceCount}</span>
                            <span>Trips: {account.tripsThisMonth}</span>
                            <span>Terms: {account.paymentTermsDays} days</span>
                          </div>
                        </button>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(account)}
                            className="rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            disabled={deletingId === account.id}
                            onClick={() => void deleteAccount(account.id)}
                            className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                          >
                            {deletingId === account.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 xl:grid-cols-3">
                          <InfoCard title="Billing">
                            <DetailRow label="Current Balance" value={formatCurrency(account.currentBalance)} />
                            <DetailRow label="Credit Limit" value={formatCurrency(account.creditLimitValue)} />
                            <DetailRow label="Revenue" value={formatCurrency(account.monthlyRevenue)} />
                            <DetailRow label="Payment Terms" value={`${account.paymentTermsDays} days`} />
                          </InfoCard>

                          <InfoCard title="Contact">
                            <DetailRow label="Contact" value={account.contactName || '—'} />
                            <DetailRow label="Email" value={account.email || '—'} />
                            <DetailRow label="Phone" value={account.phone || '—'} />
                            <DetailRow label="Address" value={account.billingAddress || '—'} />
                          </InfoCard>

                          <InfoCard title="Usage">
                            <DetailRow label="Trips" value={String(account.tripsThisMonth)} />
                            <DetailRow label="Invoices" value={String(account.invoiceCount)} />
                            <DetailRow label="Status" value={account.uiStatus} />
                            <DetailRow label="Type" value={account.uiType} />
                          </InfoCard>

                          {account.notes ? (
                            <div className="xl:col-span-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
                                Notes
                              </h4>
                              <p className="text-sm text-white/70">{account.notes}</p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
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
  tone,
}: {
  label: string;
  value: string | number;
  hint: string;
  tone: 'slate' | 'emerald' | 'amber' | 'cyan' | 'violet';
}) {
  const toneMap = {
    slate: 'from-slate-500/10 to-transparent border-white/10',
    emerald: 'from-emerald-500/10 to-transparent border-emerald-500/20',
    amber: 'from-amber-500/10 to-transparent border-amber-500/20',
    cyan: 'from-cyan-500/10 to-transparent border-cyan-500/20',
    violet: 'from-violet-500/10 to-transparent border-violet-500/20',
  };

  return (
    <div className={`rounded-3xl border bg-gradient-to-br ${toneMap[tone]} p-5`}>
      <p className="text-sm font-medium text-white/60">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
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

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
        {title}
      </h4>
      {children}
    </div>
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
      <span className="max-w-[60%] text-right text-sm text-white/85">
        {value}
      </span>
    </div>
  );
}

const inputClassName =
  'w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50';