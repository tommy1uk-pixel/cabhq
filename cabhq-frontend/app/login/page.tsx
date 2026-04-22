import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#05070c] px-6 py-16 text-white">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_480px]">
        <div>
          <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-2 text-sm font-semibold text-cyan-300">
            Secure access
          </div>

          <h1 className="mt-8 text-5xl font-black tracking-tight sm:text-6xl">
            Welcome back to
            <span className="block text-cyan-400">CABHQ</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Sign in to manage bookings, dispatch drivers and control daily operations.
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}