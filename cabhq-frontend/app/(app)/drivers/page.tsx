'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { apiFetch } from '@/lib/api';

type ComplianceDocumentStatus =
  | 'VALID'
  | 'EXPIRING'
  | 'EXPIRED'
  | 'NO_EXPIRY';

type DriverDocumentType =
  | 'DRIVING_LICENCE'
  | 'DBS_CHECK'
  | 'TAXI_BADGE'
  | 'MEDICAL_CERTIFICATE'
  | 'RIGHT_TO_WORK'
  | 'INSURANCE'
  | 'OTHER';

type DriverShiftSummary = {
  totalJobs: number;
  completedJobs: number;
  cancelledJobs?: number;
  activeJobs: number;
};

type DriverShift = {
  id: string;
  driverId: string;
  companyId: string;
  startedAt: string;
  endedAt?: string | null;
  startStatus?: string | null;
  endStatus?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  active: boolean;
  durationMinutes: number;
  summary: DriverShiftSummary;
};

type DriverDocument = {
  id: string;
  driverId: string;
  documentType: DriverDocumentType;
  title: string;
  fileName: string;
  filePath: string;
  mimeType?: string | null;
  fileSize?: number | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  status: ComplianceDocumentStatus;
  notes?: string | null;
  dbsUpdateServiceEnabled?: boolean;
  dbsUpdateServiceReference?: string | null;
  dbsUpdateServiceCheckedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type DriverDispatchState = {
  assignable: boolean;
  blockedReasons: string[];
};

type DriverComplianceState = {
  blocked: boolean;
  overallStatus: 'VALID' | 'EXPIRING' | 'EXPIRED' | string;
};

type Driver = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  pin?: string | null;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  lastLocationAt?: string | null;
  licenceNumber?: string | null;
  badgeExpiry?: string | null;
  dbsExpiry?: string | null;
  licenceExpiry?: string | null;
  createdAt?: string | null;
  documents: DriverDocument[];
  dispatch?: DriverDispatchState;
  compliance?: DriverComplianceState;
  shift?: DriverShift | null;
};

type DriverFormState = {
  name: string;
  phone: string;
  email: string;
  pin: string;
  status: string;
  licenceNumber: string;
  badgeExpiry: string;
  dbsExpiry: string;
  licenceExpiry: string;
};

type DriverDocumentFormState = {
  documentType: DriverDocumentType;
  title: string;
  issueDate: string;
  expiryDate: string;
  notes: string;
  dbsUpdateServiceEnabled: boolean;
  dbsUpdateServiceReference: string;
  dbsUpdateServiceCheckedAt: string;
  file: File | null;
};

const initialDriverForm: DriverFormState = {
  name: '',
  phone: '',
  email: '',
  pin: '',
  status: 'OFF_DUTY',
  licenceNumber: '',
  badgeExpiry: '',
  dbsExpiry: '',
  licenceExpiry: '',
};

const initialDocumentForm: DriverDocumentFormState = {
  documentType: 'DRIVING_LICENCE',
  title: '',
  issueDate: '',
  expiryDate: '',
  notes: '',
  dbsUpdateServiceEnabled: false,
  dbsUpdateServiceReference: '',
  dbsUpdateServiceCheckedAt: '',
  file: null,
};

const driverDocumentTypeOptions: { value: DriverDocumentType; label: string }[] =
  [
    { value: 'DRIVING_LICENCE', label: 'Driving Licence' },
    { value: 'DBS_CHECK', label: 'DBS Check' },
    { value: 'TAXI_BADGE', label: 'Taxi Badge' },
    { value: 'MEDICAL_CERTIFICATE', label: 'Medical Certificate' },
    { value: 'RIGHT_TO_WORK', label: 'Right to Work' },
    { value: 'INSURANCE', label: 'Insurance' },
    { value: 'OTHER', label: 'Other' },
  ];

function DriversPageContent() {
  const searchParams = useSearchParams();
  const queryDriverId = searchParams.get('driverId');

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<DriverFormState>(initialDriverForm);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [documentForms, setDocumentForms] = useState<
    Record<string, DriverDocumentFormState>
  >({});
  const [shiftHistory, setShiftHistory] = useState<Record<string, DriverShift[]>>(
    {},
  );
  const [loadingShiftHistoryId, setLoadingShiftHistoryId] = useState<string | null>(
    null,
  );

  const [uploadingDriverId, setUploadingDriverId] = useState<string | null>(null);
  const [deletingDriverId, setDeletingDriverId] = useState<string | null>(null);
  const [statusSavingDriverId, setStatusSavingDriverId] = useState<string | null>(
    null,
  );
  const [startingShiftDriverId, setStartingShiftDriverId] = useState<string | null>(
    null,
  );
  const [endingShiftDriverId, setEndingShiftDriverId] = useState<string | null>(
    null,
  );
  const [removingDocumentId, setRemovingDocumentId] = useState<string | null>(null);

  const sortDrivers = useCallback((list: Driver[]) => {
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const selectedDriver = useMemo(
    () => drivers.find((driver) => driver.id === selectedDriverId) ?? null,
    [drivers, selectedDriverId],
  );

  const blockedDrivers = useMemo(
    () => drivers.filter((driver) => driver.dispatch?.assignable === false),
    [drivers],
  );

  const expiringDrivers = useMemo(
    () =>
      drivers.filter(
        (driver) =>
          driver.dispatch?.assignable !== false &&
          driver.compliance?.overallStatus === 'EXPIRING',
      ),
    [drivers],
  );

  const clearDrivers = useMemo(
    () =>
      drivers.filter(
        (driver) =>
          driver.dispatch?.assignable !== false &&
          driver.compliance?.overallStatus !== 'EXPIRING',
      ),
    [drivers],
  );

  const onShiftDrivers = useMemo(
    () => drivers.filter((driver) => Boolean(driver.shift?.active)),
    [drivers],
  );

  const filteredDrivers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;

    return drivers.filter((driver) =>
      [
        driver.name,
        driver.phone,
        driver.email,
        driver.pin,
        driver.status,
        driver.licenceNumber,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [drivers, search]);

  const upsertDriver = useCallback(
    (driver: Driver) => {
      setDrivers((current) => {
        const exists = current.some((item) => item.id === driver.id);
        const next = exists
          ? current.map((item) => (item.id === driver.id ? driver : item))
          : [...current, driver];

        return sortDrivers(next);
      });

      setSelectedDriverId((current) => current ?? driver.id);
    },
    [sortDrivers],
  );

  const fetchDriver = useCallback(async (driverId: string) => {
    return apiFetch<Driver>(`/drivers/${driverId}`);
  }, []);

  const fetchShiftHistory = useCallback(async (driverId: string) => {
    const result = await apiFetch<DriverShift[]>(`/drivers/${driverId}/shifts`);
    setShiftHistory((current) => ({
      ...current,
      [driverId]: Array.isArray(result) ? result : [],
    }));
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const data = await apiFetch<Driver[]>('/drivers');
      const nextDrivers = Array.isArray(data) ? data : [];
      const sortedDrivers = sortDrivers(nextDrivers);

      setDrivers(sortedDrivers);

      if (sortedDrivers.length > 0) {
        setSelectedDriverId((current) => {
          if (
            queryDriverId &&
            sortedDrivers.some((driver) => driver.id === queryDriverId)
          ) {
            return queryDriverId;
          }

          if (current && sortedDrivers.some((driver) => driver.id === current)) {
            return current;
          }

          return sortedDrivers[0].id;
        });
      } else {
        setSelectedDriverId(null);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to load drivers');
    } finally {
      setLoading(false);
    }
  }, [queryDriverId, sortDrivers]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedDriverId) return;
    if (shiftHistory[selectedDriverId]) return;

    setLoadingShiftHistoryId(selectedDriverId);
    void fetchShiftHistory(selectedDriverId).finally(() => {
      setLoadingShiftHistoryId(null);
    });
  }, [fetchShiftHistory, selectedDriverId, shiftHistory]);

  function setField<K extends keyof DriverFormState>(
    key: K,
    value: DriverFormState[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  const resetForm = useCallback(() => {
    setForm(initialDriverForm);
    setEditingDriverId(null);
  }, []);

  const startEdit = useCallback((driver: Driver) => {
    setEditingDriverId(driver.id);
    setSelectedDriverId(driver.id);
    setForm({
      name: driver.name ?? '',
      phone: driver.phone ?? '',
      email: driver.email ?? '',
      pin: driver.pin ?? '',
      status: driver.status ?? 'OFF_DUTY',
      licenceNumber: driver.licenceNumber ?? '',
      badgeExpiry: toDateInput(driver.badgeExpiry),
      dbsExpiry: toDateInput(driver.dbsExpiry),
      licenceExpiry: toDateInput(driver.licenceExpiry),
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const submitDriver = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);

      const payload = {
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        pin: form.pin || null,
        status: form.status || 'OFF_DUTY',
        licenceNumber: form.licenceNumber || null,
        badgeExpiry: form.badgeExpiry || null,
        dbsExpiry: form.dbsExpiry || null,
        licenceExpiry: form.licenceExpiry || null,
      };

      try {
        if (editingDriverId) {
          await apiFetch(`/drivers/${editingDriverId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });

          const refreshed = await fetchDriver(editingDriverId);
          upsertDriver(refreshed);
        } else {
          const created = await apiFetch<Driver>('/drivers', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

          const refreshed = await fetchDriver(created.id);
          upsertDriver(refreshed);
          setSelectedDriverId(refreshed.id);
        }

        resetForm();
      } catch (error) {
        console.error(error);
        alert(editingDriverId ? 'Failed to update driver' : 'Failed to create driver');
      } finally {
        setSaving(false);
      }
    },
    [editingDriverId, fetchDriver, form, resetForm, upsertDriver],
  );

  const updateDriverStatus = useCallback(
    async (driverId: string, status: string) => {
      setStatusSavingDriverId(driverId);

      try {
        await apiFetch(`/drivers/${driverId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });

        const refreshed = await fetchDriver(driverId);
        upsertDriver(refreshed);
      } catch (error) {
        console.error(error);
        alert('Failed to update driver status');
      } finally {
        setStatusSavingDriverId(null);
      }
    },
    [fetchDriver, upsertDriver],
  );

  const startShift = useCallback(
    async (driverId: string) => {
      setStartingShiftDriverId(driverId);

      try {
        await apiFetch(`/drivers/${driverId}/start-shift`, {
          method: 'POST',
        });

        const refreshed = await fetchDriver(driverId);
        upsertDriver(refreshed);
        await fetchShiftHistory(driverId);
      } catch (error) {
        console.error(error);
        alert('Failed to start shift');
      } finally {
        setStartingShiftDriverId(null);
      }
    },
    [fetchDriver, fetchShiftHistory, upsertDriver],
  );

  const endShift = useCallback(
    async (driverId: string) => {
      setEndingShiftDriverId(driverId);

      try {
        await apiFetch(`/drivers/${driverId}/end-shift`, {
          method: 'POST',
        });

        const refreshed = await fetchDriver(driverId);
        upsertDriver(refreshed);
        await fetchShiftHistory(driverId);
      } catch (error) {
        console.error(error);
        alert(error instanceof Error ? error.message : 'Failed to end shift');
      } finally {
        setEndingShiftDriverId(null);
      }
    },
    [fetchDriver, fetchShiftHistory, upsertDriver],
  );

  const deleteDriver = useCallback(
    async (driverId: string) => {
      const confirmed = window.confirm('Delete this driver?');
      if (!confirmed) return;

      setDeletingDriverId(driverId);

      try {
        await apiFetch(`/drivers/${driverId}`, {
          method: 'DELETE',
        });

        setDrivers((current) => {
          const next = current.filter((driver) => driver.id !== driverId);

          setSelectedDriverId((selected) => {
            if (selected !== driverId) return selected;
            return next[0]?.id ?? null;
          });

          return next;
        });

        setShiftHistory((current) => {
          const next = { ...current };
          delete next[driverId];
          return next;
        });

        if (editingDriverId === driverId) {
          resetForm();
        }
      } catch (error) {
        console.error(error);
        alert('Failed to delete driver');
      } finally {
        setDeletingDriverId(null);
      }
    },
    [editingDriverId, resetForm],
  );

  function getDocumentForm(driverId: string): DriverDocumentFormState {
    return documentForms[driverId] ?? initialDocumentForm;
  }

  function setDocumentFormField<K extends keyof DriverDocumentFormState>(
    driverId: string,
    key: K,
    value: DriverDocumentFormState[K],
  ) {
    setDocumentForms((prev) => ({
      ...prev,
      [driverId]: {
        ...(prev[driverId] ?? initialDocumentForm),
        [key]: value,
      },
    }));
  }

  const resetDocumentForm = useCallback((driverId: string) => {
    setDocumentForms((prev) => ({
      ...prev,
      [driverId]: initialDocumentForm,
    }));
  }, []);

  const uploadDriverDocument = useCallback(
    async (driverId: string) => {
      const formState = getDocumentForm(driverId);

      if (!formState.title.trim()) {
        alert('Document title is required');
        return;
      }

      if (!formState.file) {
        alert('Please choose a file to upload');
        return;
      }

      setUploadingDriverId(driverId);

      try {
        const formData = new FormData();
        formData.append('documentType', formState.documentType);
        formData.append('title', formState.title.trim());

        if (formState.issueDate) {
          formData.append('issueDate', formState.issueDate);
        }

        if (formState.expiryDate) {
          formData.append('expiryDate', formState.expiryDate);
        }

        if (formState.notes) {
          formData.append('notes', formState.notes);
        }

        if (formState.documentType === 'DBS_CHECK') {
          formData.append(
            'dbsUpdateServiceEnabled',
            formState.dbsUpdateServiceEnabled ? 'true' : 'false',
          );

          if (formState.dbsUpdateServiceReference) {
            formData.append(
              'dbsUpdateServiceReference',
              formState.dbsUpdateServiceReference,
            );
          }

          if (formState.dbsUpdateServiceCheckedAt) {
            formData.append(
              'dbsUpdateServiceCheckedAt',
              formState.dbsUpdateServiceCheckedAt,
            );
          }
        }

        formData.append('file', formState.file);

        await apiFetch(`/drivers/${driverId}/documents`, {
          method: 'POST',
          body: formData,
        });

        const refreshed = await fetchDriver(driverId);
        upsertDriver(refreshed);
        resetDocumentForm(driverId);
      } catch (error) {
        console.error(error);
        alert('Failed to upload driver document');
      } finally {
        setUploadingDriverId(null);
      }
    },
    [documentForms, fetchDriver, resetDocumentForm, upsertDriver],
  );

  const removeDocument = useCallback(
    async (driverId: string, documentId: string) => {
      const confirmed = window.confirm('Delete this document?');
      if (!confirmed) return;

      setRemovingDocumentId(documentId);

      try {
        await apiFetch(`/drivers/${driverId}/documents/${documentId}`, {
          method: 'DELETE',
        });

        const refreshed = await fetchDriver(driverId);
        upsertDriver(refreshed);
      } catch (error) {
        console.error(error);
        alert('Failed to delete driver document');
      } finally {
        setRemovingDocumentId(null);
      }
    },
    [fetchDriver, upsertDriver],
  );

  return (
    <AdminShell
      title="Drivers"
      subtitle="Driver records, compliance tracking, shifts and document control"
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.10),transparent_30%),linear-gradient(135deg,#081120_0%,#0c1527_55%,#07101c_100%)] p-6 md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-cyan-500/25 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                CabHQ Driver Management
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight text-white md:text-5xl">
                Manage drivers, shifts and compliance
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                Create driver records, track readiness for dispatch, manage live
                shift state and keep compliance documents under control.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Total Drivers" value={drivers.length} hint="Driver records" tone="slate" />
          <StatCard label="On Shift" value={onShiftDrivers.length} hint="Currently working" tone="cyan" />
          <StatCard label="Clear" value={clearDrivers.length} hint="Dispatch ready" tone="emerald" />
          <StatCard label="Expiring" value={expiringDrivers.length} hint="Attention soon" tone="amber" />
          <StatCard label="Blocked" value={blockedDrivers.length} hint="Cannot be dispatched" tone="red" />
          <StatCard
            label="Documents"
            value={drivers.reduce(
              (count, driver) => count + (driver.documents?.length ?? 0),
              0,
            )}
            hint="Uploaded compliance files"
            tone="violet"
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">
                  {editingDriverId ? 'Edit Driver' : 'Add Driver'}
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Create and manage driver records, dates, shifts and dispatch status.
                </p>
              </div>

              {editingDriverId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>

            <form onSubmit={submitDriver} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Field
                  label="Driver Name *"
                  input={
                    <input
                      value={form.name}
                      onChange={(e) => setField('name', e.target.value)}
                      placeholder="Driver full name"
                      required
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Status"
                  input={
                    <select
                      value={form.status}
                      onChange={(e) => setField('status', e.target.value)}
                      className={inputClassName}
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="BUSY">BUSY</option>
                      <option value="ON_DUTY">ON_DUTY</option>
                      <option value="ONLINE">ONLINE</option>
                      <option value="OFF_DUTY">OFF_DUTY</option>
                    </select>
                  }
                />

                <Field
                  label="Phone"
                  input={
                    <input
                      value={form.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                      placeholder="Phone number"
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Email"
                  input={
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setField('email', e.target.value)}
                      placeholder="Email address"
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="PIN *"
                  input={
                    <input
                      value={form.pin}
                      onChange={(e) => setField('pin', e.target.value)}
                      placeholder="Driver PIN"
                      required
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Licence Number"
                  input={
                    <input
                      value={form.licenceNumber}
                      onChange={(e) => setField('licenceNumber', e.target.value)}
                      placeholder="Driver licence / badge reference"
                      className={inputClassName}
                    />
                  }
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/70">
                  Core Compliance Dates
                </h3>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <Field
                    label="Taxi Badge Expiry"
                    input={
                      <input
                        type="date"
                        value={form.badgeExpiry}
                        onChange={(e) => setField('badgeExpiry', e.target.value)}
                        className={inputClassName}
                      />
                    }
                  />

                  <Field
                    label="DBS Expiry"
                    input={
                      <input
                        type="date"
                        value={form.dbsExpiry}
                        onChange={(e) => setField('dbsExpiry', e.target.value)}
                        className={inputClassName}
                      />
                    }
                  />

                  <Field
                    label="Licence Expiry"
                    input={
                      <input
                        type="date"
                        value={form.licenceExpiry}
                        onChange={(e) => setField('licenceExpiry', e.target.value)}
                        className={inputClassName}
                      />
                    }
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? editingDriverId
                    ? 'Saving Driver...'
                    : 'Creating Driver...'
                  : editingDriverId
                    ? 'Save Driver Changes'
                    : 'Create Driver'}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Drivers</h2>
                <p className="mt-1 text-sm text-white/60">
                  Driver records, shift controls and compliance visibility.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="rounded-xl border border-white/10 bg-[#0b1728] px-3 py-2 text-sm text-white/70">
                  On shift:{' '}
                  <span className="font-semibold text-white">{onShiftDrivers.length}</span>
                </div>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search drivers..."
                  className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-500/50 sm:w-[240px]"
                />
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl bg-[#0b1728] p-6 text-white/70">
                Loading drivers...
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="rounded-2xl bg-[#0b1728] p-6 text-white/70">
                No drivers found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDrivers.map((driver) => {
                  const documentForm = getDocumentForm(driver.id);
                  const isSelected = selectedDriverId === driver.id;
                  const driverBlocked = driver.dispatch?.assignable === false;
                  const driverExpiring =
                    driver.dispatch?.assignable !== false &&
                    driver.compliance?.overallStatus === 'EXPIRING';
                  const onShift = Boolean(driver.shift?.active);

                  return (
                    <div
                      key={driver.id}
                      className={`rounded-2xl border p-5 transition ${
                        isSelected
                          ? 'border-cyan-500/50 bg-[#0c1b2c]'
                          : 'border-white/10 bg-[#0b1728]'
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-bold">{driver.name}</h3>
                            <StatusBadge value={driver.status} />
                            <ComplianceBadge
                              value={
                                (driver.compliance?.overallStatus as
                                  | 'VALID'
                                  | 'EXPIRING'
                                  | 'EXPIRED') || 'VALID'
                              }
                            />
                            <ShiftBadge active={onShift} />
                            {driverBlocked ? (
                              <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300">
                                DISPATCH BLOCKED
                              </span>
                            ) : (
                              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                                DISPATCH READY
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-sm text-white/70">
                            {[driver.phone, driver.email].filter(Boolean).join(' · ') ||
                              'No contact details added'}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/50">
                            <span>PIN: {driver.pin || '—'}</span>
                            <span>Documents: {driver.documents?.length ?? 0}</span>
                            <span>
                              Last location:{' '}
                              {driver.lastLocationAt
                                ? formatDateTime(driver.lastLocationAt)
                                : 'No live update'}
                            </span>
                            <span>
                              Shift:{' '}
                              {onShift && driver.shift
                                ? `${formatMinutes(driver.shift.durationMinutes)} active`
                                : 'Off shift'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedDriverId((current) =>
                                current === driver.id ? null : driver.id,
                              )
                            }
                            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
                          >
                            {isSelected ? 'Hide details' : 'View details'}
                          </button>

                          {!onShift ? (
                            <button
                              type="button"
                              onClick={() => startShift(driver.id)}
                              disabled={startingShiftDriverId === driver.id}
                              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {startingShiftDriverId === driver.id ? 'Starting...' : 'Start Shift'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => endShift(driver.id)}
                              disabled={endingShiftDriverId === driver.id}
                              className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {endingShiftDriverId === driver.id ? 'Ending...' : 'End Shift'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => startEdit(driver)}
                            className="rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteDriver(driver.id)}
                            disabled={deletingDriverId === driver.id}
                            className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingDriverId === driver.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>

                      {driverBlocked && driver.dispatch?.blockedReasons?.length ? (
                        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-red-200">
                            Blocked reasons
                          </p>
                          <div className="space-y-1">
                            {driver.dispatch.blockedReasons.map((reason) => (
                              <p key={reason} className="text-xs text-red-100/90">
                                {reason}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {isSelected ? (
                        <div className="mt-5 space-y-5 border-t border-white/10 pt-5">
                          <div className="grid gap-4 xl:grid-cols-3">
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                                Driver Details
                              </h4>

                              <DetailRow label="Name" value={driver.name} />
                              <DetailRow label="Phone" value={driver.phone || '—'} />
                              <DetailRow label="Email" value={driver.email || '—'} />
                              <DetailRow label="PIN" value={driver.pin || '—'} />
                              <DetailRow
                                label="Licence Number"
                                value={driver.licenceNumber || '—'}
                              />
                              <DetailRow
                                label="Dispatch Ready"
                                value={driver.dispatch?.assignable === false ? 'No' : 'Yes'}
                              />
                              <DetailRow label="On Shift" value={onShift ? 'Yes' : 'No'} />
                              <DetailRow
                                label="Shift Started"
                                value={
                                  driver.shift?.startedAt
                                    ? formatDateTime(driver.shift.startedAt)
                                    : '—'
                                }
                              />
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 xl:col-span-2">
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                <h4 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                                  Controls
                                </h4>

                                <div className="flex flex-wrap gap-2">
                                  {!onShift ? (
                                    <button
                                      type="button"
                                      onClick={() => startShift(driver.id)}
                                      disabled={startingShiftDriverId === driver.id}
                                      className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {startingShiftDriverId === driver.id
                                        ? 'Starting...'
                                        : 'Start Shift'}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => endShift(driver.id)}
                                      disabled={endingShiftDriverId === driver.id}
                                      className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {endingShiftDriverId === driver.id ? 'Ending...' : 'End Shift'}
                                    </button>
                                  )}

                                  <select
                                    value={driver.status}
                                    disabled={statusSavingDriverId === driver.id}
                                    onChange={(e) =>
                                      updateDriverStatus(driver.id, e.target.value)
                                    }
                                    className="rounded-xl border border-white/10 bg-[#07111f] px-3 py-2 text-sm text-white outline-none"
                                  >
                                    <option value="AVAILABLE">AVAILABLE</option>
                                    <option value="BUSY">BUSY</option>
                                    <option value="ON_DUTY">ON_DUTY</option>
                                    <option value="ONLINE">ONLINE</option>
                                    <option value="OFF_DUTY">OFF_DUTY</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-3">
                                <div className="rounded-xl border border-white/10 bg-[#07111f] p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium text-white">Taxi Badge</p>
                                    <MiniComplianceBadge
                                      value={deriveDateStatus(driver.badgeExpiry)}
                                    />
                                  </div>
                                  <p className="mt-2 text-sm text-white/60">
                                    {driver.badgeExpiry
                                      ? formatDate(driver.badgeExpiry)
                                      : 'No date set'}
                                  </p>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-[#07111f] p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium text-white">DBS</p>
                                    <MiniComplianceBadge
                                      value={deriveDateStatus(driver.dbsExpiry)}
                                    />
                                  </div>
                                  <p className="mt-2 text-sm text-white/60">
                                    {driver.dbsExpiry
                                      ? formatDate(driver.dbsExpiry)
                                      : 'No date set'}
                                  </p>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-[#07111f] p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium text-white">Licence</p>
                                    <MiniComplianceBadge
                                      value={deriveDateStatus(driver.licenceExpiry)}
                                    />
                                  </div>
                                  <p className="mt-2 text-sm text-white/60">
                                    {driver.licenceExpiry
                                      ? formatDate(driver.licenceExpiry)
                                      : 'No date set'}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 md:grid-cols-4">
                                <ShiftMetricCard
                                  label="Shift Status"
                                  value={onShift ? 'LIVE' : 'OFF'}
                                  hint={
                                    onShift && driver.shift?.startedAt
                                      ? `Since ${formatDateTime(driver.shift.startedAt)}`
                                      : 'Not clocked in'
                                  }
                                />
                                <ShiftMetricCard
                                  label="Duration"
                                  value={
                                    onShift && driver.shift
                                      ? formatMinutes(driver.shift.durationMinutes)
                                      : '—'
                                  }
                                  hint="Current shift"
                                />
                                <ShiftMetricCard
                                  label="Completed Jobs"
                                  value={driver.shift?.summary?.completedJobs ?? 0}
                                  hint="This shift"
                                />
                                <ShiftMetricCard
                                  label="Active Jobs"
                                  value={driver.shift?.summary?.activeJobs ?? 0}
                                  hint="Current workload"
                                />
                              </div>

                              {driverBlocked ? (
                                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-red-200">
                                    Dispatch blocked
                                  </p>
                                  <p className="mt-2 text-sm text-red-100/90">
                                    This driver cannot currently be assigned work.
                                  </p>
                                </div>
                              ) : driverExpiring ? (
                                <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
                                    Compliance warning
                                  </p>
                                  <p className="mt-2 text-sm text-amber-100/90">
                                    This driver is still dispatchable, but compliance is expiring soon.
                                  </p>
                                </div>
                              ) : (
                                <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
                                    Compliance clear
                                  </p>
                                  <p className="mt-2 text-sm text-emerald-100/90">
                                    No active dispatch blockers on this driver.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <h4 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                                Shift History
                              </h4>
                              <button
                                type="button"
                                onClick={() => {
                                  setLoadingShiftHistoryId(driver.id);
                                  void fetchShiftHistory(driver.id).finally(() => {
                                    setLoadingShiftHistoryId(null);
                                  });
                                }}
                                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
                              >
                                Refresh
                              </button>
                            </div>

                            {loadingShiftHistoryId === driver.id &&
                            !shiftHistory[driver.id] ? (
                              <div className="rounded-xl bg-[#07111f] p-4 text-sm text-white/60">
                                Loading shift history...
                              </div>
                            ) : (shiftHistory[driver.id] ?? []).length === 0 ? (
                              <div className="rounded-xl bg-[#07111f] p-4 text-sm text-white/60">
                                No shifts recorded yet.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {(shiftHistory[driver.id] ?? []).map((shift) => (
                                  <div
                                    key={shift.id}
                                    className="rounded-xl border border-white/10 bg-[#07111f] p-4"
                                  >
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                      <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <ShiftBadge active={shift.active} />
                                          <p className="text-sm font-semibold text-white">
                                            {shift.active ? 'Active shift' : 'Completed shift'}
                                          </p>
                                        </div>
                                        <p className="mt-2 text-sm text-white/60">
                                          Start: {formatDateTime(shift.startedAt)}
                                        </p>
                                        <p className="mt-1 text-sm text-white/60">
                                          End: {shift.endedAt ? formatDateTime(shift.endedAt) : '—'}
                                        </p>
                                      </div>

                                      <div className="grid gap-2 md:grid-cols-4">
                                        <MiniStat
                                          label="Duration"
                                          value={formatMinutes(shift.durationMinutes)}
                                        />
                                        <MiniStat
                                          label="Total"
                                          value={shift.summary?.totalJobs ?? 0}
                                        />
                                        <MiniStat
                                          label="Completed"
                                          value={shift.summary?.completedJobs ?? 0}
                                        />
                                        <MiniStat
                                          label="Cancelled"
                                          value={shift.summary?.cancelledJobs ?? 0}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/70">
                                Upload Driver Document
                              </h4>

                              <div className="space-y-3">
                                <Field
                                  label="Document Type"
                                  input={
                                    <select
                                      value={documentForm.documentType}
                                      onChange={(e) =>
                                        setDocumentFormField(
                                          driver.id,
                                          'documentType',
                                          e.target.value as DriverDocumentType,
                                        )
                                      }
                                      className={inputClassName}
                                    >
                                      {driverDocumentTypeOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  }
                                />

                                <Field
                                  label="Title"
                                  input={
                                    <input
                                      value={documentForm.title}
                                      onChange={(e) =>
                                        setDocumentFormField(driver.id, 'title', e.target.value)
                                      }
                                      placeholder="e.g. Current DBS Certificate"
                                      className={inputClassName}
                                    />
                                  }
                                />

                                <Field
                                  label="Issue Date"
                                  input={
                                    <input
                                      type="date"
                                      value={documentForm.issueDate}
                                      onChange={(e) =>
                                        setDocumentFormField(
                                          driver.id,
                                          'issueDate',
                                          e.target.value,
                                        )
                                      }
                                      className={inputClassName}
                                    />
                                  }
                                />

                                <Field
                                  label="Expiry Date"
                                  input={
                                    <input
                                      type="date"
                                      value={documentForm.expiryDate}
                                      onChange={(e) =>
                                        setDocumentFormField(
                                          driver.id,
                                          'expiryDate',
                                          e.target.value,
                                        )
                                      }
                                      className={inputClassName}
                                    />
                                  }
                                />

                                <Field
                                  label="Notes"
                                  input={
                                    <textarea
                                      rows={3}
                                      value={documentForm.notes}
                                      onChange={(e) =>
                                        setDocumentFormField(driver.id, 'notes', e.target.value)
                                      }
                                      className={`${inputClassName} resize-none`}
                                    />
                                  }
                                />

                                {documentForm.documentType === 'DBS_CHECK' ? (
                                  <div className="rounded-xl border border-white/10 bg-[#07111f] p-3">
                                    <div className="space-y-3">
                                      <label className="flex items-center gap-3 text-sm text-white/80">
                                        <input
                                          type="checkbox"
                                          checked={documentForm.dbsUpdateServiceEnabled}
                                          onChange={(e) =>
                                            setDocumentFormField(
                                              driver.id,
                                              'dbsUpdateServiceEnabled',
                                              e.target.checked,
                                            )
                                          }
                                        />
                                        DBS Update Service enabled
                                      </label>

                                      <Field
                                        label="Update Service Reference"
                                        input={
                                          <input
                                            value={documentForm.dbsUpdateServiceReference}
                                            onChange={(e) =>
                                              setDocumentFormField(
                                                driver.id,
                                                'dbsUpdateServiceReference',
                                                e.target.value,
                                              )
                                            }
                                            className={inputClassName}
                                          />
                                        }
                                      />

                                      <Field
                                        label="Last Checked"
                                        input={
                                          <input
                                            type="date"
                                            value={documentForm.dbsUpdateServiceCheckedAt}
                                            onChange={(e) =>
                                              setDocumentFormField(
                                                driver.id,
                                                'dbsUpdateServiceCheckedAt',
                                                e.target.value,
                                              )
                                            }
                                            className={inputClassName}
                                          />
                                        }
                                      />
                                    </div>
                                  </div>
                                ) : null}

                                <Field
                                  label="File"
                                  input={
                                    <input
                                      type="file"
                                      onChange={(e) =>
                                        setDocumentFormField(
                                          driver.id,
                                          'file',
                                          e.target.files?.[0] ?? null,
                                        )
                                      }
                                      className="block w-full rounded-xl border border-white/10 bg-[#0b1728] px-3 py-3 text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                                    />
                                  }
                                />

                                <button
                                  type="button"
                                  onClick={() => uploadDriverDocument(driver.id)}
                                  disabled={uploadingDriverId === driver.id}
                                  className="w-full rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {uploadingDriverId === driver.id
                                    ? 'Uploading...'
                                    : 'Upload Document'}
                                </button>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                              <div className="mb-4 flex items-center justify-between gap-3">
                                <h4 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                                  Driver Documents
                                </h4>
                                <span className="rounded-xl border border-white/10 bg-[#07111f] px-3 py-1 text-xs text-white/60">
                                  {driver.documents.length} file
                                  {driver.documents.length === 1 ? '' : 's'}
                                </span>
                              </div>

                              {driver.documents.length === 0 ? (
                                <div className="rounded-xl bg-[#07111f] p-4 text-sm text-white/60">
                                  No driver documents uploaded yet.
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {driver.documents.map((document) => (
                                    <div
                                      key={document.id}
                                      className="rounded-xl border border-white/10 bg-[#07111f] p-4"
                                    >
                                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold text-white">
                                              {document.title}
                                            </p>
                                            <MiniComplianceBadge value={document.status} />
                                          </div>

                                          <p className="mt-1 text-sm text-white/60">
                                            {getDriverDocumentTypeLabel(document.documentType)} ·{' '}
                                            {document.fileName}
                                          </p>

                                          <div className="mt-3 grid gap-2 text-xs text-white/50 md:grid-cols-2">
                                            <span>
                                              Issue:{' '}
                                              {document.issueDate
                                                ? formatDate(document.issueDate)
                                                : '—'}
                                            </span>
                                            <span>
                                              Expiry:{' '}
                                              {document.expiryDate
                                                ? formatDate(document.expiryDate)
                                                : 'No expiry'}
                                            </span>
                                          </div>

                                          {document.documentType === 'DBS_CHECK' &&
                                          document.dbsUpdateServiceEnabled ? (
                                            <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
                                              <p className="text-xs text-white/70">
                                                DBS Update Service: Enabled
                                              </p>
                                              <p className="mt-1 text-xs text-white/50">
                                                Ref: {document.dbsUpdateServiceReference || '—'}
                                              </p>
                                              <p className="mt-1 text-xs text-white/50">
                                                Last checked:{' '}
                                                {document.dbsUpdateServiceCheckedAt
                                                  ? formatDate(document.dbsUpdateServiceCheckedAt)
                                                  : '—'}
                                              </p>
                                            </div>
                                          ) : null}

                                          {document.notes ? (
                                            <p className="mt-3 text-sm text-white/65">
                                              {document.notes}
                                            </p>
                                          ) : null}
                                        </div>

                                        <div className="flex gap-2">
                                          {document.filePath ? (
                                            <a
                                              href={document.filePath}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
                                            >
                                              Open
                                            </a>
                                          ) : null}

                                          <button
                                            type="button"
                                            onClick={() => removeDocument(driver.id, document.id)}
                                            disabled={removingDocumentId === document.id}
                                            className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                                          >
                                            {removingDocumentId === document.id
                                              ? 'Deleting...'
                                              : 'Delete'}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
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

        {selectedDriver ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">
                  Driver Focus · {selectedDriver.name}
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Quick dispatch, shift and compliance summary for the selected driver
                </p>
              </div>

              {selectedDriver.dispatch?.assignable === false ? (
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
                  DISPATCH BLOCKED
                </span>
              ) : (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  DISPATCH READY
                </span>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <SummaryPanel
                title="Blocked Reasons"
                items={selectedDriver.dispatch?.blockedReasons ?? []}
              />
              <SummaryPanel
                title="Expiring Core Dates"
                items={[
                  deriveDateStatus(selectedDriver.badgeExpiry) === 'EXPIRING'
                    ? 'Taxi Badge'
                    : null,
                  deriveDateStatus(selectedDriver.dbsExpiry) === 'EXPIRING'
                    ? 'DBS'
                    : null,
                  deriveDateStatus(selectedDriver.licenceExpiry) === 'EXPIRING'
                    ? 'Licence'
                    : null,
                ].filter(Boolean) as string[]}
              />
              <SummaryPanel
                title="Expired Core Dates"
                items={[
                  deriveDateStatus(selectedDriver.badgeExpiry) === 'EXPIRED'
                    ? 'Taxi Badge'
                    : null,
                  deriveDateStatus(selectedDriver.dbsExpiry) === 'EXPIRED'
                    ? 'DBS'
                    : null,
                  deriveDateStatus(selectedDriver.licenceExpiry) === 'EXPIRED'
                    ? 'Licence'
                    : null,
                ].filter(Boolean) as string[]}
              />
              <SummaryPanel
                title="Live Shift"
                items={
                  selectedDriver.shift?.active
                    ? [
                        `Started: ${formatDateTime(selectedDriver.shift.startedAt)}`,
                        `Duration: ${formatMinutes(selectedDriver.shift.durationMinutes)}`,
                        `Completed jobs: ${selectedDriver.shift.summary?.completedJobs ?? 0}`,
                        `Active jobs: ${selectedDriver.shift.summary?.activeJobs ?? 0}`,
                      ]
                    : ['Driver currently off shift']
                }
              />
            </div>
          </section>
        ) : null}
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
  value: number;
  hint: string;
  tone: 'slate' | 'cyan' | 'emerald' | 'amber' | 'red' | 'violet';
}) {
  const toneMap = {
    slate: 'from-slate-500/10 to-transparent border-white/10',
    cyan: 'from-cyan-500/10 to-transparent border-cyan-500/20',
    emerald: 'from-emerald-500/10 to-transparent border-emerald-500/20',
    amber: 'from-amber-500/10 to-transparent border-amber-500/20',
    red: 'from-red-500/10 to-transparent border-red-500/20',
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

function StatusBadge({ value }: { value: string }) {
  const normalised = value?.toUpperCase?.() || '';

  const classes =
    normalised === 'AVAILABLE' ||
    normalised === 'ONLINE' ||
    normalised === 'ON_DUTY'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : normalised === 'BUSY'
        ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
        : 'border-amber-500/30 bg-amber-500/10 text-amber-300';

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}>
      {normalised.replace('_', ' ')}
    </span>
  );
}

function ShiftBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
        active
          ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
          : 'border-slate-500/30 bg-slate-500/10 text-slate-300'
      }`}
    >
      {active ? 'ON SHIFT' : 'OFF SHIFT'}
    </span>
  );
}

function ComplianceBadge({
  value,
}: {
  value: 'VALID' | 'EXPIRING' | 'EXPIRED';
}) {
  const classes =
    value === 'VALID'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : value === 'EXPIRING'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
        : 'border-red-500/30 bg-red-500/10 text-red-300';

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}>
      {value}
    </span>
  );
}

function MiniComplianceBadge({
  value,
}: {
  value: ComplianceDocumentStatus;
}) {
  const classes =
    value === 'VALID'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : value === 'EXPIRING'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
        : value === 'EXPIRED'
          ? 'border-red-500/30 bg-red-500/10 text-red-300'
          : 'border-white/10 bg-white/5 text-white/60';

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${classes}`}>
      {value}
    </span>
  );
}

function SummaryPanel({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-white/45">None</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <p key={item} className="text-sm text-white/80">
              {item}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ShiftMetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#07111f] p-3">
      <p className="text-xs uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-2 text-lg font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/45">{hint}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';

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

function formatMinutes(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return '—';

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  if (hours <= 0) return `${minutes}m`;
  if (minutes <= 0) return `${hours}h`;

  return `${hours}h ${minutes}m`;
}

function toDateInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function deriveDateStatus(value?: string | null): ComplianceDocumentStatus {
  if (!value) return 'NO_EXPIRY';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'NO_EXPIRY';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (target.getTime() < today.getTime()) {
    return 'EXPIRED';
  }

  const diffDays = Math.ceil(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 30) {
    return 'EXPIRING';
  }

  return 'VALID';
}

function getDriverDocumentTypeLabel(value: DriverDocumentType) {
  return (
    driverDocumentTypeOptions.find((option) => option.value === value)?.label ??
    value
  );
}

const inputClassName =
  'w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50';

export default function DriversPage() {
  return (
    <Suspense fallback={<div className="p-6 text-white">Loading drivers...</div>}>
      <DriversPageContent />
    </Suspense>
  );
}