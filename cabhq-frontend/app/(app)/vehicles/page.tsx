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

type Driver = {
  id: string;
  name: string;
};

type VehicleDocumentType =
  | 'MOT_CERTIFICATE'
  | 'INSURANCE'
  | 'VEHICLE_INSPECTION'
  | 'VEHICLE_LICENCE'
  | 'LOG_BOOK'
  | 'SERVICE_RECORD'
  | 'TAX'
  | 'OTHER';

type VehicleDocument = {
  id: string;
  documentType: VehicleDocumentType;
  title: string;
  fileName: string;
  filePath: string;
  mimeType?: string | null;
  fileSize?: number | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  status: ComplianceDocumentStatus;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ComplianceSummaryItem = {
  key: string;
  label: string;
  date: string | null;
  status: ComplianceDocumentStatus;
};

type VehicleDispatchState = {
  assignable: boolean;
  blockedReasons: string[];
};

type Vehicle = {
  id: string;
  reg: string;
  make?: string | null;
  model?: string | null;
  colour?: string | null;
  capacity?: number | null;
  status: 'ACTIVE' | 'INACTIVE' | 'OFF_ROAD' | string;
  plateNumber?: string | null;
  vin?: string | null;
  motExpiry?: string | null;
  insuranceExpiry?: string | null;
  inspectionExpiry?: string | null;
  vehicleLicenceExpiry?: string | null;
  taxExpiry?: string | null;
  serviceDate?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  driverId?: string | null;
  driver?: Driver | null;
  documents: VehicleDocument[];
  coreCompliance: ComplianceSummaryItem[];
  dispatch?: VehicleDispatchState;
  compliance: {
    blocked: boolean;
    overallStatus: 'VALID' | 'EXPIRING' | 'EXPIRED';
    expiredCoreItems: ComplianceSummaryItem[];
    expiringCoreItems: ComplianceSummaryItem[];
    expiredDocuments: VehicleDocument[];
    expiringDocuments: VehicleDocument[];
  };
};

type VehiclesDashboard = {
  totalVehicles: number;
  activeVehicles: number;
  offRoadVehicles: number;
  inactiveVehicles: number;
  expiredCoreItems: number;
  expiringSoonCoreItems: number;
  expiredDocuments: number;
  expiringSoonDocuments: number;
  blockedVehicles: number;
  alerts: {
    total: number;
    expired: number;
    expiring: number;
  };
  vehicles: Vehicle[];
};

type VehicleFormState = {
  reg: string;
  make: string;
  model: string;
  colour: string;
  capacity: string;
  status: string;
  plateNumber: string;
  vin: string;
  motExpiry: string;
  insuranceExpiry: string;
  inspectionExpiry: string;
  vehicleLicenceExpiry: string;
  taxExpiry: string;
  serviceDate: string;
  notes: string;
  driverId: string;
};

type VehicleDocumentFormState = {
  documentType: VehicleDocumentType;
  title: string;
  issueDate: string;
  expiryDate: string;
  notes: string;
  file: File | null;
};

const initialVehicleForm: VehicleFormState = {
  reg: '',
  make: '',
  model: '',
  colour: '',
  capacity: '4',
  status: 'ACTIVE',
  plateNumber: '',
  vin: '',
  motExpiry: '',
  insuranceExpiry: '',
  inspectionExpiry: '',
  vehicleLicenceExpiry: '',
  taxExpiry: '',
  serviceDate: '',
  notes: '',
  driverId: '',
};

const initialDocumentForm: VehicleDocumentFormState = {
  documentType: 'MOT_CERTIFICATE',
  title: '',
  issueDate: '',
  expiryDate: '',
  notes: '',
  file: null,
};

const vehicleDocumentTypeOptions: {
  value: VehicleDocumentType;
  label: string;
}[] = [
  { value: 'MOT_CERTIFICATE', label: 'MOT Certificate' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'VEHICLE_INSPECTION', label: 'Vehicle Inspection' },
  { value: 'VEHICLE_LICENCE', label: 'Vehicle Licence' },
  { value: 'LOG_BOOK', label: 'Log Book' },
  { value: 'SERVICE_RECORD', label: 'Service Record' },
  { value: 'TAX', label: 'Tax' },
  { value: 'OTHER', label: 'Other' },
];

function VehiclesPageContent() {
  const searchParams = useSearchParams();
  const queryVehicleId = searchParams.get('vehicleId');

  const [dashboard, setDashboard] = useState<VehiclesDashboard | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<VehicleFormState>(initialVehicleForm);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const [documentForms, setDocumentForms] = useState<
    Record<string, VehicleDocumentFormState>
  >({});
  const [uploadingVehicleId, setUploadingVehicleId] = useState<string | null>(
    null,
  );
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(
    null,
  );
  const [statusSavingVehicleId, setStatusSavingVehicleId] = useState<
    string | null
  >(null);
  const [assigningVehicleId, setAssigningVehicleId] = useState<string | null>(
    null,
  );
  const [removingDocumentId, setRemovingDocumentId] = useState<string | null>(
    null,
  );

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId],
  );

  const clearVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.dispatch?.assignable !== false),
    [vehicles],
  );

  const blockedVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.dispatch?.assignable === false),
    [vehicles],
  );

  const expiringVehicles = useMemo(
    () =>
      vehicles.filter(
        (vehicle) =>
          vehicle.dispatch?.assignable !== false &&
          vehicle.compliance?.overallStatus === 'EXPIRING',
      ),
    [vehicles],
  );

  const sortVehicles = useCallback((list: Vehicle[]) => {
    return [...list].sort((a, b) => a.reg.localeCompare(b.reg));
  }, []);

  const rebuildDashboardFromVehicles = useCallback((nextVehicles: Vehicle[]) => {
    const expiredCoreItems = nextVehicles.reduce(
      (count, vehicle) =>
        count +
        (vehicle.coreCompliance?.filter((item) => item.status === 'EXPIRED')
          .length ?? 0),
      0,
    );

    const expiringSoonCoreItems = nextVehicles.reduce(
      (count, vehicle) =>
        count +
        (vehicle.coreCompliance?.filter((item) => item.status === 'EXPIRING')
          .length ?? 0),
      0,
    );

    const expiredDocuments = nextVehicles.reduce(
      (count, vehicle) =>
        count +
        (vehicle.documents?.filter((doc) => doc.status === 'EXPIRED').length ??
          0),
      0,
    );

    const expiringSoonDocuments = nextVehicles.reduce(
      (count, vehicle) =>
        count +
        (vehicle.documents?.filter((doc) => doc.status === 'EXPIRING').length ??
          0),
      0,
    );

    const nextDashboard: VehiclesDashboard = {
      totalVehicles: nextVehicles.length,
      activeVehicles: nextVehicles.filter((vehicle) => vehicle.status === 'ACTIVE')
        .length,
      offRoadVehicles: nextVehicles.filter(
        (vehicle) => vehicle.status === 'OFF_ROAD',
      ).length,
      inactiveVehicles: nextVehicles.filter(
        (vehicle) => vehicle.status === 'INACTIVE',
      ).length,
      expiredCoreItems,
      expiringSoonCoreItems,
      expiredDocuments,
      expiringSoonDocuments,
      blockedVehicles: nextVehicles.filter(
        (vehicle) => vehicle.dispatch?.assignable === false,
      ).length,
      alerts: {
        total:
          expiredCoreItems +
          expiringSoonCoreItems +
          expiredDocuments +
          expiringSoonDocuments,
        expired: expiredCoreItems + expiredDocuments,
        expiring: expiringSoonCoreItems + expiringSoonDocuments,
      },
      vehicles: nextVehicles,
    };

    setDashboard(nextDashboard);
  }, []);

  const upsertVehicle = useCallback(
    (vehicle: Vehicle) => {
      setVehicles((current) => {
        const exists = current.some((item) => item.id === vehicle.id);
        const next = exists
          ? current.map((item) => (item.id === vehicle.id ? vehicle : item))
          : [...current, vehicle];

        const sorted = sortVehicles(next);
        rebuildDashboardFromVehicles(sorted);
        return sorted;
      });

      setSelectedVehicleId((current) => current ?? vehicle.id);
    },
    [rebuildDashboardFromVehicles, sortVehicles],
  );

  const fetchVehicle = useCallback(async (vehicleId: string) => {
    return apiFetch<Vehicle>(`/vehicles/${vehicleId}`);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [dashboardData, driversData] = await Promise.all([
        apiFetch<VehiclesDashboard>('/vehicles/dashboard'),
        apiFetch<Driver[]>('/drivers'),
      ]);

      const nextVehicles = dashboardData?.vehicles ?? [];

      setDashboard(dashboardData ?? null);
      setVehicles(sortVehicles(nextVehicles));
      setDrivers(Array.isArray(driversData) ? driversData : []);

      if (nextVehicles.length > 0) {
        setSelectedVehicleId((current) => {
          if (
            queryVehicleId &&
            nextVehicles.some((vehicle) => vehicle.id === queryVehicleId)
          ) {
            return queryVehicleId;
          }

          if (current && nextVehicles.some((vehicle) => vehicle.id === current)) {
            return current;
          }

          return nextVehicles[0].id;
        });
      } else {
        setSelectedVehicleId(null);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to load vehicles dashboard');
    } finally {
      setLoading(false);
    }
  }, [queryVehicleId, sortVehicles]);

  useEffect(() => {
    void load();
  }, [load]);

  function setField<K extends keyof VehicleFormState>(
    key: K,
    value: VehicleFormState[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  const resetForm = useCallback(() => {
    setForm(initialVehicleForm);
    setEditingVehicleId(null);
  }, []);

  const startEdit = useCallback((vehicle: Vehicle) => {
    setEditingVehicleId(vehicle.id);
    setForm({
      reg: vehicle.reg ?? '',
      make: vehicle.make ?? '',
      model: vehicle.model ?? '',
      colour: vehicle.colour ?? '',
      capacity: vehicle.capacity ? String(vehicle.capacity) : '4',
      status: vehicle.status ?? 'ACTIVE',
      plateNumber: vehicle.plateNumber ?? '',
      vin: vehicle.vin ?? '',
      motExpiry: toDateInput(vehicle.motExpiry),
      insuranceExpiry: toDateInput(vehicle.insuranceExpiry),
      inspectionExpiry: toDateInput(vehicle.inspectionExpiry),
      vehicleLicenceExpiry: toDateInput(vehicle.vehicleLicenceExpiry),
      taxExpiry: toDateInput(vehicle.taxExpiry),
      serviceDate: toDateInput(vehicle.serviceDate),
      notes: vehicle.notes ?? '',
      driverId: vehicle.driver?.id ?? '',
    });
    setSelectedVehicleId(vehicle.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const submitVehicle = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);

      const payload = {
        reg: form.reg,
        make: form.make || null,
        model: form.model || null,
        colour: form.colour || null,
        capacity: form.capacity ? Number(form.capacity) : null,
        status: form.status || 'ACTIVE',
        plateNumber: form.plateNumber || null,
        vin: form.vin || null,
        motExpiry: form.motExpiry || null,
        insuranceExpiry: form.insuranceExpiry || null,
        inspectionExpiry: form.inspectionExpiry || null,
        vehicleLicenceExpiry: form.vehicleLicenceExpiry || null,
        taxExpiry: form.taxExpiry || null,
        serviceDate: form.serviceDate || null,
        notes: form.notes || null,
        driverId: form.driverId || null,
      };

      try {
        if (editingVehicleId) {
          await apiFetch(`/vehicles/${editingVehicleId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });

          const refreshed = await fetchVehicle(editingVehicleId);
          upsertVehicle(refreshed);
        } else {
          const created = await apiFetch<Vehicle>('/vehicles', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

          const refreshed = await fetchVehicle(created.id);
          upsertVehicle(refreshed);
          setSelectedVehicleId(refreshed.id);
        }

        resetForm();
      } catch (error) {
        console.error(error);
        alert(
          editingVehicleId ? 'Failed to update vehicle' : 'Failed to create vehicle',
        );
      } finally {
        setSaving(false);
      }
    },
    [editingVehicleId, fetchVehicle, form, resetForm, upsertVehicle],
  );

  const assignDriver = useCallback(
    async (vehicleId: string, driverId: string) => {
      setAssigningVehicleId(vehicleId);

      try {
        if (!driverId) {
          await apiFetch(`/vehicles/${vehicleId}/unassign-driver`, {
            method: 'POST',
          });
        } else {
          await apiFetch(`/vehicles/${vehicleId}/assign-driver`, {
            method: 'POST',
            body: JSON.stringify({ driverId }),
          });
        }

        const refreshed = await fetchVehicle(vehicleId);
        upsertVehicle(refreshed);
      } catch (error) {
        console.error(error);
        alert('Failed to update vehicle driver assignment');
      } finally {
        setAssigningVehicleId(null);
      }
    },
    [fetchVehicle, upsertVehicle],
  );

  const updateVehicleStatus = useCallback(
    async (vehicleId: string, status: string) => {
      setStatusSavingVehicleId(vehicleId);

      try {
        await apiFetch(`/vehicles/${vehicleId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });

        const refreshed = await fetchVehicle(vehicleId);
        upsertVehicle(refreshed);
      } catch (error) {
        console.error(error);
        alert('Failed to update vehicle status');
      } finally {
        setStatusSavingVehicleId(null);
      }
    },
    [fetchVehicle, upsertVehicle],
  );

  const deleteVehicle = useCallback(
    async (vehicleId: string) => {
      const confirmed = window.confirm(
        'Delete this vehicle and all of its uploaded documents?',
      );

      if (!confirmed) return;

      setDeletingVehicleId(vehicleId);

      try {
        await apiFetch(`/vehicles/${vehicleId}`, {
          method: 'DELETE',
        });

        setVehicles((current) => {
          const next = current.filter((vehicle) => vehicle.id !== vehicleId);
          rebuildDashboardFromVehicles(next);

          setSelectedVehicleId((selected) => {
            if (selected !== vehicleId) return selected;
            return next[0]?.id ?? null;
          });

          return next;
        });

        if (editingVehicleId === vehicleId) {
          resetForm();
        }
      } catch (error) {
        console.error(error);
        alert('Failed to delete vehicle');
      } finally {
        setDeletingVehicleId(null);
      }
    },
    [editingVehicleId, rebuildDashboardFromVehicles, resetForm],
  );

  function getDocumentForm(vehicleId: string): VehicleDocumentFormState {
    return documentForms[vehicleId] ?? initialDocumentForm;
  }

  function setDocumentFormField<K extends keyof VehicleDocumentFormState>(
    vehicleId: string,
    key: K,
    value: VehicleDocumentFormState[K],
  ) {
    setDocumentForms((prev) => ({
      ...prev,
      [vehicleId]: {
        ...(prev[vehicleId] ?? initialDocumentForm),
        [key]: value,
      },
    }));
  }

  const resetDocumentForm = useCallback((vehicleId: string) => {
    setDocumentForms((prev) => ({
      ...prev,
      [vehicleId]: initialDocumentForm,
    }));
  }, []);

  const uploadVehicleDocument = useCallback(
    async (vehicleId: string) => {
      const formState = getDocumentForm(vehicleId);

      if (!formState.title.trim()) {
        alert('Document title is required');
        return;
      }

      if (!formState.file) {
        alert('Please choose a file to upload');
        return;
      }

      setUploadingVehicleId(vehicleId);

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

        formData.append('file', formState.file);

        await apiFetch(`/vehicles/${vehicleId}/documents`, {
          method: 'POST',
          body: formData,
        });

        const refreshed = await fetchVehicle(vehicleId);
        upsertVehicle(refreshed);
        resetDocumentForm(vehicleId);
      } catch (error) {
        console.error(error);
        alert('Failed to upload vehicle document');
      } finally {
        setUploadingVehicleId(null);
      }
    },
    [documentForms, fetchVehicle, resetDocumentForm, upsertVehicle],
  );

  const removeDocument = useCallback(
    async (vehicleId: string, documentId: string) => {
      const confirmed = window.confirm('Delete this document?');

      if (!confirmed) return;

      setRemovingDocumentId(documentId);

      try {
        await apiFetch(`/vehicles/${vehicleId}/documents/${documentId}`, {
          method: 'DELETE',
        });

        const refreshed = await fetchVehicle(vehicleId);
        upsertVehicle(refreshed);
      } catch (error) {
        console.error(error);
        alert('Failed to delete vehicle document');
      } finally {
        setRemovingDocumentId(null);
      }
    },
    [fetchVehicle, upsertVehicle],
  );

  return (
    <AdminShell
      title="Vehicles"
      subtitle="Fleet management, compliance tracking and document control"
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total Vehicles"
            value={dashboard?.totalVehicles ?? 0}
            hint="Fleet records"
          />
          <StatCard label="Clear" value={clearVehicles.length} hint="Dispatch ready" />
          <StatCard label="Expiring" value={expiringVehicles.length} hint="Attention soon" />
          <StatCard label="Blocked" value={blockedVehicles.length} hint="Cannot be dispatched" />
          <StatCard
            label="Documents"
            value={vehicles.reduce(
              (count, vehicle) => count + (vehicle.documents?.length ?? 0),
              0,
            )}
            hint="Uploaded compliance files"
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">
                  {editingVehicleId ? 'Edit Vehicle' : 'Add Vehicle'}
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Create and manage full fleet records with compliance dates.
                </p>
              </div>

              {editingVehicleId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>

            <form onSubmit={submitVehicle} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Field
                  label="Registration *"
                  input={
                    <input
                      value={form.reg}
                      onChange={(e) => setField('reg', e.target.value.toUpperCase())}
                      placeholder="AB12 CDE"
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
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="OFF_ROAD">OFF_ROAD</option>
                    </select>
                  }
                />

                <Field
                  label="Make"
                  input={
                    <input
                      value={form.make}
                      onChange={(e) => setField('make', e.target.value)}
                      placeholder="Ford"
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Model"
                  input={
                    <input
                      value={form.model}
                      onChange={(e) => setField('model', e.target.value)}
                      placeholder="Galaxy"
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Colour"
                  input={
                    <input
                      value={form.colour}
                      onChange={(e) => setField('colour', e.target.value)}
                      placeholder="Black"
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Capacity"
                  input={
                    <input
                      type="number"
                      min="1"
                      value={form.capacity}
                      onChange={(e) => setField('capacity', e.target.value)}
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Plate / Licence Number"
                  input={
                    <input
                      value={form.plateNumber}
                      onChange={(e) => setField('plateNumber', e.target.value)}
                      placeholder="Plate or vehicle licence"
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="VIN"
                  input={
                    <input
                      value={form.vin}
                      onChange={(e) => setField('vin', e.target.value)}
                      placeholder="Vehicle identification number"
                      className={inputClassName}
                    />
                  }
                />

                <Field
                  label="Assigned Driver"
                  input={
                    <select
                      value={form.driverId}
                      onChange={(e) => setField('driverId', e.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Unassigned</option>
                      {drivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name}
                        </option>
                      ))}
                    </select>
                  }
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/70">
                  Core Compliance Dates
                </h3>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <Field
                    label="MOT Expiry"
                    input={
                      <input
                        type="date"
                        value={form.motExpiry}
                        onChange={(e) => setField('motExpiry', e.target.value)}
                        className={inputClassName}
                      />
                    }
                  />

                  <Field
                    label="Insurance Expiry"
                    input={
                      <input
                        type="date"
                        value={form.insuranceExpiry}
                        onChange={(e) => setField('insuranceExpiry', e.target.value)}
                        className={inputClassName}
                      />
                    }
                  />

                  <Field
                    label="Inspection Expiry"
                    input={
                      <input
                        type="date"
                        value={form.inspectionExpiry}
                        onChange={(e) => setField('inspectionExpiry', e.target.value)}
                        className={inputClassName}
                      />
                    }
                  />

                  <Field
                    label="Vehicle Licence Expiry"
                    input={
                      <input
                        type="date"
                        value={form.vehicleLicenceExpiry}
                        onChange={(e) =>
                          setField('vehicleLicenceExpiry', e.target.value)
                        }
                        className={inputClassName}
                      />
                    }
                  />

                  <Field
                    label="Tax Expiry"
                    input={
                      <input
                        type="date"
                        value={form.taxExpiry}
                        onChange={(e) => setField('taxExpiry', e.target.value)}
                        className={inputClassName}
                      />
                    }
                  />

                  <Field
                    label="Last Service Date"
                    input={
                      <input
                        type="date"
                        value={form.serviceDate}
                        onChange={(e) => setField('serviceDate', e.target.value)}
                        className={inputClassName}
                      />
                    }
                  />
                </div>
              </div>

              <Field
                label="Notes"
                input={
                  <textarea
                    value={form.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                    placeholder="Operational notes, issues, history, reminders..."
                    rows={4}
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
                  ? editingVehicleId
                    ? 'Saving Vehicle...'
                    : 'Creating Vehicle...'
                  : editingVehicleId
                    ? 'Save Vehicle Changes'
                    : 'Create Vehicle'}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Fleet</h2>
                <p className="mt-1 text-sm text-white/60">
                  Vehicle records, status controls, driver assignments and compliance.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0b1728] px-3 py-2 text-sm text-white/70">
                Alerts:{' '}
                <span className="font-semibold text-white">
                  {dashboard?.alerts.total ?? 0}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl bg-[#0b1728] p-6 text-white/70">
                Loading fleet...
              </div>
            ) : vehicles.length === 0 ? (
              <div className="rounded-2xl bg-[#0b1728] p-6 text-white/70">
                No vehicles added yet.
              </div>
            ) : (
              <div className="space-y-4">
                {vehicles.map((vehicle) => {
                  const documentForm = getDocumentForm(vehicle.id);
                  const isSelected = selectedVehicleId === vehicle.id;
                  const blocked = vehicle.dispatch?.assignable === false;

                  return (
                    <div
                      key={vehicle.id}
                      className={`rounded-2xl border p-5 transition ${
                        isSelected
                          ? 'border-cyan-500/50 bg-[#0c1b2c]'
                          : 'border-white/10 bg-[#0b1728]'
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-bold">{vehicle.reg}</h3>
                            <StatusBadge value={vehicle.status} />
                            <ComplianceBadge value={vehicle.compliance.overallStatus} />
                            {blocked ? (
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
                            {[vehicle.make, vehicle.model, vehicle.colour]
                              .filter(Boolean)
                              .join(' · ') || 'No make/model details added'}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/50">
                            <span>Capacity: {vehicle.capacity ?? 4}</span>
                            <span>Driver: {vehicle.driver?.name ?? 'Unassigned'}</span>
                            <span>Docs: {vehicle.documents?.length ?? 0}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedVehicleId((current) =>
                                current === vehicle.id ? null : vehicle.id,
                              )
                            }
                            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
                          >
                            {isSelected ? 'Hide details' : 'View details'}
                          </button>

                          <button
                            type="button"
                            onClick={() => startEdit(vehicle)}
                            className="rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteVehicle(vehicle.id)}
                            disabled={deletingVehicleId === vehicle.id}
                            className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingVehicleId === vehicle.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>

                      {blocked && vehicle.dispatch?.blockedReasons?.length ? (
                        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-red-200">
                            Blocked reasons
                          </p>
                          <div className="space-y-1">
                            {vehicle.dispatch.blockedReasons.map((reason) => (
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
                                Vehicle Details
                              </h4>

                              <DetailRow label="Registration" value={vehicle.reg} />
                              <DetailRow
                                label="Make / Model"
                                value={
                                  [vehicle.make, vehicle.model].filter(Boolean).join(' ') ||
                                  '—'
                                }
                              />
                              <DetailRow label="Colour" value={vehicle.colour || '—'} />
                              <DetailRow
                                label="Capacity"
                                value={String(vehicle.capacity ?? 4)}
                              />
                              <DetailRow
                                label="Plate Number"
                                value={vehicle.plateNumber || '—'}
                              />
                              <DetailRow label="VIN" value={vehicle.vin || '—'} />
                              <DetailRow
                                label="Assigned Driver"
                                value={vehicle.driver?.name || 'Unassigned'}
                              />
                              <DetailRow
                                label="Dispatch Ready"
                                value={vehicle.dispatch?.assignable === false ? 'No' : 'Yes'}
                              />
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 xl:col-span-2">
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                <h4 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                                  Controls
                                </h4>

                                <div className="flex flex-wrap gap-2">
                                  <select
                                    value={vehicle.driver?.id ?? ''}
                                    disabled={assigningVehicleId === vehicle.id}
                                    onChange={(e) => assignDriver(vehicle.id, e.target.value)}
                                    className="rounded-xl border border-white/10 bg-[#07111f] px-3 py-2 text-sm text-white outline-none"
                                  >
                                    <option value="">Unassigned</option>
                                    {drivers.map((driver) => (
                                      <option key={driver.id} value={driver.id}>
                                        {driver.name}
                                      </option>
                                    ))}
                                  </select>

                                  <select
                                    value={vehicle.status}
                                    disabled={statusSavingVehicleId === vehicle.id}
                                    onChange={(e) =>
                                      updateVehicleStatus(vehicle.id, e.target.value)
                                    }
                                    className="rounded-xl border border-white/10 bg-[#07111f] px-3 py-2 text-sm text-white outline-none"
                                  >
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="INACTIVE">INACTIVE</option>
                                    <option value="OFF_ROAD">OFF_ROAD</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {vehicle.coreCompliance.map((item) => (
                                  <div
                                    key={item.key}
                                    className="rounded-xl border border-white/10 bg-[#07111f] p-3"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-sm font-medium text-white">
                                        {item.label}
                                      </p>
                                      <MiniComplianceBadge value={item.status} />
                                    </div>
                                    <p className="mt-2 text-sm text-white/60">
                                      {item.date ? formatDate(item.date) : 'No date set'}
                                    </p>
                                  </div>
                                ))}
                              </div>

                              {vehicle.notes ? (
                                <div className="mt-4 rounded-xl border border-white/10 bg-[#07111f] p-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                                    Notes
                                  </p>
                                  <p className="mt-2 text-sm text-white/70">
                                    {vehicle.notes}
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/70">
                                Upload Vehicle Document
                              </h4>

                              <div className="space-y-3">
                                <Field
                                  label="Document Type"
                                  input={
                                    <select
                                      value={documentForm.documentType}
                                      onChange={(e) =>
                                        setDocumentFormField(
                                          vehicle.id,
                                          'documentType',
                                          e.target.value as VehicleDocumentType,
                                        )
                                      }
                                      className={inputClassName}
                                    >
                                      {vehicleDocumentTypeOptions.map((option) => (
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
                                        setDocumentFormField(
                                          vehicle.id,
                                          'title',
                                          e.target.value,
                                        )
                                      }
                                      placeholder="e.g. Current MOT Certificate"
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
                                          vehicle.id,
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
                                          vehicle.id,
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
                                        setDocumentFormField(
                                          vehicle.id,
                                          'notes',
                                          e.target.value,
                                        )
                                      }
                                      className={`${inputClassName} resize-none`}
                                    />
                                  }
                                />

                                <Field
                                  label="File"
                                  input={
                                    <input
                                      type="file"
                                      onChange={(e) =>
                                        setDocumentFormField(
                                          vehicle.id,
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
                                  onClick={() => uploadVehicleDocument(vehicle.id)}
                                  disabled={uploadingVehicleId === vehicle.id}
                                  className="w-full rounded-2xl bg-cyan-600 px-4 py-3 font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {uploadingVehicleId === vehicle.id
                                    ? 'Uploading...'
                                    : 'Upload Document'}
                                </button>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                              <div className="mb-4 flex items-center justify-between gap-3">
                                <h4 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                                  Vehicle Documents
                                </h4>
                                <span className="rounded-xl border border-white/10 bg-[#07111f] px-3 py-1 text-xs text-white/60">
                                  {vehicle.documents.length} file
                                  {vehicle.documents.length === 1 ? '' : 's'}
                                </span>
                              </div>

                              {vehicle.documents.length === 0 ? (
                                <div className="rounded-xl bg-[#07111f] p-4 text-sm text-white/60">
                                  No vehicle documents uploaded yet.
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {vehicle.documents.map((document) => (
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
                                            {getVehicleDocumentTypeLabel(document.documentType)} ·{' '}
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
                                            onClick={() =>
                                              removeDocument(vehicle.id, document.id)
                                            }
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

        {selectedVehicle ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">
                  Fleet Focus · {selectedVehicle.reg}
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Quick status summary for the selected vehicle
                </p>
              </div>
              {selectedVehicle.dispatch?.assignable === false ? (
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
                  DISPATCH BLOCKED
                </span>
              ) : (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  DISPATCH READY
                </span>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <SummaryPanel
                title="Blocked Reasons"
                items={selectedVehicle.dispatch?.blockedReasons ?? []}
              />
              <SummaryPanel
                title="Expired Core Items"
                items={selectedVehicle.compliance.expiredCoreItems.map((item) => item.label)}
              />
              <SummaryPanel
                title="Expiring Core Items"
                items={selectedVehicle.compliance.expiringCoreItems.map((item) => item.label)}
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
}: {
  label: string;
  value: number;
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
      <span className="mb-2 block text-sm font-medium text-white/75">
        {label}
      </span>
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
    normalised === 'ACTIVE'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : normalised === 'OFF_ROAD'
        ? 'border-red-500/30 bg-red-500/10 text-red-300'
        : 'border-amber-500/30 bg-amber-500/10 text-amber-300';

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}
    >
      {normalised.replace('_', ' ')}
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
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}
    >
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
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${classes}`}
    >
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

function formatDate(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function toDateInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function getVehicleDocumentTypeLabel(value: VehicleDocumentType) {
  return (
    vehicleDocumentTypeOptions.find((option) => option.value === value)?.label ??
    value
  );
}

const inputClassName =
  'w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50';

export default function VehiclesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-white">Loading vehicles...</div>}>
      <VehiclesPageContent />
    </Suspense>
  );
}