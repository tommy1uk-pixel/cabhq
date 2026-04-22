'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { apiFetch } from '@/lib/api';

type InvoiceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'PART_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'VOID';

type Invoice = {
  id: string;
  invoiceNumber: string;
  accountName: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  tripCount: number;
  subtotal: number;
  vat: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  notes?: string | null;
};

type InvoiceFormState = {
  accountName: string;
  issueDate: string;
  dueDate: string;
  tripCount: string;
  subtotal: string;
  vat: string;
  notes: string;
};

const today = new Date().toISOString().slice(0, 10);

const initialForm: InvoiceFormState = {
  accountName: '',
  issueDate: today,
  dueDate: today,
  tripCount: '1',
  subtotal: '0',
  vat: '0',
  notes: '',
};

function formatCurrency(value: number) {
  return `£${value.toFixed(2)}`;
}

function prettifyEnum(value: string) {
  return value.replace(/_/g, ' ');
}

function statusClasses(status: InvoiceStatus) {
  if (status === 'PAID') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (status === 'PART_PAID') {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }

  if (status === 'SENT') {
    return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300';
  }

  if (status === 'OVERDUE') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }

  if (status === 'VOID') {
    return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
  }

  return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
}

function toDateInput(value?: string | null) {
  if (!value) return today;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return today;
  return date.toISOString().slice(0, 10);
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [form, setForm] = useState<InvoiceFormState>(initialForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadInvoices() {
      try {
        setLoading(true);
        setError('');

        const data = await apiFetch<Invoice[]>('/invoices');
        if (!mounted) return;

        const next = Array.isArray(data) ? data : [];
        setInvoices(next);
        setSelectedInvoiceId((current) => current ?? next[0]?.id ?? null);
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load invoices');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadInvoices();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;

    return invoices.filter((invoice) =>
      [
        invoice.invoiceNumber,
        invoice.accountName,
        invoice.status,
        invoice.issueDate,
        invoice.dueDate,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [invoices, search]);

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [invoices, selectedInvoiceId],
  );

  const stats = useMemo(() => {
    const total = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const paid = invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
    const outstanding = invoices.reduce(
      (sum, invoice) => sum + invoice.balanceDue,
      0,
    );
    const overdue = invoices
      .filter((invoice) => invoice.status === 'OVERDUE')
      .reduce((sum, invoice) => sum + invoice.balanceDue, 0);

    return {
      totalInvoices: invoices.length,
      total,
      paid,
      outstanding,
      overdue,
    };
  }, [invoices]);

  function setField<K extends keyof InvoiceFormState>(
    key: K,
    value: InvoiceFormState[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingInvoiceId(null);
  }

  function setNotice(message: string) {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 2500);
  }

  async function submitInvoice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        accountName: form.accountName.trim(),
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        tripCount: Number(form.tripCount || 0),
        subtotal: Number(form.subtotal || 0),
        vat: Number(form.vat || 0),
        notes: form.notes.trim(),
      };

      if (!payload.accountName) {
        throw new Error('Account name is required');
      }

      let savedInvoice: Invoice;

      if (editingInvoiceId) {
        savedInvoice = await apiFetch<Invoice>(`/invoices/${editingInvoiceId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });

        setInvoices((prev) =>
          prev.map((invoice) =>
            invoice.id === editingInvoiceId ? savedInvoice : invoice,
          ),
        );

        setNotice('Invoice updated');
      } else {
        savedInvoice = await apiFetch<Invoice>('/invoices', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setInvoices((prev) => [savedInvoice, ...prev]);
        setNotice('Invoice created');
      }

      setSelectedInvoiceId(savedInvoice.id);
      resetForm();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(invoice: Invoice) {
    setEditingInvoiceId(invoice.id);
    setSelectedInvoiceId(invoice.id);
    setForm({
      accountName: invoice.accountName,
      issueDate: toDateInput(invoice.issueDate),
      dueDate: toDateInput(invoice.dueDate),
      tripCount: String(invoice.tripCount),
      subtotal: String(invoice.subtotal),
      vat: String(invoice.vat),
      notes: invoice.notes ?? '',
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteInvoice(invoiceId: string) {
    const confirmed = window.confirm('Delete this invoice?');
    if (!confirmed) return;

    setError('');
    setSuccess('');

    try {
      await apiFetch(`/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      const remaining = invoices.filter((invoice) => invoice.id !== invoiceId);
      setInvoices(remaining);

      if (selectedInvoiceId === invoiceId) {
        setSelectedInvoiceId(remaining[0]?.id ?? null);
      }

      if (editingInvoiceId === invoiceId) {
        resetForm();
      }

      setNotice('Invoice deleted');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to delete invoice');
    }
  }

  async function updateInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
    setError('');
    setSuccess('');

    try {
      const updatedInvoice = await apiFetch<Invoice>(`/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      setInvoices((prev) =>
        prev.map((invoice) =>
          invoice.id === invoiceId ? updatedInvoice : invoice,
        ),
      );

      setNotice(`Invoice marked ${prettifyEnum(status).toLowerCase()}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  const liveSubtotal = Number(form.subtotal || 0);
  const liveVat = Number(form.vat || 0);
  const liveTotal = liveSubtotal + liveVat;

  return (
    <AdminShell
      title="Invoices"
      subtitle="Create, send and track account invoices, balances and payment status."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Invoices" value={stats.totalInvoices} hint="All records" />
          <StatCard label="Billed" value={formatCurrency(stats.total)} hint="Invoice value" />
          <StatCard label="Paid" value={formatCurrency(stats.paid)} hint="Collected so far" />
          <StatCard
            label="Outstanding"
            value={formatCurrency(stats.outstanding)}
            hint="Still due"
          />
          <StatCard label="Overdue" value={formatCurrency(stats.overdue)} hint="Past due date" />
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
                  {editingInvoiceId ? 'Edit Invoice' : 'Create Invoice'}
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Build monthly account invoices and billing runs.
                </p>
              </div>

              {editingInvoiceId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>

            <form onSubmit={submitInvoice} className="space-y-5">
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

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Issue Date"
                  input={
                    <input
                      type="date"
                      value={form.issueDate}
                      onChange={(e) => setField('issueDate', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Due Date"
                  input={
                    <input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setField('dueDate', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  label="Trip Count"
                  input={
                    <input
                      type="number"
                      min="0"
                      value={form.tripCount}
                      onChange={(e) => setField('tripCount', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Subtotal"
                  input={
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.subtotal}
                      onChange={(e) => setField('subtotal', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="VAT"
                  input={
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.vat}
                      onChange={(e) => setField('vat', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <QuickValue label="Subtotal" value={formatCurrency(liveSubtotal)} />
                  <QuickValue label="VAT" value={formatCurrency(liveVat)} />
                  <QuickValue label="Total" value={formatCurrency(liveTotal)} />
                </div>
              </div>

              <Field
                label="Notes"
                input={
                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                    placeholder="Invoice notes, trip period, PO number..."
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
                  ? editingInvoiceId
                    ? 'Saving Invoice...'
                    : 'Creating Invoice...'
                  : editingInvoiceId
                    ? 'Save Invoice Changes'
                    : 'Create Invoice'}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Invoices</h2>
                <p className="mt-1 text-sm text-white/60">
                  Review invoice status, balances, payment state and account totals.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoices..."
                className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50 lg:w-[300px]"
              />
            </div>

            {loading ? (
              <div className="rounded-2xl bg-[#0b1728] p-6 text-white/60">
                Loading invoices...
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="rounded-2xl bg-[#0b1728] p-6 text-white/60">
                No invoices found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInvoices.map((invoice) => {
                  const isSelected = selectedInvoiceId === invoice.id;

                  return (
                    <div
                      key={invoice.id}
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
                            setSelectedInvoiceId((current) =>
                              current === invoice.id ? null : invoice.id,
                            )
                          }
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-bold">
                              {invoice.invoiceNumber}
                            </h3>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
                                invoice.status,
                              )}`}
                            >
                              {prettifyEnum(invoice.status)}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-white/70">
                            {invoice.accountName}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/50">
                            <span>Issued: {toDateInput(invoice.issueDate)}</span>
                            <span>Due: {toDateInput(invoice.dueDate)}</span>
                            <span>Trips: {invoice.tripCount}</span>
                          </div>
                        </button>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(invoice)}
                            className="rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteInvoice(invoice.id)}
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
                              Totals
                            </h4>

                            <DetailRow
                              label="Subtotal"
                              value={formatCurrency(invoice.subtotal)}
                            />
                            <DetailRow label="VAT" value={formatCurrency(invoice.vat)} />
                            <DetailRow label="Total" value={formatCurrency(invoice.total)} />
                            <DetailRow
                              label="Paid"
                              value={formatCurrency(invoice.paidAmount)}
                            />
                            <DetailRow
                              label="Balance Due"
                              value={formatCurrency(invoice.balanceDue)}
                            />
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                              Details
                            </h4>

                            <DetailRow label="Account" value={invoice.accountName} />
                            <DetailRow label="Issue Date" value={toDateInput(invoice.issueDate)} />
                            <DetailRow label="Due Date" value={toDateInput(invoice.dueDate)} />
                            <DetailRow
                              label="Trip Count"
                              value={String(invoice.tripCount)}
                            />
                            <DetailRow label="Status" value={prettifyEnum(invoice.status)} />
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                              Actions
                            </h4>

                            <div className="space-y-2">
                              <button
                                type="button"
                                onClick={() => updateInvoiceStatus(invoice.id, 'SENT')}
                                className="w-full rounded-xl border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                              >
                                Mark Sent
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  updateInvoiceStatus(invoice.id, 'PART_PAID')
                                }
                                className="w-full rounded-xl border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                              >
                                Mark Part Paid
                              </button>

                              <button
                                type="button"
                                onClick={() => updateInvoiceStatus(invoice.id, 'PAID')}
                                className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                              >
                                Mark Paid
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  updateInvoiceStatus(invoice.id, 'OVERDUE')
                                }
                                className="w-full rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
                              >
                                Mark Overdue
                              </button>
                            </div>
                          </div>

                          {invoice.notes ? (
                            <div className="xl:col-span-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
                                Notes
                              </h4>
                              <p className="text-sm text-white/70">{invoice.notes}</p>
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