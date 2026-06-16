import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'admin@wrappedmedia.ca', password: '' },
  });

  async function onSubmit(values: FormValues) {
    try {
      await signIn(values.email, values.password);
      navigate('/dashboard');
    } catch {
      toast.error('Invalid email or password');
    }
  }

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-orange/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-orange/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-orange rounded-2xl flex items-center justify-center font-bold text-white text-3xl mx-auto mb-4 shadow-lg shadow-brand-orange/30">
            W
          </div>
          <h1 className="text-2xl font-bold text-white">Wrapped Media</h1>
          <p className="text-slate-400 text-sm mt-1">Campaign Admin Dashboard</p>
        </div>

        {/* Form card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-white mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="admin@wrappedmedia.ca"
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2.5 pl-10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent text-sm transition-all"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2.5 pl-10 pr-10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign in
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-xs text-slate-500 text-center">Demo credentials</p>
            <div className="mt-2 bg-white/5 rounded-lg p-3 font-mono text-xs text-slate-400 space-y-1">
              <div>Email: <span className="text-slate-300">admin@wrappedmedia.ca</span></div>
              <div>Password: <span className="text-slate-300">Admin1234!</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
