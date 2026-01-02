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

            <div className="mt-8 flex justify-center">
                 <button 
                    onClick={() => {
                        setIsAdminModalOpen(true);
                        setIsMasterAuthenticated(false);
                        setMasterAuth('');
                    }}
                    className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white font-bold rounded-lg transition-all text-xs flex items-center gap-2 border border-slate-700/50 hover:border-slate-600"
                 >
                    <Settings className="w-3 h-3" /> Admin Management
                 </button>
            </div>
        </div>
        
        <div className="text-center mt-6 opacity-60">
            <p className="text-xs text-white/80 font-medium">© 2024 VGMC Connect. All rights reserved.</p>
        </div>
      </div>

      {/* Admin Management Modal */}
      {isAdminModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 relative">
                  <button onClick={() => setIsAdminModalOpen(false)} className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                  
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-brand-600" /> Admin Management
                  </h3>

                  {!isMasterAuthenticated ? (
                      <div className="space-y-4">
                          <p className="text-sm text-slate-500">Enter Master Password to manage admins.</p>
                          <input 
                            type="password" 
                            value={masterAuth} 
                            onChange={(e) => setMasterAuth(e.target.value)} 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-800"
                            placeholder="Master Password"
                          />
                          <button onClick={handleMasterAuth} className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors">
                              Verify Access
                          </button>
                      </div>
                  ) : (
                      <div className="space-y-6">
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-hide">
                              <h4 className="text-xs font-bold text-slate-400 uppercase">Current Admins</h4>
                              {storedAdmins.length === 0 ? <p className="text-sm text-slate-400 italic">No sub-admins added.</p> : (
                                  storedAdmins.map((admin) => (
                                      <div key={admin.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                          <div>
                                              <div className="font-bold text-sm text-slate-700">{admin.id}</div>
                                              <div className="text-xs text-slate-400">{admin.note || 'No description'}</div>
                                          </div>
                                          <button onClick={() => handleDeleteAdmin(admin.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4"/></button>
                                      </div>
                                  ))
                              )}
                          </div>

                          <div className="pt-4 border-t border-slate-100 space-y-3">
                               <h4 className="text-xs font-bold text-brand-600 uppercase">Add New Admin</h4>
                               <input value={newAdminId} onChange={e => setNewAdminId(e.target.value)} placeholder="New ID" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-brand-500 outline-none"/>
                               <input value={newAdminPw} onChange={e => setNewAdminPw(e.target.value)} placeholder="New Password" type="password" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-brand-500 outline-none"/>
                               <input value={newAdminNote} onChange={e => setNewAdminNote(e.target.value)} placeholder="Note (e.g. Finance Team)" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-brand-500 outline-none"/>
                               <button onClick={handleAddAdmin} className="w-full py-2 bg-brand-50 text-brand-700 font-bold rounded-lg hover:bg-brand-100 flex items-center justify-center gap-2">
                                   <Plus className="w-4 h-4"/> Add User
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
