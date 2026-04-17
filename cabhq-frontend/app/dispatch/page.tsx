'use client';

import { useEffect, useMemo, useState } from 'react';
import { closeSocket, getSocket } from '../../lib/socket';

const API_URL = 'http://localhost:3002';

type Vehicle = {
  id: string;
  registration: string;
  make: string;
  model: string;
} | null;

type Driver = {
  id: string;
  fullName: string;
  isOnDuty: boolean;
  isAvailable: boolean;
  latitude?: number | null;
  longitude?: number | null;
  vehicle?: Vehicle;
};

type Booking = {
  id: string;
  reference: string;
  customerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupAt: string;
  status: string;
  quotedPrice?: number | null;
  driverId?: string | null;
  driver?: Driver | null;
};

type TimelineEvent = {
  id: string;
  type: string;
  note?: string | null;
  createdAt: string;
};

export default function DispatchPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // ---------------- FETCH INITIAL ----------------
  useEffect(() => {
    if (!token) return;

    const load = async () => {
      const [b, d] = await Promise.all([
        fetch(`${API_URL}/bookings/dispatch-board`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/drivers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setBookings(await b.json());
      setDrivers(await d.json());
      setLoading(false);
    };

    load();
  }, [token]);

  // ---------------- SOCKET ----------------
  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('booking:created', (p) => {
      setBookings((prev) => [p.booking, ...prev]);
    });

    socket.on('booking:updated', (p) => {
      setBookings((prev) =>
        prev.map((b) => (b.id === p.booking.id ? p.booking : b)),
      );
    });

    socket.on('booking:assigned', (p) => {
      setBookings((prev) =>
        prev.map((b) => (b.id === p.booking.id ? p.booking : b)),
      );
    });

    socket.on('booking:status_changed', (p) => {
      setBookings((prev) =>
        prev.map((b) => (b.id === p.booking.id ? p.booking : b)),
      );
    });

    socket.on('driver:updated', (p) => {
      setDrivers((prev) =>
        prev.map((d) => (d.id === p.driver.id ? p.driver : d)),
      );
    });

    return () => closeSocket();
  }, [token]);

  // ---------------- ACTIONS ----------------
  const autoDispatch = async (id: string) => {
    await fetch(`${API_URL}/bookings/${id}/auto-dispatch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const assignDriver = async (bookingId: string, driverId: string) => {
    await fetch(`${API_URL}/bookings/${bookingId}/assign-driver`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ driverId }),
    });
  };

  const loadTimeline = async (bookingId: string) => {
    const res = await fetch(`${API_URL}/bookings/${bookingId}/timeline`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setTimeline(await res.json());
  };

  // ---------------- STATS ----------------
  const stats = useMemo(() => {
    return {
      bookings: bookings.length,
      drivers: drivers.length,
      available: drivers.filter((d) => d.isAvailable).length,
    };
  }, [bookings, drivers]);

  // ---------------- UI ----------------
  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-4">Dispatch</h1>

      <div className="mb-4">
        Status:{' '}
        <span className={connected ? 'text-green-400' : 'text-red-400'}>
          {connected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card label="Bookings" value={stats.bookings} />
        <Card label="Drivers" value={stats.drivers} />
        <Card label="Available" value={stats.available} />
      </div>

      {/* BOOKINGS */}
      <div className="mb-8">
        <h2 className="text-xl mb-2">Bookings</h2>

        {loading ? (
          <div>Loading...</div>
        ) : (
          bookings.map((b) => (
            <div
              key={b.id}
              className="border border-white/10 p-4 mb-2 rounded"
            >
              <div className="font-bold">{b.reference}</div>
              <div className="text-sm text-gray-400">
                {b.pickupAddress} → {b.dropoffAddress}
              </div>

              <div className="mt-2 flex gap-2 flex-wrap">
                <button
                  onClick={() => autoDispatch(b.id)}
                  className="bg-blue-600 px-3 py-1 rounded"
                >
                  Auto Dispatch
                </button>

                {drivers.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => assignDriver(b.id, d.id)}
                    className="bg-gray-700 px-2 py-1 text-xs rounded"
                  >
                    {d.fullName}
                  </button>
                ))}

                <button
                  onClick={() => {
                    setSelectedBooking(b);
                    loadTimeline(b.id);
                  }}
                  className="bg-purple-600 px-3 py-1 rounded"
                >
                  Timeline
                </button>
              </div>

              <div className="mt-2 text-sm">
                Status: {b.status} | Driver:{' '}
                {b.driver?.fullName || 'None'}
              </div>
            </div>
          ))
        )}
      </div>

      {/* DRIVERS */}
      <div>
        <h2 className="text-xl mb-2">Drivers</h2>

        {drivers.map((d) => (
          <div key={d.id} className="border p-3 mb-2 rounded">
            {d.fullName} -{' '}
            {d.isAvailable ? 'Available' : 'Busy'}
          </div>
        ))}
      </div>

      {/* TIMELINE MODAL */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/80 p-10">
          <div className="bg-gray-900 p-6 rounded max-w-xl mx-auto">
            <h2 className="text-xl mb-4">
              Timeline - {selectedBooking.reference}
            </h2>

            {timeline.map((t) => (
              <div key={t.id} className="mb-2 text-sm">
                {new Date(t.createdAt).toLocaleTimeString()} - {t.type}
                {t.note ? ` (${t.note})` : ''}
              </div>
            ))}

            <button
              onClick={() => setSelectedBooking(null)}
              className="mt-4 bg-red-600 px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-900 p-4 rounded">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}