import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Save, User, Phone, Mail, MapPin, Calendar, Briefcase, Info, Plus, Trash2, ChevronDown, Tag, Camera, Check, Crown, Edit, AlertCircle, UserPlus, LogOut } from 'lucide-react';
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
  // 1. 모든 Hook은 최상단에
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeMemberIndex, setActiveMemberIndex] = useState(0);
  const [newMemo, setNewMemo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localChildLists, setLocalChildLists] = useState<ChildList[]>(childLists);
  const [editingMemoIndex, setEditingMemoIndex] = useState<number | null>(null);
  const [editingMemoText, setEditingMemoText] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const currentMember = members[activeMemberIndex] || null;

  // 2. 유틸리티 함수
  const getTagParentId = () => parentLists.find(p => p.name === '태그' || p.type?.toLowerCase() === 'tags')?.id;
  const availableTags = useMemo(() => localChildLists.filter(c => c.parent_id === getTagParentId()), [localChildLists, parentLists]);

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

  const calculateAge = (b: string) => {
    if (!b) return null;
    const today = new Date();
    const birth = new Date(b);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const formatPhoneNumber = (v: string) => {
    const d = v.replace(/\D/g, '');
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 10)}`;
  };

  const handleDateChange = (field: keyof MemberData, val: string) => {
    const d = val.replace(/\D/g, '');
    let f = d;
    if (d.length > 4 && d.length <= 6) f = `${d.slice(0, 4)}-${d.slice(4)}`;
    else if (d.length > 6) f = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    updateMember(activeMemberIndex, { [field]: f });
  };

  const updateMember = (index: number, updates: Partial<MemberData>) => {
    const newMembers = [...members];
    if (newMembers[index]) {
      newMembers[index] = { ...newMembers[index], ...updates };
      setMembers(newMembers);
    }
  };

  // 3. 비즈니스 로직 (삭제, 수정, 독립, 중복체크)

  const checkDuplicateName = async (name: string) => {
    if (!name.trim() || initialData) { setDuplicateWarning(null); return; }
    try {
      const { data } = await supabase.from('members').select('korean_name, birthday').eq('korean_name', name.trim()).maybeSingle();
      if (data) setDuplicateWarning(`⚠️ 중복 이름: ${data.korean_name} (${data.birthday || '생일 미등록'})`);
      else setDuplicateWarning(null);
    } catch (err) { console.error(err); }
  };

  const handleDeleteCurrentMember = async () => {
    if (!currentMember) return;
    if (!confirm(`${currentMember.korean_name || '이 멤버'}를 정말 삭제하시겠습니까?`)) return;

    setLoading(true);
    try {
      if (currentMember.id) {
        const { error } = await supabase.from('members').delete().eq('id', currentMember.id);
        if (error) throw error;
      }
      const updated = members.filter((_, i) => i !== activeMemberIndex);
      if (updated.length === 0) {
        onSuccess('delete');
        onClose();
      } else {
        setMembers(sortMembers(updated));
        setActiveMemberIndex(0);
        onSuccess('delete');
      }
    } catch (err) { alert('삭제 실패'); } finally { setLoading(false); }
  };

  const handleMoveOutMember = async () => {
    if (!currentMember || !currentMember.id) { alert("저장된 멤버만 독립 가능합니다."); return; }
    if (!confirm(`${currentMember.korean_name}님을 새로운 세대로 독립시키겠습니까?`)) return;

    setLoading(true);
    try {
      const { data: newFam, error: fErr } = await supabase.from('families').insert({ family_name: currentMember.korean_name }).select().single();
      if (fErr) throw fErr;
      const { error: uErr } = await supabase.from('members').update({ family_id: newFam.id, relationship: 'Head' }).eq('id', currentMember.id);
      if (uErr) throw uErr;
      onSuccess('save', currentMember.id);
      onClose();
    } catch (err) { alert("독립 처리 실패"); } finally { setLoading(false); }
  };

  const handleAddExistingMember = async () => {
    const name = prompt("가족으로 추가할 멤버의 정확한 '한글 이름'을 입력하세요.");
    if (!name) return;
    setLoading(true);
    try {
      const { data: target } = await supabase.from('members').select('*').eq('korean_name', name).maybeSingle();
      if (!target) { alert("멤버를 찾을 수 없습니다."); return; }
      setMembers(sortMembers([...members, { ...target, is_head: false, tags: target.tags || [] }]));
    } catch (err) { alert("오류 발생"); } finally { setLoading(false); }
  };

  const handleSaveMembers = async () => {
    if (!members[0]?.korean_name?.trim()) { alert("이름은 필수입니다."); return; }
    setLoading(true);
    try {
      let familyId = initialData?.family_id || members.find(m => m.family_id)?.family_id || null;
      if (!familyId) {
        const { data: newFam } = await supabase.from('families').insert({ family_name: members[0].korean_name }).select().single();
        familyId = newFam.id;
      }
      let currentIdToReturn = '';
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const finalData = { ...m, family_id: familyId, birthday: m.birthday || null, baptism_date: m.baptism_date || null, registration_date: m.registration_date || null };
        const id = finalData.id;
        delete (finalData as any).id;
        delete (finalData as any).is_head;
        if (id) {
          await supabase.from('members').update(finalData).eq('id', id);
          if (i === activeMemberIndex) currentIdToReturn = id;
        } else {
          const { data: nData } = await supabase.from('members').insert(finalData).select().single();
          if (i === activeMemberIndex) currentIdToReturn = nData.id;
        }
      }
      onSuccess('save', currentIdToReturn);
    } catch (error) { alert('저장 실패'); } finally { setLoading(false); }
  };

  const handleAddMemo = () => {
    if (!newMemo.trim() || !currentMember) return;
    const ts = new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    const currentMemos = (currentMember.memo || "").split('\n\n').filter(Boolean);
    updateMember(activeMemberIndex, { memo: [`[${ts}] ${newMemo.trim()}`, ...currentMemos].join('\n\n') });
    setNewMemo('');
  };

  const handleUpdateMemo = (idx: number) => {
    const currentMemos = (currentMember.memo || "").split('\n\n').filter(Boolean);
    const match = currentMemos[idx].match(/^\[(.*?)\] (.*)$/s);
    const ts = match ? match[1] : new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    currentMemos[idx] = `[${ts}] ${editingMemoText.trim()}`;
    updateMember(activeMemberIndex, { memo: currentMemos.join('\n\n') });
    setEditingMemoIndex(null);
  };

  // 4. 데이터 로드 로직
  const loadFamily = async (member: any) => {
    setLoading(true);
    try {
      let fid = member.family_id;
      if (!fid && member.id) {
        const { data: latest } = await supabase.from('members').select('family_id').eq('id', member.id).single();
        fid = latest?.family_id;
      }
      if (fid) {
        const { data: fMembers } = await supabase.from('members').select('*').eq('family_id', fid);
        if (fMembers && fMembers.length > 0) {
          const mapped = fMembers.map(m => ({ ...m, is_head: m.relationship?.toLowerCase() === 'head' || m.relationship?.toLowerCase() === 'self', tags: m.tags || [] }));
          const sorted = sortMembers(mapped);
          setMembers(sorted);
          setActiveMemberIndex(sorted.findIndex(m => m.id === member.id));
          setLoading(false);
          return;
        }
      }
      setMembers([{ ...member, is_head: true, tags: member.tags || [] }]);
      setActiveMemberIndex(0);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (isOpen) {
      setDuplicateWarning(null);
      setLocalChildLists(childLists);
      if (initialData) loadFamily(initialData);
      else {
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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col animate-in fade-in zoom-in duration-300 overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">{initialData ? 'Edit Profile' : 'New Member Registration'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Sidebar */}
          <div className="hidden lg:flex w-60 border-r border-slate-100 bg-slate-50/50 flex-col py-4 gap-2 overflow-y-auto no-scrollbar">
            <div className="px-4 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
              <span>Family Members</span>
              <button onClick={handleAddExistingMember} title="기존 멤버 추가" className="text-blue-500 hover:text-blue-700"><UserPlus size={14}/></button>
            </div>
            {members.map((m, idx) => (
              <button key={idx} onClick={() => setActiveMemberIndex(idx)} className={`relative flex-shrink-0 flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl transition-all ${activeMemberIndex === idx ? 'bg-white shadow-md text-blue-800' : 'text-slate-400 hover:bg-white/50'}`}>
                <div className="relative flex-shrink-0 w-8 h-8">
                  {m.photo_url ? <img src={m.photo_url} className="w-full h-full object-cover rounded-lg" /> : <User size={16} className="m-2" />}
                  {m.is_head && <div className="absolute -top-1 -left-1 bg-amber-400 text-white rounded-full p-0.5 border border-white"><Crown size={8} /></div>}
                </div>
                <span className="text-sm font-bold truncate">{m.korean_name || '새 멤버'}</span>
              </button>
            ))}
            <button onClick={() => setMembers([...members, { korean_name: '', english_name: '', gender: '', birthday: '', phone: '', email: '', address: members[0]?.address || '', relationship: '', is_baptized: false, baptism_date: '', registration_date: new Date().toISOString().split('T')[0], offering_number: '', for_slip: '', memo: '', photo_url: '', tags: [], status: 'Active', role: '', mokjang: '', is_head: false }])} className="mx-4 mt-2 p-2 rounded-xl border-2 border-dashed border-slate-300 text-slate-300 flex items-center justify-center hover:border-blue-400 transition-all"><Plus size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar">
            <div className="max-w-5xl mx-auto space-y-12">
              
              {/* Profile Header Row */}
              <div className="flex flex-col md:flex-row gap-10 items-start">
                <div className="flex flex-col items-center gap-4 mx-auto md:mx-0">
                  <div className="relative">
                    <div className="w-24 h-24 sm:w-40 sm:h-40 rounded-[2rem] sm:rounded-[2.5rem] bg-slate-100 ring-4 sm:ring-8 ring-slate-50 overflow-hidden flex items-center justify-center shadow-inner">
                      {currentMember?.photo_url ? <img src={currentMember.photo_url} className="w-full h-full object-cover" /> : <User size={32} className="text-slate-300 sm:w-12 sm:h-12" />}
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-1 right-1 w-8 h-8 sm:w-10 sm:h-10 bg-white shadow-xl rounded-xl flex items-center justify-center text-blue-600 hover:scale-110 transition-transform"><Camera size={16} /></button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if(file) {
                        setLoading(true);
                        const path = `member-photos/${Math.random()}.${file.name.split('.').pop()}`;
                        supabase.storage.from('photos').upload(path, file).then(({data}) => {
                          if(data) supabase.storage.from('photos').getPublicUrl(path).then(({data: {publicUrl}}) => updateMember(activeMemberIndex, { photo_url: publicUrl }));
                          setLoading(false);
                        });
                      }
                    }} />
                  </div>
                  {currentMember?.birthday && <div className="bg-blue-50 text-blue-800 px-4 py-1 rounded-full text-[13px] font-black uppercase tracking-widest">Age: {calculateAge(currentMember.birthday) ?? '-'}</div>}
                </div>

                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Korean Name</label>
                    <input type="text" value={currentMember?.korean_name || ''} onChange={(e) => { updateMember(activeMemberIndex, { korean_name: e.target.value }); checkDuplicateName(e.target.value); }} className="w-full bg-white border-b-2 border-slate-100 focus:border-blue-500 px-1 py-2 text-lg font-bold" />
                    {duplicateWarning && <div className="flex items-center gap-1 mt-1 text-red-500 font-bold text-[10px] animate-pulse"><AlertCircle size={12}/>{duplicateWarning}</div>}
                  </div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">English Name</label><input type="text" value={currentMember?.english_name || ''} onChange={(e) => updateMember(activeMemberIndex, { english_name: e.target.value })} className="w-full bg-white border-b-2 border-slate-100 focus:border-blue-500 px-1 py-2 text-lg font-bold" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Relationship</label><select value={currentMember?.relationship || ''} onChange={(e) => updateMember(activeMemberIndex, { relationship: e.target.value, is_head: (e.target.value === 'Head') })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none">{RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Gender</label>
                      <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => updateMember(activeMemberIndex, { gender: 'Male' })} className={`flex-1 py-1 rounded-lg text-[10px] font-black transition-all ${currentMember?.gender === 'Male' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400'}`}>남</button>
                        <button onClick={() => updateMember(activeMemberIndex, { gender: 'Female' })} className={`flex-1 py-1 rounded-lg text-[10px] font-black transition-all ${currentMember?.gender === 'Female' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400'}`}>여</button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Birthday</label><input type="text" value={currentMember?.birthday || ''} onChange={(e) => handleDateChange('birthday', e.target.value)} className="w-full bg-white border-b-2 border-slate-100 focus:border-blue-500 px-1 py-2 font-semibold" placeholder="YYYY-MM-DD" /></div>
                </div>
              </div>

              {/* Contact Information */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100"><div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Phone className="w-4 h-4 text-blue-600" /></div><h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Contact & Address</h3></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Phone Number</label><input type="tel" value={currentMember?.phone || ''} onChange={(e) => updateMember(activeMemberIndex, { phone: formatPhoneNumber(e.target.value) })} className="w-full bg-white border-b-2 border-slate-100 focus:border-blue-500 px-1 py-2 font-semibold" placeholder="000-000-0000" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Email</label><input type="email" value={currentMember?.email || ''} onChange={(e) => updateMember(activeMemberIndex, { email: e.target.value })} className="w-full bg-white border-b-2 border-slate-100 focus:border-blue-500 px-1 py-2 font-semibold" placeholder="example@email.com" /></div>
                  <div className="sm:col-span-2 space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Home Address</label><input type="text" value={currentMember?.address || ''} onChange={(e) => updateMember(activeMemberIndex, { address: e.target.value })} className="w-full bg-white border-b-2 border-slate-100 focus:border-blue-500 px-1 py-2 font-semibold" placeholder="Enter full address" /></div>
                </div>
              </section>

              {/* Church & Administration */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100"><div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Briefcase className="w-4 h-4 text-blue-600" /></div><h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Church & Administration</h3></div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registration Date</label><input type="text" value={currentMember?.registration_date || ''} onChange={(e) => handleDateChange('registration_date', e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold text-slate-700" placeholder="YYYY-MM-DD" /></div>
                  {['mokjang', 'role', 'status'].map(type => {
                    const parent = parentLists.find(p => p.type === type || p.name.includes(type === 'mokjang' ? '목장' : type === 'role' ? '직분' : '상태'));
                    return (<div key={type} className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">{parent?.name || type}</label><select value={(currentMember as any)?.[type] || ''} onChange={(e) => updateMember(activeMemberIndex, { [type]: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 outline-none appearance-none"><option value="">Select...</option>{childLists.filter(c => c.parent_id === parent?.id).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>);
                  })}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div className={`p-5 rounded-3xl border-2 transition-all flex flex-col gap-3 ${currentMember?.is_baptized ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-transparent'}`}>
                    <label className="flex items-center gap-3 cursor-pointer"><div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${currentMember?.is_baptized ? 'bg-sky-600 border-sky-600' : 'bg-white border-slate-200'}`}>{currentMember?.is_baptized && <Check size={14} className="text-white" />}</div><input type="checkbox" className="hidden" checked={currentMember?.is_baptized || false} onChange={(e) => updateMember(activeMemberIndex, { is_baptized: e.target.checked })} /><span className="text-sm font-bold text-slate-700">세례 여부</span></label>
                    {currentMember?.is_baptized && (<div className="animate-in fade-in slide-in-from-top-1"><label className="text-[14px] font-bold text-slate-700 uppercase tracking-widest ml-1">세례일</label><input type="text" value={currentMember?.baptism_date || ''} onChange={(e) => handleDateChange('baptism_date', e.target.value)} className="w-full bg-transparent border-b py-1 text-sm font-bold text-sky-800 focus:outline-none ml-1 outline-none" placeholder="YYYY-MM-DD" /></div>)}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Offering #</label><input type="text" value={currentMember?.offering_number || ''} onChange={(e) => updateMember(activeMemberIndex, { offering_number: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold outline-none" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Slip #</label><input type="text" value={currentMember?.for_slip || ''} onChange={(e) => updateMember(activeMemberIndex, { for_slip: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold outline-none" /></div>
                  </div>
                </div>
              </section>

              {/* Tags Section */}
              <section className="space-y-6 p-8 bg-slate-50/50 rounded-[2rem]">
                <div className="flex items-center gap-2"><Tag className="text-purple-500" size={20} /><h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Global Tags</h3></div>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <button key={tag.id} onClick={() => {
                        const cur = currentMember?.tags || [];
                        const next = cur.includes(tag.name) ? cur.filter(t => t !== tag.name) : [...cur, tag.name];
                        updateMember(activeMemberIndex, { tags: Array.from(new Set(next)) });
                    }} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${currentMember?.tags?.includes(tag.name) ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500'}`}>#{tag.name}</button>
                  ))}
                  <div className="relative flex items-center"><input type="text" placeholder="New Tag..." className="pl-4 pr-10 py-2 rounded-xl border-2 border-dashed border-slate-200 focus:border-purple-400 outline-none text-xs font-bold w-32" onKeyDown={(e) => { if (e.key === 'Enter') { handleAddTag((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ''; } }} /><Plus className="absolute right-3 w-4 h-4 text-slate-300" /></div>
                </div>
              </section>

              {/* Memo Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-2"><Info className="text-amber-500" size={20} /><h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Memo Log</h3></div>
                <div className="flex gap-4">
                  <textarea value={newMemo} onChange={(e) => setNewMemo(e.target.value)} placeholder="새로운 메모 작성..." className="flex-1 bg-slate-50 border-none rounded-[1.5rem] px-6 py-4 text-sm min-h-[80px] focus:ring-2 focus:ring-amber-200" />
                  <button onClick={handleAddMemo} className="px-8 bg-amber-500 text-white rounded-2xl font-black text-sm hover:bg-sky-600 shadow-lg h-20 self-end transition-all">메모 저장</button>
                </div>
                <div className="space-y-3">
                  {(currentMember?.memo || "").split('\n\n').filter(Boolean).map((m, i) => {
                    const isEditing = editingMemoIndex === i;
                    const match = m.match(/^\[(.*?)\] (.*)$/s);
                    const ts = match ? match[1] : 'LOG';
                    const content = match ? match[2] : m;
                    return (
                      <div key={i} className="group p-5 bg-white border border-slate-100 rounded-3xl relative hover:shadow-md transition-shadow">
                        {isEditing ? (
                          <div className="space-y-3"><textarea autoFocus value={editingMemoText} onChange={(e) => setEditingMemoText(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-100" rows={3} /><div className="flex justify-end gap-2"><button onClick={() => setEditingMemoIndex(null)} className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600">취소</button><button onClick={() => handleUpdateMemo(i)} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm">저장</button></div></div>
                        ) : (
                          <><div className="flex justify-between mb-2"><span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-md">{ts}</span><div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2"><button onClick={() => { setEditingMemoIndex(i); setEditingMemoText(content); }} className="text-slate-400 hover:text-blue-500"><Edit size={14}/></button><button onClick={() => {
                              const curMemos = currentMember.memo.split('\n\n').filter(Boolean);
                              updateMember(activeMemberIndex, { memo: curMemos.filter((_, idx) => idx !== i).join('\n\n') });
                            }} className="text-slate-400 hover:text-rose-500"><Trash2 size={14}/></button></div></div><p className="text-sm text-slate-600 font-medium whitespace-pre-wrap">{content}</p></>
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
          <div className="flex gap-2">
             <button onClick={handleDeleteCurrentMember} className="flex items-center gap-2 px-4 py-2 text-rose-500 font-bold hover:bg-rose-50 rounded-xl transition-all text-xs uppercase tracking-widest"><Trash2 size={18} /> Delete</button>
             <button onClick={handleMoveOutMember} className="flex items-center gap-2 px-4 py-2 text-slate-500 font-bold hover:bg-rose-50 rounded-xl transition-all text-xs uppercase tracking-widest"><LogOut size={18} /> 독립시키기</button>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-3 rounded-2xl text-slate-400 font-bold hover:bg-slate-50 text-sm uppercase tracking-widest">Cancel</button>
            <button onClick={handleSaveMembers} disabled={loading} className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 flex items-center gap-2 text-sm uppercase tracking-widest">{loading ? 'Saving...' : 'Save Profile'}<Save size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
