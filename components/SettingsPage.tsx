import { useState, useEffect, useMemo } from 'react'; 
import { supabase } from '../lib/supabase';
import { 
  Plus, 
  Trash2, 
  Settings, 
  LayoutGrid,
  Info,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Check,
  X,
  Users,
  Shield,
  Mail,
  User,
  Clock,
  Home,
  Briefcase,
  Eye,
  ShieldCheck,
  Lock,
  Edit
} from 'lucide-react';

type Chowon = {
  id: string;
  name: string;
  pastor: string;
  leader: string;
  order: number;
};

type ParentList = {
  id: string;
  type: string;
  name: string;
  order: number;
};

type ChildList = {
  id: string;
  parent_id: string;
  name: string;
  order: number;
  bg_color?: string;
  text_color?: string;
  chowon_id?: string | null;
  mokja_id?: string | null;
  moknyeo_id?: string | null;
};

type Profile = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'general' | 'user' | 'viewer'; // general 추가
  created_at: string;
};

type Member = any;

type SettingsPageProps = {
  parentLists: ParentList[];
  childLists: ChildList[];
  members: Member[];
  onUpdate: () => void;
};

export default function SettingsPage({ parentLists, childLists, members, onUpdate }: SettingsPageProps) {
  /* ================= 1. 목자/목녀 후보군 로직 ================= */
  const mokjaCandidates = useMemo(() => {
    return members
      .filter(m => m.tags?.some((tag: string) => tag === '목자'))
      .sort((a, b) => (a.korean_name || '').localeCompare(b.korean_name || '', 'ko'));
  }, [members]);

  const moknyeoCandidates = useMemo(() => {
    return members
      .filter(m => m.tags?.some((tag: string) => tag === '목녀'))
      .sort((a, b) => (a.korean_name || '').localeCompare(b.korean_name || '', 'ko'));
  }, [members]);

  const handleUpdateShepherd = async (childId: string, field: 'mokja_id' | 'moknyeo_id', memberId: string | null) => {
    const { error } = await supabase.from('child_lists').update({ [field]: memberId }).eq('id', childId);
    if (!error) onUpdate();
  };

  /* ================= 2. 상태 관리 ================= */
  const [activeTab, setActiveTab] = useState<'system' | 'users' | 'chowon' | 'roles'>('system'); 
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  
  const [chowonLists, setChowonLists] = useState<Chowon[]>([]); 
  const [isAddingChowon, setIsAddingChowon] = useState(false);
  const [newChowon, setNewChowon] = useState({ name: '', pastor: '', leader: '' });
  const [editingChowonId, setEditingChowonId] = useState<string | null>(null);
  const [editChowonData, setEditChowonData] = useState({ name: '', pastor: '', leader: '' });

  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'general' | 'user' | 'viewer'>('user');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileEmail, setEditProfileEmail] = useState('');

  const primaryColor = '#3c8fb5';

  /* ================= 3. 데이터 로딩 ================= */
  useEffect(() => {
    if (activeTab === 'users') fetchProfiles();
    else if (activeTab === 'chowon' || activeTab === 'system') fetchChowons();
  }, [activeTab]);

  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setProfiles(data as Profile[]);
    } catch (err) { console.error(err); } finally { setLoadingProfiles(false); }
  };

  const fetchChowons = async () => {
    try {
      const { data, error } = await supabase.from('chowon_lists').select('*').order('order');
      if (error) throw error;
      if (data) setChowonLists(data);
    } catch (err) { console.error(err); }
  };

  /* ================= 4. 핸들러 (초원, 사용자, 시스템) ================= */
  const handleAddChowon = async () => {
    if (!newChowon.name.trim()) return;
    const maxOrder = Math.max(...chowonLists.map(c => c.order), 0);
    const { error } = await supabase.from('chowon_lists').insert({ ...newChowon, order: maxOrder + 1 });
    if (!error) { setIsAddingChowon(false); setNewChowon({ name: '', pastor: '', leader: '' }); fetchChowons(); }
  };

  const handleUpdateChowon = async (id: string) => {
    const { error } = await supabase.from('chowon_lists').update(editChowonData).eq('id', id);
    if (!error) { setEditingChowonId(null); fetchChowons(); }
  };

  const handleDeleteChowon = async (id: string) => {
    if (confirm('초원을 삭제하시겠습니까?')) {
      await supabase.from('chowon_lists').delete().eq('id', id);
      fetchChowons();
    }
  };

  const handleUpdateRole = async (profileId: string, newRole: any) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', profileId);
    if (!error) setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRole } : p));
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (confirm('사용자를 삭제하시겠습니까?')) {
      await supabase.from('profiles').delete().eq('id', profileId);
      setProfiles(prev => prev.filter(p => p.id !== profileId));
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail.trim() || !newUserName.trim()) return;
    const newId = crypto.randomUUID();
    const newProfile = { id: newId, email: newUserEmail.trim(), name: newUserName.trim(), role: newUserRole, created_at: new Date().toISOString() };
    const { error } = await supabase.from('profiles').insert(newProfile);
    if (!error) { fetchProfiles(); setIsAddingUser(false); setNewUserEmail(''); setNewUserName(''); }
  };

  const handleUpdateProfile = async (profileId: string) => {
    const { error } = await supabase.from('profiles').update({ name: editProfileName.trim(), email: editProfileEmail.trim() }).eq('id', profileId);
    if (!error) { fetchProfiles(); setEditingProfileId(null); }
  };

  // 시스템 리스트 관련 핸들러들
  const [isAddingParent, setIsAddingParent] = useState(false);
  const [newParentName, setNewParentName] = useState('');
  const [newParentType, setNewParentType] = useState('');
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [editParentName, setEditParentName] = useState('');
  const [editParentType, setEditParentType] = useState('');
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editChildName, setEditChildName] = useState('');

  const toggleParent = (parentId: string) => setExpandedParents(prev => ({ ...prev, [parentId]: !prev[parentId] }));

  const handleAddParent = async () => {
    if (!newParentName.trim() || !newParentType.trim()) return;
    const maxOrder = Math.max(...parentLists.map(p => p.order), 0);
    const { error } = await supabase.from('parent_lists').insert({ type: newParentType.toLowerCase(), name: newParentName, order: maxOrder + 1 });
    if (!error) { setNewParentName(''); setNewParentType(''); setIsAddingParent(false); onUpdate(); }
  };

  const handleUpdateParent = async (id: string) => {
    await supabase.from('parent_lists').update({ name: editParentName, type: editParentType.toLowerCase() }).eq('id', id);
    setEditingParentId(null); onUpdate();
  };

  const handleUpdateChild = async (id: string) => {
    if (!editChildName.trim()) return;
    const oldChild = childLists.find(c => c.id === id);
    if (!oldChild) return;
    const { error } = await supabase.from('child_lists').update({ name: editChildName.trim() }).eq('id', id);
    if (!error) {
      const parent = parentLists.find(p => p.id === oldChild.parent_id);
      if (parent?.type === 'mokjang' || parent?.name.includes('목장')) {
        await supabase.from('members').update({ mokjang: editChildName.trim() }).eq('mokjang', oldChild.name);
      }
      setEditingChildId(null); onUpdate();
    }
  };

  const handleDeleteChild = async (id: string) => {
    if (confirm('삭제하시겠습니까?')) { await supabase.from('child_lists').delete().eq('id', id); onUpdate(); }
  };

  const handleDeleteParent = async (id: string) => {
    if (confirm('하위 항목 포함 모두 삭제하시겠습니까?')) {
      await supabase.from('child_lists').delete().eq('parent_id', id);
      await supabase.from('parent_lists').delete().eq('id', id);
      onUpdate();
    }
  };

  const handleLinkMokjangToChowon = async (childId: string, chowonId: string | null) => {
    await supabase.from('child_lists').update({ chowon_id: chowonId }).eq('id', childId);
    onUpdate();
  };

  if (parentLists.length === 0) return <div className="h-full flex items-center justify-center text-slate-400">Loading...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div style={{ backgroundColor: primaryColor }} className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Settings</h1>
            <p className="text-sm text-slate-500 font-medium">시스템 구성 및 사용자 권한 관리</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1.5 bg-slate-100 rounded-2xl w-fit flex-wrap">
          <button onClick={() => setActiveTab('system')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'system' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><LayoutGrid size={16}/> System</button>
          <button onClick={() => setActiveTab('chowon')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'chowon' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Shield size={16}/> Chowon</button>
          <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'users' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Users size={16}/> Users</button>
          <button onClick={() => setActiveTab('roles')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'roles' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><ShieldCheck size={16}/> Roles</button>
        </div>
      </div>

      {/* 1. System Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><Info className="text-blue-500" size={20} /></div>
              <div><h3 className="font-black text-slate-800">카테고리 설정</h3><p className="text-xs text-slate-500 font-medium">직분, 목장, 상태, 태그 등의 리스트를 관리합니다.</p></div>
            </div>
            <button onClick={() => setIsAddingParent(true)} style={{ backgroundColor: primaryColor }} className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl shadow-md font-bold text-sm"><Plus size={16} /> 카테고리 추가</button>
          </div>

          {isAddingParent && (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" value={newParentType} onChange={e => setNewParentType(e.target.value)} placeholder="내부 타입 (예: cell)" className="px-4 py-2 rounded-xl border border-slate-200 text-sm" />
                <input type="text" value={newParentName} onChange={e => setNewParentName(e.target.value)} placeholder="표시 이름 (예: 목장)" className="px-4 py-2 rounded-xl border border-slate-200 text-sm" />
              </div>
              <div className="flex gap-3"><button onClick={handleAddParent} style={{ backgroundColor: primaryColor }} className="flex-1 py-2 text-white rounded-xl font-bold">저장</button><button onClick={() => setIsAddingParent(false)} className="flex-1 py-2 bg-white text-slate-500 rounded-xl border font-bold">취소</button></div>
            </div>
          )}

          <div className="space-y-3">
            {parentLists.map(parent => {
              const isExpanded = expandedParents[parent.id];
              const children = childLists.filter(c => c.parent_id === parent.id).sort((a, b) => a.order - b.order);
              const isMokjangType = parent.type === 'mokjang' || parent.name.includes('목장');

              return (
                <div key={parent.id} className={`bg-white rounded-3xl border transition-all overflow-hidden ${isExpanded ? 'border-blue-200 shadow-xl' : 'border-slate-100 hover:border-slate-200 shadow-sm'}`}>
                  <div className={`px-6 py-4 flex items-center justify-between group cursor-pointer ${isExpanded ? 'bg-blue-50/30' : ''}`} onClick={() => toggleParent(parent.id)}>
                    <div className="flex items-center gap-4 flex-1">
                      <GripVertical className="text-slate-300" size={16} />
                      {editingParentId === parent.id ? (
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <input autoFocus value={editParentName} onChange={e => setEditParentName(e.target.value)} className="px-3 py-1 rounded-xl border border-blue-400 text-sm" />
                          <button onClick={() => handleUpdateParent(parent.id)} className="p-2 bg-blue-500 text-white rounded-xl"><Check size={14}/></button>
                        </div>
                      ) : (
                        <div onDoubleClick={(e) => { e.stopPropagation(); setEditingParentId(parent.id); setEditParentName(parent.name); setEditParentType(parent.type); }} className="flex items-center gap-3">
                          <span className="text-lg font-black text-slate-700">{parent.name}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-lg font-black uppercase">{parent.type}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={e => { e.stopPropagation(); handleDeleteParent(parent.id); }} className="p-2 opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                      {isExpanded ? <ChevronDown className="text-blue-500" /> : <ChevronRight className="text-slate-300" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-8 py-6 bg-white border-t border-slate-50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {children.map(child => (
                          <div key={child.id} onDoubleClick={() => { setEditingChildId(child.id); setEditChildName(child.name); }} className="px-4 py-3 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all group bg-slate-50/40">
                            <div className="flex items-center justify-between mb-1">
                              {editingChildId === child.id ? (
                                <input autoFocus value={editChildName} onChange={e => setEditChildName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUpdateChild(child.id)} className="w-full px-2 py-1 rounded border border-blue-400 text-xs font-bold" />
                              ) : (
                                <span className="text-sm font-bold text-slate-700">{child.name}</span>
                              )}
                              <button onClick={() => handleDeleteChild(child.id)} className="p-1 opacity-0 group-hover:opacity-100 text-red-400 transition-all"><Trash2 size={14}/></button>
                            </div>
                            {isMokjangType && (
                              <div className="space-y-1.5 mt-2 border-t border-slate-100 pt-2" onClick={e => e.stopPropagation()}>
                                <select value={child.chowon_id || ''} onChange={e => handleLinkMokjangToChowon(child.id, e.target.value || null)} className="w-full text-[10px] bg-white border-slate-200 rounded px-1 py-0.5 font-bold text-indigo-600">
                                  <option value="">초원 미지정</option>
                                  {chowonLists.map(cw => <option key={cw.id} value={cw.id}>{cw.name}</option>)}
                                </select>
                                <div className="flex items-center gap-1.5"><span className="text-[9px] font-bold text-slate-400 w-6">목자</span>
                                  <select value={child.mokja_id || ''} onChange={e => handleUpdateShepherd(child.id, 'mokja_id', e.target.value || null)} className="flex-1 text-[10px] bg-white border-slate-200 rounded px-1 font-bold text-blue-600">
                                    <option value="">선택</option>{mokjaCandidates.map(m => <option key={m.id} value={m.id}>{m.korean_name}</option>)}
                                  </select>
                                </div>
                                <div className="flex items-center gap-1.5"><span className="text-[9px] font-bold text-slate-400 w-6">목녀</span>
                                  <select value={child.moknyeo_id || ''} onChange={e => handleUpdateShepherd(child.id, 'moknyeo_id', e.target.value || null)} className="flex-1 text-[10px] bg-white border-slate-200 rounded px-1 font-bold text-rose-600">
                                    <option value="">선택</option>{moknyeoCandidates.map(m => <option key={m.id} value={m.id}>{m.korean_name}</option>)}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        <button onClick={async () => { const n = prompt('이름:'); if(n) { const max = Math.max(...children.map(c=>c.order), 0); await supabase.from('child_lists').insert({parent_id:parent.id, name:n, order:max+1}); onUpdate(); } }} className="px-4 py-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-300 text-slate-400 font-bold text-xs flex items-center justify-center gap-2"><Plus size={14}/> 항목 추가</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Chowon Tab */}
      {activeTab === 'chowon' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center"><Shield className="text-indigo-500" size={24}/></div>
                <div><h3 className="text-xl font-black text-slate-800">초원 관리</h3><p className="text-sm text-slate-500 font-medium">초원 그룹과 담당 교역자/초원지기를 설정합니다.</p></div>
              </div>
              <button onClick={() => setIsAddingChowon(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white rounded-xl shadow-md font-bold text-sm hover:bg-indigo-600 transition-all"><Plus size={16}/> 초원 추가</button>
            </div>

            {isAddingChowon && (
              <div className="p-6 bg-indigo-50/50 rounded-[2rem] border border-indigo-100 space-y-4 animate-in zoom-in-95">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" placeholder="초원 이름" className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white" value={newChowon.name} onChange={e => setNewChowon({...newChowon, name: e.target.value})} />
                  <input type="text" placeholder="담당 교역자" className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white" value={newChowon.pastor} onChange={e => setNewChowon({...newChowon, pastor: e.target.value})} />
                  <input type="text" placeholder="초원지기" className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white" value={newChowon.leader} onChange={e => setNewChowon({...newChowon, leader: e.target.value})} />
                </div>
                <div className="flex gap-3"><button onClick={handleAddChowon} className="flex-1 py-3 bg-indigo-500 text-white rounded-xl font-black">저장</button><button onClick={() => setIsAddingChowon(false)} className="flex-1 py-3 bg-white text-slate-500 rounded-xl border font-black">취소</button></div>
              </div>
            )}

            <div className="overflow-hidden rounded-3xl border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-slate-50/50 border-b"><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">초원명</th><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">교역자</th><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">초원지기</th><th className="px-6 py-4 text-right"></th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {chowonLists.map(cw => (
                    <tr key={cw.id} className="hover:bg-slate-50/30 group transition-colors">
                      <td className="px-6 py-5">{editingChowonId === cw.id ? <input autoFocus className="px-2 py-1 rounded border border-indigo-400 text-sm font-bold" value={editChowonData.name} onChange={e=>setEditChowonData({...editChowonData, name:e.target.value})} /> : <span className="font-bold text-slate-800">{cw.name}</span>}</td>
                      <td className="px-6 py-5 text-sm text-slate-600">{editingChowonId === cw.id ? <input className="px-2 py-1 rounded border border-indigo-400 text-sm" value={editChowonData.pastor} onChange={e=>setEditChowonData({...editChowonData, pastor:e.target.value})} /> : cw.pastor || '-'}</td>
                      <td className="px-6 py-5 text-sm text-slate-600">{editingChowonId === cw.id ? <input className="px-2 py-1 rounded border border-indigo-400 text-sm" value={editChowonData.leader} onChange={e=>setEditChowonData({...editChowonData, leader:e.target.value})} /> : cw.leader || '-'}</td>
                      <td className="px-6 py-5 text-right"><div className="flex justify-end gap-2">{editingChowonId === cw.id ? <button onClick={()=>handleUpdateChowon(cw.id)} className="p-2 text-indigo-600"><Check/></button> : <button onClick={()=>{setEditingChowonId(cw.id); setEditChowonData({name:cw.name, pastor:cw.pastor, leader:cw.leader});}} className="p-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-all"><Settings size={18}/></button>}<button onClick={()=>handleDeleteChowon(cw.id)} className="p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center"><Shield className="text-emerald-500" size={24}/></div>
                <div><h3 className="text-xl font-black text-slate-800">사용자 계정 권한</h3><p className="text-sm text-slate-500 font-medium">관리자 및 일반 사용자의 접근 권한을 관리합니다.</p></div>
              </div>
              <button onClick={() => setIsAddingUser(true)} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl shadow-md font-bold text-sm hover:bg-emerald-600 transition-all"><Plus size={16}/> 사용자 추가</button>
            </div>

            {isAddingUser && (
              <div className="p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100 space-y-4 animate-in zoom-in-95">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="이름" className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white" />
                  <input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="이메일" className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white" />
                  <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as any)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-bold">
                    <option value="admin">Admin (전체)</option>
                    <option value="general">General (매니저)</option>
                    <option value="user">User (조회)</option>
                    <option value="viewer">Viewer (대기)</option>
                  </select>
                </div>
                <div className="flex gap-3"><button onClick={handleAddUser} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-black">프로필 생성</button><button onClick={() => setIsAddingUser(false)} className="flex-1 py-3 bg-white text-slate-500 rounded-xl border font-black">취소</button></div>
              </div>
            )}

            {loadingProfiles ? <div className="py-20 text-center animate-pulse font-black text-slate-300">데이터를 불러오는 중...</div> : (
              <div className="overflow-hidden rounded-3xl border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-slate-50/50 border-b"><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">사용자 정보</th><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">권한 설정</th><th className="px-6 py-4 text-right"></th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {profiles.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/30 group transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400"><User size={20}/></div>
                            <div>
                              {editingProfileId === p.id ? (
                                <div className="space-y-2">
                                  <input autoFocus value={editProfileName} onChange={e=>setEditProfileName(e.target.value)} className="px-2 py-1 rounded border border-blue-400 text-sm font-bold" />
                                  <input value={editProfileEmail} onChange={e=>setEditProfileEmail(e.target.value)} className="px-2 py-1 rounded border border-blue-400 text-xs block" />
                                  <div className="flex gap-2"><button onClick={()=>handleUpdateProfile(p.id)} className="text-[10px] font-bold bg-blue-500 text-white px-2 py-1 rounded">Save</button><button onClick={()=>setEditingProfileId(null)} className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded">Cancel</button></div>
                                </div>
                              ) : (
                                <div onDoubleClick={()=>{setEditingProfileId(p.id); setEditProfileName(p.name||''); setEditProfileEmail(p.email||'');}}>
                                  <div className="font-bold text-slate-800">{p.name || 'No Name'}</div>
                                  <div className="text-xs text-slate-400 flex items-center gap-1"><Mail size={12}/>{p.email}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <select value={p.role} onChange={e => handleUpdateRole(p.id, e.target.value)} className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase border-none focus:ring-2 focus:ring-blue-100 cursor-pointer ${p.role === 'admin' ? 'bg-blue-100 text-blue-700' : p.role === 'general' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                            <option value="admin">Admin</option>
                            <option value="general">General</option>
                            <option value="user">User</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </td>
                        <td className="px-6 py-5 text-right"><div className="flex justify-end gap-2"><button onClick={()=>{setEditingProfileId(p.id); setEditProfileName(p.name||''); setEditProfileEmail(p.email||'');}} className="p-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-all"><Settings size={18}/></button><button onClick={()=>handleDeleteProfile(p.id)} className="p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Roles Tab (New) */}
      {activeTab === 'roles' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center"><ShieldCheck className="text-orange-500" size={24}/></div>
              <div><h3 className="text-xl font-black text-slate-800">사용자 권한(Roles) 가이드</h3><p className="text-sm text-slate-500 font-medium">각 권한별 사용 가능한 기능을 확인합니다.</p></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Admin */}
              <div className="p-6 rounded-[2rem] bg-blue-50/50 border border-blue-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-black text-blue-700 text-lg">Admin</div>
                  <Lock size={18} className="text-blue-300" />
                </div>
                <div className="text-xs font-bold text-slate-500 leading-relaxed">최고 관리자 권한입니다. 시스템의 모든 설정과 데이터를 관리할 수 있습니다.</div>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-xs font-bold text-slate-600"><Check size={14} className="text-blue-500"/> 모든 성도 검색/조회</li>
                  <li className="flex items-center gap-2 text-xs font-bold text-slate-600"><Check size={14} className="text-blue-500"/> 성도 추가/수정/삭제</li>
                  <li className="flex items-center gap-2 text-xs font-bold text-slate-600"><Check size={14} className="text-blue-500"/> 기도/메모 로그 열람/수정</li>
                  <li className="flex items-center gap-2 text-xs font-bold text-slate-600"><Check size={14} className="text-blue-500"/> 시스템 리스트 및 초원 설정</li>
                </ul>
              </div>

              {/* General */}
              <div className="p-6 rounded-[2rem] bg-indigo-50/50 border border-indigo-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-black text-indigo-700 text-lg">General</div>
                  <Edit size={18} className="text-indigo-300" />
                </div>
                <div className="text-xs font-bold text-slate-500 leading-relaxed">매니저 권한입니다. 목장 배정과 성도 기본 정보 관리에 집중된 권한입니다.</div>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-xs font-bold text-slate-600"><Check size={14} className="text-indigo-500"/> 목장 조직도 배정 (첫 화면)</li>
                  <li className="flex items-center gap-2 text-xs font-bold text-slate-600"><Check size={14} className="text-indigo-500"/> 성도 추가 및 기본 프로필 수정</li>
                  <li className="flex items-center gap-2 text-xs font-bold text-slate-600"><X size={14} className="text-red-400"/> 상단 통합 검색 바 이용 불가</li>
                  <li className="flex items-center gap-2 text-xs font-bold text-slate-600"><X size={14} className="text-red-400"/> 기도/상담 메모 로그 접근 불가</li>
                </ul>
              </div>

              {/* User */}
              <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-black text-slate-700 text-lg">User / Viewer</div>
                  <Eye size={18} className="text-slate-300" />
                </div>
                <div className="text-xs font-bold text-slate-500 leading-relaxed">조회 권한입니다. 성도 정보와 조직도 현황을 열람만 할 수 있습니다.</div>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-xs font-bold text-slate-600"><Check size={14} className="text-slate-400"/> 전교인 명단 및 조직도 조회</li>
                  <li className="flex items-center gap-2 text-xs font-bold text-slate-600"><Check size={14} className="text-slate-400"/> 생일 및 등록교인 현황 확인</li>
                  <li className="flex items-center gap-2 text-xs font-bold text-slate-600"><X size={14} className="text-red-400"/> 데이터 추가/수정/삭제 불가</li>
                  <li className="flex items-center gap-2 text-xs font-bold text-slate-600"><X size={14} className="text-red-400"/> 기도/상담 메모 로그 접근 불가</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
