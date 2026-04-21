import LoginForm from '@/components/auth/LoginForm';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_480px]">
          <div>
            <div className="inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-5 py-2 text-sm font-semibold text-sky-300">
              Secure access for operators, admins and drivers
            </div>

            <h1 className="mt-8 text-5xl font-semibold tracking-tight sm:text-6xl">
              Welcome back to
              <span className="block text-sky-400">CabHQ</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              Sign in to manage bookings, dispatch drivers, monitor operations and
              control your company from one place.
            </p>
          </div>

          <LoginForm />
        </div>
      </main>

      <Footer />
    </div>
  );
}