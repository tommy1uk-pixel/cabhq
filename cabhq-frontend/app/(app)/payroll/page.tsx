'use client';

import { useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';

type PayrollStatus = 'DRAFT' | 'READY' | 'PAID';

type DriverPayrollRow = {
  id: string;
  driverName: string;
  periodLabel: string;
  jobsCompleted: number;
  cashJobs: number;
  accountJobs: number;
  cashTaken: number;
  accountValue: number;
  grossFares: number;
  commissionPercent: number;
  commissionAmount: number;
  bonuses: number;
  deductions: number;
  netPay: number;
  status: PayrollStatus;
};

const initialPayroll: DriverPayrollRow[] = [
  {
    id: '1',
    driverName: 'Imran Patel',
    periodLabel: '21 Apr - 27 Apr',
    jobsCompleted: 42,
    cashJobs: 11,
    accountJobs: 31,
    cashTaken: 286,
    accountValue: 912,
    grossFares: 1198,
    commissionPercent: 25,
    commissionAmount: 299.5,
    bonuses: 40,
    deductions: 20,
    netPay: 918.5,
    status: 'READY',
  },
  {
    id: '2',
    driverName: 'David Ali',
    periodLabel: '21 Apr - 27 Apr',
    jobsCompleted: 37,
    cashJobs: 9,
    accountJobs: 28,
    cashTaken: 244,
    accountValue: 801,
    grossFares: 1045,
    commissionPercent: 25,
    commissionAmount: 261.25,
    bonuses: 0,
    deductions: 35,
    netPay: 748.75,
    status: 'DRAFT',
  },
  {
    id: '3',
    driverName: 'M Aslam',
    periodLabel: '21 Apr - 27 Apr',
    jobsCompleted: 46,
    cashJobs: 16,
    accountJobs: 30,
    cashTaken: 391,
    accountValue: 844,
    grossFares: 1235,
    commissionPercent: 25,
    commissionAmount: 308.75,
    bonuses: 25,
    deductions: 10,
    netPay: 941.25,
    status: 'PAID',
  },
];

type PayrollFormState = {
  driverName: string;
  periodLabel: string;
  jobsCompleted: string;
  cashJobs: string;
  accountJobs: string;
  cashTaken: string;
  accountValue: string;
  commissionPercent: string;
  bonuses: string;
  deductions: string;
};

const initialForm: PayrollFormState = {
  driverName: '',
  periodLabel: '21 Apr - 27 Apr',
  jobsCompleted: '0',
  cashJobs: '0',
  accountJobs: '0',
  cashTaken: '0',
  accountValue: '0',
  commissionPercent: '25',
  bonuses: '0',
  deductions: '0',
};

function formatCurrency(value: number) {
  return `£${value.toFixed(2)}`;
}

function statusClass(status: PayrollStatus) {
  if (status === 'PAID') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (status === 'READY') {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }
  return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
}

export default function PayrollPage() {
  const [rows, setRows] = useState<DriverPayrollRow[]>(initialPayroll);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialPayroll[0]?.id ?? null,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<PayrollFormState>(initialForm);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) =>
      [row.driverName, row.periodLabel, row.status]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const stats = useMemo(() => {
    const gross = rows.reduce((sum, row) => sum + row.grossFares, 0);
    const net = rows.reduce((sum, row) => sum + row.netPay, 0);
    const paid = rows.filter((row) => row.status === 'PAID').length;
    const ready = rows.filter((row) => row.status === 'READY').length;

    return {
      drivers: rows.length,
      gross,
      net,
      paid,
      ready,
    };
  }, [rows]);

  function setField<K extends keyof PayrollFormState>(
    key: K,
    value: PayrollFormState[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function startEdit(row: DriverPayrollRow) {
    setEditingId(row.id);
    setSelectedId(row.id);
    setForm({
      driverName: row.driverName,
      periodLabel: row.periodLabel,
      jobsCompleted: String(row.jobsCompleted),
      cashJobs: String(row.cashJobs),
      accountJobs: String(row.accountJobs),
      cashTaken: String(row.cashTaken),
      accountValue: String(row.accountValue),
      commissionPercent: String(row.commissionPercent),
      bonuses: String(row.bonuses),
      deductions: String(row.deductions),
    });
  }

  function submitPayroll(e: React.FormEvent) {
    e.preventDefault();

    const jobsCompleted = Number(form.jobsCompleted || 0);
    const cashJobs = Number(form.cashJobs || 0);
    const accountJobs = Number(form.accountJobs || 0);
    const cashTaken = Number(form.cashTaken || 0);
    const accountValue = Number(form.accountValue || 0);
    const commissionPercent = Number(form.commissionPercent || 0);
    const bonuses = Number(form.bonuses || 0);
    const deductions = Number(form.deductions || 0);

    const grossFares = cashTaken + accountValue;
    const commissionAmount = (grossFares * commissionPercent) / 100;
    const netPay = grossFares - commissionAmount + bonuses - deductions;

    const payload: DriverPayrollRow = {
      id: editingId ?? crypto.randomUUID(),
      driverName: form.driverName.trim(),
      periodLabel: form.periodLabel.trim(),
      jobsCompleted,
      cashJobs,
      accountJobs,
      cashTaken,
      accountValue,
      grossFares,
      commissionPercent,
      commissionAmount,
      bonuses,
      deductions,
      netPay,
      status: editingId
        ? rows.find((row) => row.id === editingId)?.status ?? 'DRAFT'
        : 'DRAFT',
    };

    if (!payload.driverName) return;

    setRows((prev) => {
      const exists = prev.some((row) => row.id === payload.id);
      if (exists) {
        return prev.map((row) => (row.id === payload.id ? payload : row));
      }
      return [payload, ...prev];
    });

    setSelectedId(payload.id);
    resetForm();
  }

  function updateStatus(id: string, status: PayrollStatus) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, status } : row)),
    );
  }

  function deleteRow(id: string) {
    const confirmed = window.confirm('Delete this payroll row?');
    if (!confirmed) return;

    setRows((prev) => prev.filter((row) => row.id !== id));

    if (selectedId === id) {
      const remaining = rows.filter((row) => row.id !== id);
      setSelectedId(remaining[0]?.id ?? null);
    }

    if (editingId === id) {
      resetForm();
    }
  }

  return (
    <AdminShell
      title="Driver Earnings / Payroll"
      subtitle="Weekly driver totals, commission splits, bonuses, deductions and payout status."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Drivers" value={stats.drivers} />
          <StatCard label="Gross Fares" value={formatCurrency(stats.gross)} />
          <StatCard label="Net Pay" value={formatCurrency(stats.net)} />
          <StatCard label="Ready" value={stats.ready} />
          <StatCard label="Paid" value={stats.paid} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">
                  {editingId ? 'Edit Payroll' : 'Create Payroll'}
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Enter driver takings and calculate payout automatically.
                </p>
              </div>

              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>

            <form onSubmit={submitPayroll} className="space-y-5">
              <Field
                label="Driver Name"
                input={
                  <input
                    value={form.driverName}
                    onChange={(e) => setField('driverName', e.target.value)}
                    className={inputClassName}
                    placeholder="Imran Patel"
                  />
                }
              />

              <Field
                label="Period"
                input={
                  <input
                    value={form.periodLabel}
                    onChange={(e) => setField('periodLabel', e.target.value)}
                    className={inputClassName}
                    placeholder="21 Apr - 27 Apr"
                  />
                }
              />

              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  label="Jobs"
                  input={
                    <input
                      type="number"
                      value={form.jobsCompleted}
                      onChange={(e) => setField('jobsCompleted', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
                <Field
                  label="Cash Jobs"
                  input={
                    <input
                      type="number"
                      value={form.cashJobs}
                      onChange={(e) => setField('cashJobs', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
                <Field
                  label="Account Jobs"
                  input={
                    <input
                      type="number"
                      value={form.accountJobs}
                      onChange={(e) => setField('accountJobs', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Cash Taken"
                  input={
                    <input
                      type="number"
                      step="0.01"
                      value={form.cashTaken}
                      onChange={(e) => setField('cashTaken', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
                <Field
                  label="Account Value"
                  input={
                    <input
                      type="number"
                      step="0.01"
                      value={form.accountValue}
                      onChange={(e) => setField('accountValue', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  label="Commission %"
                  input={
                    <input
                      type="number"
                      step="0.01"
                      value={form.commissionPercent}
                      onChange={(e) =>
                        setField('commissionPercent', e.target.value)
                      }
                      className={inputClassName}
                    />
                  }
                />
                <Field
                  label="Bonuses"
                  input={
                    <input
                      type="number"
                      step="0.01"
                      value={form.bonuses}
                      onChange={(e) => setField('bonuses', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
                <Field
                  label="Deductions"
                  input={
                    <input
                      type="number"
                      step="0.01"
                      value={form.deductions}
                      onChange={(e) => setField('deductions', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-500"
              >
                {editingId ? 'Save Payroll Changes' : 'Create Payroll Row'}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Payroll Rows</h2>
                <p className="mt-1 text-sm text-white/60">
                  Review weekly earnings, commission and payout state.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search payroll..."
                className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-500/50 lg:w-[300px]"
              />
            </div>

            {filteredRows.length === 0 ? (
              <div className="rounded-2xl bg-[#0b1728] p-6 text-white/60">
                No payroll rows found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRows.map((row) => {
                  const isSelected = selectedId === row.id;

                  return (
                    <div
                      key={row.id}
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
                            setSelectedId((current) =>
                              current === row.id ? null : row.id,
                            )
                          }
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-bold">{row.driverName}</h3>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                                row.status,
                              )}`}
                            >
                              {row.status}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-white/70">{row.periodLabel}</p>

                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                            <span>Jobs: {row.jobsCompleted}</span>
                            <span>Gross: {formatCurrency(row.grossFares)}</span>
                            <span>Net: {formatCurrency(row.netPay)}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            className="rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRow(row.id)}
                            className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 xl:grid-cols-3">
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                              Earnings
                            </h4>
                            <DetailRow label="Cash Taken" value={formatCurrency(row.cashTaken)} />
                            <DetailRow label="Account Value" value={formatCurrency(row.accountValue)} />
                            <DetailRow label="Gross Fares" value={formatCurrency(row.grossFares)} />
                            <DetailRow label="Net Pay" value={formatCurrency(row.netPay)} />
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                              Commission
                            </h4>
                            <DetailRow label="Commission %" value={`${row.commissionPercent}%`} />
                            <DetailRow
                              label="Commission Amount"
                              value={formatCurrency(row.commissionAmount)}
                            />
                            <DetailRow label="Bonuses" value={formatCurrency(row.bonuses)} />
                            <DetailRow label="Deductions" value={formatCurrency(row.deductions)} />
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                              Actions
                            </h4>

                            <div className="space-y-2">
                              <button
                                type="button"
                                onClick={() => updateStatus(row.id, 'DRAFT')}
                                className="w-full rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/10"
                              >
                                Mark Draft
                              </button>
                              <button
                                type="button"
                                onClick={() => updateStatus(row.id, 'READY')}
                                className="w-full rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
                              >
                                Mark Ready
                              </button>
                              <button
                                type="button"
                                onClick={() => updateStatus(row.id, 'PAID')}
                                className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                              >
                                Mark Paid
                              </button>
                            </div>
                          </div>
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
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-white/60">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
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