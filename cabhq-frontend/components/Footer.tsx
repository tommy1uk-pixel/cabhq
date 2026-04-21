import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#020617] text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="text-2xl font-bold">CabHQ</div>

            <p className="mt-4 max-w-sm text-slate-400 leading-7">
              Modern dispatch software built for taxi and private hire
              operators who want faster bookings, better control and real
              growth.
            </p>
          </div>

          <div>
            <div className="font-semibold text-white">Platform</div>

            <div className="mt-4 space-y-3 text-slate-400">
              <div>
                <Link href="#features" className="hover:text-white">
                  Features
                </Link>
              </div>

              <div>
                <Link href="#pricing" className="hover:text-white">
                  Pricing
                </Link>
              </div>

              <div>
                <Link href="#demo" className="hover:text-white">
                  Book Demo
                </Link>
              </div>
            </div>
          </div>

          <div>
            <div className="font-semibold text-white">Company</div>

            <div className="mt-4 space-y-3 text-slate-400">
              <div>
                <Link href="/" className="hover:text-white">
                  Home
                </Link>
              </div>

              <div>
                <Link href="/login" className="hover:text-white">
                  Login
                </Link>
              </div>

              <div>
                <Link href="#faq" className="hover:text-white">
                  FAQ
                </Link>
              </div>
            </div>
          </div>

          <div>
            <div className="font-semibold text-white">Start Now</div>

            <div className="mt-4 space-y-3">
              <Link
                href="#pricing"
                className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-black transition hover:bg-cyan-400"
              >
                Start Free Trial
              </Link>

              <Link
                href="#demo"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Request Demo
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-6 flex flex-col gap-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>© 2026 CabHQ. All rights reserved.</div>

          <div className="flex gap-5">
            <span>Taxi Dispatch Software</span>
            <span>UK Private Hire Platform</span>
          </div>
        </div>
      </div>
    </footer>
  );
}