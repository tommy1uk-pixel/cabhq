'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { apiFetch } from '@/lib/api';

type PaymentMethod =
  | 'BANK_TRANSFER'
  | 'CARD'
  | 'CASH'
  | 'DIRECT_DEBIT'
  | 'CHEQUE'
  | 'STRIPE';

type PaymentStatus = 'PENDING' | 'CLEARED' | 'FAILED' | 'REFUNDED';

type Payment = {
  id: string;
  reference: string;
  accountName: string;
  invoiceNumber?: string | null;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  paymentDate: string;
  allocatedAmount: number;
  unallocatedAmount: number;
  notes?: string | null;
};

type PaymentFormState = {
  accountName: string;
  invoiceNumber: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: string;
  paymentDate: string;
  allocatedAmount: string;
  notes: string;
};

const today = new Date().toISOString().slice(0, 10);

const initialForm: PaymentFormState = {
  accountName: '',
  invoiceNumber: '',
  method: 'BANK_TRANSFER',
  status: 'PENDING',
  amount: '',
  paymentDate: today,
  allocatedAmount: '0',
  notes: '',
};

function formatCurrency(value: number) {
  return `£${value.toFixed(2)}`;
}

function prettifyEnum(value: string) {
  return value.replace(/_/g, ' ');
}

function statusClasses(status: PaymentStatus) {
  if (status === 'CLEARED') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (status === 'PENDING') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  if (status === 'FAILED') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }

  return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
}

function methodClasses(method: PaymentMethod) {
  const map: Record<PaymentMethod, string> = {
    BANK_TRANSFER: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    CARD: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
    CASH: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    DIRECT_DEBIT: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300',
    CHEQUE: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
    STRIPE: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  };

  return map[method];
}

function toDateInput(value?: string | null) {
  if (!value) return today;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return today;
  return date.toISOString().slice(0, 10);
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentFormState>(initialForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadPayments() {
      try {
        setLoading(true);
        setError('');

        const data = await apiFetch<Payment[]>('/payments');
        if (!mounted) return;

        const next = Array.isArray(data) ? data : [];
        setPayments(next);
        setSelectedPaymentId((current) => current ?? next[0]?.id ?? null);
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load payments');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadPayments();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;

    return payments.filter((payment) =>
      [
        payment.reference,
        payment.accountName,
        payment.invoiceNumber,
        payment.method,
        payment.status,
        payment.paymentDate,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [payments, search]);

  const selectedPayment = useMemo(
    () => payments.find((payment) => payment.id === selectedPaymentId) ?? null,
    [payments, selectedPaymentId],
  );

  const stats = useMemo(() => {
    const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const cleared = payments
      .filter((payment) => payment.status === 'CLEARED')
      .reduce((sum, payment) => sum + payment.amount, 0);
    const pending = payments
      .filter((payment) => payment.status === 'PENDING')
      .reduce((sum, payment) => sum + payment.amount, 0);
    const unallocated = payments.reduce(
      (sum, payment) => sum + payment.unallocatedAmount,
      0,
    );

    return {
      totalCount: payments.length,
      total,
      cleared,
      pending,
      unallocated,
    };
  }, [payments]);

  function setField<K extends keyof PaymentFormState>(
    key: K,
    value: PaymentFormState[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingPaymentId(null);
  }

  function setNotice(message: string) {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 2500);
  }

  async function submitPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const amount = Number(form.amount || 0);
      const allocatedAmount = Number(form.allocatedAmount || 0);
      const safeAllocated = Math.min(Math.max(allocatedAmount, 0), amount);

      if (!form.accountName.trim()) {
        throw new Error('Account name is required');
      }

      if (amount <= 0) {
        throw new Error('Amount must be greater than zero');
      }

      const payload = {
        accountName: form.accountName.trim(),
        invoiceNumber: form.invoiceNumber.trim() || null,
        method: form.method,
        status: form.status,
        amount,
        paymentDate: form.paymentDate,
        allocatedAmount: safeAllocated,
        notes: form.notes.trim(),
      };

      let savedPayment: Payment;

      if (editingPaymentId) {
        savedPayment = await apiFetch<Payment>(`/payments/${editingPaymentId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });

        setPayments((prev) =>
          prev.map((payment) =>
            payment.id === editingPaymentId ? savedPayment : payment,
          ),
        );

        setNotice('Payment updated');
      } else {
        savedPayment = await apiFetch<Payment>('/payments', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setPayments((prev) => [savedPayment, ...prev]);
        setNotice('Payment recorded');
      }

      setSelectedPaymentId(savedPayment.id);
      resetForm();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(payment: Payment) {
    setEditingPaymentId(payment.id);
    setSelectedPaymentId(payment.id);
    setForm({
      accountName: payment.accountName,
      invoiceNumber: payment.invoiceNumber ?? '',
      method: payment.method,
      status: payment.status,
      amount: String(payment.amount),
      paymentDate: toDateInput(payment.paymentDate),
      allocatedAmount: String(payment.allocatedAmount),
      notes: payment.notes ?? '',
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deletePayment(paymentId: string) {
    const confirmed = window.confirm('Delete this payment?');
    if (!confirmed) return;

    setError('');
    setSuccess('');

    try {
      await apiFetch(`/payments/${paymentId}`, {
        method: 'DELETE',
      });

      const remaining = payments.filter((payment) => payment.id !== paymentId);
      setPayments(remaining);

      if (selectedPaymentId === paymentId) {
        setSelectedPaymentId(remaining[0]?.id ?? null);
      }

      if (editingPaymentId === paymentId) {
        resetForm();
      }

      setNotice('Payment deleted');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to delete payment');
    }
  }

  async function updatePaymentStatus(paymentId: string, status: PaymentStatus) {
    setError('');
    setSuccess('');

    try {
      const updatedPayment = await apiFetch<Payment>(`/payments/${paymentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      setPayments((prev) =>
        prev.map((payment) =>
          payment.id === paymentId ? updatedPayment : payment,
        ),
      );

      setNotice(`Payment marked ${prettifyEnum(status).toLowerCase()}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to update payment status');
    }
  }

  const liveAmount = Number(form.amount || 0);
  const liveAllocated = Math.min(
    Math.max(Number(form.allocatedAmount || 0), 0),
    liveAmount,
  );
  const liveUnallocated = Math.max(liveAmount - liveAllocated, 0);

  return (
    <AdminShell
      title="Payments"
      subtitle="Record receipts, allocate payments to invoices and monitor cleared, pending and unallocated funds."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Payments" value={stats.totalCount} hint="All records" />
          <StatCard
            label="Received"
            value={formatCurrency(stats.total)}
            hint="Gross payment value"
          />
          <StatCard
            label="Cleared"
            value={formatCurrency(stats.cleared)}
            hint="Settled funds"
          />
          <StatCard
            label="Pending"
            value={formatCurrency(stats.pending)}
            hint="Awaiting clearance"
          />
          <StatCard
            label="Unallocated"
            value={formatCurrency(stats.unallocated)}
            hint="Still not assigned"
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
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">
                  {editingPaymentId ? 'Edit Payment' : 'Record Payment'}
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Add account receipts, invoice payments and manual allocations.
                </p>
              </div>

              {editingPaymentId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>

            <form onSubmit={submitPayment} className="space-y-5">
              <Field
                label="Account Name *"
                input={
                  <input
                    value={form.accountName}
                    onChange={(e) => setField('accountName', e.target.value)}
                    placeholder="Northside Medical Centre"
                    required
                    className={inputClassName}
                  />
                }
              />

              <Field
                label="Invoice Number"
                input={
                  <input
                    value={form.invoiceNumber}
                    onChange={(e) => setField('invoiceNumber', e.target.value)}
                    placeholder="INV-2025-001"
                    className={inputClassName}
                  />
                }
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Method"
                  input={
                    <select
                      value={form.method}
                      onChange={(e) =>
                        setField('method', e.target.value as PaymentMethod)
                      }
                      className={inputClassName}
                    >
                      <option value="BANK_TRANSFER">BANK TRANSFER</option>
                      <option value="CARD">CARD</option>
                      <option value="CASH">CASH</option>
                      <option value="DIRECT_DEBIT">DIRECT DEBIT</option>
                      <option value="CHEQUE">CHEQUE</option>
                      <option value="STRIPE">STRIPE</option>
                    </select>
                  }
                />

                <Field
                  label="Status"
                  input={
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setField('status', e.target.value as PaymentStatus)
                      }
                      className={inputClassName}
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="CLEARED">CLEARED</option>
                      <option value="FAILED">FAILED</option>
                      <option value="REFUNDED">REFUNDED</option>
                    </select>
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  label="Amount *"
                  input={
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setField('amount', e.target.value)}
                      required
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Allocated Amount"
                  input={
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.allocatedAmount}
                      onChange={(e) =>
                        setField('allocatedAmount', e.target.value)
                      }
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Payment Date"
                  input={
                    <input
                      type="date"
                      value={form.paymentDate}
                      onChange={(e) => setField('paymentDate', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
              </div>

              {liveAmount > 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <QuickValue
                      label="Total"
                      value={formatCurrency(liveAmount)}
                    />
                    <QuickValue
                      label="Allocated"
                      value={formatCurrency(liveAllocated)}
                    />
                    <QuickValue
                      label="Unallocated"
                      value={formatCurrency(liveUnallocated)}
                    />
                  </div>
                </div>
              ) : null}

              <Field
                label="Notes"
                input={
                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                    placeholder="Receipt notes, remittance info, bank reference..."
                    className={`${inputClassName} resize-none`}
                  />
                }
              />

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-cyan-600 px-4 py-3 font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? editingPaymentId
                    ? 'Saving Payment...'
                    : 'Recording Payment...'
                  : editingPaymentId
                    ? 'Save Payment Changes'
                    : 'Record Payment'}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Payments</h2>
                <p className="mt-1 text-sm text-white/60">
                  Review receipts, payment methods, invoice allocation and payment health.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search payments..."
                className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50 lg:w-[300px]"
              />
            </div>

            {loading ? (
              <div className="rounded-2xl bg-[#0b1728] p-6 text-white/60">
                Loading payments...
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="rounded-2xl bg-[#0b1728] p-6 text-white/60">
                No payments found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPayments.map((payment) => {
                  const isSelected = selectedPaymentId === payment.id;

                  return (
                    <div
                      key={payment.id}
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
                            setSelectedPaymentId((current) =>
                              current === payment.id ? null : payment.id,
                            )
                          }
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-bold">
                              {payment.reference}
                            </h3>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
                                payment.status,
                              )}`}
                            >
                              {prettifyEnum(payment.status)}
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${methodClasses(
                                payment.method,
                              )}`}
                            >
                              {prettifyEnum(payment.method)}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-white/70">
                            {payment.accountName}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/50">
                            <span>Invoice: {payment.invoiceNumber || 'Unallocated'}</span>
                            <span>Date: {toDateInput(payment.paymentDate)}</span>
                            <span>Amount: {formatCurrency(payment.amount)}</span>
                          </div>
                        </button>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(payment)}
                            className="rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deletePayment(payment.id)}
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
                              Amounts
                            </h4>

                            <DetailRow label="Total Amount" value={formatCurrency(payment.amount)} />
                            <DetailRow
                              label="Allocated"
                              value={formatCurrency(payment.allocatedAmount)}
                            />
                            <DetailRow
                              label="Unallocated"
                              value={formatCurrency(payment.unallocatedAmount)}
                            />
                            <DetailRow label="Status" value={prettifyEnum(payment.status)} />
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                              Details
                            </h4>

                            <DetailRow label="Account" value={payment.accountName} />
                            <DetailRow label="Invoice" value={payment.invoiceNumber || '—'} />
                            <DetailRow
                              label="Method"
                              value={prettifyEnum(payment.method)}
                            />
                            <DetailRow label="Payment Date" value={toDateInput(payment.paymentDate)} />
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                              Actions
                            </h4>

                            <div className="space-y-2">
                              <button
                                type="button"
                                onClick={() => updatePaymentStatus(payment.id, 'PENDING')}
                                className="w-full rounded-xl border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                              >
                                Mark Pending
                              </button>

                              <button
                                type="button"
                                onClick={() => updatePaymentStatus(payment.id, 'CLEARED')}
                                className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                              >
                                Mark Cleared
                              </button>

                              <button
                                type="button"
                                onClick={() => updatePaymentStatus(payment.id, 'FAILED')}
                                className="w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                              >
                                Mark Failed
                              </button>

                              <button
                                type="button"
                                onClick={() => updatePaymentStatus(payment.id, 'REFUNDED')}
                                className="w-full rounded-xl bg-slate-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-500"
                              >
                                Mark Refunded
                              </button>
                            </div>
                          </div>

                          {payment.notes ? (
                            <div className="xl:col-span-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
                                Notes
                              </h4>
                              <p className="text-sm text-white/70">{payment.notes}</p>
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

function QuickValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
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