import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth-store';
import { mockApi } from '@/lib/mock-api';

type AuthView = 'login' | 'signup' | 'forgot-password';

export function AuthPage() {
  const [view, setView] = useState<AuthView>('login');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">AssetFlow</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Enterprise Asset Management</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
          {view === 'login' && <LoginForm onSwitch={setView} />}
          {view === 'signup' && <SignupForm onSwitch={setView} />}
          {view === 'forgot-password' && <ForgotPasswordForm onSwitch={setView} />}
        </div>

        <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">Demo Accounts (password: <code className="text-blue-600 dark:text-blue-400">password</code>)</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
            <div>🔴 admin@assetflow.io</div>
            <div>🟢 manager@assetflow.io</div>
            <div>🟣 head@assetflow.io</div>
            <div>⚪ employee@assetflow.io</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onSwitch }: { onSwitch: (v: AuthView) => void }) {
  const navigate = useNavigate();
  const { login: authLogin } = useAuthStore();
  const [email, setEmail] = useState('admin@assetflow.io');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await mockApi.login(email, password);
      authLogin(res.user, { accessToken: res.accessToken, refreshToken: res.refreshToken });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Welcome back</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sign in to your account</p>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <Input
        label="Email"
        type="email"
        placeholder="you@company.com"
        icon={<Mail className="w-4 h-4" />}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <Input
        label="Password"
        type="password"
        placeholder="Enter your password"
        icon={<Lock className="w-4 h-4" />}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onSwitch('forgot-password')}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        >
          Forgot password?
        </button>
      </div>

      <Button type="submit" className="w-full" loading={loading} icon={<ArrowRight className="w-4 h-4" />}>
        Sign In
      </Button>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Don't have an account?{' '}
        <button type="button" onClick={() => onSwitch('signup')} className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium">
          Create one
        </button>
      </p>
    </form>
  );
}

function SignupForm({ onSwitch }: { onSwitch: (v: AuthView) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await mockApi.signup(name, email, password);
      setSuccess(res.message);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Create Account</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Get started with AssetFlow</p>
      </div>

      <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-xs text-blue-700 dark:text-blue-400">
        ℹ️ Sign up creates an <strong>Employee</strong> account. Admin and manager roles are assigned by an administrator.
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm">
          {success}{' '}
          <button type="button" onClick={() => onSwitch('login')} className="underline font-medium cursor-pointer">
            Sign in now
          </button>
        </div>
      )}

      <Input label="Full Name" placeholder="John Doe" icon={<User className="w-4 h-4" />} value={name} onChange={(e) => setName(e.target.value)} required />
      <Input label="Email" type="email" placeholder="you@company.com" icon={<Mail className="w-4 h-4" />} value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input label="Password" type="password" placeholder="Min. 8 characters" icon={<Lock className="w-4 h-4" />} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />

      <Button type="submit" className="w-full" loading={loading}>
        Create Account
      </Button>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <button type="button" onClick={() => onSwitch('login')} className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium">
          Sign in
        </button>
      </p>
    </form>
  );
}

function ForgotPasswordForm({ onSwitch }: { onSwitch: (v: AuthView) => void }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-5">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Reset Password</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">We'll send you a reset link</p>
      </div>

      {submitted ? (
        <div className="p-4 rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm text-center">
          If an account exists with that email, a reset link has been sent.
        </div>
      ) : (
        <Input label="Email" type="email" placeholder="you@company.com" icon={<Mail className="w-4 h-4" />} value={email} onChange={(e) => setEmail(e.target.value)} required />
      )}

      {!submitted && (
        <Button type="submit" className="w-full">
          Send Reset Link
        </Button>
      )}

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        <button type="button" onClick={() => onSwitch('login')} className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium">
          ← Back to login
        </button>
      </p>
    </form>
  );
}
