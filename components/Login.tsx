import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, Key, AlertTriangle, Mail } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface LoginProps {
  onLogin: (role: 'admin' | 'user') => void;
}

const Logo = ({ className }: { className?: string }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <img
        src="https://img.sanishtech.com/u/9c94a10e73cbb826e240de306c60d5f7.png"
        alt="Logo_Kr"
        className="w-[280px] sm:w-[360px] h-auto"
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
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password
        });

        if (signInError) throw signInError;

        if (data.user) {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();
            
            const isFallbackAdmin = email.trim().toLowerCase() === 'vgmc.connect@gmail.com';

            if (profileError) {
                console.error("Profile fetch error:", profileError);
                if (isFallbackAdmin) {
                    onLogin('admin');
                } else {
                    setError("Account profile not found. Please contact administrator.");
                    await supabase.auth.signOut();
                }
            } else if (profile?.role === 'admin' || profile?.role === 'user') {
                onLogin(profile.role as 'admin' | 'user');
            } else {
                setError("You do not have permission to access this system.");
                await supabase.auth.signOut();
            }
        }
    } catch (err: any) {
        console.error("Login failed:", err);
        setError(err.message || "Failed to login. Please check your credentials.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-screen relative bg-slate-900 font-sans overflow-hidden">
      <div className="absolute inset-0 z-0">
         <img 
            src="https://images.unsplash.com/photo-1497294815431-9365093b7331?q=80&w=2670&auto=format&fit=crop" 
            alt="Background" 
            className="w-full h-full object-cover opacity-60"
         />
         <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/80 mix-blend-multiply" />
      </div>

      <div className="absolute inset-0 z-10 overflow-y-auto flex items-center justify-center p-4">
        <div className="w-full max-w-xl">
            <div className="bg-white/90 backdrop-blur-xl p-8 sm:p-14 rounded-[3rem] shadow-2xl border border-white/50 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex flex-col items-center text-center mb-8 sm:mb-12">
                    <div className="p-5 mb-8 transform hover:scale-105 transition-transform duration-500">
                    <Logo />
                    </div>
                    <h2 className="text-3xl sm:text-2xl font-black text-slate-800 tracking-tight mb-3">VGMC Connect</h2>
                    <p className="text-slate-500 text-base sm:text-l font-medium">
                        밴쿠버지구촌교회 교적부
                    </p>
                </div>

                {!isConfigured && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800 text-sm font-medium">
                        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                        <div>
                            <strong className="block text-amber-900 mb-1">Supabase Not Connected</strong>
                            Please check your configuration.
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500 uppercase ml-1 tracking-wider">Email</label>
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                                <Mail className="w-6 h-6" />
                            </div>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-14 pr-5 py-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all text-slate-800 text-lg font-bold placeholder-slate-400"
                                placeholder="admin@vgmc.ca"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500 uppercase ml-1 tracking-wider">Password</label>
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                                <Key className="w-6 h-6" />
                            </div>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-14 pr-5 py-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all text-slate-800 text-lg font-bold placeholder-slate-400"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-start gap-3 p-4 bg-red-50 text-red-600 rounded-2xl font-bold border border-red-100">
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={isLoading || !isConfigured}
                        className="w-full py-5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white text-lg font-black rounded-2xl shadow-xl shadow-emerald-200 transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3 mt-6 disabled:opacity-70"
                    >
                        {isLoading ? (
                            <span className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Lock className="w-5 h-5" />
                                <span>Secure Login</span>
                                <ArrowRight className="w-5 h-5 opacity-70" />
                            </>
                        )}
                    </button>
                </form>
            </div>
            <div className="text-center mt-8 opacity-60">
                <p className="text-sm text-white/80 font-medium tracking-wide">© 2024 VGMC Connect. All rights reserved.</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
