import LoginForm from '@/components/auth/LoginForm';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#05070c] text-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_480px]">
          <div>
            <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-2 text-sm font-semibold text-cyan-300">
              Secure access for operators, admins, drivers and super admins
            </div>

            <h1 className="mt-8 text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
              Welcome back to
              <span className="block text-cyan-400">CABHQ</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              Sign in to manage bookings, dispatch drivers, track operations and
              control your business from one modern platform.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-500">Operators</p>
                <p className="mt-2 text-base font-semibold text-white">
                  Manage dispatch fast
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-500">Drivers</p>
                <p className="mt-2 text-base font-semibold text-white">
                  Access jobs instantly
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-500">Admins</p>
                <p className="mt-2 text-base font-semibold text-white">
                  Control the whole company
                </p>
              </div>
            </div>
          </div>

          <LoginForm />
        </div>
      </main>

      <Footer />
    </div>
  );
}