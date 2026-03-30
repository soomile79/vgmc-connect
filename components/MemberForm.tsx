import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Save, User, Phone, Mail, MapPin, Calendar, Briefcase,
  Info, Plus, Trash2, ChevronDown, Tag, Camera, Check,
  Crown, Edit, AlertCircle, UserPlus, LogOut, Users,
  Heart
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Cropper from 'react-easy-crop';

function PhotoZoomModal({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation(); // 🚀 다른 리스너들이 이 이벤트를 보지 못하게 즉시 차단
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true); // 🚀 캡처링 단계에서 먼저 가로챔
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose} // 배경 클릭 시 닫기
    >
      <button
        className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2"
        onClick={onClose}
      >
        <X size={48} />
      </button>
      <img
        src={url}
        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
        alt="Full Size"
        onClick={(e) => e.stopPropagation()} // 이미지 클릭 시에는 안 닫히게
      />
    </div>
  );
}

/* ================= IMAGE CROP HELPER ================= */
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg');
  });
}

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
  prayer_request: string;
  photo_url: string;
  tags: string[];
  status: string;
  role: string;
  mokjang: string;
  is_head: boolean;
  family_id?: string | null;
  department?: string; // 추가
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

const LOG_SEPARATOR = '┃LOG_SEP┃';

const smartSplitLogs = (raw: string) => {
  if (!raw) return [];
  if (raw.includes(LOG_SEPARATOR)) return raw.split(LOG_SEPARATOR).filter(Boolean);
  return raw.split(/\n+(?=\[)/g).filter(Boolean).map(s => s.trim());
};

const RELATIONSHIPS = ['Head', 'Spouse', 'Son', 'Daughter', 'Parent', 'Sibling', 'Other'];

export default function MemberForm({ isOpen, onClose, onSuccess, initialData, parentLists, childLists }: MemberFormProps) {
  /* ================= 1. HOOKS ================= */
  const [members, setMembers] = useState<MemberData[]>([]);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeMemberIndex, setActiveMemberIndex] = useState(0);
  const [logType, setLogType] = useState<'Memo' | 'Prayer'>('Memo');
  const [logText, setLogText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [localChildLists, setLocalChildLists] = useState<ChildList[]>(childLists);
  const [newTagName, setNewTagName] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [editingMemoIndex, setEditingMemoIndex] = useState<number | null>(null);
  const [editingMemoText, setEditingMemoText] = useState('');
  const [photoSignedUrl, setPhotoSignedUrl] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // 🚀 [추가] 구분자 및 날짜 수정을 위한 상태
  const SEPARATOR = '┃LOG_SEP┃';
  const getNow = () => new Date().toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
  const [logDate, setLogDate] = useState(getNow());

  const currentMember = members.length > 0 ? members[activeMemberIndex] : null;

  const currentRoleStyle = useMemo(() => {
    if (!currentMember) return null;
    const fromRole = roles.find(r => r.name === currentMember.role);
    if (fromRole) return fromRole;
    return roles.find(r => r.name === currentMember.department);
  }, [currentMember?.role, currentMember?.department, roles]);

  const roleBg = currentRoleStyle?.bg_color ?? 'bg-slate-100';
  const roleText = currentRoleStyle?.text_color ?? 'text-slate-500';

  const getTagParentId = () => {
    const found = parentLists.find(p =>
      p.name.includes('태그') ||
      p.name.toLowerCase().includes('tag') ||
      p.type?.toLowerCase() === 'tag' ||
      p.type?.toLowerCase() === 'tags'
    );
    return found?.id;
  };

  const availableTags = useMemo(() => {
    const parentId = getTagParentId();
    if (!parentId) return [];
    return localChildLists.filter(c => c.parent_id === parentId);
  }, [localChildLists, parentLists]);

  const birthdayInputRef = useRef<HTMLInputElement>(null);
  const baptismDateInputRef = useRef<HTMLInputElement>(null);
  const registrationDateInputRef = useRef<HTMLInputElement>(null);

  /* ================= 2. HELPERS ================= */

  const formatDate = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length <= 4) return v;
    if (v.length <= 6) return `${v.slice(0, 4)}-${v.slice(4)}`;
    return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  };

  const formatPhone = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length <= 3) return v;
    if (v.length <= 7) return `${v.slice(0, 3)}-${v.slice(3)}`;
    if (v.length <= 10) return `${v.slice(0, 3)}-${v.slice(3, 6)}-${v.slice(6)}`;
    return `${v.slice(0, 3)}-${v.slice(3, 7)}-${v.slice(7, 11)}`;
  };

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
    <div className="absolute -top-1 -left-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white flex items-center justify-center shadow-md z-10 border border-slate-50">
      <Crown size={12} className="text-amber-500 fill-amber-500 sm:w-4 sm:h-4" />
    </div>
  );

  /* ================= 3. ACTIONS ================= */

  const updateMember = (index: number, updates: Partial<MemberData>) => {
    setMembers(prevMembers => {
      const newMembers = [...prevMembers];
      if (!newMembers[index]) return prevMembers;

      const target = { ...newMembers[index], ...updates };
      newMembers[index] = target;

      if (updates.relationship === 'Spouse') {
        const head = newMembers.find(m => m.relationship === 'Head');
        if (head?.gender) {
          target.gender = head.gender === 'Male' ? 'Female' : 'Male';
        }
      } else if (updates.relationship === 'Son') target.gender = 'Male';
      else if (updates.relationship === 'Daughter') target.gender = 'Female';

      if (target.relationship === 'Head' && updates.gender) {
        const spouseIdx = newMembers.findIndex(m => m.relationship === 'Spouse');
        if (spouseIdx !== -1) {
          newMembers[spouseIdx] = {
            ...newMembers[spouseIdx],
            gender: updates.gender === 'Male' ? 'Female' : 'Male'
          };
        }
      }

      return newMembers;
    });
  };

  const handleAddFamilyMember = () => {
    const newM: MemberData = {
      korean_name: '', english_name: '', gender: '', birthday: '', phone: '', email: '',
      address: members[0]?.address || '',
      relationship: '',
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
    if (!parentId) {
      alert("부모 태그 카테고리를 찾을 수 없습니다. Setting 페이지를 확인해주세요.");
      return;
    }

    try {
      const { data, error } = await supabase.from('child_lists').insert({
        parent_id: parentId, name: name, order: localChildLists.length + 1
      }).select().single();
      if (error) throw error;

      setLocalChildLists(prev => [...prev, data]);
      updateMember(activeMemberIndex, { tags: Array.from(new Set([...currentMember.tags, name])) });
      setNewTagName('');
    } catch (err) { alert("태그 추가 실패"); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 1. 파일을 읽어서 크롭 화면을 먼저 띄웁니다 (직접 업로드 X)
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImageToCrop(reader.result as string);
    });
    reader.readAsDataURL(file);
    e.target.value = ''; // 파일 입력 초기화
  };

  /* ================= 편집된 사진 최종 저장 핸들러 (추가) ================= */
  const handleSaveCroppedImage = async () => {
    if (!imageToCrop || !croppedAreaPixels || !currentMember) return;

    setLoading(true);
    try {
      // 1. 이미지 자르기 수행
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (!croppedBlob) throw new Error("이미지 생성에 실패했습니다.");

      // 2. Supabase Storage 업로드
      const oldPath = currentMember.photo_url;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인 세션이 만료되었습니다.");

      const path = `member-photos/${user.id}/${crypto.randomUUID()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(path, croppedBlob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // 3. 이전 사진 삭제 (선택 사항)
      if (oldPath) await deletePhotoFromStorage(oldPath);

      // 4. 상태 업데이트 (이 부분이 실행되어야 화면에 사진이 바뀜)
      updateMember(activeMemberIndex, { photo_url: path });

      // 5. 성공 시 크롭 모달만 닫기
      setImageToCrop(null);
      setZoom(1); // 다음을 위해 초기화
    } catch (err: any) {
      console.error(err);
      alert(`사진 저장 중 오류 발생: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMembers = async () => {
    if (members.length === 0) return;

    const invalid = members.find(m => !m.korean_name.trim() || !m.relationship || !m.gender);
    if (invalid) {
      alert(`⚠️ [${invalid.korean_name || '새 멤버'}] 한글이름, 관계, 성별은 필수 항목입니다.`);
      return;
    }

    const headMember = members.find(m => m.relationship === 'Head');
    if (!headMember) {
      alert("⚠️ 가족 대표자(Head)를 지정해야 저장할 수 있습니다.");
      return;
    }
    const headName = headMember.korean_name;

    setLoading(true);
    try {
      let familyId = initialData?.family_id || members.find(m => m.family_id)?.family_id;

      if (!familyId) {
        const { data: f, error: fError } = await supabase
          .from('families')
          .insert({ family_name: headName })
          .select().single();
        if (fError) throw fError;
        familyId = f?.id;
      } else {
        await supabase.from('families').update({ family_name: headName }).eq('id', familyId);
      }

      let memberIdToOpen = '';
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const { is_head, ...dbData } = m;
        const payload = {
          ...dbData,
          family_id: familyId,
          representative: headName,
          birthday: m.birthday || null,
          baptism_date: m.baptism_date || null,
          registration_date: m.registration_date || null
        };

        if (m.id) {
          await supabase.from('members').update(payload).eq('id', m.id);
          if (i === activeMemberIndex) memberIdToOpen = m.id;
        } else {
          const { data, error: iError } = await supabase.from('members').insert(payload).select().single();
          if (iError) throw iError;
          if (i === activeMemberIndex) memberIdToOpen = data.id;
          m.id = data.id;
        }
      }
      onSuccess('save', memberIdToOpen);
      alert('성공적으로 저장되었습니다.');
    } catch (e: any) {
      console.error("저장 중 에러:", e);
      alert(`저장 실패: ${e.message || '알 수 없는 오류'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCurrentMember = async () => {
    if (!currentMember) return;
    if (!currentMember.id) {
      const updated = members.filter((_, i) => i !== activeMemberIndex);
      if (updated.length === 0) onClose();
      else { setMembers(updated); setActiveMemberIndex(0); }
      return;
    }
    if (!confirm("정말 삭제하시겠습니까?")) return;
    setLoading(true);
    try {
      if (currentMember.photo_url) await deletePhotoFromStorage(currentMember.photo_url);
      await supabase.from('members').delete().eq('id', currentMember.id);
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

  const BAPTISM_TAG_NAME = '세례';

  useEffect(() => {
    if (!currentMember) return;

    const hasTag = currentMember.tags.includes(BAPTISM_TAG_NAME);
    const shouldHave = currentMember.is_baptized;

    if (shouldHave && !hasTag) {
      updateMember(activeMemberIndex, {
        tags: [...currentMember.tags, BAPTISM_TAG_NAME]
      });
    }

    if (!shouldHave && hasTag) {
      updateMember(activeMemberIndex, {
        tags: currentMember.tags.filter(t => t !== BAPTISM_TAG_NAME)
      });
    }
  }, [currentMember?.is_baptized]);

  /* ================= 4. EFFECTS ================= */

  useEffect(() => {
    const checkDuplicate = async () => {
      if (!currentMember?.korean_name.trim()) {
        setDuplicateWarning(null);
        return;
      }
      const localDuplicate = members.find((m, i) =>
        i !== activeMemberIndex &&
        m.korean_name.trim() === currentMember.korean_name.trim() &&
        m.birthday === currentMember.birthday
      );
      if (localDuplicate) {
        setDuplicateWarning(`⚠️ 입력 중인 명단에 [${currentMember.korean_name}(${currentMember.birthday || '생일미입력'})]님이 이미 있습니다.`);
        return;
      }
      try {
        let query = supabase.from('members').select('id, korean_name, birthday').eq('korean_name', currentMember.korean_name.trim());
        if (currentMember.birthday) query = query.eq('birthday', currentMember.birthday);
        const { data } = await query.maybeSingle();
        if (data && data.id !== currentMember.id) {
          setDuplicateWarning(`⚠️ [${data.korean_name}(${data.birthday || '생일미입력'})]님이 이미 DB에 등록되어 있습니다.`);
        } else {
          setDuplicateWarning(null);
        }
      } catch (err) { console.error("Duplicate Check Error", err); }
    };

    const timer = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timer);
  }, [currentMember?.korean_name, currentMember?.birthday, activeMemberIndex]);

  useEffect(() => {
    setLocalChildLists(childLists);
  }, [childLists]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  useEffect(() => {
    const loadRoles = async () => {
      const { data } = await supabase.from('roles').select('*').order('sort_order');
      if (data) setRoles(data);
    };
    loadRoles();
  }, []);

  useEffect(() => {
    const loadSignedUrl = async () => {
      if (!currentMember?.photo_url) { setPhotoSignedUrl(null); return; }
      if (currentMember.photo_url.startsWith('http')) { setPhotoSignedUrl(currentMember.photo_url); return; }
      const { data } = await supabase.storage.from('photos').createSignedUrl(currentMember.photo_url, 3600);
      if (data) setPhotoSignedUrl(data.signedUrl);
    };
    loadSignedUrl();
  }, [currentMember?.photo_url]);

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
          offering_number: '', for_slip: '', memo: '', prayer_request: '', photo_url: '', tags: [], status: 'Active', role: '', mokjang: '', is_head: true
        }]);
        setActiveMemberIndex(0);
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen || !currentMember) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-2 sm:p-4 overflow-hidden" onClick={onClose}>
      <div className="bg-white w-full max-w-7xl max-h-[95vh] rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>

        {/* 상단 컬러 밴드 섹션 */}
        <div className={`relative flex-shrink-0 ${roleBg} bg-opacity-35 p-3 md:p-6`}>
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6">
            <div className="flex items-center sm:items-start gap-4 md:gap-8">
              {/* 사진 컨테이너: 클릭 시 확대 로직 추가 */}
              <div
                onClick={() => currentMember.photo_url && setIsPhotoZoomed(true)}
                className={`relative group w-20 h-20 md:w-32 md:h-32 rounded-[1.2rem] md:rounded-[2rem] bg-white shadow-xl flex items-center justify-center overflow-hidden ring-2 md:ring-4 ring-white flex-shrink-0 ${currentMember.photo_url ? 'cursor-zoom-in' : ''}`}
              >
                {(currentMember.relationship === 'Head' || currentMember.is_head) && <CrownBadge />}
                {photoSignedUrl ? (
                  <img src={photoSignedUrl} className="w-full h-full object-cover" />
                ) : (
                  <User size={32} className="text-slate-300 md:w-12 md:h-12" />
                )}

                {/* 중요: 오버레이 영역에 onClick={(e) => e.stopPropagation()} 추가하여 버튼 클릭 시 확대 방지 */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1"
                >
                  <button onClick={() => fileInputRef.current?.click()} className="text-white text-[9px] md:text-xs font-bold flex items-center gap-1 hover:text-blue-200"><Camera size={12} /> 사진변경</button>
                  {currentMember.photo_url && (
                    <button onClick={() => { deletePhotoFromStorage(currentMember.photo_url); updateMember(activeMemberIndex, { photo_url: '' }); }} className="text-white text-[9px] md:text-xs font-bold flex items-center gap-1 hover:text-rose-200"><Trash2 size={12} /> 삭제</button>
                  )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </div>

              <div className="min-w-0 pt-1 md:pt-2">
                <div className="flex items-center gap-2 md:gap-4 flex-wrap mb-0.5">
                  <h2 className="text-xl md:text-3xl font-black text-slate-800 truncate">{currentMember.korean_name || '새 멤버'}</h2>
                  <span className="text-sm md:text-lg text-slate-500 font-bold">
                    {calculateAge(currentMember.birthday) || ' '} · {currentMember.gender === 'Male' ? 'M' : currentMember.gender === 'Female' ? 'F' : ' '}
                  </span>
                </div>
                <div className="text-sm md:text-xl text-slate-400 font-semibold mb-2 md:mb-4 truncate tracking-tight">{currentMember.english_name || ''}</div>
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-md md:rounded-lg bg-white/60 border border-white text-[10px] md:text-xs font-bold ${roleText}`}>{currentMember.role || '직분'}</span>
                  {currentMember.mokjang && <span className="px-2 py-0.5 md:px-3 md:py-1 rounded-md md:rounded-lg bg-blue-50 border border-blue-100 text-[10px] md:text-xs font-bold text-blue-600 shadow-sm">{currentMember.mokjang}</span>}
                  {currentMember.tags?.map(tag => <span key={tag} className="px-2 py-0.5 md:px-3 md:py-1 rounded-md md:rounded-lg bg-white border border-slate-200 text-[10px] md:text-xs font-bold text-slate-500 shadow-sm">#{tag}</span>)}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="absolute top-4 right-4 p-1.5 hover:bg-white/50 rounded-full text-slate-500 sm:static sm:p-2"><X size={20} className="sm:w-6 sm:h-6" /></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* 왼쪽 사이드바 */}
          <div className="hidden lg:flex w-60 border-r border-slate-100 bg-slate-50/50 flex-col p-4 gap-2 overflow-y-auto">
            <div className="px-2 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
              <span>Family Members</span>
              <button onClick={handleAddExisting} title="기존 멤버 추가" className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg"><UserPlus size={16} /></button>
            </div>
            {members.map((m, idx) => (
              <button key={idx} onClick={() => setActiveMemberIndex(idx)} className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${activeMemberIndex === idx ? 'bg-white shadow-md text-blue-600 ring-1 ring-slate-100' : 'text-slate-500 hover:bg-white'} ${m.status?.toLowerCase() !== 'active' ? 'opacity-50' : ''}`}>
                <div className="relative w-9 h-9 md:w-10 md:h-10 rounded-xl bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {m.photo_url ? <img src={supabase.storage.from('photos').getPublicUrl(m.photo_url).data.publicUrl} className="w-full h-full object-cover" /> : <User size={20} />}
                  {(m.relationship === 'Head' || m.is_head) && <div className="absolute -top-1 -left-1 bg-amber-400 text-white rounded-full p-0.5 border border-white shadow-sm"><Crown size={8} /></div>}
                </div>
                <div className="text-left min-w-0">
                  <div className="text-sm font-bold truncate">{m.korean_name || '이름 없음'}</div>
                  <div className="text-[9px] md:text-[10px] font-medium opacity-60 uppercase">{m.relationship}</div>
                </div>
              </button>
            ))}
            <button onClick={handleAddFamilyMember} className="mt-2 w-full p-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 flex items-center justify-center gap-2 hover:border-blue-300 hover:text-blue-500 transition-all text-xs font-bold uppercase"><Plus size={16} />가족 추가</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-4 custom-scrollbar bg-white">
            <div className="max-w-4xl mx-auto space-y-8 md:space-y-12">

              {/* 입력 섹션 */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                <div className="col-span-2 md:col-span-1 space-y-1">
                  <label className="text-[11px] md:text-xs font-bold text-slate-400 ml-1 uppercase">한글 이름 <span className="text-rose-500">*</span></label>
                  <input type="text" value={currentMember.korean_name} onChange={e => updateMember(activeMemberIndex, { korean_name: e.target.value })} className={`w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm md:text-base font-bold text-slate-700 focus:ring-2 ${duplicateWarning ? 'ring-2 ring-orange-400' : 'focus:ring-blue-100'}`} />
                  {duplicateWarning && (
                    <div className="flex items-center gap-1 text-orange-600 mt-1 animate-pulse">
                      <AlertCircle size={12} />
                      <span className="text-[10px] md:text-[11px] font-bold">{duplicateWarning}</span>
                    </div>
                  )}
                </div>

                <div className="col-span-2 md:col-span-1 space-y-1">
                  <label className="text-[11px] md:text-xs font-bold text-slate-400 ml-1 ">영문 이름 (Last, First Name)</label>
                  <input type="text" value={currentMember.english_name} onChange={e => updateMember(activeMemberIndex, { english_name: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm md:text-base font-bold text-slate-700" />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] md:text-xs font-bold text-slate-400 ml-1 uppercase">관계 <span className="text-rose-500">*</span></label>
                  <select value={currentMember.relationship} onChange={e => updateMember(activeMemberIndex, { relationship: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-3 py-2.5 text-xs md:text-sm font-bold text-slate-700 outline-none">
                    <option value="">선택</option>
                    {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] md:text-xs font-bold text-slate-400 ml-1 uppercase">성별 <span className="text-rose-500">*</span></label>
                  <div className="flex bg-slate-100 p-1 rounded-xl h-[42px] md:h-[48px]">
                    <button onClick={() => updateMember(activeMemberIndex, { gender: 'Male' })} className={`flex-1 rounded-lg text-[11px] md:text-xs font-bold transition-all ${currentMember.gender === 'Male' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400'}`}>남성</button>
                    <button onClick={() => updateMember(activeMemberIndex, { gender: 'Female' })} className={`flex-1 rounded-lg text-[11px] md:text-xs font-bold transition-all ${currentMember.gender === 'Female' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400'}`}>여성</button>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[11px] md:text-xs font-bold text-slate-400 ml-1 uppercase">생년월일</label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={currentMember.birthday}
                      onChange={e => updateMember(activeMemberIndex, { birthday: formatDate(e.target.value) })}
                      maxLength={10}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 pr-10"
                      placeholder="YYYY-MM-DD"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 cursor-pointer">
                      <Calendar
                        size={18}
                        onClick={() => birthdayInputRef.current?.showPicker()}
                      />
                    </div>
                    <input
                      ref={birthdayInputRef}
                      type="date"
                      tabIndex={-1}
                      className="absolute opacity-0 pointer-events-none right-0 bottom-0 w-0 h-0"
                      onChange={e => updateMember(activeMemberIndex, { birthday: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] md:text-xs font-bold text-slate-400 ml-1 uppercase">전화번호</label>
                  <input
                    type="tel"
                    value={currentMember.phone}
                    onChange={e => updateMember(activeMemberIndex, { phone: formatPhone(e.target.value) })}
                    maxLength={13}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700"
                    placeholder="000-0000-0000"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] md:text-xs font-bold text-slate-400 ml-1 uppercase tracking-wide">E-mail</label>
                  <input
                    type="email"
                    value={currentMember.email}
                    onChange={e => updateMember(activeMemberIndex, { email: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700"
                  />
                </div>
              </section>

              <section className="space-y-1">
                <label className="text-[11px] md:text-xs font-bold text-slate-400 ml-1 uppercase">집 주소</label>
                <input type="text" value={currentMember.address} onChange={e => updateMember(activeMemberIndex, { address: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 tracking-wide" />
              </section>

              <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-[11px] md:text-xs font-bold text-slate-400 ml-1 uppercase">세례여부</label>
                  <div className={`flex flex-col gap-2 p-2 rounded-xl border-2 transition-all ${currentMember.is_baptized ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-transparent'}`}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${currentMember.is_baptized ? 'bg-sky-600 border-sky-600' : 'bg-white border-slate-200'}`}>
                        {currentMember.is_baptized && <Check size={12} className="text-white" />}
                      </div>
                      <input type="checkbox" className="hidden" checked={currentMember.is_baptized}
                        onChange={e => updateMember(activeMemberIndex, { is_baptized: e.target.checked })} />
                      <span className="text-[11px] md:text-xs font-black text-slate-600">Yes</span>
                    </label>
                    {currentMember.is_baptized && (
                      <div className="relative group">
                        <input
                          type="text"
                          value={currentMember.baptism_date}
                          onChange={e => updateMember(activeMemberIndex, { baptism_date: formatDate(e.target.value) })}
                          maxLength={10}
                          className="w-full bg-transparent border-b border-blue-200 text-[11px] md:text-xs font-bold text-sky-800 outline-none pr-7"
                          placeholder="YYYY-MM-DD"
                        />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600 cursor-pointer">
                          <Calendar size={14} onClick={() => baptismDateInputRef.current?.showPicker()} />
                        </div>
                        <input
                          ref={baptismDateInputRef}
                          type="date"
                          tabIndex={-1}
                          className="absolute opacity-0 pointer-events-none right-0 bottom-0 w-0 h-0"
                          onChange={e => updateMember(activeMemberIndex, { baptism_date: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1"><label className="text-[11px] md:text-xs font-bold text-slate-400 ml-1 uppercase">헌금번호</label><input type="text" value={currentMember.offering_number} onChange={e => updateMember(activeMemberIndex, { offering_number: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm md:text-base font-bold text-slate-700 h-[42px] md:h-[48px]" /></div>
                <div className="space-y-1"><label className="text-[11px] md:text-xs font-bold text-slate-400 ml-1 uppercase">Slip #</label><input type="text" value={currentMember.for_slip} onChange={e => updateMember(activeMemberIndex, { for_slip: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm md:text-base font-bold text-slate-700 h-[42px] md:h-[48px]" /></div>
              </section>

              <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 pt-6 border-t border-slate-100">
                {['mokjang', 'role', 'status', 'department'].map(field => {
                  const parent = parentLists.find(p => p.type === field || (field === 'department' && p.name === '소속부서'));
                  return (
                    <div key={field} className="space-y-1">
                      <label className="text-[11px] md:text-xs font-bold text-slate-400 capitalize ml-1 tracking-widest">
                        {parent?.name || field}
                      </label>
                      <select
                        value={(currentMember as any)[field] || ''}
                        onChange={e => updateMember(activeMemberIndex, { [field]: e.target.value })}
                        className="w-full bg-slate-50 border-none rounded-xl px-3 py-2.5 text-xs md:text-sm font-bold text-slate-700"
                      >
                        <option value="">선택</option>
                        {childLists.filter(c => c.parent_id === parent?.id).map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
                <div className="space-y-1">
                  <label className="text-[11px] md:text-xs font-bold text-slate-400 ml-1 uppercase">등록일</label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={currentMember.registration_date}
                      onChange={e => updateMember(activeMemberIndex, { registration_date: formatDate(e.target.value) })}
                      maxLength={10}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-s md:text-sm font-bold text-slate-700 pr-10"
                      placeholder="YYYY-MM-DD"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 cursor-pointer">
                      <Calendar size={18} onClick={() => registrationDateInputRef.current?.showPicker()} />
                    </div>
                    <input
                      ref={registrationDateInputRef}
                      type="date"
                      tabIndex={-1}
                      className="absolute opacity-0 pointer-events-none right-0 bottom-0 w-0 h-0"
                      onChange={e => updateMember(activeMemberIndex, { registration_date: e.target.value })}
                    />
                  </div>
                </div>
              </section>

              {/* Tags 섹션 */}
              <section className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-1"><Tag className="text-purple-500" size={16} /><h3 className="text-sm md:text-s font-bold text-slate-800 uppercase tracking-tight">Global Tags</h3></div>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <button key={tag.id} onClick={() => {
                      const cur = currentMember.tags;
                      const next = cur.includes(tag.name) ? cur.filter(t => t !== tag.name) : [...cur, tag.name];
                      updateMember(activeMemberIndex, { tags: next });
                    }} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-[13px] md:text-m font-bold border transition-all ${currentMember.tags.includes(tag.name) ? 'bg-purple-500 border-purple-500 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500 hover:border-purple-200'}`}>#{tag.name}</button>
                  ))}
                  <div className="flex items-center gap-2">
                    <input type="text" value={newTagName} onChange={e => setNewTagName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddNewTag()} placeholder="New Tag..." className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold border border-slate-200 outline-none w-24 md:w-32 focus:border-purple-300" />
                    <button onClick={handleAddNewTag} className="p-1.5 md:p-2 bg-purple-100 text-purple-600 rounded-lg md:rounded-xl hover:bg-purple-200 transition-colors"><Plus size={16} /></button>
                  </div>
                </div>
              </section>

              {/* ================= 통합 로그 관리 (Memo + Prayer) ================= */}
              <section className="space-y-4 pt-6 border-t border-slate-100 pb-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {logType === 'Memo' ? <Info className="text-blue-500" size={18} /> : <Heart className="text-rose-500" size={18} />}
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">메모 & 기도제목</h3>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* 🚀 날짜 수정 입력란 */}
                    <input
                      type="text"
                      value={logDate}
                      onChange={e => setLogDate(e.target.value)}
                      className="text-[10px] font-bold text-slate-400 bg-transparent border-none focus:ring-0 text-right w-32"
                    />

                    {/* 타입 선택 스위치 */}
                    <div className="flex p-1 bg-slate-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setLogType('Memo')}
                        className={`px-4 py-1.5 rounded-lg text-[11px] font-black transition-all ${logType === 'Memo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                      >메모</button>
                      <button
                        type="button"
                        onClick={() => setLogType('Prayer')}
                        className={`px-4 py-1.5 rounded-lg text-[11px] font-black transition-all ${logType === 'Prayer' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}
                      >기도제목</button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <textarea
                    value={logText || ''}
                    onChange={e => setLogText(e.target.value)}
                    placeholder={logType === 'Memo' ? "상담 내용이나 메모를 입력하세요..." : "기도제목을 입력하세요..."}
                    className={`flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 outline-none min-h-[100px] transition-all ${logType === 'Memo' ? 'focus:ring-blue-100' : 'focus:ring-rose-100'}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!logText.trim()) return;
                      const ts = logDate; // 수정 가능하게 만든 logDate 사용
                      const entry = `[${ts}] ${logText.trim()}`;
                      const field = logType === 'Memo' ? 'memo' : 'prayer_request';

                      const currentEntries = smartSplitLogs(currentMember[field] || '');
                      // 최신 로그를 맨 앞으로, 구분자로 합침
                      const updatedData = [entry, ...currentEntries].join(LOG_SEPARATOR);

                      updateMember(activeMemberIndex, { [field]: updatedData });
                      setLogText('');
                    }}
                    className={`px-6 rounded-xl font-black text-white transition-all text-xs ${logType === 'Memo' ? 'bg-sky-700 hover:bg-sky-900' : 'bg-rose-500 hover:bg-rose-600'}`}
                  >
                    등록
                  </button>
                </div>

                {/* 통합 리스트 출력 로직 */}
                <div className="space-y-3 mt-4">
                  {(() => {
                    const getEntries = (type: 'Memo' | 'Prayer') => {
                      const raw = (type === 'Memo' ? currentMember.memo : currentMember.prayer_request) || '';
                      return smartSplitLogs(raw).map(text => ({ text, type }));
                    };

                    return [...getEntries('Memo'), ...getEntries('Prayer')]
                      .sort((a, b) => b.text.localeCompare(a.text))
                      .map((item, idx) => {
                        // [\s\S]를 사용하여 엔터가 포함된 전체 내용 캡처
                        const match = item.text.match(/^\[([\s\S]*?)\] ([\s\S]*)$/);
                        const date = match ? match[1] : 'LOG';
                        const content = match ? match[2] : item.text;

                        return (
                          <div key={idx} className={`group p-4 rounded-2xl border transition-all relative ${item.type === 'Memo' ? 'bg-blue-50/30 border-blue-50' : 'bg-rose-50/30 border-rose-50'}`}>
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${item.type === 'Memo' ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'}`}>
                                  {item.type === 'Memo' ? 'MEMO' : 'PRAYER'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">{date}</span>
                              </div>
                            </div>
                            {/* 🚀 whitespace-pre-wrap으로 줄바꿈 무조건 표시 */}
                            <p className="text-xs text-slate-600 font-bold leading-relaxed whitespace-pre-wrap">{content}</p>
                          </div>
                        );
                      });
                  })()}
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-5 py-4 md:px-10 md:py-6 border-t border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex gap-2 md:gap-4">
            <button onClick={handleDeleteCurrentMember} className="flex items-center gap-1.5 md:gap-2 px-3 py-2 md:px-5 md:py-3 text-rose-500 font-bold hover:bg-rose-50 rounded-xl transition-all text-[11px] md:text-sm uppercase tracking-widest outline-none"><Trash2 size={13} /> <span className="hidden">Delete</span></button>
            <button onClick={handleMoveOut} className="flex items-center gap-1.5 md:gap-2 px-3 py-2 md:px-5 md:py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all text-[11px] md:text-sm uppercase tracking-widest outline-none"><LogOut size={18} /> <span className="hidden ">독립</span></button>
          </div>
          <div className="flex gap-2 md:gap-4">
            <button onClick={onClose} className="px-4 py-2 md:px-8 md:py-3 rounded-xl md:rounded-2xl text-slate-400 font-bold hover:bg-slate-50 text-[11px] md:text-sm uppercase tracking-widest outline-none">Cancel</button>
            <button onClick={handleSaveMembers} disabled={loading} className="px-6 py-2 md:px-12 md:py-3 bg-sky-700 text-white rounded-xl md:rounded-2xl font-black shadow-lg hover:bg-sky-900 transition-all flex items-center gap-2 text-[11px] md:text-sm uppercase tracking-widest outline-none">{loading ? '...' : 'Save All'}<Save size={18} /></button>
          </div>
        </div>
      </div>
      {isPhotoZoomed && photoSignedUrl && (
        <PhotoZoomModal
          url={photoSignedUrl}
          onClose={() => setIsPhotoZoomed(false)}
        />
      )}
      {/* 🚀 사진 편집(크롭) 모달창 수정 */}
      {imageToCrop && (
        <div
          className="fixed inset-0 z-[250] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onPointerDown={(e) => e.stopPropagation()} // 드래그 시작 시 전파 방지
          onClick={(e) => e.stopPropagation()}        // 클릭 전파 방지
        >
          <div className="relative w-full max-w-lg aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/20">
            <Cropper
              image={imageToCrop}
              crop={crop}
              zoom={zoom}
              aspect={1 / 1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              // 라이브러리 내부의 터치/마우스 이벤트가 밖으로 나가지 않게 설정
              classes={{ containerClassName: "crop-container" }}
            />
          </div>

          <div className="mt-8 w-full max-w-lg space-y-6 px-4">
            {/* Zoom 슬라이더 영역 */}
            <div className="bg-white/5 p-4 rounded-2xl">
              <label className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-3 block text-center">
                Zoom: {Math.round(zoom * 100)}%
              </label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.01}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="button" // submit 방지
                onClick={(e) => {
                  e.stopPropagation();
                  setImageToCrop(null);
                }}
                className="flex-1 py-4 text-white/50 font-bold hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button" // submit 방지
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveCroppedImage();
                }}
                disabled={loading}
                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-500 transition-all disabled:opacity-50"
              >
                {loading ? "Uploading..." : "Set Profile Photo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 기존 확대 모달 위치 유지 */}
      {isPhotoZoomed && photoSignedUrl && (
        <PhotoZoomModal url={photoSignedUrl} onClose={() => setIsPhotoZoomed(false)} />
      )}
    </div>
  );
}
