import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#07111f]">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="CabHQ Logo"
              width={42}
              height={42}
              priority
              className="rounded-xl"
            />
            <span className="text-2xl font-bold tracking-wide text-white">
              CABHQ
            </span>
          </div>

          <p className="max-w-md text-white/55">
            Modern dispatch software for operators who want stronger control,
            live driver visibility and a cleaner customer journey.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-white/40">
              Navigation
            </h4>
            <div className="space-y-3 text-white/60">
              <a href="#platform" className="block transition hover:text-white">
                Platform
              </a>
              <a href="#features" className="block transition hover:text-white">
                Features
              </a>
              <a href="#pricing" className="block transition hover:text-white">
                Pricing
              </a>
              <a href="#demo" className="block transition hover:text-white">
                Book Demo
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-white/40">
              Product
            </h4>
            <div className="space-y-3 text-white/60">
              <p>Taxi Dispatch</p>
              <p>Fleet Management</p>
              <p>Driver App</p>
              <p>Passenger App</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-5 text-sm text-white/40 md:flex-row md:items-center md:justify-between">
          <div>© 2026 CabHQ. All rights reserved.</div>
          <div>Built for modern taxi operators</div>
        </div>
      </div>
    </footer>
  );
}