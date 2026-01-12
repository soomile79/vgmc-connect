import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, Key, AlertTriangle, Mail } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface LoginProps {
  onLogin: (role: 'admin' | 'user') => void;
}

const Logo = ({ className }: { className?: string }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <img
      src="/logo_kr.png"
      alt="VGMC Logo"
      className="w-[260px] sm:w-[360px] h-auto"
      loading="lazy"
    />
  </div>
);

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    setIsConfigured(isSupabaseConfigured());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) throw signInError;

      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        const isFallbackAdmin =
          email.trim().toLowerCase() === 'vgmc.connect@gmail.com';

        if (profileError) {
          if (isFallbackAdmin) onLogin('admin');
          else {
            setError('Account profile not found.');
            await supabase.auth.signOut();
          }
        } else if (profile?.role === 'admin' || profile?.role === 'user') {
          onLogin(profile.role);
        } else {
          setError('You do not have permission.');
          await supabase.auth.signOut();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh bg-slate-900 font-sans overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <img
          src="https://images.unsplash.com/photo-1497294815431-9365093b7331?q=80&w=2670&auto=format&fit=crop"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/80" />
      </div>

      {/* Layout */}
      <div className="relative z-10 min-h-dvh flex flex-col px-4">
        {/* Center */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-xl">
            <div className="bg-white/90 backdrop-blur-xl p-8 sm:p-14 rounded-[3rem] shadow-2xl border border-white/50">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="mb-6">
                  <Logo />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-2">
                  VGMC Connect
                </h2>
                <p className="text-slate-500 font-medium">
                  밴쿠버지구촌교회 교적부
                </p>
              </div>

              {!isConfigured && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-sm font-medium">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <span>Supabase Not Connected</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Email
                  </label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-emerald-100 outline-none text-lg font-bold"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Password
                  </label>
                  <div className="relative mt-1">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-emerald-100 outline-none text-lg font-bold"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl font-bold text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-lg font-black rounded-2xl shadow-xl"
                >
                  {isLoading ? 'Signing in…' : 'Secure Login'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="pb-4 text-center text-sm text-white/70">
          © 2026 VGMC Connect. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default Login;
