import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Save, User, Phone, Mail, MapPin, Calendar, Briefcase, Info, Plus, Trash2, ChevronDown, Tag, Camera, Check, Crown, Edit, AlertCircle, UserPlus, LogOut, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

type ParentList = { id: string; type: string; name: string; };
type ChildList = { id: string; parent_id: string; name: string; };

type MemberData = {
  id?: string;
  korean_name: string;
  english_name: string;
  gender: 'Male' | 'Female' | '';
  birthday: string;
  phone: string;
  email: string;
  address: string;
  relationship: string;
  is_baptized: boolean;
  baptism_date: string;
  registration_date: string;
  offering_number: string;
  for_slip: string;
  memo: string;
  photo_url: string;
  tags: string[];
  status: string;
  role: string;
  mokjang: string;
  is_head: boolean;
  family_id?: string | null;
};

type Role = { id: string; name: string; bg_color: string; text_color: string; };

interface MemberFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (actionType: 'save' | 'delete', memberId?: string) => void;
  initialData?: any;
  parentLists: ParentList[];
  childLists: ChildList[];
}

const RELATIONSHIPS = ['Head', 'Spouse', 'Son', 'Daughter', 'Parent', 'Sibling', 'Other'];

export default function MemberForm({ isOpen, onClose, onSuccess, initialData, parentLists, childLists }: MemberFormProps) {
  /* ================= 1. HOOKS (최상단 배치) ================= */
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeMemberIndex, setActiveMemberIndex] = useState(0);
  const [newMemo, setNewMemo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localChildLists, setLocalChildLists] = useState<ChildList[]>(childLists);
  const [newTagName, setNewTagName] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [editingMemoIndex, setEditingMemoIndex] = useState<number | null>(null);
  const [editingMemoText, setEditingMemoText] = useState('');

  const currentMember = members.length > 0 ? members[activeMemberIndex] : null;
  const currentRole = roles.find(r => r.name === currentMember?.role);
  const roleBg = currentRole?.bg_color ?? 'bg-slate-200';
  const roleText = currentRole?.text_color ?? 'text-slate-500';

  const getTagParentId = () => parentLists.find(p => p.name.trim() === '태그' || p.type?.toLowerCase().trim() === 'tags')?.id;
  const availableTags = useMemo(() => localChildLists.filter(c => c.parent_id === getTagParentId()), [localChildLists, parentLists]);

  /* ================= 2. HELPERS ================= */

  const calculateAge = (b: string) => {
    if (!b) return null;
    const today = new Date();
    const birth = new Date(b);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const sortMembers = (mList: MemberData[]) => {
    return [...mList].sort((a, b) => {
      const getRank = (rel: string) => {
        const r = rel?.toLowerCase();
        if (r === 'head' || r === 'self') return 0;
        if (r === 'spouse') return 1;
        return 2;
      };
      const rankA = getRank(a.relationship);
      const rankB = getRank(b.relationship);
      if (rankA !== rankB) return rankA - rankB;
      return (a.birthday || '9999').localeCompare(b.birthday || '9999');
    });
  };

  const deletePhotoFromStorage = async (path?: string) => {
    if (!path || path.startsWith('http')) return;
    try {
      await supabase.storage.from('photos').remove([path]);
    } catch (e) { console.warn('Storage 삭제 실패', e); }
  };

  const CrownBadge = () => (
    <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-md z-10 border border-slate-50">
      <Crown size={14} className="text-amber-500 fill-amber-500" />
    </div>
  );

  /* ================= 3. ACTIONS ================= */

  const updateMember = (index: number, updates: Partial<MemberData>) => {
    const newMembers = [...members];
    if (!newMembers[index]) return;
    const target = { ...newMembers[index], ...updates };

    if (updates.relationship === 'Head') {
      const hasHead = newMembers.some((m, i) => i !== index && m.relationship === 'Head');
      if (hasHead) {
        alert("⚠️ 한 가정에 대표자(Head)는 한 명만 지정할 수 있습니다.");
        return;
      }
    }

    if (updates.relationship) {
      const head = newMembers.find(m => m.relationship === 'Head');
      if (updates.relationship === 'Spouse' && head?.gender) {
        target.gender = head.gender === 'Male' ? 'Female' : 'Male';
      } else if (updates.relationship === 'Son') target.gender = 'Male';
      else if (updates.relationship === 'Daughter') target.gender = 'Female';
    }

    newMembers[index] = target;
    setMembers(newMembers);
  };

  const handleAddFamilyMember = () => {
    const newM: MemberData = {
      korean_name: '', english_name: '', gender: '', birthday: '', phone: '', email: '',
      address: members[0]?.address || '', relationship: 'Spouse',
      is_baptized: false, baptism_date: '', registration_date: new Date().toISOString().split('T')[0],
      offering_number: '', for_slip: '', memo: '', photo_url: '', tags: [], status: 'Active', role: '', 
      mokjang: members[0]?.mokjang || '', is_head: false
    };
    const updated = [...members, newM];
    setMembers(updated);
    setActiveMemberIndex(updated.length - 1);
  };

  const handleAddNewTag = async () => {
    const name = newTagName.trim();
    if (!name || !currentMember) return;
    const parentId = getTagParentId();
    if (!parentId) return;

    try {
      const { data, error } = await supabase.from('child_lists').insert({
        parent_id: parentId, name: name, order: localChildLists.length + 1
      }).select().single();
      if (error) throw error;
      setLocalChildLists([...localChildLists, data]);
      updateMember(activeMemberIndex, { tags: Array.from(new Set([...currentMember.tags, name])) });
      setNewTagName('');
    } catch (err) { alert("태그 추가 실패"); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentMember) return;
    setLoading(true);
    try {
      const oldPath = currentMember.photo_url;
      const { data: { user } } = await supabase.auth.getUser();
      const path = `member-photos/${user?.id}/${crypto.randomUUID()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('photos').upload(path, file);
      if (error) throw error;
      if (oldPath) await deletePhotoFromStorage(oldPath);
      updateMember(activeMemberIndex, { photo_url: path });
    } catch (err) { alert("사진 업로드 실패"); } finally { setLoading(false); e.target.value = ''; }
  };

  const handleSaveMembers = async () => {
    if (!currentMember) return;
    const invalid = members.find(m => !m.korean_name.trim() || !m.relationship || !m.gender);
    if (invalid) {
      alert(`⚠️ [${invalid.korean_name || '새 멤버'}] 한글이름, 관계, 성별은 필수 항목입니다.`);
      return;
    }

    setLoading(true);
    try {
      let familyId = initialData?.family_id || members.find(m => m.family_id)?.family_id;
      if (!familyId) {
        const { data: f } = await supabase.from('families').insert({ family_name: members[0].korean_name }).select().single();
        familyId = f?.id;
      }
      for (const m of members) {
        const { is_head, ...dbData } = m;
        const payload = { ...dbData, family_id: familyId, birthday: m.birthday || null, baptism_date: m.baptism_date || null, registration_date: m.registration_date || null };
        if (m.id) await supabase.from('members').update(payload).eq('id', m.id);
        else await supabase.from('members').insert(payload);
      }
      onSuccess('save');
    } catch (e) { alert("저장 실패"); } finally { setLoading(false); }
  };

  const handleDeleteCurrentMember = async () => {
    if (!currentMember || !confirm("정말 삭제하시겠습니까?")) return;
    setLoading(true);
    try {
      if (currentMember.photo_url) await deletePhotoFromStorage(currentMember.photo_url);
      if (currentMember.id) await supabase.from('members').delete().eq('id', currentMember.id);
      const updated = members.filter((_, i) => i !== activeMemberIndex);
      if (updated.length === 0) onClose();
      else { setMembers(updated); setActiveMemberIndex(0); }
      onSuccess('delete');
    } catch (e) { alert("삭제 실패"); } finally { setLoading(false); }
  };

  const handleMoveOut = async () => {
    if (!currentMember?.id || !confirm("이 멤버를 새로운 세대로 독립시키겠습니까?")) return;
    setLoading(true);
    try {
      const { data: newF } = await supabase.from('families').insert({ family_name: currentMember.korean_name }).select().single();
      await supabase.from('members').update({ family_id: newF?.id, relationship: 'Head' }).eq('id', currentMember.id);
      onSuccess('save', currentMember.id);
      onClose();
    } catch (e) { alert("독립 처리 실패"); } finally { setLoading(false); }
  };

  const handleAddExisting = async () => {
    const name = prompt("가족으로 추가할 멤버의 정확한 '한글 이름'을 입력하세요.");
    if (!name) return;
    const { data } = await supabase.from('members').select('*').eq('korean_name', name).maybeSingle();
    if (!data) return alert("멤버를 찾을 수 없습니다.");
    const updated = sortMembers([...members, { ...data, tags: data.tags || [] }]);
    setMembers(updated);
    setActiveMemberIndex(updated.findIndex(m => m.korean_name === name));
  };

  /* ================= 4. EFFECTS ================= */

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const loadRoles = async () => {
      const { data } = await supabase.from('roles').select('*').order('sort_order');
      if (data) setRoles(data);
    };
    loadRoles();
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setLoading(true);
        supabase.from('members').select('*').eq('family_id', initialData.family_id).then(({ data }) => {
          if (data) {
            const sorted = sortMembers(data.map(m => ({ ...m, tags: m.tags || [] })));
            setMembers(sorted);
            setActiveMemberIndex(sorted.findIndex(m => m.id === initialData.id));
          }
          setLoading(false);
        });
      } else {
        setMembers([{
          korean_name: '', english_name: '', gender: '', birthday: '', phone: '', email: '',
          address: '', relationship: 'Head', is_baptized: false, baptism_date: '', 
          registration_date: new Date().toISOString().split('T')[0],
          offering_number: '', for_slip: '', memo: '', photo_url: '', tags: [], status: 'Active', role: '', mokjang: '', is_head: true
        }]);
        setActiveMemberIndex(0);
      }
    }
  }, [isOpen, initialData]);

  /* ================= 5. RENDER ================= */
  if (!isOpen || !currentMember) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-2 sm:p-4 overflow-hidden" onClick={onClose}>
      <div className="bg-white w-full max-w-7xl max-h-[95vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        
        {/* 상단 컬러 밴드 섹션 */}
        <div className={`relative flex-shrink-0 ${roleBg} bg-opacity-35 p-6 sm:p-8`}>
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
            <div className="flex items-start gap-6">
              <div className="relative group">
                {/* 왕관 표시 */}
                {(currentMember.relationship === 'Head' || currentMember.is_head) && <CrownBadge />}
                
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] bg-white shadow-xl flex items-center justify-center overflow-hidden ring-4 ring-white relative">
                  {currentMember.photo_url ? (
                    <img src={supabase.storage.from('photos').getPublicUrl(currentMember.photo_url).data.publicUrl} className="w-full h-full object-cover" />
                  ) : (
                    <User size={48} className="text-slate-300" />
                  )}
                  {/* 사진 오버레이 */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                    <button onClick={() => fileInputRef.current?.click()} className="text-white text-[10px] font-bold flex items-center gap-1 hover:text-blue-200"><Camera size={12}/> 사진변경</button>
                    {currentMember.photo_url && (
                      <button onClick={() => { deletePhotoFromStorage(currentMember.photo_url); updateMember(activeMemberIndex, { photo_url: '' }); }} className="text-white text-[10px] font-bold flex items-center gap-1 hover:text-rose-200"><Trash2 size={12}/> 사진삭제</button>
                    )}
                  </div>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </div>

              <div className="min-w-0 pt-2">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h2 className="text-3xl font-bold text-slate-800">{currentMember.korean_name || '새 멤버'}</h2>
                  <span className="text-lg text-slate-500 font-medium">
                    {calculateAge(currentMember.birthday) || '-'}세 · {currentMember.gender === 'Male' ? 'M' : currentMember.gender === 'Female' ? 'F' : '-'}
                  </span>
                </div>
                <div className="text-xl text-slate-400 font-medium mb-4">{currentMember.english_name || 'English Name'}</div>
                
                {/* 상단 배지 섹션 */}
                <div className="flex flex-wrap gap-2">
                  {currentMember.role && (
                    <span className={`px-3 py-1 rounded-lg bg-white/60 border border-white text-xs font-bold ${roleText}`}>
                      {currentMember.role}
                    </span>
                  )}
                  {currentMember.mokjang && (
                    <span className="px-3 py-1 rounded-lg bg-blue-50 border border-blue-100 text-xs font-bold text-blue-600">
                      {currentMember.mokjang}
                    </span>
                  )}
                  {currentMember.tags?.map(tag => (
                    <span key={tag} className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-500 shadow-sm">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
              <X size={24} className="text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* 왼쪽 사이드바: 가족 리스트 */}
          <div className="hidden lg:flex w-72 border-r border-slate-100 bg-slate-50/50 flex-col p-4 gap-2 overflow-y-auto">
            <div className="px-2 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
              <span>Family Members</span>
              <button onClick={handleAddExisting} title="기존 멤버 추가" className="text-blue-600 hover:bg-blue-50 p-1 rounded"><UserPlus size={16}/></button>
            </div>
            {members.map((m, idx) => (
              <button 
                key={idx} 
                onClick={() => setActiveMemberIndex(idx)}
                className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${activeMemberIndex === idx ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:bg-white'} ${m.status?.toLowerCase() !== 'active' ? 'opacity-50' : ''}`}
              >
                <div className="relative w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {m.photo_url ? (
                    <img src={supabase.storage.from('photos').getPublicUrl(m.photo_url).data.publicUrl} className="w-full h-full object-cover" />
                  ) : (
                    <User size={20}/>
                  )}
                  {(m.relationship === 'Head' || m.is_head) && (
                    <div className="absolute -top-1 -left-1 bg-amber-400 text-white rounded-full p-0.5 border border-white shadow-sm">
                      <Crown size={10}/>
                    </div>
                  )}
                </div>
                <div className="text-left min-w-0">
                  <div className="text-sm font-bold truncate">{m.korean_name || '이름 없음'}</div>
                  <div className="text-[10px] font-medium opacity-60 uppercase">{m.relationship} · {calculateAge(m.birthday) || '-'}세</div>
                </div>
              </button>
            ))}
            <button onClick={handleAddFamilyMember} className="mt-2 w-full p-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 flex items-center justify-center gap-2 hover:border-blue-300 hover:text-blue-500 transition-all"><Plus size={18}/>가족 추가</button>
          </div>

          {/* 메인 폼 영역 */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar bg-white">
            <div className="max-w-4xl mx-auto space-y-10">
              {/* 한줄 이름/성별 레이아웃 */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 ml-1">한글 이름 <span className="text-rose-500">*</span></label>
                  <input type="text" value={currentMember.korean_name} onChange={e => updateMember(activeMemberIndex, { korean_name: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 ml-1">영문 이름</label>
                  <input type="text" value={currentMember.english_name} onChange={e => updateMember(activeMemberIndex, { english_name: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 font-bold text-slate-700" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 ml-1">성별 <span className="text-rose-500">*</span></label>
                  <div className="flex bg-slate-100 p-1 rounded-2xl h-[52px]">
                    <button onClick={() => updateMember(activeMemberIndex, { gender: 'Male' })} className={`flex-1 rounded-xl text-xs font-bold transition-all ${currentMember.gender === 'Male' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>남성</button>
                    <button onClick={() => updateMember(activeMemberIndex, { gender: 'Female' })} className={`flex-1 rounded-xl text-xs font-bold transition-all ${currentMember.gender === 'Female' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400'}`}>여성</button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 ml-1">관계 <span className="text-rose-500">*</span></label>
                  <select value={currentMember.relationship} onChange={e => updateMember(activeMemberIndex, { relationship: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 font-bold text-slate-700">
                    {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 ml-1">생년월일</label>
                  <input type="text" value={currentMember.birthday} onChange={e => updateMember(activeMemberIndex, { birthday: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 font-bold text-slate-700" placeholder="YYYY-MM-DD" />
                </div>
              </section>

              {/* 세례 및 헌금 정보 */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                <div className={`p-5 rounded-3xl border-2 transition-all ${currentMember.is_baptized ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-transparent'}`}>
                  <label className="flex items-center gap-3 cursor-pointer mb-2">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${currentMember.is_baptized ? 'bg-sky-600 border-sky-600' : 'bg-white border-slate-200'}`}>
                      {currentMember.is_baptized && <Check size={14} className="text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={currentMember.is_baptized} onChange={e => updateMember(activeMemberIndex, { is_baptized: e.target.checked })} />
                    <span className="text-sm font-bold text-slate-700">세례 여부</span>
                  </label>
                  {currentMember.is_baptized && (
                    <input type="text" value={currentMember.baptism_date} onChange={e => updateMember(activeMemberIndex, { baptism_date: e.target.value })} className="w-full bg-transparent border-b border-blue-200 py-1 text-sm font-bold text-sky-800 outline-none" placeholder="세례일 (YYYY-MM-DD)" />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400">헌금번호</label>
                    <input type="text" value={currentMember.offering_number} onChange={e => updateMember(activeMemberIndex, { offering_number: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 font-bold text-slate-700" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400">Slip #</label>
                    <input type="text" value={currentMember.for_slip} onChange={e => updateMember(activeMemberIndex, { for_slip: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 font-bold text-slate-700" />
                  </div>
                </div>
              </section>

              {/* 태그 섹션 (동기화 보완) */}
              <section className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2"><Tag className="text-purple-600" size={18} /><h3 className="font-bold text-slate-800">Global Tags</h3></div>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <button key={tag.id} onClick={() => {
                      const cur = currentMember.tags;
                      const next = cur.includes(tag.name) ? cur.filter(t => t !== tag.name) : [...cur, tag.name];
                      updateMember(activeMemberIndex, { tags: next });
                    }} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${currentMember.tags.includes(tag.name) ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-purple-300'}`}>#{tag.name}</button>
                  ))}
                  <div className="flex items-center gap-2 ml-2">
                    <input type="text" value={newTagName} onChange={e => setNewTagName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddNewTag()} placeholder="New Tag..." className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 outline-none w-28" />
                    <button onClick={handleAddNewTag} className="p-2 bg-purple-100 text-purple-600 rounded-xl hover:bg-purple-200 transition-colors"><Plus size={16} /></button>
                  </div>
                </div>
              </section>

              {/* 연락처 및 주소 */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                <div className="space-y-1"><label className="text-xs font-bold text-slate-400">전화번호</label><input type="tel" value={currentMember.phone} onChange={e => updateMember(activeMemberIndex, { phone: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 font-bold text-slate-700" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-400">이메일</label><input type="email" value={currentMember.email} onChange={e => updateMember(activeMemberIndex, { email: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 font-bold text-slate-700" /></div>
                <div className="md:col-span-2 space-y-1"><label className="text-xs font-bold text-slate-400">집 주소</label><input type="text" value={currentMember.address} onChange={e => updateMember(activeMemberIndex, { address: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 font-bold text-slate-700" /></div>
              </section>

              {/* 행정 정보 */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-slate-100">
                {['mokjang', 'role', 'status'].map(field => {
                  const parent = parentLists.find(p => p.type === field || p.name.includes(field === 'mokjang' ? '목장' : field === 'role' ? '직분' : '상태'));
                  return (
                    <div key={field} className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 capitalize">{parent?.name || field}</label>
                      <select value={(currentMember as any)[field] || ''} onChange={e => updateMember(activeMemberIndex, { [field]: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700">
                        <option value="">선택</option>
                        {childLists.filter(c => c.parent_id === parent?.id).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                  );
                })}
                <div className="space-y-1"><label className="text-xs font-bold text-slate-400">등록일</label><input type="text" value={currentMember.registration_date} onChange={e => updateMember(activeMemberIndex, { registration_date: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700" /></div>
              </section>

              {/* 메모 섹션 (완벽 복구) */}
              <section className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2"><Info className="text-amber-500" size={18} /><h3 className="font-bold text-slate-800">Memos</h3></div>
                <div className="flex gap-2">
                  <textarea value={newMemo} onChange={e => setNewMemo(e.target.value)} placeholder="새 메모를 입력하세요..." className="flex-1 bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm min-h-[80px] focus:ring-2 focus:ring-amber-100" />
                  <button onClick={() => { 
                    if (!newMemo.trim()) return; 
                    const ts = new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }); 
                    const cur = currentMember.memo ? currentMember.memo.split('\n\n').filter(Boolean) : []; 
                    updateMember(activeMemberIndex, { memo: [`[${ts}] ${newMemo.trim()}`, ...cur].join('\n\n') }); 
                    setNewMemo(''); 
                  }} className="px-6 bg-amber-500 text-white rounded-2xl font-bold hover:bg-amber-600 transition-colors">추가</button>
                </div>
                
                <div className="space-y-3 mt-4">
                  {currentMember.memo?.split('\n\n').filter(Boolean).map((m, i) => {
                    const match = m.match(/^\[(.*?)\] (.*)$/s);
                    const ts = match ? match[1] : 'LOG';
                    const content = match ? match[2] : m;
                    const isEditing = editingMemoIndex === i;

                    return (
                      <div key={i} className="group p-5 bg-slate-50 rounded-3xl relative hover:shadow-sm transition-shadow">
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea autoFocus value={editingMemoText} onChange={e => setEditingMemoText(e.target.value)} className="w-full bg-white border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-100" />
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setEditingMemoIndex(null)} className="text-xs font-bold text-slate-400">취소</button>
                              <button onClick={() => {
                                const curMemos = currentMember.memo.split('\n\n').filter(Boolean);
                                curMemos[i] = `[${ts}] ${editingMemoText}`;
                                updateMember(activeMemberIndex, { memo: curMemos.join('\n\n') });
                                setEditingMemoIndex(null);
                              }} className="text-xs font-bold text-blue-600">저장</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between mb-2">
                              <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-md">{ts}</span>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button onClick={() => { setEditingMemoIndex(i); setEditingMemoText(content); }} className="text-slate-400 hover:text-blue-500"><Edit size={14}/></button>
                                <button onClick={() => {
                                  const curMemos = currentMember.memo.split('\n\n').filter(Boolean);
                                  updateMember(activeMemberIndex, { memo: curMemos.filter((_, idx) => idx !== i).join('\n\n') });
                                }} className="text-slate-400 hover:text-rose-500"><Trash2 size={14}/></button>
                              </div>
                            </div>
                            <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">{content}</p>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-8 py-6 border-t border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex gap-2">
            <button onClick={handleDeleteCurrentMember} className="flex items-center gap-2 px-4 py-2 text-rose-500 font-bold hover:bg-rose-50 rounded-xl transition-all text-xs uppercase tracking-widest outline-none"><Trash2 size={18} /> Delete</button>
            <button onClick={handleMoveOut} className="flex items-center gap-2 px-4 py-2 text-slate-500 font-bold hover:bg-rose-50 rounded-xl transition-all text-xs uppercase tracking-widest outline-none"><LogOut size={18} /> 독립시키기</button>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-3 rounded-2xl text-slate-400 font-bold hover:bg-slate-50 text-sm uppercase tracking-widest outline-none">Cancel</button>
            <button onClick={handleSaveMembers} disabled={loading} className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 flex items-center gap-2 text-sm uppercase tracking-widest outline-none">{loading ? 'Saving...' : 'Save All Changes'}<Save size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
