'use client';

import { useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';

type RateCard = {
  id: string;
  name: string;
  type: 'STANDARD' | 'NIGHT' | 'WEEKEND' | 'HOLIDAY' | 'AIRPORT' | 'ACCOUNT';
  active: boolean;
  priority: number;
  applies: string;
  baseFare: number;
  perMile: number;
  waitingPerHour: number;
  minimumFare: number;
};

const initialRates: RateCard[] = [
  {
    id: '1',
    name: 'Tariff 1 - Day Rate',
    type: 'STANDARD',
    active: true,
    priority: 1,
    applies: 'Mon-Fri • 06:00 to 22:00',
    baseFare: 3.2,
    perMile: 2.1,
    waitingPerHour: 18,
    minimumFare: 6,
  },
  {
    id: '2',
    name: 'Tariff 2 - Night Rate',
    type: 'NIGHT',
    active: true,
    priority: 2,
    applies: 'Daily • 22:00 to 06:00',
    baseFare: 4,
    perMile: 2.8,
    waitingPerHour: 22,
    minimumFare: 8,
  },
  {
    id: '3',
    name: 'Tariff 3 - Weekend',
    type: 'WEEKEND',
    active: true,
    priority: 3,
    applies: 'Fri 22:00 to Mon 06:00',
    baseFare: 4.5,
    perMile: 3,
    waitingPerHour: 24,
    minimumFare: 10,
  },
  {
    id: '4',
    name: 'Airport Transfers',
    type: 'AIRPORT',
    active: true,
    priority: 4,
    applies: 'Fixed routes only',
    baseFare: 25,
    perMile: 0,
    waitingPerHour: 0,
    minimumFare: 25,
  },
];

export default function RatesPage() {
  const [rates, setRates] = useState(initialRates);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rates;

    return rates.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.applies.toLowerCase().includes(q),
    );
  }, [rates, search]);

  const stats = useMemo(() => {
    return {
      total: rates.length,
      active: rates.filter((r) => r.active).length,
      premium: rates.filter((r) => r.priority >= 3).length,
      avgBase:
        rates.reduce((sum, r) => sum + r.baseFare, 0) / rates.length || 0,
    };
  }, [rates]);

  return (
    <AdminShell
      title="Rates"
      subtitle="Fare tariffs, time-based pricing, priority overrides and fixed pricing rules."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Rate Cards" value={stats.total} />
          <MetricCard label="Active Rates" value={stats.active} />
          <MetricCard label="Priority Rules" value={stats.premium} />
          <MetricCard
            label="Avg Base Fare"
            value={`£${stats.avgBase.toFixed(2)}`}
          />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Rate Cards</h2>
              <p className="mt-1 text-sm text-white/60">
                Configure multiple tariffs for day, night, weekend and special journeys.
              </p>
            </div>

            <div className="flex gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rate cards..."
                className="w-64 rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
              />

              <button className="rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-500">
                + Add Rate
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filtered.map((rate) => (
              <div
                key={rate.id}
                className="rounded-2xl border border-white/10 bg-[#08111f] p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-bold text-white">
                        {rate.name}
                      </h3>

                      <Badge value={rate.type} />

                      {rate.active ? (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
                          DISABLED
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm text-white/60">
                      Applies: {rate.applies}
                    </p>

                    <p className="mt-1 text-xs text-white/40">
                      Priority Order: {rate.priority}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/10">
                      Edit
                    </button>

                    <button className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <PriceBox
                    label="Base Fare"
                    value={`£${rate.baseFare.toFixed(2)}`}
                  />
                  <PriceBox
                    label="Per Mile"
                    value={`£${rate.perMile.toFixed(2)}`}
                  />
                  <PriceBox
                    label="Waiting"
                    value={`£${rate.waitingPerHour}/hr`}
                  />
                  <PriceBox
                    label="Minimum Fare"
                    value={`£${rate.minimumFare.toFixed(2)}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6">
          <h2 className="text-xl font-bold text-white">Pricing Logic</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <LogicCard
              title="Priority Override"
              text="Holiday > Weekend > Night > Standard"
            />
            <LogicCard
              title="Auto Quote"
              text="Dispatch can calculate fares automatically by pickup date/time."
            />
            <LogicCard
              title="Future Ready"
              text="Supports zones, surge pricing and account customer pricing."
            />
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function MetricCard({
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

function Badge({ value }: { value: string }) {
  return (
    <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
      {value}
    </span>
  );
}

function PriceBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-2 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function LogicCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm text-white/60">{text}</p>
    </div>
  );
}