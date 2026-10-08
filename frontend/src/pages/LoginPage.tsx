import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { login } from '@/services/batteryApi';

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      onLogin();
      navigate('/dashboard');
    } else {
      setError('Invalid credentials. Please check your email and password.');
    }
  };

  return (
    <div className="min-h-screen bg-base-900 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-base-850 to-base-900">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#00a8e8 1px, transparent 1px), linear-gradient(90deg, #00a8e8 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-success-500/5 blur-3xl" />

        <div className="relative flex flex-col justify-between p-12 w-full">
          <Logo size="lg" />

          <div className="space-y-6">
            <h2 className="text-3xl font-bold leading-tight text-slate-100">
              AI-Based Intelligent
              <br />
              <span className="text-primary-400">EV Battery Health</span>
              <br />
              Monitoring System
            </h2>
            <p className="max-w-md text-base text-slate-400 leading-relaxed">
              Real-time monitoring and predictive health analysis of electric vehicle
              batteries using machine learning. Track SOH, RUL, voltage, temperature,
              and more — all in one professional dashboard.
            </p>
            <div className="flex items-center gap-6 pt-4">
              {['SOH Prediction', 'Live Monitoring', 'Alert System'].map((feat) => (
                <div key={feat} className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-success-500" />
                  <span className="text-sm text-slate-400">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck size={14} />
            Final Year Engineering Project — 2026
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <Logo size="lg" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-100">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-400">
              Sign in to access the battery monitoring dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@evlab.edu"
                  required
                  className="w-full rounded-xl border border-base-700 bg-base-800 py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  minLength={4}
                  className="w-full rounded-xl border border-base-700 bg-base-800 py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/10"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-danger-500/20 bg-danger-500/5 px-4 py-3 text-sm text-danger-400 animate-fade-in">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 py-3.5 text-sm font-semibold text-white transition-all hover:from-primary-400 hover:to-primary-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Authenticating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In to Dashboard
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-8 rounded-xl border border-base-700/50 bg-base-800/50 p-4">
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-400">Demo Mode:</span> Enter any
              email and a password of 4+ characters to access the dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
