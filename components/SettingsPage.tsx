import { useState, useEffect, useMemo } from 'react'; 
import { supabase } from '../lib/supabase';
import { 
  DndContext, 
  closestCenter, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

/* ================= 타입 정의 ================= */
type Chowon = { id: string; name: string; pastor: string; leader: string; order: number; };
type ParentList = { id: string; type: string; name: string; order: number; };
type ChildList = { id: string; parent_id: string; name: string; order: number; chowon_id?: string | null; mokja_id?: string | null; moknyeo_id?: string | null; };
type Profile = { id: string; email: string; name: string; role: 'admin' | 'general' | 'user' | 'viewer'; created_at: string; };

/* ================= 1. 드래그 가능한 카테고리(부모) 컴포넌트 ================= */
const SortableParentItem = ({ 
  parent, 
  isExpanded, 
  onToggle, 
  editingParentId, 
  editParentName, 
  setEditParentName, 
  handleUpdateParent, 
  handleDeleteParent, 
  setEditingParentId, 
  setEditParentType,
  children 
}: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: parent.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`bg-white rounded-3xl border transition-all overflow-hidden ${isExpanded ? 'border-blue-200 shadow-xl' : 'border-slate-100 hover:border-slate-200 shadow-sm'}`}>
      <div className={`px-6 py-4 flex items-center justify-between group ${isExpanded ? 'bg-blue-50/30' : ''}`}>
        <div className="flex items-center gap-4 flex-1">
          {/* 드래그 핸들: listeners를 여기에만 바인딩하여 텍스트 클릭 시 드래그 방지 */}
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-slate-100 rounded transition-colors">
            <GripVertical className="text-slate-300" size={16} />
          </div>
          
          {editingParentId === parent.id ? (
            <div className="flex items-center gap-2">
              <input autoFocus value={editParentName} onChange={e => setEditParentName(e.target.value)} className="px-3 py-1.5 rounded-xl border border-blue-400 text-sm w-40" />
              <button onClick={() => handleUpdateParent(parent.id)} className="p-2 bg-blue-500 text-white rounded-xl"><Check size={14}/></button>
            </div>
          ) : (
            <div 
              onDoubleClick={() => { setEditingParentId(parent.id); setEditParentName(parent.name); setEditParentType(parent.type); }} 
              onClick={() => onToggle(parent.id)}
              className="flex items-center gap-3 cursor-pointer select-none"
            >
              <span className="text-lg font-black text-slate-700">{parent.name}</span>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-lg font-black uppercase">{parent.type}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => handleDeleteParent(parent.id)} className="p-2 opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16}/></button>
          <div onClick={() => onToggle(parent.id)} className="cursor-pointer">
            {isExpanded ? <ChevronDown className="text-blue-500" /> : <ChevronRight className="text-slate-300" />}
          </div>
        </div>
      </div>
      {isExpanded && <div className="px-8 py-6 bg-white border-t border-slate-50">{children}</div>}
    </div>
  );
};

/* ================= 2. 메인 페이지 컴포넌트 ================= */
export default function SettingsPage({ parentLists, childLists, members, onUpdate }: any) {
  const [activeTab, setActiveTab] = useState<'system' | 'users' | 'chowon' | 'roles'>('system'); 
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [chowonLists, setChowonLists] = useState<Chowon[]>([]); 
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  // 시스템 설정용 임시 상태
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [editParentName, setEditParentName] = useState('');
  const [editParentType, setEditParentType] = useState('');
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editChildName, setEditChildName] = useState('');
  const [isAddingParent, setIsAddingParent] = useState(false);
  const [newParentName, setNewParentName] = useState('');
  const [newParentType, setNewParentType] = useState('');

  // 유저/초원용 기타 상태
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileEmail, setEditProfileEmail] = useState('');
  const [isAddingChowon, setIsAddingChowon] = useState(false);
  const [newChowon, setNewChowon] = useState({ name: '', pastor: '', leader: '' });
  const [editingChowonId, setEditingChowonId] = useState<string | null>(null);
  const [editChowonData, setEditChowonData] = useState({ name: '', pastor: '', leader: '' });

  const primaryColor = '#3c8fb5';
  
  // 드래그 센서 설정: distance를 주어 단순 클릭과 드래그를 구분함
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  /* ================= 데이터 로딩 ================= */
  useEffect(() => {
    if (activeTab === 'users') fetchProfiles();
    else if (activeTab === 'chowon' || activeTab === 'system') fetchChowons();
  }, [activeTab]);

  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setProfiles(data as Profile[]);
    setLoadingProfiles(false);
  };

  const fetchChowons = async () => {
    const { data } = await supabase.from('chowon_lists').select('*').order('order');
    if (data) setChowonLists(data);
  };

  /* ================= 순서 변경 로직 (Dnd-kit) ================= */
  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // 1. UI 즉시 반영을 위해 로컬 정렬
    const oldIndex = parentLists.findIndex((p: any) => p.id === active.id);
    const newIndex = parentLists.findIndex((p: any) => p.id === over.id);
    const newOrderedList = arrayMove(parentLists, oldIndex, newIndex);

    // 2. 전체 order 필드 업데이트 준비
    const updates = newOrderedList.map((item: any, index: number) => ({
      ...item,
      order: index + 1 
    }));

    // 🚀 Supabase upsert 일괄 저장
    const { error } = await supabase.from('parent_lists').upsert(updates);
    
    if (error) {
      console.error(error);
      alert("순서 저장에 실패했습니다.");
    } else {
      onUpdate(); // App.tsx의 상태 새로고침
    }
  };

  /* ================= 핸들러 모음 ================= */
  const handleUpdateRole = async (profileId: string, newRole: any) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', profileId);
    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRole } : p));
  };

  const handleUpdateParent = async (id: string) => {
    await supabase.from('parent_lists').update({ name: editParentName, type: editParentType.toLowerCase() }).eq('id', id);
    setEditingParentId(null); onUpdate();
  };

  const handleUpdateChild = async (id: string) => {
    const oldChild = childLists.find((c: any) => c.id === id);
    if (!oldChild) return;
    const { error } = await supabase.from('child_lists').update({ name: editChildName }).eq('id', id);
    if (!error) {
      const parent = parentLists.find((p: any) => p.id === oldChild.parent_id);
      if (parent?.type === 'mokjang' || parent?.name.includes('목장')) {
        await supabase.from('members').update({ mokjang: editChildName }).eq('mokjang', oldChild.name);
      }
      setEditingChildId(null); onUpdate();
    }
  };

  const toggleParent = (id: string) => setExpandedParents(prev => ({ ...prev, [id]: !prev[id] }));

  const mokjaCandidates = useMemo(() => members.filter((m: any) => m.tags?.includes('목자')).sort((a: any, b: any) => a.korean_name.localeCompare(b.korean_name, 'ko')), [members]);
  const moknyeoCandidates = useMemo(() => members.filter((m: any) => m.tags?.includes('목녀')).sort((a: any, b: any) => a.korean_name.localeCompare(b.korean_name, 'ko')), [members]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header & Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div style={{ backgroundColor: primaryColor }} className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div><h1 className="text-3xl font-black text-slate-800 tracking-tight">Settings</h1><p className="text-sm text-slate-500 font-medium">시스템 구성 및 사용자 권한 관리</p></div>
        </div>
        <div className="flex p-1.5 bg-slate-100 rounded-2xl w-fit flex-wrap">
          <button onClick={() => setActiveTab('system')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'system' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><LayoutGrid size={16}/> System</button>
          <button onClick={() => setActiveTab('chowon')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'chowon' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Shield size={16}/> Chowon</button>
          <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'users' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Users size={16}/> Users</button>
          <button onClick={() => setActiveTab('roles')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'roles' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><ShieldCheck size={16}/> Roles</button>
        </div>
      </div>

      {/* 1. System Tab: Category Management with Dnd-kit */}
      {activeTab === 'system' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><Info className="text-blue-500" size={20} /></div>
              <div><h3 className="font-black text-slate-800">카테고리 설정</h3><p className="text-xs text-slate-500 font-medium">항목의 핸들을 드래그하여 순서를 변경할 수 있습니다.</p></div>
            </div>
            <button onClick={() => setIsAddingParent(true)} style={{ backgroundColor: primaryColor }} className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl shadow-md font-bold text-sm hover:opacity-90 transition-all"><Plus size={16} /> 카테고리 추가</button>
          </div>

          {isAddingParent && (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" value={newParentType} onChange={e => setNewParentType(e.target.value)} placeholder="내부 타입 (예: cell)" className="px-4 py-2 rounded-xl border border-slate-200 text-sm bg-white" />
                <input type="text" value={newParentName} onChange={e => setNewParentName(e.target.value)} placeholder="표시 이름 (예: 목장)" className="px-4 py-2 rounded-xl border border-slate-200 text-sm bg-white" />
              </div>
              <div className="flex gap-3"><button onClick={() => { const max = Math.max(...parentLists.map((p:any)=>p.order), 0); supabase.from('parent_lists').insert({type:newParentType.toLowerCase(), name:newParentName, order:max+1}).then(()=>{setIsAddingParent(false); setNewParentName(''); setNewParentType(''); onUpdate();})}} style={{ backgroundColor: primaryColor }} className="flex-1 py-2 text-white rounded-xl font-bold">저장</button><button onClick={() => setIsAddingParent(false)} className="flex-1 py-2 bg-white text-slate-50 rounded-xl border">취소</button></div>
            </div>
          )}

          {/* 카테고리 드래그 앤 드롭 영역 */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={parentLists.map((p: any) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {parentLists.map((parent: any) => {
                  const children = childLists.filter((c: any) => c.parent_id === parent.id).sort((a: any, b: any) => a.order - b.order);
                  return (
                    <SortableParentItem 
                      key={parent.id} 
                      parent={parent} 
                      isExpanded={expandedParents[parent.id]} 
                      onToggle={toggleParent}
                      editingParentId={editingParentId}
                      editParentName={editParentName}
                      setEditParentName={setEditParentName}
                      handleUpdateParent={handleUpdateParent}
                      handleDeleteParent={(id: string) => { if(confirm('모든 하위 항목을 포함해 삭제하시겠습니까?')) { supabase.from('child_lists').delete().eq('parent_id', id).then(() => supabase.from('parent_lists').delete().eq('id', id)).then(onUpdate); } }}
                      setEditingParentId={setEditingParentId}
                      setEditParentType={setEditParentType}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {children.map((child: any) => (
                          <div key={child.id} onDoubleClick={() => { setEditingChildId(child.id); setEditChildName(child.name); }} className="px-4 py-3 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all group bg-slate-50/40">
                            <div className="flex items-center justify-between mb-1">
                              {editingChildId === child.id ? (
                                <input autoFocus value={editChildName} onChange={e => setEditChildName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUpdateChild(child.id)} className="w-full px-2 py-1 rounded border border-blue-400 text-xs font-bold" />
                              ) : (
                                <span className="text-sm font-bold text-slate-700">{child.name}</span>
                              )}
                              <button onClick={() => { if(confirm('항목을 삭제하시겠습니까?')) supabase.from('child_lists').delete().eq('id', child.id).then(onUpdate); }} className="p-1 opacity-0 group-hover:opacity-100 text-red-400"><Trash2 size={14}/></button>
                            </div>
                            { (parent.type === 'mokjang' || parent.name.includes('목장')) && (
                              <div className="space-y-1.5 mt-2 border-t border-slate-100 pt-2">
                                <select value={child.chowon_id || ''} onChange={e => { supabase.from('child_lists').update({ chowon_id: e.target.value || null }).eq('id', child.id).then(onUpdate); }} className="w-full text-[10px] bg-white border-slate-200 rounded px-1 py-0.5 font-bold text-indigo-600 outline-none cursor-pointer">
                                  <option value="">초원 미지정</option>
                                  {chowonLists.map(cw => <option key={cw.id} value={cw.id}>{cw.name}</option>)}
                                </select>
                                <div className="flex items-center gap-1.5"><span className="text-[9px] font-bold text-slate-400 w-6">목자</span>
                                  <select value={child.mokja_id || ''} onChange={e => { supabase.from('child_lists').update({ mokja_id: e.target.value || null }).eq('id', child.id).then(onUpdate); }} className="flex-1 text-[10px] bg-white border-slate-200 rounded px-1 font-bold text-blue-600 outline-none cursor-pointer">
                                    <option value="">선택</option>{mokjaCandidates.map((m: any) => <option key={m.id} value={m.id}>{m.korean_name}</option>)}
                                  </select>
                                </div>
                                <div className="flex items-center gap-1.5"><span className="text-[9px] font-bold text-slate-400 w-6">목녀</span>
                                  <select value={child.moknyeo_id || ''} onChange={e => { supabase.from('child_lists').update({ moknyeo_id: e.target.value || null }).eq('id', child.id).then(onUpdate); }} className="flex-1 text-[10px] bg-white border-slate-200 rounded px-1 font-bold text-rose-600 outline-none cursor-pointer">
                                    <option value="">선택</option>{moknyeoCandidates.map((m: any) => <option key={m.id} value={m.id}>{m.korean_name}</option>)}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        <button onClick={() => { const n = prompt('추가할 항목 이름:'); if(n) supabase.from('child_lists').insert({ parent_id: parent.id, name: n, order: children.length + 1 }).then(onUpdate); }} className="px-4 py-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-300 text-slate-400 font-bold text-xs flex items-center justify-center gap-2"><Plus size={14}/> 항목 추가</button>
                      </div>
                    </SortableParentItem>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* 2. Chowon Tab */}
      {activeTab === 'chowon' && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4"><div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center"><Shield className="text-indigo-500" size={24}/></div><h3 className="text-xl font-black text-slate-800">초원 관리</h3></div>
            <button onClick={() => setIsAddingChowon(true)} className="px-5 py-2.5 bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-md hover:bg-indigo-600 transition-all"><Plus size={16} className="inline mr-1"/> 초원 추가</button>
          </div>
          {isAddingChowon && (
            <div className="p-6 bg-indigo-50/50 rounded-[2rem] border border-indigo-100 space-y-4 animate-in zoom-in-95">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="text" placeholder="이름" className="px-4 py-2 rounded-xl border border-slate-200 text-sm bg-white" value={newChowon.name} onChange={e => setNewChowon({...newChowon, name: e.target.value})} />
                <input type="text" placeholder="교역자" className="px-4 py-2 rounded-xl border border-slate-200 text-sm bg-white" value={newChowon.pastor} onChange={e => setNewChowon({...newChowon, pastor: e.target.value})} />
                <input type="text" placeholder="초원지기" className="px-4 py-2 rounded-xl border border-slate-200 text-sm bg-white" value={newChowon.leader} onChange={e => setNewChowon({...newChowon, leader: e.target.value})} />
              </div>
              <div className="flex gap-3"><button onClick={() => { supabase.from('chowon_lists').insert({...newChowon, order: chowonLists.length + 1}).then(() => { setIsAddingChowon(false); fetchChowons(); }); }} className="flex-1 py-2 bg-indigo-500 text-white rounded-xl font-bold">저장</button><button onClick={() => setIsAddingChowon(false)} className="flex-1 py-2 bg-white text-slate-500 rounded-xl border">취소</button></div>
            </div>
          )}
          <table className="w-full text-left border-collapse overflow-hidden rounded-3xl">
            <thead><tr className="bg-slate-50/50 border-b"><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">초원명</th><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">교역자</th><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">초원지기</th><th className="px-6 py-4"></th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {chowonLists.map(cw => (
                <tr key={cw.id} className="hover:bg-slate-50/30 group">
                  <td className="px-6 py-5 font-bold">{editingChowonId === cw.id ? <input className="px-2 py-1 rounded border border-indigo-400" value={editChowonData.name} onChange={e => setEditChowonData({...editChowonData, name: e.target.value})} /> : cw.name}</td>
                  <td className="px-6 py-5 text-sm">{editingChowonId === cw.id ? <input className="px-2 py-1 rounded border border-indigo-400" value={editChowonData.pastor} onChange={e => setEditChowonData({...editChowonData, pastor: e.target.value})} /> : cw.pastor}</td>
                  <td className="px-6 py-5 text-sm">{editingChowonId === cw.id ? <input className="px-2 py-1 rounded border border-indigo-400" value={editChowonData.leader} onChange={e => setEditChowonData({...editChowonData, leader: e.target.value})} /> : cw.leader}</td>
                  <td className="px-6 py-5 text-right"><div className="flex justify-end gap-2">{editingChowonId === cw.id ? <button onClick={() => { supabase.from('chowon_lists').update(editChowonData).eq('id', cw.id).then(() => { setEditingChowonId(null); fetchChowons(); }); }}><Check/></button> : <button className="opacity-0 group-hover:opacity-100 transition-all" onClick={() => { setEditingChowonId(cw.id); setEditChowonData({name:cw.name, pastor:cw.pastor, leader:cw.leader}); }}><Settings size={18}/></button>}<button className="opacity-0 group-hover:opacity-100 text-red-400" onClick={() => { if(confirm('삭제?')) supabase.from('chowon_lists').delete().eq('id', cw.id).then(fetchChowons); }}><Trash2 size={18}/></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4"><div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center"><Shield className="text-emerald-500" size={24}/></div><h3 className="text-xl font-black text-slate-800">사용자 권한 관리</h3></div>
            <button onClick={() => setIsAddingUser(true)} className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all"><Plus size={16} className="inline mr-1"/> 사용자 추가</button>
          </div>
          {isAddingUser && (
            <div className="p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100 space-y-4 animate-in zoom-in-95">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="text" placeholder="이름" className="px-4 py-2 rounded-xl border border-slate-200 text-sm bg-white" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
                <input type="email" placeholder="이메일" className="px-4 py-2 rounded-xl border border-slate-200 text-sm bg-white" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
                <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm bg-white font-bold"><option value="admin">Admin</option><option value="general">General</option><option value="user">User</option><option value="viewer">Viewer</option></select>
              </div>
              <button onClick={handleAddUser} className="w-full py-2 bg-emerald-500 text-white rounded-xl font-black">추가하기</button>
            </div>
          )}
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-slate-50/50 border-b"><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">사용자 정보</th><th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">권한</th><th className="px-6 py-4"></th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {profiles.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/30 group">
                  <td className="px-6 py-5 flex items-center gap-4"><div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400"><User size={20}/></div><div><div className="font-bold">{p.name}</div><div className="text-xs text-slate-400"><Mail size={12} className="inline mr-1"/>{p.email}</div></div></td>
                  <td className="px-6 py-5">
                    <select value={p.role} onChange={e => handleUpdateRole(p.id, e.target.value)} className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase border-none focus:ring-2 focus:ring-blue-100 cursor-pointer ${p.role === 'admin' ? 'bg-blue-100 text-blue-700' : p.role === 'general' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                      <option value="admin">Admin</option><option value="general">General</option><option value="user">User</option><option value="viewer">Viewer</option>
                    </select>
                  </td>
                  <td className="px-6 py-5 text-right"><button className="text-red-400 opacity-0 group-hover:opacity-100" onClick={() => { if(confirm('사용자 프로필을 삭제하시겠습니까?')) supabase.from('profiles').delete().eq('id', p.id).then(fetchProfiles); }}><Trash2 size={18}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Roles Tab: Informational View */}
      {activeTab === 'roles' && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-4"><ShieldCheck className="text-orange-500" size={24}/><div><h3 className="text-xl font-black text-slate-800">사용자 권한 가이드</h3><p className="text-sm text-slate-500 font-medium">각 권한별 기능을 확인하세요.</p></div></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-[2rem] bg-blue-50/50 border border-blue-100 space-y-4">
              <div className="flex items-center justify-between"><div className="font-black text-blue-700 text-lg">Admin</div><Lock size={18} className="text-blue-300" /></div>
              <ul className="space-y-2 text-xs font-bold text-slate-600"><li>✅ 모든 데이터 조회 및 관리</li><li>✅ 시스템 설정 및 순서 변경</li><li>✅ 모든 기도/메모 로그 열람</li></ul>
            </div>
            <div className="p-6 rounded-[2rem] bg-indigo-50/50 border border-indigo-100 space-y-4">
              <div className="flex items-center justify-between"><div className="font-black text-indigo-700 text-lg">General</div><Edit size={18} className="text-indigo-300" /></div>
              <ul className="space-y-2 text-xs font-bold text-slate-600"><li>✅ 목장 배정 및 성도 기본 정보 수정</li><li>✅ 새가족 추가 가능</li><li>❌ 통합 검색 기능 이용 불가</li><li>❌ 기도/메모 로그 접근 불가</li></ul>
            </div>
            <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between"><div className="font-black text-slate-700 text-lg">User / Viewer</div><Eye size={18} className="text-slate-300" /></div>
              <ul className="space-y-2 text-xs font-bold text-slate-600"><li>✅ 성도 정보 및 조직도 열람 전용</li><li>❌ 데이터 추가/수정 불가</li><li>❌ 모든 관리 기능 접근 불가</li></ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
