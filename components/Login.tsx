import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, Key, AlertTriangle, Mail, User, ChevronLeft } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// onLogin에 'viewer' 타입을 추가하여 가입 직후 상태를 처리할 수 있게 합니다.
interface LoginProps {
  onLogin: (role: 'admin' | 'user' | 'viewer') => void;
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
  const [isSignUp, setIsSignUp] = useState(false); // 로그인/회원가입 모드 전환
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // 회원가입용 이름 상태
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    setIsConfigured(isSupabaseConfigured());
  }, []);

  const handleKakaoLogin = async () => {
  setIsLoading(true);
  setError('');
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        // 인증 후 돌아올 주소 (window.location.origin은 현재 사이트 주소입니다)
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  } catch (err: any) {
    setError(err.message || '카카오 로그인에 실패했습니다.');
    setIsLoading(false);
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isSignUp) {
        /* ================= 회원가입 로직 ================= */
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            // 🚀 이 data.name이 DB 트리거의 raw_user_meta_data->>'name'으로 들어갑니다.
            data: { name: name.trim() },
            emailRedirectTo: window.location.origin
          }
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          alert('인증 메일을 보냈습니다! 이메일 함을 확인하여 인증을 완료해주세요.');
          setIsSignUp(false); // 가입 성공 후 로그인 모드로 전환
        }

      } else {
        /* ================= 로그인 로직 ================= */
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) throw signInError;

        if (data.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .maybeSingle();

          const isFallbackAdmin = email.trim().toLowerCase() === 'vgmc.connect@gmail.com';

          if (profileError || !profile) {
            if (isFallbackAdmin) onLogin('admin');
            else {
              setError('계정 프로필을 찾을 수 없습니다.');
              await supabase.auth.signOut();
            }
          } else {
            // admin, user, viewer 모두 허용 (viewer 처리는 App.tsx에서 수행)
            onLogin(profile.role as any);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || '인증에 실패했습니다.');
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
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-xl">
            <div className="bg-white/90 backdrop-blur-xl p-8 sm:p-14 rounded-[3rem] shadow-2xl border border-white/50 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="mb-6">
                  <Logo />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-2">
                  {isSignUp ? 'Create Account' : 'Welcome Back'}
                </h2>
                <p className="text-slate-500 font-medium">
                  {isSignUp ? '새로운 계정을 생성합니다' : '밴쿠버지구촌교회 교적부'}
                </p>
              </div>

              {!isConfigured && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-sm font-medium">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <span>서버 연결 설정이 필요합니다.</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name (회원가입 시에만 표시) */}
                {isSignUp && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                      Full Name
                    </label>
                    <div className="relative mt-1">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="실명을 입력해주세요"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-emerald-100 outline-none text-lg font-bold transition-all"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                    Email
                  </label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-emerald-100 outline-none text-lg font-bold transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                    Password
                  </label>
                  <div className="relative mt-1">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-emerald-100 outline-none text-lg font-bold transition-all"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl font-bold text-sm flex items-center gap-2">
                    <AlertTriangle size={16} />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-lg font-black rounded-2xl shadow-xl shadow-emerald-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Secure Login'}
                </button>

                {/* 🚀 카카오 로그인 버튼 추가 */}
                {!isSignUp && (
                  <>
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-slate-400 font-medium">Or continue with</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleKakaoLogin}
                      disabled={isLoading}
                      className="w-full py-4 bg-[#FEE500] text-[#191919] text-lg font-bold rounded-2xl shadow-lg hover:bg-[#FADA0A] transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                      {/* 카카오 아이콘 대신 MessageCircle 사용 혹은 이미지 사용 */}
                      <img src="/kakao.png" className="w-6 h-6" alt="Kakao" />
                      카카오로 로그인
                    </button>
                  </>
                )}

                {/* 모드 전환 버튼 */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                  }}
                  className="w-full py-2 text-sm font-bold text-slate-400 hover:text-emerald-600 transition-colors flex items-center justify-center gap-1"
                >
                  {isSignUp ? (
                    <><ChevronLeft size={16}/> Back to Login</>
                  ) : (
                    <>처음이신가요? 회원가입 <ArrowRight size={16}/></>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        <footer className="pb-4 text-center text-sm text-white/70">
          © 2026 VGMC Connect. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default Login;
