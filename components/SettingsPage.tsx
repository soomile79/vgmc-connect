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
  Briefcase
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
  chowon_id?: string | null; // 초원 연결을 위한 필드 추가
  mokja_id?: string | null;
  moknyeo_id?: string | null;
};

type Profile = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
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

     // 1. 목자 후보군 (태그 '목자' 포함 + 가나다순 정렬)
  const mokjaCandidates = useMemo(() => {
    return members
      .filter(m => m.tags?.some((tag: string) => tag === '목자'))
      .sort((a, b) => (a.korean_name || '').localeCompare(b.korean_name || '', 'ko'));
  }, [members]);

  // 2. 목녀 후보군 (태그 '목녀' 포함 + 가나다순 정렬)
  const moknyeoCandidates = useMemo(() => {
    return members
      .filter(m => m.tags?.some((tag: string) => tag === '목녀'))
      .sort((a, b) => (a.korean_name || '').localeCompare(b.korean_name || '', 'ko'));
  }, [members]);

  // 목자/목녀 배정 함수
  const handleUpdateShepherd = async (childId: string, field: 'mokja_id' | 'moknyeo_id', memberId: string | null) => {
    const { error } = await supabase.from('child_lists').update({ [field]: memberId }).eq('id', childId);
    if (!error) onUpdate();
  };

  // 탭 상태 확장
  const [activeTab, setActiveTab] = useState<'system' | 'users' | 'chowon'>('system');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  
  // 초원 관련 상태
  const [chowonLists, setChowonLists] = useState<Chowon[]>([]); 
  const [isAddingChowon, setIsAddingChowon] = useState(false);
  const [newChowon, setNewChowon] = useState({ name: '', pastor: '', leader: '' });
  const [editingChowonId, setEditingChowonId] = useState<string | null>(null);
  const [editChowonData, setEditChowonData] = useState({ name: '', pastor: '', leader: '' });

  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'viewer'>('user');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileEmail, setEditProfileEmail] = useState('');

  const primaryColor = '#3c8fb5';

  useEffect(() => {
    if (activeTab === 'users') {
      fetchProfiles();
    } else if (activeTab === 'chowon' || activeTab === 'system') {
      fetchChowons();
    }
  }, [activeTab]);

  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setProfiles(data);
    } catch (err) {
      console.error("Error fetching profiles:", err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const fetchChowons = async () => {
  try {
    const { data, error } = await supabase.from('chowon_lists').select('*').order('order');
    if (error) throw error;
    if (data) setChowonLists(data);
  } catch (err) {
    console.error("Error fetching chowons:", err);
  }
};

  const handleAddChowon = async () => {
    if (!newChowon.name.trim()) return;
    const maxOrder = Math.max(...chowonLists.map(c => c.order), 0);
    const { error } = await supabase.from('chowon_lists').insert({
      ...newChowon,
      order: maxOrder + 1
    });
    if (error) alert(error.message);
    else {
      setIsAddingChowon(false);
      setNewChowon({ name: '', pastor: '', leader: '' });
      fetchChowons();
    }
  };

  const handleUpdateChowon = async (id: string) => {
    const { error } = await supabase.from('chowon_lists').update(editChowonData).eq('id', id);
    if (error) alert(error.message);
    else {
      setEditingChowonId(null);
      fetchChowons();
    }
  };

  const handleDeleteChowon = async (id: string) => {
    if (!confirm('초원을 삭제하시겠습니까? 연결된 목장 정보는 유지되나 소속 초원은 없음으로 표시됩니다.')) return;
    const { error } = await supabase.from('chowon_lists').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchChowons();
  };

  const handleLinkMokjangToChowon = async (childId: string, chowonId: string | null) => {
    const { error } = await supabase.from('child_lists').update({ chowon_id: chowonId }).eq('id', childId);
    if (error) alert(error.message);
    else onUpdate();
  };

  const handleUpdateRole = async (profileId: string, newRole: 'admin' | 'user' | 'viewer') => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', profileId);
    if (error) alert(error.message);
    else setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRole } : p));
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('정말 이 사용자를 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', profileId);
    if (error) alert(error.message);
    else setProfiles(prev => prev.filter(p => p.id !== profileId));
  };

  const handleAddUser = async () => {
    if (!newUserEmail.trim() || !newUserName.trim()) { alert('이메일과 이름을 모두 입력해주세요.'); return; }
    const newId = crypto.randomUUID();
    const newProfile: Profile = { id: newId, email: newUserEmail.trim(), name: newUserName.trim(), role: newUserRole as any, created_at: new Date().toISOString() };
    setProfiles(prev => [newProfile, ...prev]);
    setIsAddingUser(false);
    setNewUserEmail('');
    setNewUserName('');
    const { error } = await supabase.from('profiles').insert(newProfile);
    if (error) { alert(error.message); fetchProfiles(); }
  };

  const handleUpdateProfile = async (profileId: string) => {
    if (!editProfileName.trim() || !editProfileEmail.trim()) return;
    const { error } = await supabase.from('profiles').update({ name: editProfileName.trim(), email: editProfileEmail.trim() }).eq('id', profileId);
    if (error) alert(error.message);
    else {
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, name: editProfileName.trim(), email: editProfileEmail.trim() } : p));
      setEditingProfileId(null);
    }
  };
  

  const [isAddingParent, setIsAddingParent] = useState(false);
  const [newParentName, setNewParentName] = useState('');
  const [newParentType, setNewParentType] = useState('');
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [editParentName, setEditParentName] = useState('');
  const [editParentType, setEditParentType] = useState('');
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editChildName, setEditChildName] = useState('');
  const [draggedItem, setDraggedItem] = useState<{ id: string; type: 'parent' | 'child'; parentId?: string } | null>(null);

  const toggleParent = (parentId: string) => {
    setExpandedParents(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  const handleAddParent = async () => {
    if (!newParentName.trim() || !newParentType.trim()) return;
    const maxOrder = Math.max(...parentLists.map((p) => p.order), 0);
    const { error } = await supabase.from('parent_lists').insert({ type: newParentType.trim().toLowerCase(), name: newParentName.trim(), order: maxOrder + 1 });
    if (error) alert(error.message);
    else { setNewParentName(''); setNewParentType(''); setIsAddingParent(false); onUpdate(); }
  };

  const handleUpdateParent = async (id: string) => {
    const { error } = await supabase.from('parent_lists').update({ name: editParentName.trim(), type: editParentType.trim().toLowerCase() }).eq('id', id);
    if (error) alert(error.message);
    setEditingParentId(null);
    onUpdate();
  };

  /* 🚀 [핵심 수정 부분] 목장 이름 변경 시 성도 정보 일괄 업데이트 로직 추가 */
  const handleUpdateChild = async (id: string) => {
    if (!editChildName.trim()) return;

    // 기존 목장 정보 확인
    const oldChild = childLists.find(c => c.id === id);
    if (!oldChild) return;

    const oldName = oldChild.name;
    const newName = editChildName.trim();
    const parent = parentLists.find(p => p.id === oldChild.parent_id);
    const isMokjang = parent?.type === 'mokjang' || parent?.name.includes('목장');

    // 1. 카테고리(child_lists) 이름 업데이트
    const { error: childUpdateError } = await supabase.from('child_lists').update({ name: newName }).eq('id', id);
    if (childUpdateError) { alert(childUpdateError.message); return; }

    // 2. 목장 타입이면서 이름이 변경된 경우 소속 성도들의 목장 필드도 일괄 업데이트
    if (isMokjang && oldName !== newName) {
      await supabase.from('members').update({ mokjang: newName }).eq('mokjang', oldName);
    }

    setEditingChildId(null);
    onUpdate();
  };

  const handleDragStart = (id: string, type: 'parent' | 'child', parentId?: string) => { setDraggedItem({ id, type, parentId }); };

  const handleDrop = async (targetId: string, type: 'parent' | 'child') => {
    if (!draggedItem || draggedItem.type !== type) return;
    if (draggedItem.id === targetId) return;
    if (type === 'parent') {
      const draggedIdx = parentLists.findIndex(p => p.id === draggedItem.id);
      const targetIdx = parentLists.findIndex(p => p.id === targetId);
      await supabase.from('parent_lists').update({ order: parentLists[targetIdx].order }).eq('id', draggedItem.id);
      await supabase.from('parent_lists').update({ order: parentLists[draggedIdx].order }).eq('id', targetId);
    } else {
      if (draggedItem.parentId !== childLists.find(c => c.id === targetId)?.parent_id) return;
      const draggedIdx = childLists.findIndex(c => c.id === draggedItem.id);
      const targetIdx = childLists.findIndex(c => c.id === targetId);
      await supabase.from('child_lists').update({ order: childLists[targetIdx].order }).eq('id', draggedItem.id);
      await supabase.from('child_lists').update({ order: childLists[draggedIdx].order }).eq('id', targetId);
    }
    setDraggedItem(null);
    onUpdate();
  };

  const handleDeleteChild = async (childId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const childToDelete = childLists.find(c => c.id === childId);
    if (!childToDelete) return;
    const { error: deleteError } = await supabase.from('child_lists').delete().eq('id', childId);
    if (deleteError) alert(deleteError.message);
    else onUpdate();
  };

  const handleDeleteParent = async (parentId: string) => {
    if (!confirm('정말 삭제하시겠습니까? 하위 항목도 모두 삭제됩니다.')) return;
    await supabase.from('child_lists').delete().eq('parent_id', parentId);
    const { error } = await supabase.from('parent_lists').delete().eq('id', parentId);
    if (error) alert(error.message);
    else onUpdate();
  };

  if (parentLists.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto mb-3"></div>
          <p className="text-sm font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-modal-in space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div style={{ backgroundColor: primaryColor }} className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Settings</h1>
            <p className="text-sm text-slate-500 font-medium">Manage organization structure and user permissions</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1.5 bg-slate-100 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'system' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <LayoutGrid className="w-4 h-4" /> System
          </button>
          <button 
            onClick={() => setActiveTab('chowon')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'chowon' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Shield className="w-4 h-4" /> Chowon
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'users' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Users className="w-4 h-4" /> Users
          </button>
        </div>
      </div>

      {/* 탭 내용 분기 */}
      {activeTab === 'system' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Info className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-black text-slate-800">Category Management</h3>
                <p className="text-xs text-slate-500 font-medium">Double-click to edit or assign Mokjang to Chowon</p>
              </div>
            </div>
            <button onClick={() => setIsAddingParent(true)} style={{ backgroundColor: primaryColor }} className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl hover:opacity-90 transition-all shadow-md font-bold text-sm">
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>

          {isAddingParent && (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" value={newParentType} onChange={(e) => setNewParentType(e.target.value)} placeholder="Internal Type" className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
                <input type="text" value={newParentName} onChange={(e) => setNewParentName(e.target.value)} placeholder="Display Name" className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
              </div>
              <div className="flex gap-3">
                <button onClick={handleAddParent} style={{ backgroundColor: primaryColor }} className="flex-1 py-2 text-white rounded-lg text-sm font-black shadow-sm">Save</button>
                <button onClick={() => setIsAddingParent(false)} className="flex-1 py-2 bg-white text-slate-500 rounded-lg text-sm font-black border border-slate-200">Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {parentLists.map((parent) => {
              const isExpanded = expandedParents[parent.id];
              const children = childLists.filter(c => c.parent_id === parent.id).sort((a, b) => (a.order || 0) - (b.order || 0));
              const isMokjangType = parent.type === 'mokjang' || parent.name.includes('목장');

              return (
                <div key={parent.id} className={`bg-white rounded-3xl border transition-all overflow-hidden ${isExpanded ? 'border-blue-200 shadow-lg shadow-blue-50' : 'border-slate-100 hover:border-slate-200 shadow-sm'}`}>
                  <div className={`px-6 py-4 flex items-center justify-between group cursor-pointer ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-slate-50/30'}`} onClick={() => toggleParent(parent.id)}>
                    <div className="flex items-center gap-4 flex-1">
                      <GripVertical className="w-4 h-4 text-slate-300" />
                      {editingParentId === parent.id ? (
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <input autoFocus value={editParentName} onChange={e => setEditParentName(e.target.value)} className="px-3 py-1.5 rounded-xl border border-blue-400 text-sm w-40" />
                          <button onClick={() => handleUpdateParent(parent.id)} style={{ backgroundColor: primaryColor }} className="p-2 text-white rounded-xl"><Check size={16} /></button>
                        </div>
                      ) : (
                        <div onDoubleClick={(e) => { e.stopPropagation(); setEditingParentId(parent.id); setEditParentName(parent.name); setEditParentType(parent.type); }} className="flex items-center gap-3">
                          <span className="text-lg font-black tracking-tight text-slate-700">{parent.name}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-lg font-black uppercase">{parent.type}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteParent(parent.id); }} className="p-2 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                      {isExpanded ? <ChevronDown className="w-6 h-6 text-blue-500" /> : <ChevronRight className="w-6 h-6 text-slate-300" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-8 py-6 bg-white border-t border-slate-50 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {children.map((child) => (
                          <div key={child.id} onDoubleClick={() => { setEditingChildId(child.id); setEditChildName(child.name); }} className={`px-4 py-3 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all group flex flex-col gap-2 cursor-pointer bg-slate-50/40`}>
                            <div className="flex items-center justify-between">
                              {editingChildId === child.id ? (
                                <input autoFocus value={editChildName} onChange={e => setEditChildName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUpdateChild(child.id)} className="w-full px-2 py-1 rounded border border-blue-400 text-xs font-bold" />
                              ) : (
                                <span className="text-sm font-bold text-slate-700">{child.name}</span>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteChild(child.id); }} className="p-1 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={3.5} className="text-red-400" /></button>
                            </div>
                             {isMokjangType && (
                              <div className="mt-2 space-y-2 border-t border-slate-100 pt-2" onClick={e => e.stopPropagation()}>
                              <select value={child.chowon_id || ''} onChange={(e) => handleLinkMokjangToChowon(child.id, e.target.value || null)} className="w-full text-[10px] bg-white border-slate-200 rounded px-1 py-0.5 font-bold text-indigo-600 outline-none">
                                 <option value="">초원 미지정</option>
                                {chowonLists.map(chowon => (<option key={chowon.id} value={chowon.id}>{chowon.name}</option>))}
                              </select>
                              <div className="flex items-center gap-2"><span className="text-[9px] font-bold text-slate-400 w-8">목자</span>
                                <select value={child.mokja_id || ''} onChange={(e) => handleUpdateShepherd(child.id, 'mokja_id', e.target.value || null)} className="flex-1 text-[10px] bg-white border-slate-200 rounded px-1 py-0.5 font-bold text-blue-600 outline-none">
                                  <option value="">선택</option>{mokjaCandidates.map(m => (<option key={m.id} value={m.id}>{m.korean_name}</option>))}
                                </select>
                              </div>
                              <div className="flex items-center gap-2"><span className="text-[9px] font-bold text-slate-400 w-8">목녀</span>
                                <select value={child.moknyeo_id || ''} onChange={(e) => handleUpdateShepherd(child.id, 'moknyeo_id', e.target.value || null)} className="flex-1 text-[10px] bg-white border-slate-200 rounded px-1 py-0.5 font-bold text-rose-600 outline-none">
                                  <option value="">선택</option>{moknyeoCandidates.map(m => (<option key={m.id} value={m.id}>{m.korean_name}</option>))}
                                </select>
                              </div>
                            </div>
                          )}
                         </div>
                        ))}
                        <button onClick={async () => { const name = prompt('New item name:'); if (!name) return; const maxOrder = Math.max(...children.map(c => c.order), 0); await supabase.from('child_lists').insert({ parent_id: parent.id, name, order: maxOrder + 1 }); onUpdate(); }} className="px-4 py-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-slate-400 font-bold text-sm"><Plus size={16} /> Add Item</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'chowon' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4"><div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center"><Shield className="w-6 h-6 text-indigo-500" /></div><div><h3 className="text-xl font-black text-slate-800">Chowon Management</h3><p className="text-sm text-slate-500 font-medium">Define plains and assign leaders</p></div></div>
              <button onClick={() => setIsAddingChowon(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-all shadow-md font-bold text-sm"><Plus className="w-4 h-4" /> Add Chowon</button>
            </div>
            {isAddingChowon && (
              <div className="p-6 bg-indigo-50/50 rounded-[2rem] border border-indigo-100 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" placeholder="Name" className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white" value={newChowon.name} onChange={e => setNewChowon({...newChowon, name: e.target.value})} />
                  <input type="text" placeholder="Pastor" className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white" value={newChowon.pastor} onChange={e => setNewChowon({...newChowon, pastor: e.target.value})} />
                  <input type="text" placeholder="Leader" className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white" value={newChowon.leader} onChange={e => setNewChowon({...newChowon, leader: e.target.value})} />
                </div>
                <div className="flex gap-3"><button onClick={handleAddChowon} className="flex-1 py-3 bg-indigo-500 text-white rounded-xl text-sm font-black shadow-lg">Create Chowon</button><button onClick={() => setIsAddingChowon(false)} className="flex-1 py-3 bg-white text-slate-500 rounded-xl text-sm font-black border border-slate-200">Cancel</button></div>
              </div>
            )}
            <div className="overflow-hidden rounded-3xl border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-slate-50/50 border-b border-slate-100"><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pastor</th><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Leader</th><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {chowonLists.map((chowon) => (
                    <tr key={chowon.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-6 py-5">{editingChowonId === chowon.id ? (<input autoFocus className="px-2 py-1 rounded border border-indigo-400 text-sm font-bold" value={editChowonData.name} onChange={e => setEditChowonData({...editChowonData, name: e.target.value})} />) : (<span className="font-bold text-slate-800">{chowon.name}</span>)}</td>
                      <td className="px-6 py-5 text-sm text-slate-600 font-medium">{editingChowonId === chowon.id ? (<input className="px-2 py-1 rounded border border-indigo-400 text-sm" value={editChowonData.pastor} onChange={e => setEditChowonData({...editChowonData, pastor: e.target.value})} />) : (chowon.pastor || '-')}</td>
                      <td className="px-6 py-5 text-sm text-slate-600 font-medium">{editingChowonId === chowon.id ? (<input className="px-2 py-1 rounded border border-indigo-400 text-sm" value={editChowonData.leader} onChange={e => setEditChowonData({...editChowonData, leader: e.target.value})} />) : (chowon.leader || '-')}</td>
                      <td className="px-6 py-5 text-right"><div className="flex items-center justify-end gap-2">{editingChowonId === chowon.id ? (<button onClick={() => handleUpdateChowon(chowon.id)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl"><Check size={18} /></button>) : (<button onClick={() => { setEditingChowonId(chowon.id); setEditChowonData({ name: chowon.name, pastor: chowon.pastor, leader: chowon.leader }); }} className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Settings size={18} /></button>)}<button onClick={() => handleDeleteChowon(chowon.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {chowonLists.length === 0 && <div className="py-20 text-center text-slate-400 font-bold">No chowon groups found.</div>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center"><Shield className="w-6 h-6 text-emerald-500" /></div><div><h3 className="text-xl font-black text-slate-800">User Group Management</h3><p className="text-sm text-slate-500 font-medium">Control access permissions</p></div></div><button onClick={() => setIsAddingUser(true)} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-md font-bold text-sm"><Plus className="w-4 h-4" /> Add User</button></div>
            {isAddingUser && (
              <div className="p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300"><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><input type="text" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Name" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white" /><input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white" /><select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as any)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-bold"><option value="user">User</option><option value="viewer">Viewer</option></select></div><div className="flex gap-3"><button onClick={handleAddUser} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-sm font-black">Create Profile</button><button onClick={() => setIsAddingUser(false)} className="flex-1 py-3 bg-white text-slate-500 rounded-xl text-sm font-black border border-slate-200">Cancel</button></div></div>
            )}
            {loadingProfiles ? (<div className="py-20 flex flex-col items-center justify-center text-slate-400"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4"></div><p className="font-bold">Fetching profiles...</p></div>) : (
              <div className="overflow-hidden rounded-3xl border border-slate-100"><table className="w-full text-left border-collapse"><thead><tr className="bg-slate-50/50 border-b border-slate-100"><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">User Info</th><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-50">
                  {profiles.map((profile) => (
                    <tr key={profile.id} className="hover:bg-slate-50/30 transition-colors group"><td className="px-6 py-5"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400"><User className="w-5 h-5" /></div><div>{editingProfileId === profile.id ? (<div className="space-y-2"><input autoFocus value={editProfileName} onChange={e => setEditProfileName(e.target.value)} className="w-full px-2 py-1 rounded border border-blue-400 text-sm font-bold" /><input value={editProfileEmail} onChange={e => setEditProfileEmail(e.target.value)} className="w-full px-2 py-1 rounded border border-blue-400 text-xs" /><div className="flex gap-2"><button onClick={() => handleUpdateProfile(profile.id)} className="px-2 py-1 bg-blue-500 text-white rounded text-[10px] font-bold">Save</button><button onClick={() => setEditingProfileId(null)} className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-[10px] font-bold">Cancel</button></div></div>) : (<div onDoubleClick={() => { setEditingProfileId(profile.id); setEditProfileName(profile.name || ''); setEditProfileEmail(profile.email || ''); }}><div className="font-bold text-slate-800">{profile.name || 'No Name'}</div><div className="text-xs text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" />{profile.email}</div></div>)}</div></div></td><td className="px-6 py-5"><select value={profile.role} onChange={(e) => handleUpdateRole(profile.id, e.target.value as any)} className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase border-none cursor-pointer ${profile.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}><option value="admin">Admin</option><option value="user">User</option><option value="viewer">Viewer</option></select></td><td className="px-6 py-5 text-right"><div className="flex items-center justify-end gap-2"><button onClick={() => { setEditingProfileId(profile.id); setEditProfileName(profile.name || ''); setEditProfileEmail(profile.email || ''); }} className="p-2 text-slate-400 hover:text-blue-400 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Settings size={18} /></button><button onClick={() => handleDeleteProfile(profile.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button></div></td></tr>
                  ))}
                </tbody></table></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
