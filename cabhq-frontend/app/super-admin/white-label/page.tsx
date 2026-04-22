'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type WhiteLabelStatus = 'ENABLED' | 'DISABLED';
type BrandTargetType = 'GLOBAL' | 'COMPANY';

type BrandProfile = {
  id: string;
  name: string;
  targetType: BrandTargetType;
  targetValue: string;
  status: WhiteLabelStatus;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  loginTitle: string;
  appName: string;
  supportEmail: string;
  customDomain?: string | null;
  updatedAt: string;
};

const initialProfiles: BrandProfile[] = [
  {
    id: 'brand_001',
    name: 'CabHQ Default',
    targetType: 'GLOBAL',
    targetValue: 'ALL',
    status: 'ENABLED',
    logoUrl: '/logo.png',
    primaryColor: '#06b6d4',
    secondaryColor: '#0f172a',
    loginTitle: 'Welcome to CabHQ',
    appName: 'CabHQ',
    supportEmail: 'support@cabhq.co.uk',
    customDomain: null,
    updatedAt: '2026-04-22T10:20:00',
  },
  {
    id: 'brand_002',
    name: 'Premier Fleet Brand',
    targetType: 'COMPANY',
    targetValue: 'Premier Fleet',
    status: 'ENABLED',
    logoUrl: '/logo.png',
    primaryColor: '#a855f7',
    secondaryColor: '#111827',
    loginTitle: 'Premier Fleet Control Centre',
    appName: 'Premier Fleet',
    supportEmail: 'help@premierfleet.co.uk',
    customDomain: 'portal.premierfleet.co.uk',
    updatedAt: '2026-04-22T09:40:00',
  },
  {
    id: 'brand_003',
    name: 'Skyline Preview Theme',
    targetType: 'COMPANY',
    targetValue: 'Skyline Cars',
    status: 'DISABLED',
    logoUrl: '/logo.png',
    primaryColor: '#f59e0b',
    secondaryColor: '#0b1220',
    loginTitle: 'Skyline Cars Portal',
    appName: 'Skyline Cars',
    supportEmail: 'ops@skylinecars.co.uk',
    customDomain: 'app.skylinecars.co.uk',
    updatedAt: '2026-04-21T16:10:00',
  },
];

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusClass(status: WhiteLabelStatus) {
  return status === 'ENABLED'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    : 'border-red-500/30 bg-red-500/10 text-red-300';
}

function targetClass(target: BrandTargetType) {
  return target === 'GLOBAL'
    ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
    : 'border-violet-500/30 bg-violet-500/10 text-violet-300';
}

export default function SuperAdminWhiteLabelPage() {
  const [profiles, setProfiles] = useState<BrandProfile[]>(initialProfiles);
  const [selectedId, setSelectedId] = useState<string | null>(initialProfiles[0]?.id ?? null);
  const [search, setSearch] = useState('');

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;

    return profiles.filter((profile) =>
      [
        profile.name,
        profile.targetValue,
        profile.status,
        profile.targetType,
        profile.appName,
        profile.supportEmail,
        profile.customDomain || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [profiles, search]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedId) ?? null,
    [profiles, selectedId],
  );

  const stats = useMemo(() => {
    return {
      total: profiles.length,
      enabled: profiles.filter((profile) => profile.status === 'ENABLED').length,
      disabled: profiles.filter((profile) => profile.status === 'DISABLED').length,
      global: profiles.filter((profile) => profile.targetType === 'GLOBAL').length,
      company: profiles.filter((profile) => profile.targetType === 'COMPANY').length,
    };
  }, [profiles]);

  function setStatus(id: string, status: WhiteLabelStatus) {
    setProfiles((prev) =>
      prev.map((profile) =>
        profile.id === id
          ? { ...profile, status, updatedAt: new Date().toISOString() }
          : profile,
      ),
    );
  }

  function addProfile() {
    const newProfile: BrandProfile = {
      id: `brand_${Math.random().toString(36).slice(2, 8)}`,
      name: 'New Brand Profile',
      targetType: 'COMPANY',
      targetValue: 'New Company',
      status: 'DISABLED',
      logoUrl: '/logo.png',
      primaryColor: '#06b6d4',
      secondaryColor: '#0f172a',
      loginTitle: 'Welcome',
      appName: 'New Brand',
      supportEmail: 'support@example.com',
      customDomain: null,
      updatedAt: new Date().toISOString(),
    };

    setProfiles((prev) => [newProfile, ...prev]);
    setSelectedId(newProfile.id);
  }

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1850px]">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">
              Super Admin
            </div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">White Label</h1>
            <p className="mt-2 text-white/55">
              Manage global and company-specific branding, domains and login experience.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/super-admin"
              className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Back to Overview
            </Link>
            <button
              onClick={addProfile}
              className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Create Brand Profile
            </button>
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Profiles" value={stats.total} />
          <StatCard label="Enabled" value={stats.enabled} />
          <StatCard label="Disabled" value={stats.disabled} />
          <StatCard label="Global" value={stats.global} />
          <StatCard label="Company" value={stats.company} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Brand Profiles</h2>
                <p className="mt-1 text-sm text-white/60">
                  Review white-label themes and account branding targets.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search profiles..."
                className="w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50 lg:w-[320px]"
              />
            </div>

            <div className="space-y-4">
              {filteredProfiles.map((profile) => {
                const active = selectedId === profile.id;

                return (
                  <div
                    key={profile.id}
                    onClick={() => setSelectedId(profile.id)}
                    className={`cursor-pointer rounded-2xl border p-5 transition ${
                      active
                        ? 'border-cyan-500/50 bg-[#0c1b2c]'
                        : 'border-white/10 bg-[#0b1728]'
                    }`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold">{profile.name}</h3>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(profile.status)}`}>
                            {profile.status}
                          </span>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${targetClass(profile.targetType)}`}>
                            {profile.targetType}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-white/60">
                          Target: {profile.targetValue}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                          <span>App: {profile.appName}</span>
                          <span>Domain: {profile.customDomain || 'Default domain'}</span>
                          <span>Updated: {formatDateTime(profile.updatedAt)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <div
                          className="h-10 w-10 rounded-full border border-white/10"
                          style={{ backgroundColor: profile.primaryColor }}
                        />
                        <div
                          className="h-10 w-10 rounded-full border border-white/10"
                          style={{ backgroundColor: profile.secondaryColor }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredProfiles.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-white/55">
                  No brand profiles found.
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-6">
            {!selectedProfile ? (
              <Panel title="Brand Detail">
                <div className="text-white/55">No profile selected.</div>
              </Panel>
            ) : (
              <>
                <Panel title="Brand Detail">
                  <DetailRow label="Profile" value={selectedProfile.name} />
                  <DetailRow label="Status" value={selectedProfile.status} />
                  <DetailRow label="Target Type" value={selectedProfile.targetType} />
                  <DetailRow label="Target Value" value={selectedProfile.targetValue} />
                  <DetailRow label="App Name" value={selectedProfile.appName} />
                  <DetailRow label="Login Title" value={selectedProfile.loginTitle} />
                  <DetailRow label="Support Email" value={selectedProfile.supportEmail} />
                  <DetailRow label="Custom Domain" value={selectedProfile.customDomain || 'Default'} />
                  <DetailRow label="Updated" value={formatDateTime(selectedProfile.updatedAt)} />

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <ColorCard label="Primary" color={selectedProfile.primaryColor} />
                    <ColorCard label="Secondary" color={selectedProfile.secondaryColor} />
                  </div>
                </Panel>

                <Panel title="Brand Actions">
                  <div className="grid gap-3">
                    <button
                      onClick={() => setStatus(selectedProfile.id, 'ENABLED')}
                      className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      Enable Profile
                    </button>
                    <button
                      onClick={() => setStatus(selectedProfile.id, 'DISABLED')}
                      className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500"
                    >
                      Disable Profile
                    </button>
                    <button className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
                      Duplicate Profile
                    </button>
                  </div>
                </Panel>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>
      {children}
    </section>
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

function ColorCard({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
      <div className="mb-3 text-sm font-medium text-white/70">{label}</div>
      <div className="h-20 rounded-2xl border border-white/10" style={{ backgroundColor: color }} />
      <div className="mt-3 text-sm text-white/60">{color}</div>
    </div>
  );
}