import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="text-2xl font-semibold">CabHQ</div>
            <p className="mt-4 text-slate-400">
              Modern dispatch software for taxi operators.
            </p>
          </div>

          <div>
            <div className="font-semibold">Navigation</div>
            <div className="mt-4 space-y-3">
              <Link href="/">Home</Link><br />
              <Link href="/pricing">Pricing</Link><br />
              <Link href="/login">Login</Link>
            </div>
          </div>

          <div>
            <div className="font-semibold">Get Started</div>
            <div className="mt-4 space-y-3">
              <Link href="/pricing">View Pricing</Link><br />
              <Link href="/login">Book Demo</Link>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-800 pt-6 text-sm text-slate-500">
          © 2026 CabHQ
        </div>
      </div>
    </footer>
  );
}