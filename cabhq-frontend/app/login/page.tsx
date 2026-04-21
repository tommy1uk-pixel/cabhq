import LoginForm from '@/components/auth/LoginForm';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_500px]">
          <div>
            <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-2 text-sm font-semibold text-cyan-300">
              Secure access for operators, admins and drivers
            </div>

            <h1 className="mt-8 text-5xl font-black tracking-tight sm:text-6xl md:text-7xl">
              Welcome back to
              <span className="block text-cyan-400">CabHQ</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Sign in to manage bookings, dispatch drivers, track live activity
              and run your company from one place.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-bold text-white">Live</div>
                <div className="mt-1 text-sm text-slate-400">Dispatch control</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-bold text-white">Fast</div>
                <div className="mt-1 text-sm text-slate-400">Booking workflow</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-bold text-white">Secure</div>
                <div className="mt-1 text-sm text-slate-400">Role-based access</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-3 shadow-2xl shadow-black/30">
            <div className="rounded-[22px] bg-[#07111f] p-2">
              <LoginForm />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}