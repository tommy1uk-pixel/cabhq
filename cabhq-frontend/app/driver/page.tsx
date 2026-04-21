import LogoutButton from '@/components/auth/LogoutButton';

export default function DriverPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">
              Driver Portal
            </h1>
            <p className="mt-2 text-base text-slate-400">
              View and manage assigned jobs.
            </p>
          </div>

          <LogoutButton />
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-base text-slate-400">
          No jobs assigned yet.
        </div>
      </div>
    </div>
  );
}