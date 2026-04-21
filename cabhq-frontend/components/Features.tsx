import Link from 'next/link';

export default function Features() {
  return (
    <section id="features" className="bg-slate-950 py-24 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-5xl font-semibold">Everything needed to run smarter</h2>

        <p className="mt-6 max-w-2xl text-lg text-slate-400">
          Built around real taxi operations.
        </p>

        <div className="mt-12 flex gap-4">
          <Link
            href="/pricing"
            className="rounded-2xl bg-white px-6 py-4 text-black font-semibold"
          >
            View Pricing
          </Link>

          <Link
            href="/login"
            className="rounded-2xl border border-slate-700 px-6 py-4 text-white font-semibold"
          >
            Login
          </Link>
        </div>
      </div>
    </section>
  );
}