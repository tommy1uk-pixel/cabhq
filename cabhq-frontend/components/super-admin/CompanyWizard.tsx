'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export default function CompanyWizard() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [code, setCode] = useState('');
  const [slug, setSlug] = useState('');
  const [driverLimit, setDriverLimit] = useState('25');
  const [vehicleLimit, setVehicleLimit] = useState('25');

  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('Temp123!');

  async function launchCompany() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          contactName,
          contactEmail,
          contactPhone,
          adminName,
          adminEmail,
          adminPassword,
          code,
          slug,
          driverLimit: Number(driverLimit),
          vehicleLimit: Number(vehicleLimit),
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to create company');
      }

      router.push(`/super-admin/companies/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company');
    } finally {
      setLoading(false);
    }
  }

  const totalSteps = 5;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-8">
      <div className="mb-8 flex items-center gap-3">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full ${
              i + 1 <= step ? 'bg-white' : 'bg-slate-800'
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <WizardStep
          title="Company Details"
          back={null}
          next={() => setStep(2)}
          nextDisabled={!name.trim()}
        >
          <Input value={name} setValue={setName} placeholder="Company Name" />
        </WizardStep>
      )}

      {step === 2 && (
        <WizardStep
          title="Contact Details"
          back={() => setStep(1)}
          next={() => setStep(3)}
        >
          <Input value={contactName} setValue={setContactName} placeholder="Contact Name" />
          <Input value={contactEmail} setValue={setContactEmail} placeholder="Contact Email" />
          <Input value={contactPhone} setValue={setContactPhone} placeholder="Contact Phone" />
        </WizardStep>
      )}

      {step === 3 && (
        <WizardStep
          title="Platform Setup"
          back={() => setStep(2)}
          next={() => setStep(4)}
        >
          <Input value={code} setValue={setCode} placeholder="Company Code (future field)" />
          <Input value={slug} setValue={setSlug} placeholder="Portal Slug (future field)" />
          <Input value={driverLimit} setValue={setDriverLimit} placeholder="Driver Limit (future field)" />
          <Input value={vehicleLimit} setValue={setVehicleLimit} placeholder="Vehicle Limit (future field)" />
          <div className="rounded-xl border border-amber-700/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            These setup fields are captured in the wizard UI now. They will become active once we complete the full Company database expansion.
          </div>
        </WizardStep>
      )}

      {step === 4 && (
        <WizardStep
          title="Admin Account"
          back={() => setStep(3)}
          next={() => setStep(5)}
          nextDisabled={!adminEmail.trim() || !adminPassword.trim()}
        >
          <Input value={adminName} setValue={setAdminName} placeholder="Admin Full Name" />
          <Input value={adminEmail} setValue={setAdminEmail} placeholder="Admin Email" />
          <Input value={adminPassword} setValue={setAdminPassword} placeholder="Temporary Password" />
        </WizardStep>
      )}

      {step === 5 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Review & Launch</h2>

          <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
            <div><strong>Company:</strong> {name}</div>
            <div><strong>Contact:</strong> {contactName || '-'}</div>
            <div><strong>Contact Email:</strong> {contactEmail || '-'}</div>
            <div><strong>Contact Phone:</strong> {contactPhone || '-'}</div>
            <div><strong>Admin:</strong> {adminName || '-'}</div>
            <div><strong>Admin Email:</strong> {adminEmail || '-'}</div>
            <div><strong>Code:</strong> {code || '-'}</div>
            <div><strong>Slug:</strong> {slug || '-'}</div>
            <div><strong>Driver Limit:</strong> {driverLimit || '-'}</div>
            <div><strong>Vehicle Limit:</strong> {vehicleLimit || '-'}</div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-700 bg-red-950/30 px-4 py-3 text-red-300">
              {error}
            </div>
          ) : null}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(4)}
              className="rounded-xl border border-slate-700 px-5 py-3 text-white"
            >
              Back
            </button>

            <button
              onClick={launchCompany}
              disabled={loading}
              className="rounded-xl bg-white px-5 py-3 text-black disabled:opacity-40"
            >
              {loading ? 'Launching...' : 'Launch Company'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function WizardStep({
  title,
  children,
  back,
  next,
  nextDisabled,
}: {
  title: string;
  children: React.ReactNode;
  back: (() => void) | null;
  next: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">{title}</h2>

      {children}

      <div className="flex justify-between">
        {back ? (
          <button
            onClick={back}
            className="rounded-xl border border-slate-700 px-5 py-3 text-white"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={next}
          disabled={nextDisabled}
          className="rounded-xl bg-white px-5 py-3 text-black disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function Input({
  value,
  setValue,
  placeholder,
}: {
  value: string;
  setValue: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
    />
  );
}