import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, User, Key, Sparkles, Settings, Plus, Trash2, X, ShieldAlert } from 'lucide-react';
import Logo from './Logo';

interface LoginProps {
  onLogin: () => void;
}

interface AdminUser {
    id: string;
    pw: string;
    note?: string;
}

const MASTER_ID = 'vgmc';
const MASTER_PW = 'vgmc.org';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Admin Management State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [masterAuth, setMasterAuth] = useState('');
  const [isMasterAuthenticated, setIsMasterAuthenticated] = useState(false);
  const [storedAdmins, setStoredAdmins] = useState<AdminUser[]>([]);
  
  const [newAdminId, setNewAdminId] = useState('');
  const [newAdminPw, setNewAdminPw] = useState('');
  const [newAdminNote, setNewAdminNote] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('church-admins');
    if (saved) {
        setStoredAdmins(JSON.parse(saved));
    }
  }, []);

  const saveAdmins = (admins: AdminUser[]) => {
      setStoredAdmins(admins);
      localStorage.setItem('church-admins', JSON.stringify(admins));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate a brief network delay
    setTimeout(() => {
        const isMaster = id === MASTER_ID && pw === MASTER_PW;
        const isSubAdmin = storedAdmins.some(admin => admin.id === id && admin.pw === pw);

        if (isMaster || isSubAdmin) {
            onLogin();
        } else {
            setError('아이디 또는 비밀번호가 올바르지 않습니다.');
            setIsLoading(false);
        }
    }, 600);
  };

  const handleMasterAuth = () => {
      if (masterAuth === MASTER_PW) {
          setIsMasterAuthenticated(true);
      } else {
          alert('Incorrect Master Password');
      }
  };

  const handleAddAdmin = () => {
      if (!newAdminId || !newAdminPw) return;
      if (newAdminId === MASTER_ID || storedAdmins.some(a => a.id === newAdminId)) {
          alert('ID already exists or is reserved.');
          return;
      }
      const updated = [...storedAdmins, { id: newAdminId, pw: newAdminPw, note: newAdminNote }];
      saveAdmins(updated);
      setNewAdminId('');
      setNewAdminPw('');
      setNewAdminNote('');
  };

  const handleDeleteAdmin = (targetId: string) => {
      if (confirm(`Delete admin "${targetId}"?`)) {
          const updated = storedAdmins.filter(a => a.id !== targetId);
          saveAdmins(updated);
      }
  };

  return (
    <div className="w-full h-full relative bg-slate-900 font-sans">
      {/* Background Container - Absolute to fill the fixed h-full parent */}
      <div className="absolute inset-0 z-0 overflow-hidden">
         <img 
            src="https://images.unsplash.com/photo-1497294815431-9365093b7331?q=80&w=2670&auto=format&fit=crop" 
            alt="Background" 
            className="w-full h-full object-cover opacity-60 animate-in zoom-in-105 duration-[20s]"
         />
         <div className="absolute inset-0 bg-gradient-to-br from-brand-900/80 via-slate-900/60 to-brand-800/80 mix-blend-multiply" />
         
         {/* Decorative Blobs */}
         <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-500/30 rounded-full blur-3xl animate-pulse" />
         <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Scrollable Content Wrapper - Handles scrolling within the fixed viewport */}
      <div className="absolute inset-0 z-10 overflow-y-auto">
        <div className="min-h-full w-full flex flex-col items-center justify-center p-4 sm:px-6 py-12">
            
            <div className="w-full max-w-xl my-auto">
                {/* Login Card */}
                <div className="bg-white/90 backdrop-blur-xl p-8 sm:p-14 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl border border-white/50 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    
                    {/* Header */}
                    <div className="flex flex-col items-center text-center mb-8 sm:mb-12">
                        <div className="bg-brand-50 p-4 sm:p-5 rounded-3xl shadow-inner mb-6 sm:mb-8 transform hover:scale-105 transition-transform duration-500">
                            <Logo className="scale-110 sm:scale-125 origin-center" />
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight mb-2 sm:mb-3">Welcome Back</h2>
                        <p className="text-slate-500 text-base sm:text-lg font-medium">
                            밴쿠버지구촌교회 성도 관리 시스템
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-500 uppercase ml-1 tracking-wider">Admin ID</label>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                    <User className="w-6 h-6" />
                                </div>
                                <input 
                                    type="text" 
                                    value={id}
                                    onChange={(e) => setId(e.target.value)}
                                    className="w-full pl-14 pr-5 py-4 sm:py-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-brand-100 focus:border-brand-400 outline-none transition-all text-slate-800 text-lg font-bold placeholder-slate-400"
                                    placeholder="아이디를 입력하세요"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-500 uppercase ml-1 tracking-wider">Password</label>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                    <Key className="w-6 h-6" />
                                </div>
                                <input 
                                    type="password" 
                                    value={pw}
                                    onChange={(e) => setPw(e.target.value)}
                                    className="w-full pl-14 pr-5 py-4 sm:py-5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-brand-100 focus:border-brand-400 outline-none transition-all text-slate-800 text-lg font-bold placeholder-slate-400"
                                    placeholder="비밀번호를 입력하세요"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 text-sm sm:text-base rounded-2xl font-bold animate-in slide-in-from-top-2 border border-red-100">
                                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 sm:py-5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white text-lg font-black rounded-2xl shadow-xl shadow-brand-200 hover:shadow-2xl hover:shadow-brand-300 transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3 mt-6 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
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

                    <div className="mt-8 sm:mt-10 flex justify-center">
                         <button 
                            onClick={() => {
                                setIsAdminModalOpen(true);
                                setIsMasterAuthenticated(false);
                                setMasterAuth('');
                            }}
                            className="px-5 py-2.5 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white font-bold rounded-xl transition-all text-sm flex items-center gap-2 border border-slate-700/50 hover:border-slate-600 backdrop-blur-sm"
                         >
                            <Settings className="w-4 h-4" /> Admin Management
                         </button>
                    </div>
                </div>
                
                {/* Footer with extra padding for mobile scrolling */}
                <div className="text-center mt-8 pb-12 sm:pb-0 opacity-60">
                    <p className="text-xs sm:text-sm text-white/80 font-medium tracking-wide">© 2024 VGMC Connect. All rights reserved.</p>
                </div>
            </div>
        </div>
      </div>

      {/* Admin Management Modal - Increased Size */}
      {isAdminModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-8 relative ring-1 ring-white/20 my-auto">
                  <button onClick={() => setIsAdminModalOpen(false)} className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-6 h-6"/></button>
                  
                  <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                      <ShieldAlert className="w-6 h-6 text-brand-600" /> Admin Management
                  </h3>

                  {!isMasterAuthenticated ? (
                      <div className="space-y-5">
                          <p className="text-base text-slate-500 font-medium leading-relaxed">Please enter the Master Password to access administrative controls.</p>
                          <input 
                            type="password" 
                            value={masterAuth} 
                            onChange={(e) => setMasterAuth(e.target.value)} 
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-100 focus:border-brand-500 outline-none text-slate-800 text-lg font-bold"
                            placeholder="Master Password"
                            autoFocus
                          />
                          <button onClick={handleMasterAuth} className="w-full py-4 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-900 transition-colors shadow-lg text-lg">
                              Verify Access
                          </button>
                      </div>
                  ) : (
                      <div className="space-y-6">
                          <div className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Current Admins</h4>
                              {storedAdmins.length === 0 ? <div className="p-4 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200 text-slate-400 font-medium">No sub-admins added yet.</div> : (
                                  storedAdmins.map((admin) => (
                                      <div key={admin.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-brand-200 transition-colors group">
                                          <div>
                                              <div className="font-bold text-base text-slate-800">{admin.id}</div>
                                              <div className="text-xs text-slate-500 font-medium">{admin.note || 'No description'}</div>
                                          </div>
                                          <button onClick={() => handleDeleteAdmin(admin.id)} className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-5 h-5"/></button>
                                      </div>
                                  ))
                              )}
                          </div>

                          <div className="pt-6 border-t border-slate-100 space-y-4">
                               <h4 className="text-xs font-extrabold text-brand-600 uppercase tracking-widest">Add New Admin</h4>
                               <div className="space-y-3">
                                   <input value={newAdminId} onChange={e => setNewAdminId(e.target.value)} placeholder="New Admin ID" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-base font-medium focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"/>
                                   <input value={newAdminPw} onChange={e => setNewAdminPw(e.target.value)} placeholder="Password" type="password" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-base font-medium focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"/>
                                   <input value={newAdminNote} onChange={e => setNewAdminNote(e.target.value)} placeholder="Note (e.g. Finance Team)" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-base font-medium focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"/>
                               </div>
                               <button onClick={handleAddAdmin} disabled={!newAdminId || !newAdminPw} className="w-full py-3 bg-brand-50 text-brand-700 font-bold rounded-xl hover:bg-brand-100 flex items-center justify-center gap-2 border border-brand-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                   <Plus className="w-5 h-5"/> Add User
                               </button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default Login;
