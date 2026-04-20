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
  const [code, setCode] = useState('');
  const [slug, setSlug] = useState('');

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

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
          code,
          slug,
          contactName,
          contactEmail,
          contactPhone,
          adminName,
          adminEmail,
          adminPassword,
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

  const totalSteps = 4;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-8 md:p-10">
      <div className="mb-10 flex items-center gap-3">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-3 flex-1 rounded-full ${
              i + 1 <= step ? 'bg-white' : 'bg-slate-800'
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <WizardStep
          title="Company Details"
          description="Set the primary tenant identity for this company."
          back={null}
          next={() => setStep(2)}
          nextDisabled={!name.trim()}
        >
          <Input value={name} setValue={setName} placeholder="Company Name" />
          <Input value={code} setValue={setCode} placeholder="Company Code" />
          <Input value={slug} setValue={setSlug} placeholder="Portal Slug" />
        </WizardStep>
      )}

      {step === 2 && (
        <WizardStep
          title="Contact Details"
          description="Add the main operational contact for the company."
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
          title="Admin Account"
          description="Create the initial admin login for this tenant."
          back={() => setStep(2)}
          next={() => setStep(4)}
          nextDisabled={!adminEmail.trim() || !adminPassword.trim()}
        >
          <Input value={adminName} setValue={setAdminName} placeholder="Admin Full Name" />
          <Input value={adminEmail} setValue={setAdminEmail} placeholder="Admin Email" />
          <Input value={adminPassword} setValue={setAdminPassword} placeholder="Temporary Password" />
        </WizardStep>
      )}

      {step === 4 && (
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-semibold text-white">Review & Launch</h2>
            <p className="mt-2 text-base text-slate-400">
              Confirm the tenant details before creating the company.
            </p>
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-6 text-base text-slate-300">
            <Row label="Company" value={name} />
            <Row label="Code" value={code || '-'} />
            <Row label="Slug" value={slug || '-'} />
            <Row label="Contact Name" value={contactName || '-'} />
            <Row label="Contact Email" value={contactEmail || '-'} />
            <Row label="Contact Phone" value={contactPhone || '-'} />
            <Row label="Admin Name" value={adminName || '-'} />
            <Row label="Admin Email" value={adminEmail || '-'} />
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-800 bg-red-950/30 px-5 py-4 text-base text-red-300">
              {error}
            </div>
          ) : null}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-medium text-white"
            >
              Back
            </button>

            <button
              onClick={launchCompany}
              disabled={loading}
              className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-black disabled:opacity-40"
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
  description,
  children,
  back,
  next,
  nextDisabled,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  back: (() => void) | null;
  next: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-semibold text-white">{title}</h2>
        <p className="mt-2 text-base text-slate-400">{description}</p>
      </div>

      <div className="space-y-5">{children}</div>

      <div className="flex justify-between">
        {back ? (
          <button
            onClick={back}
            className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-medium text-white"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={next}
          disabled={nextDisabled}
          className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-black disabled:opacity-40"
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
      className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-base text-white placeholder:text-slate-500"
    />
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3 last:border-b-0 last:pb-0">
      <div className="text-base text-slate-400">{label}</div>
      <div className="text-right text-base font-medium text-white">{value}</div>
    </div>
  );
}