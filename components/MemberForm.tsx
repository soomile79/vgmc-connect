import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Save, User, Phone, Mail, MapPin, Calendar, Briefcase, Info, Plus, Trash2, ChevronDown, Tag, Camera, Check, Crown, Edit } from 'lucide-react';
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
};

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
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeMemberIndex, setActiveMemberIndex] = useState(0);
  const [newMemo, setNewMemo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [localChildLists, setLocalChildLists] = useState<ChildList[]>(childLists);
  const [editingMemoIndex, setEditingMemoIndex] = useState<number | null>(null);
  const [editingMemoText, setEditingMemoText] = useState('');

  // --- 1. ESC 키 이벤트 리스너 (보강된 로직) ---
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 입력창(input, textarea)에서 Esc를 눌러도 닫히도록 stopPropagation 추가
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    // 'true' 옵션을 주어 캡처링 단계에서 이벤트를 가로챕니다.
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  // --- 2. 유틸리티 & 정렬 로직 ---
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

  const calculateAge = (birthday: string) => {
    if (!birthday) return null;
    const bDate = new Date(birthday);
    if (isNaN(bDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - bDate.getFullYear();
    const m = today.getMonth() - bDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) age--;
    return age;
  };

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handleDateChange = (field: keyof MemberData, value: string) => {
    const numbers = value.replace(/\D/g, '');
    let formatted = '';
    if (numbers.length <= 4) formatted = numbers;
    else if (numbers.length <= 6) formatted = `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
    else formatted = `${numbers.slice(0, 4)}-${numbers.slice(4, 6)}-${numbers.slice(6, 8)}`;
    updateMember(activeMemberIndex, { [field]: formatted });
  };

  const getTagParentId = () => {
    const parent = parentLists.find(p => p.name === '태그' || p.type?.toLowerCase() === 'tags');
    return parent?.id;
  };

  const toggleTag = (tagName: string) => {
    const currentMember = members[activeMemberIndex];
    const currentTags = currentMember.tags || [];
    let nextTags;
    if (currentTags.includes(tagName)) {
      nextTags = currentTags.filter(t => t !== tagName);
    } else {
      nextTags = [...currentTags, tagName];
    }
    updateMember(activeMemberIndex, { tags: Array.from(new Set(nextTags)) });
  };

  const handleAddTag = async (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed) return;
    const parentId = getTagParentId();
    if (!parentId) return;
    try {
      const { data: existing } = await supabase.from('child_lists').select('*').eq('parent_id', parentId).eq('name', trimmed).maybeSingle();
      if (!existing) {
        const { data: newTag, error } = await supabase.from('child_lists').insert({ parent_id: parentId, name: trimmed, order: localChildLists.length + 1 }).select().single();
        if (error) throw error;
        setLocalChildLists(prev => [...prev, newTag]);
      }
      toggleTag(trimmed);
    } catch (err) { alert('태그 추가 오류'); }
  };

  const updateMember = (index: number, updates: Partial<MemberData>) => {
    if (!members[index]) return;
    const newMembers = [...members];
    newMembers[index] = { ...newMembers[index], ...updates };
    setMembers(newMembers); 
  };

  const handleDeleteCurrentMember = async () => {
    const memberToDelete = members[activeMemberIndex];
    if (!memberToDelete) return;
    if (!confirm(`${memberToDelete.korean_name || '이 멤버'}를 정말 삭제하시겠습니까?`)) return;

    setLoading(true);
    try {
      if (memberToDelete.id) {
        const { error } = await supabase.from('members').delete().eq('id', memberToDelete.id);
        if (error) throw error;
      }
      const updatedMembers = members.filter((_, i) => i !== activeMemberIndex);
      if (updatedMembers.length === 0) {
        onSuccess('delete');
        onClose();
      } else {
        setMembers(sortMembers(updatedMembers));
        setActiveMemberIndex(0);
        onSuccess('delete');
      }
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLocalChildLists(childLists);
      if (initialData) loadFamily(initialData);
      else {
        setMembers([createEmptyMember(true)]);
        setActiveMemberIndex(0);
      }
    }
  }, [isOpen, initialData, childLists]);

  const loadFamily = async (member: any) => {
    setLoading(true);
    if (member.family_id) {
      const { data } = await supabase.from('members').select('*').eq('family_id', member.family_id);
      if (data) {
        const mapped = data.map(m => ({ ...m, is_head: m.relationship?.toLowerCase() === 'head' || m.relationship?.toLowerCase() === 'self', tags: m.tags || [] }));
        setMembers(sortMembers(mapped));
        const idx = sortMembers(mapped).findIndex(m => m.id === member.id);
        setActiveMemberIndex(idx >= 0 ? idx : 0);
      }
    } else {
      setMembers([{ ...member, is_head: true, tags: member.tags || [] }]);
      setActiveMemberIndex(0);
    }
    setLoading(false);
  };

  const createEmptyMember = (isHead = false): MemberData => ({
    korean_name: '', english_name: '', gender: '', birthday: '', phone: '', email: '',
    address: members[0]?.address || '', relationship: isHead ? 'Head' : '',
    is_baptized: false, baptism_date: '', registration_date: new Date().toISOString().split('T')[0],
    offering_number: '', for_slip: '', memo: '', photo_url: '', tags: [], status: 'Active', role: '', mokjang: '', is_head: isHead
  });

  const handleSaveMembers = async () => {
    setLoading(true);
    try {
      const familyId = initialData?.family_id || null;
      for (const member of members) {
        const memberData = { ...member, family_id: familyId, birthday: member.birthday || null, baptism_date: member.baptism_date || null, registration_date: member.registration_date || null };
        const id = memberData.id;
        const finalData = { ...memberData };
        delete (finalData as any).id;
        delete (finalData as any).is_head;
        if (id) await supabase.from('members').update(finalData).eq('id', id);
        else await supabase.from('members').insert(finalData);
      }
      onSuccess('save', members[activeMemberIndex]?.id);
    } catch (error) { alert('저장 실패'); } finally { setLoading(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `member-photos/${fileName}`;
      await supabase.storage.from('photos').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(filePath);
      updateMember(index, { photo_url: publicUrl });
    } catch (error) { alert('사진 업로드 실패'); } finally { setLoading(false); }
  };

  const handleAddMemo = () => {
    const currentMember = members[activeMemberIndex];
    if (!newMemo.trim() || !currentMember) return;
    const ts = new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    const memoEntry = `[${ts}] ${newMemo.trim()}`;
    const currentMemos = (currentMember.memo || "").split('\n\n').filter(Boolean);
    updateMember(activeMemberIndex, { memo: [memoEntry, ...currentMemos].join('\n\n') });
    setNewMemo('');
  };

  const handleDeleteMemo = (memoIndex: number) => {
    if (!confirm('이 메모를 삭제하시겠습니까?')) return;
    const currentMember = members[activeMemberIndex];
    const currentMemos = (currentMember.memo || "").split('\n\n').filter(Boolean);
    updateMember(activeMemberIndex, { memo: currentMemos.filter((_, i) => i !== memoIndex).join('\n\n') });
  };

  const handleUpdateMemo = (index: number) => {
    const currentMember = members[activeMemberIndex];
    if (!editingMemoText.trim() || !currentMember) return;
    const currentMemos = (currentMember.memo || "").split('\n\n').filter(Boolean);
    const match = currentMemos[index].match(/^\[(.*?)\] (.*)$/s);
    const ts = match ? match[1] : new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    currentMemos[index] = `[${ts}] ${editingMemoText.trim()}`;
    updateMember(activeMemberIndex, { memo: currentMemos.join('\n\n') });
    setEditingMemoIndex(null);
    setEditingMemoText('');
  };

  if (!isOpen) return null;
  const currentMember = members[activeMemberIndex];
  if (!currentMember) return null;

  const availableTags = localChildLists.filter(c => c.parent_id === getTagParentId());

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col animate-in fade-in zoom-in duration-300 overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Edit Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Sidebar */}
          <div className="hidden lg:flex w-56 border-r border-slate-100 bg-slate-50/50 flex-col py-4 gap-2 overflow-y-auto no-scrollbar">
            <div className="px-4 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Family Members</div>
            {sortMembers(members).map((m, idx) => {
              const originalIndex = members.findIndex(mem => mem === m);
              return (
                <button 
                  key={idx} 
                  onClick={() => setActiveMemberIndex(originalIndex)} 
                  className={`relative flex-shrink-0 flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl transition-all ${activeMemberIndex === originalIndex ? 'bg-white shadow-md text-blue-800' : 'text-slate-400 hover:bg-white/50'}`}>
                  <div className="relative flex-shrink-0 w-8 h-8">
                    {m.photo_url ? <img src={m.photo_url} className="w-full h-full object-cover rounded-lg" /> : <User size={16} className="m-2" />}
                    {m.is_head && <div className="absolute -top-1 -left-1 bg-amber-400 text-white rounded-full p-0.5 border border-white"><Crown size={8} /></div>}
                  </div>
                  <span className="text-sm font-bold truncate">{m.korean_name || '새 멤버'}</span>
                </button>
              );
            })}
            <button onClick={() => setMembers([...members, createEmptyMember(false)])} className="mx-4 mt-2 p-2 rounded-xl border-2 border-dashed border-slate-300 text-slate-300 flex items-center justify-center hover:border-blue-400 transition-all"><Plus size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar">
            <div className="max-w-5xl mx-auto space-y-12">
              {/* Photo & Basic Info */}
              <div className="flex flex-col md:flex-row gap-10 items-start">
                <div className="flex flex-col items-center gap-4 mx-auto md:mx-0">
                  <div className="relative">
                    <div className="w-24 h-24 sm:w-40 sm:h-40 rounded-[2rem] sm:rounded-[2.5rem] bg-slate-100 ring-4 sm:ring-8 ring-slate-50 overflow-hidden flex items-center justify-center shadow-inner">
                      {currentMember.photo_url ? <img src={currentMember.photo_url} className="w-full h-full object-cover" /> : <User size={32} className="text-slate-300 sm:w-12 sm:h-12" />}
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-1 right-1 w-8 h-8 sm:w-10 sm:h-10 bg-white shadow-xl rounded-xl flex items-center justify-center text-blue-600 hover:scale-110 transition-transform"><Camera size={16} /></button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, activeMemberIndex)} />
                  </div>
                  {currentMember.birthday && (
                    <div className="bg-blue-50 text-blue-800 px-4 py-1 rounded-full text-[13px] font-black uppercase tracking-widest">Age: {calculateAge(currentMember.birthday) ?? '-'}</div>
                  )}
                </div>

                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-1">Korean Name</label><input type="text" value={currentMember.korean_name} onChange={(e) => updateMember(activeMemberIndex, { korean_name: e.target.value })} className="w-full bg-white border-b-2 border-slate-100 focus:border-blue-500 px-1 py-2 text-lg font-bold" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-1">English Name</label><input type="text" value={currentMember.english_name} onChange={(e) => updateMember(activeMemberIndex, { english_name: e.target.value })} className="w-full bg-white border-b-2 border-slate-100 focus:border-blue-500 px-1 py-2 text-lg font-bold" /></div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-1">Relationship</label>
                      <select value={currentMember.relationship} onChange={(e) => updateMember(activeMemberIndex, { relationship: e.target.value, is_head: e.target.value === 'Head' })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-700">
                        <option value="">Select...</option>
                        {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-1">Gender</label>
                      <div className="flex bg-slate-100 p-1 rounded-xl">
                        {['Male', 'Female'].map(g => (
                          <button key={g} onClick={() => updateMember(activeMemberIndex, { gender: g as any })} className={`flex-1 py-1 rounded-lg text-[10px] font-black transition-all ${currentMember.gender === g ? g === 'Male' ? 'bg-blue-400 text-white shadow-sm' : 'bg-pink-400 text-white shadow-sm' : 'text-slate-400'}`}>{g === 'Male' ? '남' : '여'}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-1">Birthday</label><input type="text" value={currentMember.birthday} onChange={(e) => handleDateChange('birthday', e.target.value)} className="w-full bg-white border-b-2 border-slate-100 focus:border-blue-500 px-1 py-2 font-semibold" placeholder="YYYY-MM-DD" /></div>
                </div>
              </div>

              {/* Church Info */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Briefcase className="w-4 h-4 text-blue-600" /></div>
                  <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Church & Administration</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registration Date</label><input type="text" value={currentMember.registration_date} onChange={(e) => handleDateChange('registration_date', e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold text-slate-700" placeholder="YYYY-MM-DD" /></div>
                  {['mokjang', 'role', 'status'].map(type => {
                    const parent = parentLists.find(p => p.type === type || (type === 'mokjang' && p.name.includes('목장')) || (type === 'role' && p.name.includes('직분')) || (type === 'status' && p.name.includes('상태')));
                    return (
                      <div key={type} className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{parent?.name || type}</label>
                        <select value={(currentMember as any)[type] || ''} onChange={(e) => updateMember(activeMemberIndex, { [type]: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 appearance-none"><option value="">Select...</option>{childLists.filter(c => c.parent_id === parent?.id).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div className={`p-5 rounded-3xl border-2 transition-all flex flex-col gap-3 ${currentMember.is_baptized ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-transparent'}`}>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${currentMember.is_baptized ? 'bg-sky-600 border-sky-600' : 'bg-white border-slate-200'}`}>{currentMember.is_baptized && <Check size={14} className="text-white" />}</div>
                      <input type="checkbox" className="hidden" checked={currentMember.is_baptized} onChange={(e) => updateMember(activeMemberIndex, { is_baptized: e.target.checked })} /><span className="text-sm font-bold text-slate-700">세례 여부</span>
                    </label>
                    {currentMember.is_baptized && (
                      <div className="animate-in fade-in slide-in-from-top-1"><label className="text-[14px] font-bold text-slate-700 uppercase tracking-widest ml-1">세례일</label><input type="text" value={currentMember.baptism_date} onChange={(e) => handleDateChange('baptism_date', e.target.value)} className="w-full bg-transparent border-b py-1 text-sm font-bold text-sky-800 focus:outline-none ml-1" placeholder="YYYY-MM-DD" /></div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-1">Offering #</label><input type="text" value={currentMember.offering_number} onChange={(e) => updateMember(activeMemberIndex, { offering_number: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-1">Slip #</label><input type="text" value={currentMember.for_slip} onChange={(e) => updateMember(activeMemberIndex, { for_slip: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold" /></div>
                  </div>
                </div>
              </section>

              {/* Tags Section */}
              <section className="space-y-6 p-8 bg-slate-50/50 rounded-[2rem]">
                <div className="flex items-center gap-2"><Tag className="text-purple-500" size={20} /><h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Global Tags</h3></div>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <button key={tag.id} onClick={() => toggleTag(tag.name)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${currentMember.tags?.includes(tag.name) ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-purple-300'}`}>#{tag.name}</button>
                  ))}
                  <div className="relative flex items-center">
                    <input type="text" placeholder="New Tag..." className="pl-4 pr-10 py-2 rounded-xl border-2 border-dashed border-slate-200 focus:border-purple-400 focus:outline-none text-xs font-bold w-32" onKeyDown={(e) => { if (e.key === 'Enter') { handleAddTag((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ''; } }} /><Plus className="absolute right-3 w-4 h-4 text-slate-300" />
                  </div>
                </div>
              </section>

              {/* Memo Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-2"><Info className="text-amber-500" size={20} /><h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Memo Log</h3></div>
                <div className="flex gap-4">
                  <textarea value={newMemo} onChange={(e) => setNewMemo(e.target.value)} placeholder="새로운 메모 작성..." className="flex-1 bg-slate-50 border-none rounded-[1.5rem] px-6 py-4 text-sm min-h-[80px] focus:ring-2 focus:ring-amber-200" />
                  <button onClick={handleAddMemo} className="px-8 bg-amber-600 text-white rounded-2xl font-black text-sm hover:bg-sky-600 shadow-lg h-20 self-end transition-all">메모 저장</button>
                </div>
                <div className="space-y-3">
                  {(currentMember.memo || "").split('\n\n').filter(Boolean).map((m, i) => {
                    const isEditing = editingMemoIndex === i;
                    const match = m.match(/^\[(.*?)\] (.*)$/s);
                    const ts = match ? match[1] : 'LOG';
                    const content = match ? match[2] : m;
                    return (
                      <div key={i} className="group p-5 bg-white border border-slate-100 rounded-3xl relative hover:shadow-md transition-shadow">
                        {isEditing ? (
                          <div className="space-y-3"><textarea autoFocus value={editingMemoText} onChange={(e) => setEditingMemoText(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-100" rows={3} /><div className="flex justify-end gap-2"><button onClick={() => setEditingMemoIndex(null)} className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600">취소</button><button onClick={() => handleUpdateMemo(i)} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm">저장</button></div></div>
                        ) : (
                          <><div className="flex justify-between mb-2"><span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-md">{ts}</span><div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1"><button onClick={() => { setEditingMemoIndex(i); setEditingMemoText(content); }} className="p-1 text-slate-400 hover:text-blue-500"><Edit size={14}/></button><button onClick={() => handleDeleteMemo(i)} className="p-1 text-slate-400 hover:text-rose-500"><Trash2 size={14}/></button></div></div><p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">{content}</p></>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 flex items-center justify-between bg-white">
          <button onClick={handleDeleteCurrentMember} disabled={loading} className="flex items-center gap-2 px-4 py-2 text-rose-500 font-bold hover:bg-rose-50 rounded-xl transition-all text-xs uppercase tracking-widest disabled:opacity-50"><Trash2 size={18} />Delete Member</button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-3 rounded-2xl text-slate-400 font-bold hover:bg-slate-50 text-sm uppercase tracking-widest">Cancel</button>
            <button onClick={handleSaveMembers} disabled={loading} className="px-10 py-3 bg-sky-700 text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 flex items-center gap-2 text-sm uppercase tracking-widest">{loading ? 'Saving...' : 'Save Profile'}<Save size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
