'use client';

import { useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';

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
  type: AccountType;
  status: AccountStatus;
  contactName: string;
  email: string;
  phone: string;
  billingAddress: string;
  paymentTermsDays: number;
  creditLimit: number;
  currentBalance: number;
  invoiceCount: number;
  tripsThisMonth: number;
  monthlyRevenue: number;
  notes?: string;
};

type AccountFormState = {
  name: string;
  type: AccountType;
  status: AccountStatus;
  contactName: string;
  email: string;
  phone: string;
  billingAddress: string;
  paymentTermsDays: string;
  creditLimit: string;
  notes: string;
};

const initialAccounts: Account[] = [
  {
    id: '1',
    name: 'Northside Medical Centre',
    type: 'NHS',
    status: 'ACTIVE',
    contactName: 'Sarah Malik',
    email: 'accounts@northsidemedical.co.uk',
    phone: '02070001111',
    billingAddress: '12 High Street, London',
    paymentTermsDays: 30,
    creditLimit: 5000,
    currentBalance: 1280,
    invoiceCount: 6,
    tripsThisMonth: 44,
    monthlyRevenue: 2160,
    notes: 'Monthly invoice account',
  },
  {
    id: '2',
    name: 'Greenfield School Transport',
    type: 'SCHOOL',
    status: 'ACTIVE',
    contactName: 'Peter Jones',
    email: 'transport@greenfieldschool.co.uk',
    phone: '02070002222',
    billingAddress: '45 Station Road, Essex',
    paymentTermsDays: 30,
    creditLimit: 8000,
    currentBalance: 3320,
    invoiceCount: 11,
    tripsThisMonth: 102,
    monthlyRevenue: 4890,
    notes: 'AM/PM school run contract',
  },
  {
    id: '3',
    name: 'City Stay Hotel',
    type: 'HOTEL',
    status: 'ON_HOLD',
    contactName: 'Laura Price',
    email: 'frontdesk@citystayhotel.co.uk',
    phone: '02070003333',
    billingAddress: '88 Central Avenue, Birmingham',
    paymentTermsDays: 14,
    creditLimit: 2500,
    currentBalance: 2410,
    invoiceCount: 4,
    tripsThisMonth: 21,
    monthlyRevenue: 1195,
    notes: 'Hold new jobs if unpaid invoices increase',
  },
];

const initialForm: AccountFormState = {
  name: '',
  type: 'BUSINESS',
  status: 'ACTIVE',
  contactName: '',
  email: '',
  phone: '',
  billingAddress: '',
  paymentTermsDays: '30',
  creditLimit: '5000',
  notes: '',
};

function formatCurrency(value: number) {
  return `£${value.toFixed(2)}`;
}

function statusClasses(status: AccountStatus) {
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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [search, setSearch] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    initialAccounts[0]?.id ?? null,
  );
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountFormState>(initialForm);

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;

    return accounts.filter((account) =>
      [
        account.name,
        account.type,
        account.status,
        account.contactName,
        account.email,
        account.phone,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [accounts, search]);

  const selectedAccount = useMemo(
    () =>
      accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );

  const stats = useMemo(() => {
    const active = accounts.filter((a) => a.status === 'ACTIVE').length;
    const onHold = accounts.filter((a) => a.status === 'ON_HOLD').length;
    const revenue = accounts.reduce((sum, a) => sum + a.monthlyRevenue, 0);
    const outstanding = accounts.reduce((sum, a) => sum + a.currentBalance, 0);

    return {
      total: accounts.length,
      active,
      onHold,
      revenue,
      outstanding,
    };
  }, [accounts]);

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

  function submitAccount(e: React.FormEvent) {
    e.preventDefault();

    const payload: Account = {
      id: editingAccountId ?? crypto.randomUUID(),
      name: form.name.trim(),
      type: form.type,
      status: form.status,
      contactName: form.contactName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      billingAddress: form.billingAddress.trim(),
      paymentTermsDays: Number(form.paymentTermsDays || 30),
      creditLimit: Number(form.creditLimit || 0),
      currentBalance:
        editingAccountId != null
          ? accounts.find((a) => a.id === editingAccountId)?.currentBalance ?? 0
          : 0,
      invoiceCount:
        editingAccountId != null
          ? accounts.find((a) => a.id === editingAccountId)?.invoiceCount ?? 0
          : 0,
      tripsThisMonth:
        editingAccountId != null
          ? accounts.find((a) => a.id === editingAccountId)?.tripsThisMonth ?? 0
          : 0,
      monthlyRevenue:
        editingAccountId != null
          ? accounts.find((a) => a.id === editingAccountId)?.monthlyRevenue ?? 0
          : 0,
      notes: form.notes.trim(),
    };

    if (!payload.name || !payload.contactName) return;

    setAccounts((prev) => {
      const exists = prev.some((a) => a.id === payload.id);
      if (exists) {
        return prev.map((a) => (a.id === payload.id ? payload : a));
      }
      return [payload, ...prev];
    });

    setSelectedAccountId(payload.id);
    resetForm();
  }

  function startEdit(account: Account) {
    setEditingAccountId(account.id);
    setSelectedAccountId(account.id);
    setForm({
      name: account.name,
      type: account.type,
      status: account.status,
      contactName: account.contactName,
      email: account.email,
      phone: account.phone,
      billingAddress: account.billingAddress,
      paymentTermsDays: String(account.paymentTermsDays),
      creditLimit: String(account.creditLimit),
      notes: account.notes ?? '',
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function deleteAccount(accountId: string) {
    const confirmed = window.confirm('Delete this account?');
    if (!confirmed) return;

    setAccounts((prev) => prev.filter((a) => a.id !== accountId));

    if (selectedAccountId === accountId) {
      const remaining = accounts.filter((a) => a.id !== accountId);
      setSelectedAccountId(remaining[0]?.id ?? null);
    }

    if (editingAccountId === accountId) {
      resetForm();
    }
  }

  return (
    <AdminShell
      title="Accounts"
      subtitle="Account customers, billing terms, balances, contract work and monthly invoice clients."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total Accounts" value={stats.total} hint="All account customers" />
          <StatCard label="Active" value={stats.active} hint="Currently trading" />
          <StatCard label="On Hold" value={stats.onHold} hint="Payment or ops hold" />
          <StatCard
            label="Monthly Revenue"
            value={formatCurrency(stats.revenue)}
            hint="Current account revenue"
          />
          <StatCard
            label="Outstanding"
            value={formatCurrency(stats.outstanding)}
            hint="Open balance"
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">
                  {editingAccountId ? 'Edit Account' : 'Create Account'}
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Add account customers for invoicing, contracts and priority jobs.
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
              <div className="grid gap-4">
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
                    label="Account Type"
                    input={
                      <select
                        value={form.type}
                        onChange={(e) =>
                          setField('type', e.target.value as AccountType)
                        }
                        className={inputClassName}
                      >
                        <option value="BUSINESS">BUSINESS</option>
                        <option value="SCHOOL">SCHOOL</option>
                        <option value="NHS">NHS</option>
                        <option value="HOTEL">HOTEL</option>
                        <option value="AGENCY">AGENCY</option>
                        <option value="CORPORATE">CORPORATE</option>
                      </select>
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
                  label="Contact Name *"
                  input={
                    <input
                      value={form.contactName}
                      onChange={(e) => setField('contactName', e.target.value)}
                      placeholder="Sarah Malik"
                      required
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
                  label="Billing Address"
                  input={
                    <textarea
                      rows={3}
                      value={form.billingAddress}
                      onChange={(e) => setField('billingAddress', e.target.value)}
                      placeholder="Billing address"
                      className={`${inputClassName} resize-none`}
                    />
                  }
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Payment Terms (days)"
                    input={
                      <input
                        type="number"
                        min="0"
                        value={form.paymentTermsDays}
                        onChange={(e) =>
                          setField('paymentTermsDays', e.target.value)
                        }
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
                        value={form.creditLimit}
                        onChange={(e) => setField('creditLimit', e.target.value)}
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
                      placeholder="Invoice notes, contract notes, restrictions..."
                      className={`${inputClassName} resize-none`}
                    />
                  }
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-cyan-600 px-4 py-3 font-semibold text-white transition hover:bg-cyan-500"
              >
                {editingAccountId ? 'Save Account Changes' : 'Create Account'}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
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

            {filteredAccounts.length === 0 ? (
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
                        <div
                          className="min-w-0 cursor-pointer"
                          onClick={() =>
                            setSelectedAccountId((current) =>
                              current === account.id ? null : account.id,
                            )
                          }
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-bold">{account.name}</h3>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${typeClasses(
                                account.type,
                              )}`}
                            >
                              {account.type}
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
                                account.status,
                              )}`}
                            >
                              {account.status.replace('_', ' ')}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-white/70">
                            {account.contactName} · {account.email || 'No email'} ·{' '}
                            {account.phone || 'No phone'}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/50">
                            <span>Invoices: {account.invoiceCount}</span>
                            <span>Trips this month: {account.tripsThisMonth}</span>
                            <span>Terms: {account.paymentTermsDays} days</span>
                          </div>
                        </div>

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
                            onClick={() => deleteAccount(account.id)}
                            className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 xl:grid-cols-3">
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                              Billing
                            </h4>

                            <DetailRow
                              label="Current Balance"
                              value={formatCurrency(account.currentBalance)}
                            />
                            <DetailRow
                              label="Credit Limit"
                              value={formatCurrency(account.creditLimit)}
                            />
                            <DetailRow
                              label="Monthly Revenue"
                              value={formatCurrency(account.monthlyRevenue)}
                            />
                            <DetailRow
                              label="Payment Terms"
                              value={`${account.paymentTermsDays} days`}
                            />
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                              Contact
                            </h4>

                            <DetailRow label="Contact" value={account.contactName} />
                            <DetailRow label="Email" value={account.email || '—'} />
                            <DetailRow label="Phone" value={account.phone || '—'} />
                            <DetailRow
                              label="Address"
                              value={account.billingAddress || '—'}
                            />
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                              Usage
                            </h4>

                            <DetailRow
                              label="Trips This Month"
                              value={String(account.tripsThisMonth)}
                            />
                            <DetailRow
                              label="Invoices"
                              value={String(account.invoiceCount)}
                            />
                            <DetailRow label="Status" value={account.status} />
                            <DetailRow label="Type" value={account.type} />
                          </div>

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
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
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