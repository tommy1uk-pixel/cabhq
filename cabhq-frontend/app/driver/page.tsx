'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type DriverDocument = {
  id: string;
  title: string;
  status: string;
  expiryDate?: string | null;
};

type DriverVehicle = {
  id: string;
  reg: string;
  make?: string | null;
  model?: string | null;
} | null;

type DriverProfile = {
  id?: string;
  name?: string;
  phone?: string | null;
  email?: string | null;
  status?: string;
  vehicle?: DriverVehicle;
  documents?: DriverDocument[];
  driver?: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    status?: string;
    vehicle?: DriverVehicle;
    documents?: DriverDocument[];
  };
};

export default function DriverPage() {
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDriver() {
      try {
        const token = localStorage.getItem('driverToken');

        if (!token) {
          window.location.href = '/driver/login';
          return;
        }

        const data = await apiFetch<DriverProfile>(
          '/driver-app/me',
          {},
          {
            useDriverToken: true,
          },
        );

        const resolvedDriver = data.driver ?? data;

        setDriver(resolvedDriver);
        localStorage.setItem('driver', JSON.stringify(resolvedDriver));
      } catch (err) {
        console.error(err);
        localStorage.removeItem('driverToken');
        localStorage.removeItem('driver');
        setError(err instanceof Error ? err.message : 'Failed to load driver');
        window.location.href = '/driver/login';
      } finally {
        setLoading(false);
      }
    }

    void loadDriver();
  }, []);

  if (loading) {
    return <div className="p-6 text-white">Loading driver...</div>;
  }

  if (error) {
    return <div className="p-6 text-white">Driver access failed: {error}</div>;
  }

  if (!driver) {
    return <div className="p-6 text-white">Driver not found</div>;
  }

  return (
    <div className="min-h-screen bg-[#08111f] p-6 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-3xl font-bold">{driver.name}</h1>
          <p className="mt-2 text-white/60">{driver.phone || 'No phone set'}</p>
          <p className="text-white/60">{driver.email || 'No email set'}</p>
          <p className="mt-3 text-sm text-cyan-300">
            Status: {driver.status || 'Unknown'}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold">Assigned Vehicle</h2>
          <p className="mt-3 text-white/70">
            {driver.vehicle
              ? `${driver.vehicle.reg} ${driver.vehicle.make || ''} ${driver.vehicle.model || ''}`.trim()
              : 'No vehicle assigned'}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold">Documents</h2>
          <div className="mt-4 space-y-3">
            {(driver.documents || []).length === 0 ? (
              <p className="text-white/60">No documents found</p>
            ) : (
              (driver.documents || []).map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-2xl border border-white/10 bg-[#0b1728] p-4"
                >
                  <p className="font-semibold">{doc.title}</p>
                  <p className="mt-1 text-sm text-white/60">
                    Status: {doc.status}
                  </p>
                  <p className="text-sm text-white/50">
                    Expiry: {doc.expiryDate || 'No expiry'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}