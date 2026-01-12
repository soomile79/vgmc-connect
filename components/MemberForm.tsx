//MemberForm.tsx
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
  is_head: boolean; // ← 이건 프론트에서만 쓰는 플래그
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
  const [editingMemoIndex, setEditingMemoIndex] = useState<number | null>(null);
  const [editingMemoText, setEditingMemoText] = useState('');
  const [localChildLists, setLocalChildLists] = useState<ChildList[]>(childLists);

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [showHeadTransferModal, setShowHeadTransferModal] = useState<{ index: number; members: MemberData[] } | null>(null);

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const calculateAge = (birthday: string) => {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleDateChange = (field: keyof MemberData, value: string) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');
    
    // Format as yyyy-mm-dd automatically
    let formatted = '';
    if (numbers.length <= 4) {
      formatted = numbers;
    } else if (numbers.length <= 6) {
      formatted = `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
    } else {
      formatted = `${numbers.slice(0, 4)}-${numbers.slice(4, 6)}-${numbers.slice(6, 8)}`;
    }
    
    updateMember(activeMemberIndex, { [field]: formatted });
  };

  const checkDuplicateName = async (name: string) => {
    if (!name.trim()) {
      setDuplicateWarning(null);
      return;
    }

    // 1. Check if name exists in the current family members being added (excluding the active one)
    const isDuplicateInForm = members.some((m, idx) => 
      idx !== activeMemberIndex && m.korean_name.trim() === name.trim()
    );

    if (isDuplicateInForm) {
      setDuplicateWarning(`⚠️ 현재 입력 중인 가족 명단에 이미 같은 이름이 있습니다.`);
      return;
    }

    // 2. Check database (only for new members, not when editing existing ones)
    if (!initialData) {
      try {
        const { data, error } = await supabase
          .from('members')
          .select('korean_name, birthday')
          .eq('korean_name', name.trim())
          .maybeSingle();
        
        if (data) {
          setDuplicateWarning(`⚠️ 이미 등록된 이름입니다: ${data.korean_name} (${data.birthday || '생일 미등록'})`);
        } else {
          setDuplicateWarning(null);
        }
      } catch (err) {
        console.error('Duplicate check error:', err);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  useEffect(() => {
  if (!isOpen) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();   // ⭐ 아래 Detail로 전파 차단
      onClose();             // X 버튼과 동일
    }
  };

  window.addEventListener('keydown', handleKeyDown, true); // ⭐ capture
  return () => window.removeEventListener('keydown', handleKeyDown, true);
}, [isOpen, onClose]);



  useEffect(() => {
    if (members[activeMemberIndex]) {
      checkDuplicateName(members[activeMemberIndex].korean_name);
    } else {
      setDuplicateWarning(null);
    }
  }, [activeMemberIndex, members]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      // if (e.key === 'Escape') onClose();
       };
    if (isOpen) {
      // window.addEventListener('keydown', handleEsc);
      setLocalChildLists(childLists);
      setDuplicateWarning(null);
      if (initialData) {
        loadFamily(initialData);
      } else {
        setMembers([createEmptyMember(true)]);
        setActiveMemberIndex(0);
      }
    } else {
      // window.removeEventListener('keydown', handleEsc);
      setMembers([]);
      setActiveMemberIndex(0);
      setDuplicateWarning(null);
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
    let newMembers = [...members];
    
    // If setting someone as Head, unset others
    if (updates.relationship === 'Head' || updates.is_head === true) {
      const currentHeadIndex = newMembers.findIndex(m => m.is_head);
      if (currentHeadIndex !== -1 && currentHeadIndex !== index) {
        if (confirm(`이미 대표자(${newMembers[currentHeadIndex].korean_name})가 있습니다. ${newMembers[index].korean_name}님을 새로운 대표자로 지정하시겠습니까?`)) {
          newMembers = newMembers.map((m, i) => ({
            ...m,
            is_head: i === index,
            relationship: i === index ? 'Head' : (m.relationship === 'Head' ? '' : m.relationship)
          }));
          updates.is_head = true;
          updates.relationship = 'Head';
        } else {
          // If user cancels, don't change to Head
          updates.is_head = false;
          if (updates.relationship === 'Head') updates.relationship = '';
        }
      } else {
        newMembers = newMembers.map((m, i) => ({
          ...m,
          is_head: i === index,
          relationship: i === index ? 'Head' : (m.relationship === 'Head' ? '' : m.relationship)
        }));
        updates.is_head = true;
        updates.relationship = 'Head';
      }
    }

    const updated = { ...newMembers[index], ...updates };

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

  const confirmDeleteMember = async (index: number, newHeadIndex?: number) => {
    const memberToDelete = members[index];
    if (!memberToDelete) return;

    let updatedMembers = members.filter((_, i) => i !== index);
    
    if (memberToDelete.is_head && updatedMembers.length > 0) {
      const headIdx = newHeadIndex !== undefined 
        ? (newHeadIndex > index ? newHeadIndex - 1 : newHeadIndex)
        : 0;
      
      updatedMembers = updatedMembers.map((m, i) => ({
        ...m,
        is_head: i === headIdx,
        relationship: i === headIdx ? 'Head' : m.relationship
      }));
    }

    if (memberToDelete.id) {
      try {
        setLoading(true);
        const { error } = await supabase.from('members').delete().eq('id', memberToDelete.id);
        if (error) throw error;

        // If this was the last member, we might want to delete the family record too
        if (updatedMembers.length === 0 && memberToDelete.family_id) {
          const { error: familyError } = await supabase.from('families').delete().eq('id', memberToDelete.family_id);
          if (familyError) console.error('Error deleting empty family:', familyError);
        }
      } catch (error) {
        console.error('Error deleting member:', error);
        alert('멤버 삭제 중 오류가 발생했습니다.');
        return;
      } finally {
        setLoading(false);
      }
    }

    // After any deletion, close the modal and refresh the list to go back to the main screen
    onSuccess('delete');
    onClose();
    setShowHeadTransferModal(null);
  };

  const handleDeleteMember = (index: number) => {
    const memberToDelete = members[index];
    if (!memberToDelete) return;
    
    if (!confirm(`${memberToDelete.korean_name || '이 멤버'}를 삭제하시겠습니까?`)) return;

    const otherMembers = members.filter((_, i) => i !== index);
    
    if (memberToDelete.is_head && otherMembers.length > 0) {
      setShowHeadTransferModal({ index, members: otherMembers });
    } else {
      confirmDeleteMember(index);
    }
  };

  const handleDeleteCurrentMember = () => {
    handleDeleteMember(activeMemberIndex);
  };

  const handleSave = async () => {
    // Validate that all members have a Korean name
    const membersWithoutName = members.filter(m => !m.korean_name || !m.korean_name.trim());
    if (membersWithoutName.length > 0) {
      alert(`⚠️ 한글 이름은 필수 입력 사항입니다.\n\n모든 가족 구성원의 한글 이름을 입력해주세요!`);
      
      // Switch to the first member without a name
      const firstMissingIdx = members.findIndex(m => !m.korean_name || !m.korean_name.trim());
      if (firstMissingIdx >= 0) setActiveMemberIndex(firstMissingIdx);
      return;
    }

    // Validate that all members have a relationship
    const membersWithoutRelationship = members.filter(m => !m.relationship);
    if (membersWithoutRelationship.length > 0) {
      const names = membersWithoutRelationship.map(m => m.korean_name || '이름 미입력').join(', ');
      alert(`⚠️ 가족 관계는 필수 조건입니다.\n\n가족 구성원 중 [${names}]님의 관계가 비어있으니 입력해주세요!`);
      
      // Switch to the first member without a relationship
      const firstMissingIdx = members.findIndex(m => !m.relationship);
      if (firstMissingIdx >= 0) setActiveMemberIndex(firstMissingIdx);
      return;
    }

    // Validate that there is exactly one Head
    const heads = members.filter(m => m.is_head || m.relationship === 'Head');
    if (heads.length === 0) {
      alert('⚠️ 가족 대표자(Head)가 지정되지 않았습니다. 한 명의 대표자를 지정해주세요.');
      return;
    }
    if (heads.length > 1) {
      alert('⚠️ 가족 대표자(Head)는 한 명이어야 합니다.');
      return;
    }

    try {
      setLoading(true);
      let familyId = initialData?.family_id;
      
      // 1. Create family if it doesn't exist
      if (!familyId) {
        const head = members.find(m => m.is_head) || members[0];
        const { data: familyData, error: familyError } = await supabase
          .from('families')
          .insert({ family_name: head.korean_name }) // Use family_name instead of name
          .select()
          .single();
        
        if (familyError) {
          console.error('Family creation error:', familyError);
          throw familyError;
        }
        familyId = familyData.id;
      }

      // 2. Save members
      for (const member of members) {
      const {
        id,
        korean_name,
        english_name,
        gender,
        birthday,
        phone,
        email,
        address,
        relationship,
        is_baptized,
        baptism_date,
        registration_date,
        offering_number,
        for_slip,
        memo,
        photo_url,
        tags,
        status,
        role,
        mokjang,
        // is_head는 DB에 없으므로 여기서 구조 분해만 하고 memberData에는 넣지 않음
        is_head,
      } = member;

      const memberData = {
        family_id: familyId,                    // members 테이블에 존재
        korean_name,
        english_name,
        gender: gender || null,                 // text + check
        birthday: birthday || null,             // date
        phone,
        email,
        address,
        mokjang,
        relationship,                           // Head / Spouse / Son ...
        is_baptized,
        baptism_date: baptism_date || null,     // date
        role,
        registration_date: registration_date || null, // date
        status,
        memo,
        offering_number,
        for_slip,
        tags,                                   // text[]
        // is_head 없음
      };

      if (id) {
        // UPDATE
        const { error } = await supabase
          .from('members')
          .update(memberData)
          .eq('id', id);

        if (error) {
          console.error('Member update error', error);
          throw error;
        }
      } else {
        // INSERT
        const { data, error } = await supabase
          .from('members')
          .insert(memberData)
          .select()
          .single();

        if (error) {
          console.error('Member insert error', error);
          throw error;
        }

        // 새로 생성된 멤버의 id를 상태에 반영
        setMembers(prev =>
          prev.map(m => (m === member ? { ...m, id: data.id } : m))
        );

        (member as any).id = data.id;
      }
    }   
      // Pass 'save' action and the ID of the active member to show their detail
      const savedMemberId = members[activeMemberIndex]?.id || initialData?.id;
      onSuccess('save', savedMemberId);
      // onClose(); 
    } catch (error: any) {
      console.error('Error saving members:', error);
      alert(`저장 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
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
    alert('태그 카테고리를 찾을 수 없습니다.');
    return;
  }

  try {
    const { data: existingTag } = await supabase
      .from('child_lists')
      .select('*')
      .eq('parent_id', tagParent.id)
      .eq('name', trimmedName)
      .maybeSingle();

    if (!existingTag) {
      const { error } = await supabase
        .from('child_lists')
        .insert({
          parent_id: tagParent.id,
          name: trimmedName,
          order: localChildLists.length + 1
        });
      if (error) throw error;
      
      setLocalChildLists(prev => [...prev, { id: Math.random().toString(), parent_id: tagParent.id, name: trimmedName }]);
    }

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `member-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      updateMember(index, { photo_url: publicUrl });
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('사진 업로드 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      {showHeadTransferModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full space-y-6 animate-in zoom-in duration-200">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-xl font-black text-slate-800">새로운 가족대표 선택</h3>
              <p className="text-slate-500 font-medium">가족대표를 삭제하시려면 새로운 대표자를 지정해야 합니다.</p>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {members.filter((_, i) => i !== showHeadTransferModal.index).map((m, i) => {
                const originalIndex = members.findIndex(mem => mem === m);
                return (
                  <button
                    key={i}
                    onClick={() => confirmDeleteMember(showHeadTransferModal.index, originalIndex)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-[#3c8fb5] hover:bg-blue-50 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden">
                      {m.photo_url ? <img src={m.photo_url} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-slate-300" />}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-bold text-slate-800 group-hover:text-[#3c8fb5]">{m.korean_name}</div>
                      <div className="text-xs font-bold text-slate-400 uppercase">{m.relationship}</div>
                    </div>
                    <ChevronDown className="w-5 h-5 text-slate-300 -rotate-90" />
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowHeadTransferModal(null)}
              className="w-full py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-all"
            >
              취소
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[98vh] sm:max-h-[95vh] flex flex-col animate-in fade-in zoom-in duration-300 overflow-hidden">
        
        {/* Header */}
        <div className="px-4 sm:px-10 py-4 sm:py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl sm:text-3xl font-black text-slate-800 flex items-center gap-2 sm:gap-3">
              {initialData ? 'Edit Profile' : 'New Member'}
              <span className="text-[10px] sm:text-sm font-medium text-slate-400 bg-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-slate-200 shadow-sm">
                {members.length} Members
              </span>
            </h2>
            <p className="hidden sm:block text-slate-500 mt-1 font-medium text-sm">Manage personal information and family relationships</p>
          </div>
          <button onClick={onClose} className="p-2 sm:p-3 hover:bg-white hover:shadow-md rounded-xl sm:rounded-2xl transition-all text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5 sm:w-7 sm:h-7" />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Sidebar - Horizontal on mobile, Vertical on desktop */}
          <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/30 overflow-x-auto lg:overflow-y-auto p-4 sm:p-6 flex lg:flex-col gap-4 custom-scrollbar">
            <div className="flex lg:flex-col gap-2 min-w-max lg:min-w-0">
              {members.map((m, idx) => (
                <div key={idx} onClick={() => setActiveMemberIndex(idx)} 
                     className={`group relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl cursor-pointer transition-all border-2 ${activeMemberIndex === idx ? 'bg-white border-[#3c8fb5] shadow-lg shadow-blue-100 lg:-translate-y-0.5' : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'}`}>
                  <div className="relative flex-shrink-0">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center overflow-hidden ${activeMemberIndex === idx ? 'bg-blue-50' : 'bg-slate-100'}`}>
                      {m.photo_url ? <img src={m.photo_url} alt="" className="w-full h-full object-cover" /> : <User className={`w-5 h-5 sm:w-6 sm:h-6 ${activeMemberIndex === idx ? 'text-[#3c8fb5]' : 'text-slate-300'}`} />}
                    </div>
                    {m.is_head && <div className="absolute -top-1.5 -left-1.5 sm:-top-2 sm:-left-2 w-5 h-5 sm:w-6 sm:h-6 bg-amber-400 rounded-lg flex items-center justify-center shadow-sm border-2 border-white"><Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" /></div>}
                  </div>
                  <div className="flex-1 min-w-0 pr-6 lg:pr-0">
                    <div className="font-bold text-slate-800 text-sm sm:text-base truncate">{m.korean_name || 'New Member'}</div>
                    <div className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">{m.relationship || (m.is_head ? 'Head' : 'Relation?')}</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteMember(idx); }}
                          className="absolute right-2 lg:static lg:opacity-0 lg:group-hover:opacity-100 p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
</div>
<button onClick={handleAddFamilyMember} className="flex-shrink-0 w-40 lg:w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-bold hover:border-[#3c8fb5] hover:text-[#3c8fb5] hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2 text-sm">
<Plus className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden sm:inline">Add Family</span><span className="sm:hidden">Add</span>
</button>
</div>

{/* Main Form Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-10 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-8 sm:space-y-12">
          
          {/* Profile Header Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
            <div className="relative group">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2rem] sm:rounded-[2.5rem] bg-slate-100 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                {currentMember.photo_url ? <img src={currentMember.photo_url} alt="" className="w-full h-full object-cover" /> : <User className="w-12 h-12 sm:w-16 sm:h-16 text-slate-200" />}
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-1 -right-1 sm:bottom-2 sm:-right-2 w-10 h-10 sm:w-12 sm:h-12 bg-[#3c8fb5] text-white rounded-xl sm:rounded-2xl shadow-lg flex items-center justify-center hover:scale-110 transition-all border-4 border-white">
                <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, activeMemberIndex)} />
              
              {currentMember.birthday && calculateAge(currentMember.birthday) !== null && (
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm whitespace-nowrap">
                  <span className="text-xs font-black text-[#3c8fb5]">Age: {calculateAge(currentMember.birthday)}</span>
                </div>
              )}
            </div>
            <div className="w-full sm:flex-1 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Relationship</label>
                  <div className="relative">
                    <select 
                      value={currentMember.relationship} 
                      onChange={(e) => updateMember(activeMemberIndex, { relationship: e.target.value, is_head: e.target.value === 'Head' })} 
                      className={`w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border-2 transition-all font-bold text-slate-800 appearance-none text-sm sm:text-base ${!currentMember.relationship ? 'border-red-400 focus:border-red-500' : 'border-transparent focus:bg-white focus:border-[#3c8fb5]'}`}
                    >
                      <option value="">Select Relationship</option>
                      {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {!currentMember.relationship && (
                      <p className="text-red-500 text-[10px] sm:text-xs font-bold mt-1 ml-1 animate-pulse">
                        ⚠️ 가족 관계를 선택해주세요!
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                  <div className="flex p-1 bg-slate-100 rounded-xl sm:rounded-2xl">
                    {['Male', 'Female'].map(g => (
                      <button 
                        key={g} 
                        onClick={() => updateMember(activeMemberIndex, { gender: g as any })} 
                        className={`flex-1 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all ${
                          currentMember.gender === g 
                            ? g === 'Male' 
                              ? 'bg-blue-500 text-white shadow-md' 
                              : 'bg-pink-300 text-white shadow-md' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Info Section */}
          <section className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 flex items-center justify-center"><User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#3c8fb5]" /></div>
              <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs sm:text-sm">Personal Information</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Korean Name</label>
                <input 
                  type="text" 
                  value={currentMember.korean_name} 
                  onChange={(e) => {
                    const newName = e.target.value;
                    updateMember(activeMemberIndex, { korean_name: newName });
                    checkDuplicateName(newName);
                  }} 
                  className={`w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border-2 transition-all font-bold text-slate-800 text-sm sm:text-base ${
                    (!currentMember.korean_name || !currentMember.korean_name.trim()) 
                      ? "border-red-400 focus:border-red-500" 
                      : duplicateWarning 
                        ? "border-orange-400 focus:border-orange-500" 
                        : "border-transparent focus:bg-white focus:border-[#3c8fb5]"
                  }`} 
                  placeholder="홍길동" 
                />
                {(!currentMember.korean_name || !currentMember.korean_name.trim()) && (
                  <p className="text-red-500 text-[10px] sm:text-xs font-bold mt-1 ml-1 animate-pulse">
                    ⚠️ 필수 입력 사항입니다!
                  </p>
                )}
                {currentMember.korean_name && currentMember.korean_name.trim() && duplicateWarning && (
                  <p className="text-orange-500 text-[10px] sm:text-xs font-bold mt-1 ml-1 animate-pulse">
                    {duplicateWarning}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">English Name</label>
                <input type="text" value={currentMember.english_name} onChange={(e) => updateMember(activeMemberIndex, { english_name: e.target.value })} className="w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800 text-sm sm:text-base" placeholder="Gildong Hong" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Birthday</label>
                <input 
                  type="text" 
                  value={currentMember.birthday} 
                  onChange={(e) => handleDateChange('birthday', e.target.value)} 
                  className="w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800 text-sm sm:text-base" 
                  placeholder="YYYY-MM-DD"
                  maxLength={10}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Registration Date</label>
                <input 
                  type="text" 
                  value={currentMember.registration_date} 
                  onChange={(e) => handleDateChange('registration_date', e.target.value)} 
                  className="w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800 text-sm sm:text-base" 
                  placeholder="YYYY-MM-DD"
                  maxLength={10}
                />
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#3c8fb5]" /></div>
              <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs sm:text-sm">Contact & Address</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                <input type="tel" value={currentMember.phone} onChange={(e) => updateMember(activeMemberIndex, { phone: formatPhoneNumber(e.target.value) })} className="w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800 text-sm sm:text-base" placeholder="000-000-0000" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <input type="email" value={currentMember.email} onChange={(e) => updateMember(activeMemberIndex, { email: e.target.value })} className="w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800 text-sm sm:text-base" placeholder="example@email.com" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Home Address</label>
                <input type="text" value={currentMember.address} onChange={(e) => updateMember(activeMemberIndex, { address: e.target.value })} className="w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800 text-sm sm:text-base" placeholder="Enter full address" />
              </div>
            </div>
          </section>

          {/* Church Info Section */}
          <section className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#3c8fb5]" /></div>
              <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs sm:text-sm">Church & Administration</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {parentLists?.filter(p => !['tags', '태그'].some(s => p.name.toLowerCase().includes(s))).map(parent => (
                <div key={parent.id} className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">{parent.name}</label>
                  <select value={(currentMember as any)[parent.type] || ''} onChange={(e) => updateMember(activeMemberIndex, { [parent.type]: e.target.value })} className="w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800 appearance-none text-sm sm:text-base">
                    <option value="">Select {parent.name}</option>
                    {childLists?.filter(c => c.parent_id === parent.id).map(child => (
                      <option key={child.id} value={child.name}>{child.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-50/50 border border-slate-100 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 flex items-center justify-center transition-all ${currentMember.is_baptized ? 'bg-[#3c8fb5] border-[#3c8fb5]' : 'border-slate-300 group-hover:border-[#3c8fb5]'}`}>
                    {currentMember.is_baptized && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={currentMember.is_baptized} onChange={(e) => updateMember(activeMemberIndex, { is_baptized: e.target.checked })} />
                  <span className="font-bold text-slate-700 text-sm sm:text-base">세례 여부 (Baptized)</span>
                </label>
                {currentMember.is_baptized && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Baptism Date</label>
                    <input 
                      type="text" 
                      value={currentMember.baptism_date} 
                      onChange={(e) => handleDateChange('baptism_date', e.target.value)} 
                      className="w-full px-4 py-2.5 rounded-xl bg-white border-slate-200 focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800 text-sm" 
                      placeholder="YYYY-MM-DD"
                      maxLength={10}
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Offering #</label>
                  <input type="text" value={currentMember.offering_number} onChange={(e) => updateMember(activeMemberIndex, { offering_number: e.target.value })} className="w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800 text-sm sm:text-base" placeholder="000" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Slip #</label>
                  <input type="text" value={currentMember.for_slip} onChange={(e) => updateMember(activeMemberIndex, { for_slip: e.target.value })} className="w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-[#3c8fb5] focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800 text-sm sm:text-base" placeholder="000" />
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
                          <div className="flex items-center justify-between">
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
        <div className="px-4 sm:px-10 py-4 sm:py-8 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="hidden sm:flex items-center gap-6">
            <div className="flex -space-x-3">
              {members.map((m, i) => (
                <div key={i} className="w-10 h-10 rounded-xl border-4 border-white bg-slate-100 flex items-center justify-center overflow-hidden shadow-sm">
                  {m.photo_url ? <img src={m.photo_url} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-slate-300" />}
                </div>
              ))}
            </div>
            <div className="text-sm font-bold text-slate-400">
              {members.length} members ready to save
            </div>
          </div>

          {/* Delete Button in the middle */}
          <div className="flex-1 flex justify-center">
            <button 
              onClick={handleDeleteCurrentMember}
              className="px-6 py-3 rounded-xl font-bold text-red-400 hover:text-red-600 hover:bg-red-50 transition-all flex items-center gap-2 text-sm"
            >
              <Trash2 className="w-4 h-4" /> Delete This Member
            </button>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <button onClick={onClose} className="flex-1 sm:flex-none px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-slate-400 hover:text-slate-600 hover:bg-white transition-all text-sm sm:text-base">Cancel</button>
            <button onClick={handleSave} disabled={loading} className="flex-[2] sm:flex-none px-6 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-[#3c8fb5] text-white font-black shadow-lg shadow-blue-100 hover:scale-105 hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50 disabled:scale-100 text-sm sm:text-base">
              {loading ? <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4 sm:w-5 sm:h-5" />}
              Complete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
