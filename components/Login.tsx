import React, { useState } from 'react';
import { Lock, ArrowRight, User, Key, Sparkles } from 'lucide-react';
import Logo from './Logo';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate a brief network delay for better UX feel
    setTimeout(() => {
        if (id === 'vgmc' && pw === 'vgmc.org') {
            onLogin();
        } else {
            setError('아이디 또는 비밀번호가 올바르지 않습니다.');
            setIsLoading(false);
        }
    }, 600);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
         <img 
            src="https://images.unsplash.com/photo-1497294815431-9365093b7331?q=80&w=2670&auto=format&fit=crop" 
            alt="Background" 
            className="w-full h-full object-cover opacity-60 animate-in zoom-in-105 duration-[20s]"
         />
         <div className="absolute inset-0 bg-gradient-to-br from-brand-900/80 via-slate-900/60 to-brand-800/80 mix-blend-multiply" />
      </div>

      {/* Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-500/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-white/90 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-white/50 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-10">
                <div className="bg-brand-50 p-4 rounded-2xl shadow-inner mb-6">
                    <Logo className="scale-110 origin-center" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Welcome Back</h2>
                <p className="text-slate-500 text-sm mt-2 font-medium">
                    밴쿠버지구촌교회 성도 관리 시스템
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Admin ID</label>
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                            <User className="w-5 h-5" />
                        </div>
                        <input 
                            type="text" 
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-brand-400 focus:border-brand-400 outline-none transition-all text-slate-800 font-medium placeholder-slate-400"
                            placeholder="아이디를 입력하세요"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                            <Key className="w-5 h-5" />
                        </div>
                        <input 
                            type="password" 
                            value={pw}
                            onChange={(e) => setPw(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-brand-400 focus:border-brand-400 outline-none transition-all text-slate-800 font-medium placeholder-slate-400"
                            placeholder="비밀번호를 입력하세요"
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 text-sm rounded-xl font-medium animate-in slide-in-from-top-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {error}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-200 hover:shadow-xl hover:shadow-brand-300 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <Lock className="w-4 h-4" />
                            <span>Secure Login</span>
                            <ArrowRight className="w-4 h-4 opacity-70" />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-8 text-center">
                 <p className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Connected in Faith, United in Love
                 </p>
            </div>
        </div>
        
        <div className="text-center mt-6 opacity-60">
            <p className="text-xs text-white/80 font-medium">© 2024 VGMC Connect. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;