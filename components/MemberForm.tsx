import React, { useState, useEffect, useRef } from 'react';
import { X, Save, User, Phone, Mail, MapPin, Calendar, Briefcase, Info, Plus, Trash2, ChevronDown, ChevronUp, Tag, Camera, Check, Crown, Edit } from 'lucide-react';
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
  onSuccess: () => void;
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
  const [editingMemoIndex, setEditingMemoIndex] = useState<number | null>(null);
  const [editingMemoText, setEditingMemoText] = useState('');
  const [localChildLists, setLocalChildLists] = useState<ChildList[]>(childLists);


  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      setLocalChildLists(childLists);
      if (initialData) {
        loadFamily(initialData);
      } else {
        setMembers([createEmptyMember(true)]);
        setActiveMemberIndex(0);
      }
    } else {
      window.removeEventListener('keydown', handleEsc);
      setMembers([]);
      setActiveMemberIndex(0);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, initialData, onClose, childLists]);

  const sortMembers = (memberList: MemberData[]) => {
    const getRank = (rel: string) => {
      const r = rel?.toLowerCase();
      if (r === 'head' || r === 'self') return 1;
      if (r === 'spouse') return 2;
      return 3;
    };

    return [...memberList].sort((a, b) => {
      const rankA = getRank(a.relationship);
      const rankB = getRank(b.relationship);
      if (rankA !== rankB) return rankA - rankB;
      if (!a.birthday) return 1;
      if (!b.birthday) return -1;
      return new Date(a.birthday).getTime() - new Date(b.birthday).getTime();
    });
  };

  const loadFamily = async (member: any) => {
    try {
      setLoading(true);
      if (member.family_id) {
        const { data } = await supabase.from('members').select('*').eq('family_id', member.family_id);
        if (data) {
          const mapped = data.map(m => ({
            ...m,
            is_head: m.relationship?.toLowerCase() === 'head' || m.relationship?.toLowerCase() === 'self',
            tags: m.tags || []
          }));
          const sorted = sortMembers(mapped);
          setMembers(sorted);
          const idx = sorted.findIndex(m => m.id === member.id);
          setActiveMemberIndex(idx >= 0 ? idx : 0);
        }
      } else {
        setMembers([{ ...member, is_head: true, tags: member.tags || [] }]);
        setActiveMemberIndex(0);
      }
    } catch (err) {
      console.error('Error loading family:', err);
    } finally {
      setLoading(false);
    }
  };

  const createEmptyMember = (isHead = false): MemberData => {
    const firstMember = members && members.length > 0 ? members[0] : null;
    return {
      korean_name: '',
      english_name: '',
      gender: '',
      birthday: '',
      phone: '',
      email: '',
      address: firstMember?.address || '',
      relationship: isHead ? 'Head' : '',
      is_baptized: false,
      baptism_date: '',
      registration_date: new Date().toISOString().split('T')[0],
      offering_number: '',
      for_slip: '',
      memo: '',
      photo_url: '',
      tags: [],
      status: 'Active',
      role: '',
      mokjang: firstMember?.mokjang || '',
      is_head: isHead
    };
  };

  const handleAddFamilyMember = () => {
    const newMember = createEmptyMember(false);
    const updatedMembers = sortMembers([...members, newMember]);
    setMembers(updatedMembers);
    const newIdx = updatedMembers.findIndex(m => m === newMember);
    setActiveMemberIndex(newIdx >= 0 ? newIdx : updatedMembers.length - 1);
  };

  const updateMember = (index: number, updates: Partial<MemberData>) => {
    if (!members[index]) return;
    const newMembers = [...members];
    const current = newMembers[index];
    const updated = { ...current, ...updates };

    if (updates.relationship) {
      const head = newMembers.find(m => m.is_head);
      if (updates.relationship === 'Spouse' && head?.gender) {
        updated.gender = head.gender === 'Male' ? 'Female' : 'Male';
      } else if (updates.relationship === 'Son') {
        updated.gender = 'Male';
      } else if (updates.relationship === 'Daughter') {
        updated.gender = 'Female';
      }
    }

    newMembers[index] = updated;
    
    if (updates.relationship || updates.birthday) {
      const sorted = sortMembers(newMembers);
      setMembers(sorted);
      const newIdx = sorted.findIndex(m => m.korean_name === updated.korean_name && m.birthday === updated.birthday);
      if (newIdx >= 0) setActiveMemberIndex(newIdx);
    } else {
      setMembers(newMembers);
    }
  };

  const handleAddMemo = () => {
    const currentMember = members[activeMemberIndex];
    if (!newMemo.trim() || !currentMember) return;
    const timestamp = new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    const memoEntry = `[${timestamp}] ${newMemo.trim()}`;
    const currentMemos = currentMember.memo ? String(currentMember.memo).split('\n\n').map(m => m.trim()).filter(Boolean) : [];
    const updatedMemo = [memoEntry, ...currentMemos].join('\n\n');
    updateMember(activeMemberIndex, { memo: updatedMemo });
    setNewMemo('');
  };

  const handleUpdateMemo = (index: number) => {
    const currentMember = members[activeMemberIndex];
    if (!editingMemoText.trim() || !currentMember) return;
    const currentMemos = currentMember.memo ? String(currentMember.memo).split('\n\n').map(m => m.trim()).filter(Boolean) : [];
    const entry = currentMemos[index];
    const match = entry.match(/^\[(.*?)\] (.*)$/s);
    const timestamp = match ? match[1] : new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    currentMemos[index] = `[${timestamp}] ${editingMemoText.trim()}`;
    updateMember(activeMemberIndex, { memo: currentMemos.join('\n\n') });
    setEditingMemoIndex(null);
    setEditingMemoText('');
  };

  const handleDeleteMemo = (index: number) => {
    const currentMember = members[activeMemberIndex];
    if (!confirm('이 메모를 삭제하시겠습니까?') || !currentMember) return;
    const currentMemos = currentMember.memo ? String(currentMember.memo).split('\n\n').map(m => m.trim()).filter(Boolean) : [];
    const updatedMemos = currentMemos.filter((_, i) => i !== index);
    updateMember(activeMemberIndex, { memo: updatedMemos.join('\n\n') });
  };

  const handleDeleteMember = async (index: number) => {
    const memberToDelete = members[index];
    if (!memberToDelete) return;
    if (!confirm(`${memberToDelete.korean_name || '이 멤버'}를 삭제하시겠습니까?`)) return;

    let updatedMembers = members.filter((_, i) => i !== index);
    
    if (memberToDelete.is_head && updatedMembers.length > 0) {
      const spouseIdx = updatedMembers.findIndex(m => m.relationship?.toLowerCase() === 'spouse');
      if (spouseIdx >= 0) {
        updatedMembers[spouseIdx] = { ...updatedMembers[spouseIdx], is_head: true, relationship: 'Head' };
      } else {
        updatedMembers[0] = { ...updatedMembers[0], is_head: true, relationship: 'Head' };
      }
    }

    if (memberToDelete.id) {
      try {
        setLoading(true);
        const { error } = await supabase.from('members').delete().eq('id', memberToDelete.id);
        if (error) throw error;
      } catch (error) {
        console.error('Error deleting member:', error);
        alert('멤버 삭제 중 오류가 발생했습니다.');
        return;
      } finally {
        setLoading(false);
      }
    }

    setMembers(sortMembers(updatedMembers));
    setActiveMemberIndex(0);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      let familyId = initialData?.family_id;
      if (!familyId) {
        const head = members.find(m => m.is_head) || members[0];
        const { data: familyData, error: familyError } = await supabase
          .from('families')
          .insert({ name: head.korean_name })
          .select()
          .single();
        if (familyError) throw familyError;
        familyId = familyData.id;
      }

      for (const member of members) {
        const memberData = { ...member, family_id: familyId };
        delete (memberData as any).is_head;
        
        if (member.id) {
          const { error } = await supabase.from('members').update(memberData).eq('id', member.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('members').insert(memberData);
          if (error) throw error;
        }
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving members:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = async (tagName: string) => {
  const trimmedName = tagName.trim();
  if (!trimmedName) return;
  
  const tagParent = parentLists.find(
    p => p.name.toLowerCase().includes('태그') || p.type === 'tags'
  );
  if (!tagParent) {
    alert('태그 카테고리를 찾을 수 없습니다. 시스템 설정에서 "태그" 카테고리를 먼저 생성해주세요.');
    return;
  }

  try {
    // 로컬 기준으로 기존 태그 확인
    let existingTag = localChildLists.find(
      c => c.parent_id === tagParent.id && c.name === trimmedName
    );

    if (!existingTag) {
      const tags = localChildLists.filter(c => c.parent_id === tagParent.id);
      const maxOrder = tags.length > 0
        ? Math.max(...tags.map(t => (t as any).order || 0))
        : 0;

      const { data: newTag, error } = await supabase
        .from('child_lists')
        .insert({
          parent_id: tagParent.id,
          name: trimmedName,
          order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      existingTag = newTag;

      // ⭐ 즉시 UI 반영
      setLocalChildLists(prev => [...prev, newTag]);
    }

    // ⭐ 현재 멤버에게 자동 체크
    const currentTags = members[activeMemberIndex].tags || [];
    if (!currentTags.includes(trimmedName)) {
      updateMember(activeMemberIndex, {
        tags: [...currentTags, trimmedName],
      });
    }
  } catch (err: any) {
    console.error('Error adding tag:', err);
    alert('태그 추가 중 오류가 발생했습니다: ' + err.message);
  }
};

  if (!isOpen) return null;

  const currentMember = members[activeMemberIndex];

  if (!currentMember) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[#3c8fb5] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600 font-bold">Loading member data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col animate-in fade-in zoom-in duration-300 overflow-hidden">
        
        {/* Header */}
        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              {initialData ? 'Edit Member Profile' : 'Register New Member'}
              <span className="text-sm font-medium text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                {members.length} Family Members
              </span>
            </h2>
            <p className="text-slate-500 mt-1 font-medium">Manage personal information and family relationships</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white hover:shadow-md rounded-2xl transition-all text-slate-400 hover:text-slate-600">
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 border-r border-slate-100 bg-slate-50/30 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            <div className="space-y-2">
              {members.map((m, idx) => (
                <div key={idx} onClick={() => setActiveMemberIndex(idx)} 
                     className={`group relative flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border-2 ${activeMemberIndex === idx ? 'bg-white border-[#3c8fb5] shadow-lg shadow-blue-100 -translate-y-0.5' : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'}`}>
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden ${activeMemberIndex === idx ? 'bg-blue-50' : 'bg-slate-100'}`}>
                      {m.photo_url ? <img src={m.photo_url} alt="" className="w-full h-full object-cover" /> : <User className={`w-6 h-6 ${activeMemberIndex === idx ? 'text-[#3c8fb5]' : 'text-slate-300'}`} />}
                    </div>
                    {m.is_head && <div className="absolute -top-2 -left-2 w-6 h-6 bg-amber-400 rounded-lg flex items-center justify-center shadow-sm border-2 border-white"><Crown className="w-3 h-3 text-white" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 truncate">{m.korean_name || 'New Member'}</div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{m.relationship || (m.is_head ? 'Head' : 'Relation?')}</div>
                  </div>
                  {members.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteMember(idx); }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={handleAddFamilyMember} className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-bold hover:border-[#3c8fb5] hover:text-[#3c8fb5] hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> Add Family Member
            </button>
          </div>

          {/* Main Form Area */}
          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-12">
              
              {/* Profile Header Section */}
              <div className="flex items-center gap-10">
                <div className="relative group">
                  <div className="w-40 h-40 rounded-[2.5rem] bg-slate-100 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                    {currentMember.photo_url ? <img src={currentMember.photo_url} alt="" className="w-full h-full object-cover" /> : <User className="w-16 h-16 text-slate-200" />}
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-2 -right-2 w-12 h-12 bg-[#3c8fb5] text-white rounded-2xl shadow-lg flex items-center justify-center hover:scale-110 transition-all border-4 border-white">
                    <Camera className="w-5 h-5" />
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, activeMemberIndex)} />
                </div>
                <div className="flex-1 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Relationship</label>
                      <select value={currentMember.relationship} onChange={(e) => updateMember(activeMemberIndex, { relationship: e.target.value, is_head: e.target.value === 'Head' })} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800 appearance-none">
                        <option value="">Select Relationship</option>
                        {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                      <div className="flex p-1 bg-slate-100 rounded-2xl">
                        {['Male', 'Female'].map(g => (
                          <button key={g} onClick={() => updateMember(activeMemberIndex, { gender: g as any })} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${currentMember.gender === g ? 'bg-white text-[#3c8fb5] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{g}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Info Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><User className="w-4 h-4 text-[#3c8fb5]" /></div>
                  <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Personal Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Korean Name</label>
                    <input type="text" value={currentMember.korean_name} onChange={(e) => updateMember(activeMemberIndex, { korean_name: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800" placeholder="홍길동" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">English Name</label>
                    <input type="text" value={currentMember.english_name} onChange={(e) => updateMember(activeMemberIndex, { english_name: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800" placeholder="Gildong Hong" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Birthday</label>
                    <input type="date" value={currentMember.birthday} onChange={(e) => updateMember(activeMemberIndex, { birthday: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Registration Date</label>
                    <input type="date" value={currentMember.registration_date} onChange={(e) => updateMember(activeMemberIndex, { registration_date: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800" />
                  </div>
                </div>
              </section>

              {/* Contact Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Phone className="w-4 h-4 text-[#3c8fb5]" /></div>
                  <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Contact & Address</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                    <input type="tel" value={currentMember.phone} onChange={(e) => updateMember(activeMemberIndex, { phone: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800" placeholder="000-000-0000" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                    <input type="email" value={currentMember.email} onChange={(e) => updateMember(activeMemberIndex, { email: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800" placeholder="example@email.com" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Home Address</label>
                    <input type="text" value={currentMember.address} onChange={(e) => updateMember(activeMemberIndex, { address: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800" placeholder="Enter full address" />
                  </div>
                </div>
              </section>

              {/* Church Info Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Briefcase className="w-4 h-4 text-[#3c8fb5]" /></div>
                  <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Church & Administration</h3>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  {parentLists?.filter(p => !['tags', '태그'].some(s => p.name.toLowerCase().includes(s))).map(parent => (
                    <div key={parent.id} className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">{parent.name}</label>
                      <select value={(currentMember as any)[parent.type] || ''} onChange={(e) => updateMember(activeMemberIndex, { [parent.type]: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800 appearance-none">
                        <option value="">Select {parent.name}</option>
                        {childLists?.filter(c => c.parent_id === parent.id).map(child => (
                          <option key={child.id} value={child.name}>{child.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${currentMember.is_baptized ? 'bg-[#3c8fb5] border-[#3c8fb5]' : 'border-slate-300 group-hover:border-[#3c8fb5]'}`}>
                        {currentMember.is_baptized && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <input type="checkbox" className="hidden" checked={currentMember.is_baptized} onChange={(e) => updateMember(activeMemberIndex, { is_baptized: e.target.checked })} />
                      <span className="font-bold text-slate-700">세례 여부 (Baptized)</span>
                    </label>
                    {currentMember.is_baptized && (
                      <div className="space-y-1.5 animate-in slide-in-from-top-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Baptism Date</label>
                        <input type="date" value={currentMember.baptism_date} onChange={(e) => updateMember(activeMemberIndex, { baptism_date: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white border-slate-200 focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800 text-sm" />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Offering #</label>
                      <input type="text" value={currentMember.offering_number} onChange={(e) => updateMember(activeMemberIndex, { offering_number: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800" placeholder="000" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Slip #</label>
                      <input type="text" value={currentMember.for_slip} onChange={(e) => updateMember(activeMemberIndex, { for_slip: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800" placeholder="000" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Tags Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Tag className="w-4 h-4 text-[#3c8fb5]" /></div>
                  <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Tags & Categories</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {localChildLists
                    .filter(c => {
                      const p = parentLists.find(pl => pl.id === c.parent_id);
                      return p?.type === 'tags' || p?.name.toLowerCase().includes('태그');
                    })
                    .sort((a, b) => (Number((a as any).order) || 0) - (Number((b as any).order) || 0))
                    .map(tag => (
                      <label
                        key={tag.id}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all ${
                          (currentMember.tags || []).includes(tag.name)
                            ? 'bg-blue-50 border-[#3c8fb5] text-[#3c8fb5]'
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={(currentMember.tags || []).includes(tag.name)}
                          onChange={(e) => {
                            const currentTags = currentMember.tags || [];
                            const newTags = e.target.checked
                              ? [...currentTags, tag.name]
                              : currentTags.filter(t => t !== tag.name);
                            updateMember(activeMemberIndex, { tags: newTags });
                          }}
                        />
                        <span className="text-sm font-bold">{tag.name}</span>
                      </label>
                    ))}

                  <div className="relative flex items-center">
                    <input type="text" placeholder="Add Tag..." className="pl-4 pr-10 py-2 rounded-xl border-2 border-dashed border-slate-200 focus:border-[#3c8fb5] focus:outline-none text-sm font-bold w-32 transition-all focus:w-48" 
                           onKeyDown={(e) => { if (e.key === 'Enter') { handleAddTag((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ''; } }} />
                    <Plus className="absolute right-3 w-4 h-4 text-slate-300" />
                  </div>
                </div>
              </section>

              {/* Memo Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Info className="w-4 h-4 text-[#3c8fb5]" /></div>
                  <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Administrative Memo Log</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <textarea 
                      value={newMemo} 
                      onChange={(e) => setNewMemo(e.target.value)} 
                      className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-medium text-slate-700 min-h-[80px] text-sm" 
                      placeholder="새로운 메모를 입력하세요..." 
                    />
                    <button 
                      onClick={handleAddMemo}
                      className="px-6 bg-[#3c8fb5] text-white rounded-2xl font-bold hover:bg-[#327a9c] transition-colors flex items-center justify-center"
                    >
                      등록
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {currentMember.memo ? String(currentMember.memo).split('\n\n').map(m => m.trim()).filter(Boolean).map((entry, i) => {
                      const match = String(entry).match(/^\[(.*?)\] (.*)$/s);
                      const timestamp = match ? match[1] : '';
                      const content = match ? match[2] : String(entry);

                      return (
                        <div key={i} className="group/memo p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 relative">
                          {editingMemoIndex === i ? (
                            <div className="space-y-2">
                              <textarea 
                                value={editingMemoText} 
                                onChange={(e) => setEditingMemoText(e.target.value)}
                                className="w-full p-3 rounded-xl border-slate-200 text-sm focus:border-[#3c8fb5] focus:ring-2 focus:ring-blue-50"
                                rows={3}
                              />
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setEditingMemoIndex(null)} className="px-3 py-1 text-xs font-bold text-slate-400 hover:text-slate-600">취소</button>
                                <button onClick={() => handleUpdateMemo(i)} className="px-3 py-1 text-xs font-bold text-white bg-[#3c8fb5] rounded-lg">저장</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between items-start">
                                <div className="text-[10px] font-bold text-[#3c8fb5] uppercase tracking-widest">{timestamp || '기존 메모'}</div>
                                <div className="flex gap-1 opacity-0 group-hover/memo:opacity-100 transition-opacity">
                                  <button onClick={() => { setEditingMemoIndex(i); setEditingMemoText(content); }} className="p-1 hover:bg-blue-100 rounded text-blue-600"><Edit className="w-3 h-3" /></button>
                                  <button onClick={() => handleDeleteMemo(i)} className="p-1 hover:bg-red-100 rounded text-red-600"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              </div>
                              <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{content}</div>
                            </>
                          )}
                        </div>
                      );
                    }) : (
                      <div className="py-10 text-center text-slate-400 font-medium text-sm bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                        등록된 메모가 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {members.map((m, i) => (
                <div key={i} className={`w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden shadow-sm ${activeMemberIndex === i ? 'ring-2 ring-[#3c8fb5] ring-offset-2' : ''}`}>
                  {m.photo_url ? <img src={m.photo_url} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-slate-400" />}
                </div>
              ))}
            </div>
            <span className="text-sm font-bold text-slate-500">Ready to save {members.length} profiles</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:bg-white hover:shadow-md transition-all">Cancel</button>
            <button onClick={handleSave} disabled={loading} style={{ backgroundColor: '#3c8fb5' }} className="px-10 py-4 rounded-2xl font-bold text-white shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
              {initialData ? 'Update All Profiles' : 'Complete Registration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
