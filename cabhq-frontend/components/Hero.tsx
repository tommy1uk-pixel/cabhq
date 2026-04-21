import Link from 'next/link';

export default function Hero() {
  return (
    <section className="bg-slate-950 py-24 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-4xl">
          <div className="inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-5 py-2 text-sm font-semibold text-sky-300">
            Built for taxi & private hire operators
          </div>

          <h1 className="mt-8 text-5xl font-semibold tracking-tight md:text-7xl">
            Dispatch faster.
            <span className="block text-sky-400">Run smarter.</span>
            <span className="block">Grow with less admin.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Modern dispatch, live visibility and business control without bloated
            enterprise software.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/pricing"
              className="rounded-2xl bg-white px-6 py-4 text-base font-semibold text-black"
            >
              View Pricing
            </Link>

            <Link
              href="/login"
              className="rounded-2xl border border-slate-700 px-6 py-4 text-base font-semibold text-white"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}