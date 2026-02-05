import React, { useState, useEffect, useRef, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { supabase } from './lib/supabase';
import SettingsPage from './components/SettingsPage';
import MemberForm from './components/MemberForm';
import Login from './components/Login';
// import GlobalLogView from './components/GlobalLogView';
// import { useTypingPlaceholder } from './hooks/useTypingPlaceholder';
import {
  LayoutGrid,
  Users,
  Search,
  X,
  Check,
  ChevronDown,
  MapPin,
  Smartphone,
  Mail,
  Calendar,
  DollarSign,
  Edit,
  Trash2,
  Plus,
  Cake,
  Home,
  Briefcase,
  Tag,
  Award,
  UserCog,
  Settings,
  LogOut,
  ArrowUpDown, // ⬅️ ArrowsUpDown에서 ArrowUpDown으로 수정 (에러 방지)
  ChevronRight,
  ChevronUp,
  Crown,
  Clock,
  Wallet,
  User,
  Heart 
} from 'lucide-react';

const placeholders = [
  ' Search by Korean Name...',
  ' Search by English Name...',
  ' Search by Phone Number...',
];


const getTagLabel = (tag: string, childLists: ChildList[]) => {
  const matched = childLists.find(
    c => c.name.trim().toLowerCase() === tag.trim().toLowerCase()
  );
  return matched ? matched.name : tag;
};


/* ================= PHOTO HELPER ================= */
const getMemberPhotoUrl = (path: string | null | undefined) => {
  if (!path) return null;
  // 이미 완전한 URL(http...)인 경우 그대로 반환
  if (path.startsWith('http')) return path; 
  // 경로인 경우 Supabase Public URL 생성
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
};

/* ================= DATA NORMALIZATION ================= */
const normalizeMember = (m: any): Member => {
  try {
    if (!m) return { id: '', korean_name: 'Unknown', tags: [], memo: '' } as any;
    return {
      ...m,
      id: String(m.id || ''),
      family_id: m.family_id ? String(m.family_id) : null,
      korean_name: String(m.korean_name || '이름 없음'),
      english_name: m.english_name ? String(m.english_name) : '',
      gender: m.gender || null,
      birthday: m.birthday || null,
      phone: m.phone || '',
      email: m.email || '',
      address: m.address || '',
      relationship: m.relationship || '',
      role: m.role || '',
      registration_date: m.registration_date || null,
      baptism_date: m.baptism_date || null,
      status: m.status || 'Active',
      offering_number: m.offering_number || '',
      for_slip: m.for_slip || '',
      tags: Array.isArray(m.tags) ? m.tags : [],
      memo: m.memo ? String(m.memo) : '',
      prayer_request: m.prayer_request ? String(m.prayer_request) : '',  
      photo_url: m.photo_url || null,
    };
  } catch (e) {
    console.error("Normalization error:", e);
    return { id: '', korean_name: 'Error', tags: [], memo: '' } as any;
  }
};

/* ================= GLOBAL LOG MODAL (STACKED VERSION) ================= */
function GlobalLogModal({ 
  isOpen, 
  onClose, 
  members, 
  onRefresh,
  onSelectMember // 상세 정보를 띄우기 위한 함수
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  members: Member[];
  onRefresh: () => void;
  onSelectMember: (m: Member) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [filterType, setFilterType] = useState<'All' | 'Memo' | 'Prayer'>('All');
  const [showAllTime, setShowAllTime] = useState(false);
  const [editingLog, setEditingLog] = useState<{ id: string; text: string; memberId: string; type: 'Memo' | 'Prayer'; originalIndex: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const allLogs = useMemo(() => {
    const logs: any[] = [];
    members.forEach(m => {
      const parse = (text: string | null | undefined, type: 'Memo' | 'Prayer') => {
        if (!text) return;
        text.split('\n\n').forEach((entry, idx) => {
          const match = entry.match(/^\[(.*?)\] (.*)$/s);
          if (match) logs.push({ 
            member: m,
            name: m.korean_name, 
            date: match[1], 
            content: match[2], 
            type, 
            originalIndex: idx,
            id: m.id + type + match[1] 
          });
        });
      };
      parse(m.memo, 'Memo');
      parse(m.prayer_request, 'Prayer');
    });
    return logs.sort((a, b) => b.date.localeCompare(a.date));
  }, [members]);

  const handleUpdate = async () => {
    if (!editingLog || loading) return;
    try {
      setLoading(true);
      const field = editingLog.type === 'Memo' ? 'memo' : 'prayer_request';
      const targetMember = members.find(m => m.id === editingLog.memberId);
      if (!targetMember) return;

      const currentLogs = (targetMember[field]?.split('\n\n') || []);
      const match = currentLogs[editingLog.originalIndex].match(/^\[(.*?)\]/);
      const ts = match ? match[1] : new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

      currentLogs[editingLog.originalIndex] = `[${ts}] ${editingLog.text.trim()}`;
      
      const { error } = await supabase.from('members').update({ [field]: currentLogs.join('\n\n') }).eq('id', editingLog.memberId);
      if (!error) {
        setEditingLog(null);
        if (onRefresh) onRefresh(); // 에러 방지 체크
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleDelete = async (log: any) => {
    if (!confirm('이 로그를 삭제하시겠습니까?')) return;
    try {
      setLoading(true);
      const field = log.type === 'Memo' ? 'memo' : 'prayer_request';
      const updatedLogs = (log.member[field]?.split('\n\n') || []).filter((_: any, i: number) => i !== log.originalIndex);
      
      const { error } = await supabase.from('members').update({ [field]: updatedLogs.join('\n\n') }).eq('id', log.member.id);
      if (!error) {
        if (onRefresh) onRefresh();
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filtered = allLogs.filter(log => {
    const matchesSearch = log.name.includes(searchTerm) || log.content.includes(searchTerm);
    const matchesType = filterType === 'All' || log.type === filterType;
    if (showAllTime) return matchesSearch && matchesType;
    const cleanDate = log.date.replace(/[\[\]]/g, '');
    const dateParts = cleanDate.split('.');
    const logYear = parseInt(dateParts[0]?.trim());
    const logMonth = parseInt(dateParts[1]?.trim()) - 1;
    return matchesSearch && matchesType && logYear === selectedYear && logMonth === selectedMonth;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header - 필터 (기존 유지) */}
        <div className="p-6 md:p-8 border-b border-slate-100 bg-white space-y-6 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-700 flex items-center gap-3">
              <div className="w-5 h-5 bg-sky-700 text-white flex items-center justify-center shadow-sm shadow-sky-200">
                <Mail className="w-6 h-6" />
              </div>
              기도 & 메모 통합 로그
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 opacity-50" />
                <input placeholder="이름 또는 내용 검색..." className="w-full bg-slate-50 border-none rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-emerald-100" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
                {(['All', 'Prayer', 'Memo'] as const).map(t => (
                  <button key={t} onClick={() => setFilterType(t)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === t ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'}`}>{t === 'All' ? '전체' : t === 'Prayer' ? '기도제목' : '메모'}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-end items-end gap-3">
               <div className="flex items-center gap-2">
                 <button onClick={() => setShowAllTime(!showAllTime)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${showAllTime ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>전체 기간</button>
                 {!showAllTime && (
                   <div className="flex gap-2">
                     <select className="bg-slate-50 border-none rounded-xl text-sm font-bold py-2 pl-3 pr-8" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>{[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}년</option>)}</select>
                     <select className="bg-slate-50 border-none rounded-xl text-sm font-bold py-2 pl-3 pr-8" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>{Array.from({length: 12}).map((_, i) => <option key={i} value={i}>{i+1}월</option>)}</select>
                   </div>
                 )}
               </div>
               <div className="text-[10px] font-bold text-slate-400 tracking-wide">{filtered.length} Logs Found</div>
            </div>
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 custom-scrollbar bg-slate-50/30">
          {filtered.map((log, i) => {
            const isEditing = editingLog?.id === log.id;

            return (
              <div 
                key={i} 
                className="group p-5 rounded-[1.5rem] bg-white border border-slate-100 hover:border-sky-200 hover:shadow-xl hover:-translate-y-0.5 transition-all relative"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    {/* 사진 클릭 시 성도 상세 모달 띄우기 */}
                    <div 
                      onClick={() => onSelectMember(log.member)}
                      className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-sky-400 transition-all"
                    >
                      {log.member.photo_url ? (
                        <img src={getMemberPhotoUrl(log.member.photo_url)} className="w-full h-full object-cover" />
                      ) : (
                        <User className="text-slate-300 w-5 h-5" />
                      )}
                    </div>
                    <div>
                      {/* 이름 클릭 시 성도 상세 모달 띄우기 */}
                      <div 
                        onClick={() => onSelectMember(log.member)}
                        className="font-black text-slate-800 hover:text-sky-600 cursor-pointer transition-colors"
                      >
                        {log.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold">{log.member.mokjang || '소속 없음'}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${log.type === 'Prayer' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'}`}>
                      {log.type === 'Prayer' ? '기도제목' : '메모'}
                    </span>
                  </div>
                  
                  {/* 수정 / 삭제 버튼 */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setEditingLog({ id: log.id, text: log.content, memberId: log.member.id, type: log.type, originalIndex: log.originalIndex })}
                      className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-blue-500 transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(log)}
                      className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-3 pl-[52px]">
                    <textarea 
                      value={editingLog.text} 
                      onChange={e => setEditingLog({ ...editingLog, text: e.target.value })} 
                      className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm focus:ring-2 focus:ring-sky-100 outline-none" 
                      rows={3} 
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingLog(null)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600">취소</button>
                      <button 
                        onClick={handleUpdate}
                        disabled={loading}
                        className="px-5 py-2 text-xs font-bold bg-sky-500 text-white rounded-xl shadow-md hover:bg-sky-600 transition-all disabled:opacity-50"
                      >
                        {loading ? '저장 중...' : '저장하기'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 pl-[52px]">
                    <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">{log.content}</p>
                    <span className="text-[10px] text-slate-300 font-bold mt-1 tracking-wider">{log.date}</span>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
              <Search className="w-16 h-16 mb-4 opacity-30" />
              <p className="font-bold">조건에 맞는 기록이 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= TYPES ================= */

type Role = {
  name: string;
  bg_color: string;
  text_color: string;
};

type Member = {
  id: string;
  family_id: string | null;
  korean_name: string;
  english_name?: string | null;
  gender?: 'Male' | 'Female' | null;
  birthday?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  mokjang?: string | null;
  representative?: string | null;
  relationship?: string | null;
  is_baptized?: boolean;
  baptism_date?: string | null;
  role?: string | null;
  registration_date?: string | null;
  status?: string | null;
  memo?: string | null;
  prayer_request?: string | null;
  offering_number?: string | null;
  for_slip?: string | null;
  tags?: string[] | null;
  created_at?: string;
  updated_at?: string;
  photo_url?: string | null;
  offering?: string | null;
  slip?: string | null;
};

type Family = {
  id: string;
  family_name?: string | null;
};

type MenuKey = 'active' | 'birthdays' | 'recent' | 'settings' | string;

type ParentList = {
  id: string
  type: string
  name: string
  order: number
}

type ChildList = {
  id: string
  parent_id: string
  name: string
  order: number
  bg_color?: string | null
  text_color?: string | null
}

/* ================= HELPERS ================= */

const calcAge = (birthday?: string | null) => {
  if (!birthday) return null;
  const today = new Date();
  const b = new Date(birthday);
  if (Number.isNaN(b.getTime())) return null;
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
};

const calcYearsMonths = (dateStr?: string | null) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let years = today.getFullYear() - d.getFullYear();
  let months = today.getMonth() - d.getMonth();
  if (months < 0) { years--; months += 12; }
  return { years, months };
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-sky-500',
  inactive: 'bg-slate-300',
  pending: 'bg-amber-400',
};

/* ================= SIDEBAR Left Bar================= */

function Sidebar({ 
  activeMembersCount, 
  familiesCount, 
  birthdaysCount, 
  activeOnly, 
  sidebarOpen, 
  onCloseSidebar, 
  onClickActiveMembers, 
  onSelectMenu, 
  parentLists, 
  childLists, 
  onSelectFilter, 
  activeMenu, 
  selectedFilter, 
  members, 
  onNewMember, 
  onSignOut, 
  userRole,
  onOpenGlobalLog // ⬅️ 기도/메모 로그 열기 프롭스 추가
}: { 
  activeMembersCount: number; 
  familiesCount: number; 
  birthdaysCount: number; 
  activeOnly: boolean; 
  sidebarOpen: boolean; 
  onCloseSidebar: () => void; 
  onClickActiveMembers: () => void; 
  onSelectMenu: (menu: MenuKey) => void; 
  parentLists: ParentList[]; 
  childLists: ChildList[]; 
  onSelectFilter: (parentType: string, child: ChildList) => void; 
  activeMenu: MenuKey; 
  selectedFilter: ChildList | null; 
  members: Member[]; 
  onNewMember: () => void; 
  onSignOut: () => void; 
  userRole: 'admin' | 'user' | null; 
  onOpenGlobalLog: () => void; // ⬅️ 타입 정의 추가
}) {
  const [now, setNow] = useState(new Date());
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});


  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    
    // Viewport height fix for mobile browsers
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', setVh);
    };
  }, []);

  const toggleParent = (parentId: string) => {
    setExpandedParents(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  };
 
   
  // 통계 계산 로직 수정: 완전 동적 필드 매칭
  const getChildStats = (parentType: string, parentName: string, childName: string) => {
  const pType = (parentType || '').trim().toLowerCase();
  const pName = (parentName || '').trim().toLowerCase();
  const cName = (childName || '').trim().toLowerCase().replace(/\s+/g, '');
    
    const filtered = members.filter((m) => {
      if (activeOnly && m.status?.toLowerCase() !== 'active') return false;
      const memberValue = (m as any)[pType];
      
      // 1. 직접 필드 매칭 (예: m.mokjang, m.role, m.status)
      if (Array.isArray(memberValue)) {
        if (memberValue.some(v => (v || '').toString().trim().toLowerCase().replace(/\s+/g, '') === cName)) return true;
      } else if (memberValue !== undefined && memberValue !== null) {
        if (memberValue.toString().trim().toLowerCase().replace(/\s+/g, '') === cName) return true;
      }
      
      // 2. 폴백 로직 (이름 기반 매칭)
      if (pType === 'cell' || pName.includes('목장')) {
        return (m.mokjang || '').trim().toLowerCase().replace(/\s+/g, '') === cName;
      }
      if (pType === 'role' || pName.includes('직분')) {
        return (m.role || '').trim().toLowerCase().replace(/\s+/g, '') === cName;
      }
      if (pType === 'status' || pName.includes('상태')) {
        return (m.status || '').trim().toLowerCase().replace(/\s+/g, '') === cName;
      }
      if (pType === 'tag' || pType === 'tags' || pName.includes('태그')) {
        return (m.tags || []).some(t => (t || '').trim().toLowerCase().replace(/\s+/g, '') === cName);
      }
      
      return false;
    });

    const familyIds = new Set(filtered.map((m) => m.family_id).filter(Boolean));
    return { people: filtered.length, families: familyIds.size };
  };

  return (
    <>
      {sidebarOpen && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden" onClick={onCloseSidebar} />}
      <aside
        className={`
          fixed left-0 top-0
          h-[100dvh] w-72
          bg-white border-r border-slate-200
          z-50
          flex flex-col
          overflow-hidden   // ⭐ 중요
          transform transition-transform
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0
        `}
      >

       {/* 🔹 Sidebar Header */}
        <div className="flex items-center justify-end px-4 py-3">
        {/* ❌ Close button */}
        <button
          onClick={onCloseSidebar}
          className="p-2 rounded-lg hover:bg-slate-100 transition lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5 text-slate-300" />
        </button>
      </div>
       <h1 className="text-lg font-bold text-slate-500  ml-7 hover:shadow-sm transition-shadow duration-500">VGMC CONNECT</h1>     
        
        {userRole === 'admin' && (
          <div className="p-4">
            <button onClick={onNewMember} style={{ backgroundColor: '#3c8fb5' }} className="w-full text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-semibold transition-colors hover:opacity-90">
              <Plus className="w-5 h-5" />New Member
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }} >
         <nav className="px-4 py-2">
          <div className="mb-3">
            <button onClick={onClickActiveMembers} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all group ${activeOnly ? 'bg-sky-50 border-sky-200 shadow-sm' : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-blue-300'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${activeOnly ? 'bg-sky-100' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
                <Users className={`w-6 h-6 ${activeOnly ? 'text-sky-600' : 'text-blue-600'}`} />
              </div>
              <div className="flex-1 text-left">
                <div className={`text-base font-bold transition-colors ${activeOnly ? 'text-sky-700' : 'text-slate-800 group-hover:text-blue-700'}`}>Active Members</div>
                <div className="text-sm text-slate-500 mt-0.5">{familiesCount} 가정&nbsp;&nbsp;|&nbsp;&nbsp;{activeMembersCount} 명</div>
              </div>
            </button>
          </div>
          <div className="mb-2">
            <button onClick={() => onSelectMenu('birthdays')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${activeMenu === 'birthdays' ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeMenu === 'birthdays' ? 'bg-amber-100' : 'bg-slate-50'}`}><Cake className={`w-5 h-5 ${activeMenu === 'birthdays' ? 'text-amber-600' : 'text-slate-600'}`} /></div>
              <div className="flex-1 text-left"><div className={`text-sm font-semibold ${activeMenu === 'birthdays' ? 'text-amber-700' : 'text-slate-700'}`}>Birthdays</div></div>
              {birthdaysCount > 0 && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{birthdaysCount}</span>}
              <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
          <div className="mb-2">
            <button onClick={() => onSelectMenu('recent')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${activeMenu === 'recent' ? 'bg-sky-50' : 'hover:bg-slate-50'}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeMenu === 'recent' ? 'bg-sky-100' : 'bg-slate-50'}`}><UserCog className={`w-5 h-5 ${activeMenu === 'recent' ? 'text-sky-600' : 'text-slate-600'}`} /></div>
              <div className="flex-1 text-left"><div className={`text-sm font-semibold ${activeMenu === 'recent' ? 'text-sky-700' : 'text-slate-700'}`}>최신 등록교인</div></div>
              <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>

          {/* ================= ACCORDION PARENT LISTS ================= */}
          <div className="mt-6 space-y-1">
            {parentLists.map((parent) => {
              const children = childLists.filter((c) => c.parent_id === parent.id);
              const isExpanded = expandedParents[parent.id];
              return (
                <div key={parent.id} className="space-y-1">
                  <button onClick={() => toggleParent(parent.id)} className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      {parent.type === 'mokjang' ? <Home className="w-4 h-4 text-slate-400" /> : 
                       parent.type === 'role' ? <Briefcase className="w-4 h-4 text-slate-400" /> :
                       parent.type === 'status' ? <Award className="w-4 h-4 text-slate-400" /> :
                       <Tag className="w-4 h-4 text-slate-400" />}
                      <span className="text-base font-bold text-slate-700">{parent.name}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isExpanded && (
                    <div className="space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      {children.map((child) => {
                        const stats = getChildStats(parent.type, parent.name, child.name);
                        const isSelected = selectedFilter?.id === child.id;
                        return (
                          <button key={child.id} onClick={() => onSelectFilter(parent.type, child)} className={`w-full flex items-center justify-between px-10 py-2.5 rounded-lg transition-all ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                            <span className={`text-sm ${isSelected ? 'font-bold' : 'font-medium'}`}>{child.name}</span>
                            <span className={`text-xs font-semibold ${isSelected ? 'text-blue-500' : 'text-slate-400'}`}>
                              {/* 목장만 '가정/명' 표시, 나머지는 숫자만 표시 */}
                              {parent.type === 'mokjang' ? `${stats.families}가정 · ${stats.people}명` : stats.people}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>
    </div>
        {/* ===== BOTTOM FIXED AREA ===== */}
<div className="shrink-0 text-s font-semibold text-slate-600 px-4 py-2 mb-3 bg-white border border-slate-200 rounded-lg text-center">
  
  {/* ⬇️ 추가된 기도 & 메모 로그 버튼 (Admin 전용) */}
  {userRole === 'admin' && (
    <button
      onClick={onOpenGlobalLog}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100 transition-all mb-3 shadow-sm group"
    >
      <Mail className="w-4 h-4 text-sky-500 group-hover:scale-110 transition-transform" />
      <span className="text-sm font-bold">기도 & 메모 로그</span>
    </button>
  )}

  <div className="text-xs text-slate-500 px-4 mb-2">
    Today : {now.getFullYear()}-
    {String(now.getMonth() + 1).padStart(2, '0')}-
    {String(now.getDate()).padStart(2, '0')}
    {' '}
    {String(now.getHours()).padStart(2, '0')}:
    {String(now.getMinutes()).padStart(2, '0')}
  </div>

  {userRole === 'admin' && (
    <button
      onClick={() => onSelectMenu('settings')}
      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all mb-2 ${
        activeMenu === 'settings'
          ? 'bg-slate-100 border-slate-300'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <Settings className="w-4 h-4" />
      <span className="text-sm font-semibold">Settings</span>
    </button>
  )}

  <button
    onClick={onSignOut}
    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
  >
    <LogOut className="w-4 h-4" />
    <span className="text-sm font-semibold">Sign Out</span>
  </button>
</div>

      </aside>
    </>
  );
}

/* ================= Crown Badge ================= */
function CrownBadge() {
  return (
    <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md">
      <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="currentColor"><path d="M3 7l4 3 5-5 5 5 4-3v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /></svg>
    </div>
  );
}

/* ================= MEMBER CARD ================= */
function MemberCard({ member, age, roles, onClick, childLists }: {
    member: Member;
    age: number | null;
    roles: Role[];
    onClick: () => void;
    childLists: ChildList[];
  }) {
  const roleMeta = roles.find((r) => r.name === member.role);
  const roleBg = roleMeta?.bg_color ?? 'bg-slate-50';
  const roleText = roleMeta?.text_color ?? 'text-slate-400';
  const statusKey = member.status?.toLowerCase();
  const statusColor = statusKey && STATUS_COLORS[statusKey] ? STATUS_COLORS[statusKey] : 'bg-gray-300';
  const genderLabel = member.gender?.toLowerCase() === 'male' ? 'M' : member.gender?.toLowerCase() === 'female' ? 'F' : null;
  const isHead = member.relationship?.toLowerCase() === 'head' || member.relationship?.toLowerCase() === 'self';
  const isActive = statusKey === 'active';
  
  return (
    <div onClick={onClick} className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden ${!isActive ? 'opacity-50' : ''}`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[5rem] -mr-8 -mt-8 transition-colors group-hover:bg-blue-50/50" />
      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-4"> 
          <div className={`
              relative flex items-center justify-center w-14 h-14 rounded-2xl ${roleBg} shadow-inner flex-shrink-0 overflow-hidden
              ${!member.photo_url ? 'opacity-50' : 'opacity-100'} // ⬅️ 추가
            `}>
             {member.photo_url ? <img src={getMemberPhotoUrl(member.photo_url)} alt={member.korean_name} className="w-full h-full object-cover" /> : <svg className={`w-6 h-6 ${roleText}`} style={{ opacity: 0.5 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            {isHead && <CrownBadge />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="text-lg md:text-xl font-bold text-slate-800">{member.korean_name}</h3>
              {(age !== null || genderLabel) && <span className="text-xs text-slate-400 font-medium">{age !== null && `${age}`}{age !== null && genderLabel && ' · '}{genderLabel}</span>}
              <span className={`w-2 h-2 rounded-full ${statusColor} flex-shrink-0`}></span>
            </div>
            {member.english_name && <div className="text-xs md:text-sm text-slate-400 font-medium mt-0.5">{member.english_name}</div>}
          </div>
        </div>

        {/* ⭐ 배지 순서 조정: Role > Mokjang > Tags */}
        <div className="flex flex-wrap gap-1.5">
          {/* 1. 직분 (Role) */}
          {member.role && (
            <span className={`px-2 py-0.5 rounded-md text-[11.5px] font-bold ${roleBg} ${roleText}`} style={{ opacity: 0.8 }}>
              {member.role}
            </span>
          )}
          {/* 2. 목장 (Mokjang) */}
          {member.mokjang && (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
              {member.mokjang}
            </span>
          )}
        {/* 3. 태그 (중복 제거 로직 추가: Array.from(new Set(...))) */}
        {Array.from(new Set(member.tags || [])).map((tag: any) => (
          <span key={tag} className="px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-white border border-slate-200 text-slate-500">
            #{getTagLabel(tag, childLists)}
          </span>
        ))}
      </div>

        {/* 주소 및 전화번호 (기존 유지) */}
        <div className="space-y-1">
          {member.address && (
            <div className="flex items-start gap-1.5 text-xs md:text-sm  text-slate-600">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(member.address)}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:text-blue-600 hover:underline break-words">{member.address}</a>
            </div>
          )}
          {member.phone && (
            <div className="flex items-center gap-1.5 text-xs md:text-sm text-slate-600">
              <Smartphone className="w-3.5 h-3.5" />
              <a href={`tel:${member.phone.replace(/[^0-9+]/g, '')}`} onClick={(e) => e.stopPropagation()} className="hover:text-blue-600 hover:underline">{member.phone}</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= FAMILY CARD ================= */
function FamilyCard({
    familyLabel,
    members,
    roles,
    familyAddress,
    onMemberClick,
    childLists
  }: {
    familyLabel: string;
    members: Member[];
    roles: Role[];
    familyAddress?: string | null;
    onMemberClick: (member: Member) => void;
    childLists: ChildList[];
  }) {

  if (!members || members.length === 0) return null;
  const sorted = [...members].sort((a, b) => {
    const getRank = (m: Member) => {
      const r = m.relationship?.toLowerCase();
      if (r === 'head' || r === 'self') return 0;
      if (r === 'spouse') return 1;
      return 2;
    };
    const rankA = getRank(a);
    const rankB = getRank(b);
    if (rankA !== rankB) return rankA - rankB;
    
    // If same rank (e.g., both are children), sort by age (oldest first)
    const ageA = calcAge(a.birthday);
    const ageB = calcAge(b.birthday);
    if (ageA !== null && ageB !== null) return ageB - ageA;
    if (ageA !== null) return -1;
    if (ageB !== null) return 1;
    return 0;
  });
  const head = sorted.find((m) => m.relationship?.toLowerCase() === 'head' || m.relationship?.toLowerCase() === 'self');
  const headRole = roles.find((r) => r.name === head?.role);
  const stripColor = headRole?.bg_color ?? 'bg-blue-200';

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      <div className={`h-2 w-full ${stripColor}`} />
      <div>
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-500" />
            <h2 className="text-base sm:text-xl font-bold text-slate-700 break-words leading-snug">{familyLabel}{"'s Family"}</h2></div>
            <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md shadow-sm">{members.length}</span>
          </div>
          {familyAddress && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(familyAddress)}`} target="_blank" rel="noopener noreferrer" 
          className="flex items-center gap-1.5 text-sm  md:text-s text-slate-500 hover:text-blue-700 transition-colors">
         <MapPin className="w-3.5 h-3.5 shrink-0" /><span>{familyAddress}</span></a>}
        </div>
        <div className="p-4 space-y-2">
          {sorted.map((member) => {
            const age = calcAge(member.birthday);
            const gender = member.gender?.toLowerCase() === 'male' ? 'M' : member.gender?.toLowerCase() === 'female' ? 'F' : null;
            const roleMeta = roles.find((r) => r.name === member.role);
            const bg = roleMeta?.bg_color ?? 'bg-slate-100';
            const text = roleMeta?.text_color ?? 'text-slate-400';
            const isHead = member.relationship?.toLowerCase() === 'head' || member.relationship?.toLowerCase() === 'self';
            const statusKey = member.status?.toLowerCase();
            const statusColor = statusKey && STATUS_COLORS[statusKey] ? STATUS_COLORS[statusKey] : 'bg-gray-300';
            const isActive = statusKey === 'active';
            return (
              <div key={member.id} onClick={() => onMemberClick(member)} className={`flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer ${!isActive ? 'opacity-50' : ''}`}>
                <div className={`
                    relative flex items-center justify-center w-10 h-10 rounded-lg ${bg} flex-shrink-0
                    ${!member.photo_url ? 'opacity-40' : 'opacity-100'}
                  `}>
                    {/* 내부 이미지 로직 */}
                    {member.photo_url ? (
                      <img 
                        src={getMemberPhotoUrl(member.photo_url)} 
                        alt={member.korean_name} 
                        className="w-full h-full rounded-lg object-cover" 
                      />
                    ) : (
                      <svg className={`w-5 h-5 ${text}`} style={{ opacity: 0.5 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                    {isHead && <CrownBadge />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap"><span className="text-base sm:text-lg font-bold text-slate-600 break-words leading-snug">{member.korean_name}</span>{(age !== null || gender) && <span className="text-[10px] text-slate-400 font-bold">{age !== null && age}{age !== null && gender && ' · '}{gender}</span>}</div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {member.english_name && <span className="text-xs sm:text-s text-slate-600 break-words leading-snug">{member.english_name}</span>}
                      {member.relationship && <span className={`text-[10px] font-black tracking-wide ${isHead ? 'text-[#4292b8]' : 'text-slate-500'}`}>· {member.relationship}</span>}
                      {member.role && <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${bg} ${text}`} style={{ opacity: 0.6 }}>{member.role}</span>}
                      {member.tags?.map(tag => (
                        <span key={tag} className="text-[9px] font-bold text-slate-400">#{getTagLabel(tag, childLists)}</span>
                      ))}
                    </div>
                  </div>
                <span className={`w-2 h-2 rounded-full ${statusColor} flex-shrink-0`} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================= RECENT MEMBER CARD ================= */
function RecentMemberCard({ member, roles, onClick }: { member: Member; roles: Role[]; onClick: () => void; }) {
  const age = calcAge(member.birthday);
  const genderLabel = member.gender?.toLowerCase() === 'male' ? 'M' : member.gender?.toLowerCase() === 'female' ? 'F' : null;
  const roleMeta = roles.find((r) => r.name === member.role);
  const roleBg = roleMeta?.bg_color ?? 'bg-slate-100';
  const roleText = roleMeta?.text_color ?? 'text-slate-500';
  const statusKey = member.status?.toLowerCase();
  const statusColor = statusKey && STATUS_COLORS[statusKey] ? STATUS_COLORS[statusKey] : 'bg-gray-300';

  return (
    <div onClick={onClick} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[4rem] -mr-8 -mt-8 transition-colors group-hover:bg-blue-50/50" />
      
      <div className="relative space-y-5">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl ${roleBg} flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner`}>
            {member.photo_url ? <img src={member.photo_url} alt={member.korean_name} className="w-full h-full object-cover" /> : <svg className={`w-6 h-6 ${roleText}`} style={{ opacity: 0.5 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-black text-slate-800">{member.korean_name}</h3>
              {(age !== null || genderLabel) && <span className="text-xs text-slate-400 font-bold">{age !== null && `${age}`}{age !== null && genderLabel && ' · '}{genderLabel}</span>}
              <span className={`w-2 h-2 rounded-full ${statusColor}`}></span>
            </div>
            {member.english_name && <div className="text-xs text-slate-400 font-bold mt-0.5">{member.english_name}</div>}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${roleBg} ${roleText} bg-opacity-30`}>{member.role || 'Member'}</span>
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black tracking-widest">{member.registration_date || '-'}</span>
            </div>
          </div>

          {member.address && (
            <div className="flex items-start gap-2 text-slate-500">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
              <span className="text-xs font-medium leading-relaxed truncate">{member.address}</span>
            </div>
          )}
          
          {member.phone && (
            <div className="flex items-center gap-2 text-slate-500">
              <Smartphone className="w-4 h-4 flex-shrink-0 text-slate-400" />
              <span className="text-xs font-medium">{member.phone}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BirthdaysPage({
  members,
  roles,
  onSelectMember
}: {
  members: Member[];
  roles: Role[];
  onSelectMember: (m: Member) => void;
}) {
  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  const currentMonth = new Date().getMonth();
  const [activeMonth, setActiveMonth] = useState(currentMonth);

  const monthMembers = useMemo(() => {
    return members.filter(m => {
      if (!m.birthday) return false;
      return new Date(m.birthday).getMonth() === activeMonth;
    });
  }, [members, activeMonth]);

  return (
    <div className="w-full">

      {/* ================= STICKY MONTH HEADER ================= */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="py-3 flex gap-2 overflow-x-auto no-scrollbar">
            {monthNames.map((m, idx) => (
              <button
                key={m}
                onClick={() => setActiveMonth(idx)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition
                  ${activeMonth === idx
                    ? 'bg-blue-600 text-white shadow scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                `}
              >
                {m.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================= CONTENT ================= */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">

        {/* Title */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900">
            Birthdays in {monthNames[activeMonth]}
          </h1>
          <p className="text-base text-slate-500 mt-1">
            {monthMembers.length} people celebrating this month
          </p>
        </div>

        {/* ✅ 왼쪽 정렬 1/3 크기 배너 */}
        <div className="flex justify-start">
          <div className="
            inline-flex items-center gap-2
            max-w-[500px] w-full sm:max-w-[640x]
            rounded-xl bg-gradient-to-r from-pink-500 to-orange-400
            px-3 py-2 sm:px-4 sm:py-3 shadow-lg
            text-xs sm:text-sm
          ">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <Cake className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white truncate">Celebration Time!</div>
              <div className="text-white/85 truncate">Let’s celebrate 🎉</div>
            </div>
          </div>
        </div>

        {/* ================= BIRTHDAY GRID ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {monthMembers.map(member => (
            <BirthdayCard
              key={member.id}
              member={member}
              roles={roles}
              onClick={() => onSelectMember(member)}
            />
          ))}

          {monthMembers.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed">
              <div className="text-4xl mb-2">🎂</div>
              <div className="font-semibold">No birthdays this month</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
/* ================= BIRTHDAY CARD ================= */

function BirthdayCard({
  member,
  roles,
  onClick
}: {
  member: Member;
  roles: Role[];
  onClick: () => void;
}) {
  const roleMeta = roles.find(r => r.name === member.role);

  // 1. 타임존 오류를 방지하기 위해 문자열을 '-'로 잘라서 직접 숫자를 가져옵니다.
  const birthdayStr = member.birthday || ''; // 예: "1990-05-15"
  const parts = birthdayStr.split('-');
  
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1; // 0-indexed (Jan is 0)
  const day = parts[2]; // "15"

  // 월 이름을 가져오기 위한 처리
  const monthName = !isNaN(monthIdx) 
    ? new Date(2024, monthIdx, 1).toLocaleString('en', { month: 'short' }).toUpperCase()
    : '';

  // 2. 나이 계산: "Turning X" (올해 몇 살이 되는가)
  // 단순히 (현재 연도 - 태어난 연도)를 하면 올해 생일에 맞이할 나이가 됩니다.
  const currentYear = new Date().getFullYear();
  const birthYear = parseInt(year, 10);
  const turningAge = !isNaN(birthYear) ? currentYear - birthYear : null;

  return (
    <div
        onClick={onClick}
        className="bg-white rounded-2xl border border-slate-100 px-4 py-3 shadow-sm hover:shadow-md transition cursor-pointer flex items-center gap-4 w-full"
      >
      {/* Date: 문자열에서 직접 가져온 day를 사용 */}
      <div className="w-12 h-14 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center flex-shrink-0">
        <div className="text-[10px] font-bold text-pink-500">{monthName}</div>
        <div className="text-xl font-black text-slate-800">{day}</div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-slate-800 truncate">
            {member.korean_name}
          </span>
          <span className="text-base font-extrabold text-slate-600 whitespace-nowrap">
            {/* Turning 뒤에 정확한 나이 표시 */}
            Turning {turningAge !== null ? turningAge : '-'}
          </span>
        </div>

        <div className="mt-1">
          <span
            className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold ${roleMeta?.bg_color || 'bg-slate-100'} ${roleMeta?.text_color || 'text-slate-600'} bg-opacity-20`}
          >
            {member.role || 'Member'}
          </span>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
    </div>
  );
}


/* ================= UNIFIED LOG SECTION (Memo + Prayer) ================= */
function MemoSection({ member, onRefresh }: { member: Member; onRefresh: () => void; }) {
  const [logType, setLogType] = useState<'Memo' | 'Prayer'>('Memo');
  const [newLog, setNewLog] = useState('');
  const [editingLog, setEditingLog] = useState<{ index: number; type: 'Memo' | 'Prayer'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. 메모와 기도제목을 하나의 리스트로 합치고 정렬
  const combinedLogs = useMemo(() => {
    const memos = (member.memo?.split('\n\n') || []).filter(Boolean).map((text, index) => ({ text, type: 'Memo' as const, originalIndex: index }));
    const prayers = (member.prayer_request?.split('\n\n') || []).filter(Boolean).map((text, index) => ({ text, type: 'Prayer' as const, originalIndex: index }));
    
    return [...memos, ...prayers].sort((a, b) => b.text.localeCompare(a.text));
  }, [member.memo, member.prayer_request]);

  // 2. 로그 추가 함수
  const handleAddLog = async () => {
    if (!newLog.trim() || loading || !member?.id) return;
    try {
      setLoading(true);
      const timestamp = new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
      const entry = `[${timestamp}] ${newLog.trim()}`;
      
      const field = logType === 'Memo' ? 'memo' : 'prayer_request';
      const currentData = (member[field] ? member[field]?.split('\n\n') : []) || [];
      const updatedData = [entry, ...currentData].join('\n\n');

      const { error } = await supabase.from('members').update({ [field]: updatedData }).eq('id', member.id);
      if (!error) {
        setNewLog('');
        onRefresh();
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // 3. 로그 수정 함수
  const handleUpdateLog = async () => {
    if (!editingLog || !editingLog.text.trim() || loading) return;
    try {
      setLoading(true);
      const field = editingLog.type === 'Memo' ? 'memo' : 'prayer_request';
      const currentLogs = (member[field]?.split('\n\n') || []);
      
      // 기존 타임스탬프가 있으면 유지, 없으면 새로 생성
      const match = currentLogs[editingLog.index].match(/^\[(.*?)\]/);
      const ts = match ? match[1] : new Date().toLocaleString('ko-KR', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
      
      currentLogs[editingLog.index] = `[${ts}] ${editingLog.text.trim()}`;

      const { error } = await supabase.from('members').update({ [field]: currentLogs.join('\n\n') }).eq('id', member.id);
      if (!error) {
        setEditingLog(null);
        onRefresh();
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // 4. 로그 삭제 함수
  const handleDeleteLog = async (type: 'Memo' | 'Prayer', index: number) => {
    if (!confirm('이 기록을 삭제하시겠습니까?') || loading) return;
    try {
      setLoading(true);
      const field = type === 'Memo' ? 'memo' : 'prayer_request';
      const updatedLogs = (member[field]?.split('\n\n') || []).filter((_, i) => i !== index);
      
      const { error } = await supabase.from('members').update({ [field]: updatedLogs.join('\n\n') }).eq('id', member.id);
      if (!error) onRefresh();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      {/* 입력 섹션: 타입 선택 + 텍스트 영역 */}
      <div className="space-y-3">
        <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
          <button 
            onClick={() => setLogType('Memo')}
            className={`px-4 py-1.5 rounded-lg text-[11px] font-black transition-all ${logType === 'Memo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
          >메모</button>
          <button 
            onClick={() => setLogType('Prayer')}
            className={`px-4 py-1.5 rounded-lg text-[11px] font-black transition-all ${logType === 'Prayer' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}
          >기도제목</button>
        </div>

        <div className="flex gap-2">
          <textarea
            value={newLog}
            onChange={(e) => setNewLog(e.target.value)}
            placeholder={logType === 'Memo' ? "메모 입력..." : "기도제목 입력..."}
            className={`flex-1 px-3 py-2 rounded-xl bg-slate-50 border-none focus:ring-2 text-sm min-h-[56px] ${logType === 'Memo' ? 'focus:ring-blue-100' : 'focus:ring-rose-100'}`}
          />
          <button
            onClick={handleAddLog}
            disabled={loading}
            className={`px-4 rounded-xl font-bold text-white transition-all text-xs disabled:opacity-50 ${logType === 'Memo' ? 'bg-blue-600' : 'bg-rose-500'}`}
          >
            등록
          </button>
        </div>
      </div>

      {/* 리스트 섹션: 통합 타임라인 */}
      <div className="space-y-4">
        {combinedLogs.map((log, i) => {
          const match = log.text.match(/^\[(.*?)\] (.*)$/s);
          const timestamp = match ? match[1] : '';
          const content = match ? match[2] : log.text;
          const isEditing = editingLog?.type === log.type && editingLog?.index === log.originalIndex;

          return (
            <div key={i} className={`group p-4 rounded-2xl border transition-all relative ${log.type === 'Memo' ? 'bg-blue-50/30 border-blue-50' : 'bg-rose-50/30 border-rose-50'}`}>
              {isEditing ? (
                <div className="space-y-3">
                  <textarea 
                    value={editingLog.text} 
                    onChange={(e) => setEditingLog({ ...editingLog, text: e.target.value })} 
                    className="w-full p-3 rounded-xl border-none text-sm focus:ring-2 focus:ring-sky-100" 
                    rows={3} 
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingLog(null)} className="px-3 py-1 text-[10px] font-bold text-slate-400">취소</button>
                    <button onClick={handleUpdateLog} className="px-3 py-1 text-[10px] font-bold bg-slate-800 text-white rounded-lg">저장</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${log.type === 'Memo' ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'}`}>
                        {log.type === 'Memo' ? 'MEMO' : 'PRAYER'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">{timestamp}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingLog({ index: log.originalIndex, type: log.type, text: content })} className="p-1 hover:bg-white rounded-lg text-slate-400"><Edit size={14} /></button>
                      <button onClick={() => handleDeleteLog(log.type, log.originalIndex)} className="p-1 hover:bg-white rounded-lg text-rose-400"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{content}</div>
                </>
              )}
            </div>
          );
        })}
        
        {combinedLogs.length === 0 && (
          <div className="py-10 text-center text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            등록된 기록이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= MEMBER DETAIL MODAL ================= */
function MemberDetailModal({ member: rawMember, onClose, roles, familyMembers, onSelectMember, onEdit, userRole, onRefresh }: { member: Member; onClose: () => void; roles: Role[]; familyMembers: Member[]; onSelectMember: (member: Member) => void; onEdit: (member: Member) => void; userRole: 'admin' | 'user'; onRefresh: () => void; }) {
  // Normalize data immediately
  const member = useMemo(() => normalizeMember(rawMember), [rawMember]);
  
  if (!member || !member.id) return null;

  const age = useMemo(() => { try { return calcAge(member.birthday); } catch (e) { return null; } }, [member.birthday]);
  const genderLabel = member.gender?.toLowerCase() === 'male' ? 'M' : member.gender?.toLowerCase() === 'female' ? 'F' : null;
  const isHead = member.relationship?.toLowerCase() === 'head' || member.relationship?.toLowerCase() === 'self';
  const roleMeta = roles?.find((r) => r.name === member.role);
  const roleBg = roleMeta?.bg_color ?? 'bg-slate-200';
  const roleText = roleMeta?.text_color ?? 'text-slate-600';
  const regInfo = useMemo(() => { try { return calcYearsMonths(member.registration_date); } catch (e) { return null; } }, [member.registration_date]);
  
  const otherFamilyMembers = useMemo(() => {
    try {
      if (!Array.isArray(familyMembers)) return [];
      return familyMembers
        .filter((m) => m && m.id !== member.id)
        .map(m => normalizeMember(m))
        .sort((a, b) => { 
          const rank = (m: Member) => { 
            const r = m.relationship?.toLowerCase(); 
            if (r === 'head' || r === 'self') return 0; 
            if (r === 'spouse') return 1; 
            return 2; 
          }; 
          const ra = rank(a); const rb = rank(b); 
          if (ra !== rb) return ra - rb; 
          if (a.birthday && b.birthday) return new Date(a.birthday).getTime() - new Date(b.birthday).getTime(); 
          return 0; 
        });
    } catch (e) { return []; }
  }, [familyMembers, member.id]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300" onClick={onClose}>
      <div className="
            bg-white
            w-full
            max-w-6xl
            h-[100dvh] sm:h-auto sm:max-h-[90vh]
            rounded-2xl sm:rounded-[2rem]
            shadow-2xl
            flex flex-col
            overflow-hidden
            animate-in zoom-in-95 duration-300
          " onClick={(e) => e.stopPropagation()}>
        
        {/* Header Section with Role Background Band */}
        <div className={`relative flex-shrink-0 ${roleBg} bg-opacity-35 pt-16 sm:pt-6 p-4 sm:p-6 lg:p-8 pb-6`}>
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3 sm:gap-5 md:gap-6">
              {/* Profile Image Card */}
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-xl sm:rounded-[1.5rem] bg-white shadow-xl flex items-center justify-center overflow-hidden ring-1 ring-black/5  ${!member.photo_url ? 'opacity-50' : 'opacity-100'}">
                  {member.photo_url ? (
                    <img src={getMemberPhotoUrl(member.photo_url)} alt={member.korean_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${roleText} opacity-30`}>
                      <Users className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16" strokeWidth={1} />
                    </div>
                  )}
                </div>
                {isHead && <CrownBadge />}
              </div>

              {/* Name & Basic Info */}
              <div className="min-w-0">
               <div className="flex flex-col gap-1 sm:gap-2 mb-2 sm:mb-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">{member.korean_name}</h2>
                <span className="text-sm sm:text-base md:text-lg font-medium text-slate-400">{age || '-'} · {genderLabel || '-'}</span>
                </div>
              </div>
                <div className="text-sm sm:text-base md:text-xl font-medium text-slate-400 mb-2 sm:mb-3 break-words">{member.english_name}</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <div className={`inline-block px-3 sm:px-4 py-1 rounded-lg sm:rounded-xl text-[15px] sm:text-m font-bold tracking-wide ${roleBg} ${roleText} bg-opacity-40`}>
                    {member.role || 'Member'}
                  </div>
                  {member.mokjang && (
                    <div className="inline-block px-3 sm:px-4 py-1 rounded-lg sm:rounded-xl text-[15px] sm:text-m font-bold tracking-wide bg-blue-50 text-blue-600 border border-blue-100">
                      {member.mokjang}
                    </div>
                  )}
                  {member.tags?.map(tag => (
                    <span key={tag} className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-500 shadow-sm">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="
              absolute
              top-4 right-4
              sm:static
              sm:flex
              items-center
              gap-2 sm:gap-3
            ">
              {userRole === 'admin' && (
                <button onClick={() => onEdit(member)} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white text-slate-400 hover:text-slate-600 rounded-full shadow-sm border border-slate-100 transition-all hover:shadow-md">
                  <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
              <button onClick={onClose} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white text-slate-400 hover:text-slate-600 rounded-full shadow-sm border border-slate-100 transition-all hover:shadow-md">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden overflow-y-auto custom-scrollbar">
          
          {/* Main Content Area */}
          <div className={`flex-1 ${userRole === 'admin' ? 'lg:border-r lg:border-slate-100 lg:overflow-y-auto custom-scrollbar' : 'overflow-y-auto custom-scrollbar'}`}>
            <div className="p-4 sm:p-6 lg:p-8 pt-6 sm:pt-8">
              
              {/* Contact Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {/* Phone */}
                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border-slate-50 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                    <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-[12px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1">연락처</p>
                    <a href={`tel:${member.phone}`} className="text-sm sm:text-base font-bold text-slate-500 hover:text-blue-300 transition-colors break-all">{member.phone || ''}</a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border-slate-50 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                    <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-[12px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1">E-mail</p>
                    <a href={`mailto:${member.email}`} className="text-sm sm:text-base font-bold text-slate-500 hover:text-blue-300 transition-colors break-all">{member.email || ''}</a>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border-slate-50 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-[12px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1">주소</p>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(member.address || '')}`} target="_blank" rel="noopener noreferrer" className="text-sm sm:text-m font-bold text-slate-500 hover:text-blue-300 transition-colors break-words">{member.address || ''}</a>
                  </div>
                </div>
              </div>
              
              <hr className="border-t border-slate-200 " />
              
              {/* Detailed Info Row */}
             
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 py-6 sm:py-8 border-t border-slate-50">
                {/* Birthday */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                    <p className="text-[10px] sm:text-[12px] font-bold text-slate-500 uppercase tracking-[0.15em]">생일</p>
                  </div>
                  <p className="text-sm sm:text-sm font-bold text-slate-600 break-words ml-6">{member.birthday || '-'}</p>
                </div>

                {/* Registration */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                    <p className="text-[10px] sm:text-[12px] font-bold text-slate-500 uppercase tracking-widest">등록일</p>
                  </div>
                  <p className="text-sm sm:text-sm font-bold text-slate-600 break-words ml-6">{member.registration_date || '-'}</p>
                  {regInfo && <p className="text-[10px] sm:text-[12px] text-slate-500 mt-1 ml-6">{regInfo.years}y {regInfo.months}m</p>}
                </div>

	                {/* Baptism (세례일) */}
	                <div className="min-w-0">
	                  <div className="flex items-center gap-2 mb-2">
	                    <Award className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
	                    <p className="text-[10px] sm:text-[12px] font-bold text-slate-500 uppercase tracking-widest">세례</p>
	                  </div>
	                  <p className="text-sm sm:text-sm font-bold text-slate-600 break-words ml-6">
	                    {member.is_baptized ? (member.baptism_date || 'Yes') : 'No'}
	                  </p>
	                </div>

	                {/* Mokjang (목장) */}
	                <div className="min-w-0">
	                  <div className="flex items-center gap-2 mb-2">
	                    <Home className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
	                    <p className="text-[10px] sm:text-[12px] font-bold text-slate-500 uppercase tracking-widest">목장</p>
	                  </div>
	                  <p className="text-sm sm:text-sm font-bold text-slate-600 break-words ml-6">
	                    {member.mokjang || '-'}
	                  </p>
	                </div>

                {/* Offering # (헌금번호) */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                    <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest">헌금 번호</p>
                  </div>
                  <p className="text-sm sm:text-sm font-bold text-slate-600 break-words ml-6">{member.offering_number || '-'}</p>
                </div>
              </div>
                <hr className="border-t border-slate-200 " />
              {/* Family Members Section */}
              <div className="mt-6 sm:mt-10">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                  <h3 className="text-[11px] sm:text-[13px] font-bold text-slate-600 uppercase tracking-[0.2em]">Family Members</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                  {otherFamilyMembers.map((fm) => {
                    const isFmHead = fm.relationship?.toLowerCase() === 'head' || fm.relationship?.toLowerCase() === 'self';
                    const fmAge = calcAge(fm.birthday);
                    
                    // Get role colors from database
                    const fmRoleMeta = roles?.find((r) => r.name === fm.role);
                    const fmRoleBg = fmRoleMeta?.bg_color ?? 'bg-slate-300';
                    const fmRoleText = fmRoleMeta?.text_color ?? 'text-slate-600';
                    
                    const getRelationshipLabel = (currentRel: string, targetRel: string) => {
                      const isCurrentChild = currentRel === 'son' || currentRel === 'daughter';
                      if (isCurrentChild) {
                        if (targetRel === 'head' || targetRel === 'self') return 'Parent (Head)';
                        if (targetRel === 'spouse') return 'Parent';
                        if (targetRel === 'son' || targetRel === 'daughter') return 'Sibling';
                      }
                      return targetRel; 
                    };

                    const memberRel = member.relationship?.toLowerCase() || '';
                    const fmRel = fm.relationship?.toLowerCase() || '';
                    const displayRelationship = getRelationshipLabel(memberRel, fmRel);
                    const isActive = fm.status?.toLowerCase() === 'active';

                    return (
                      <button
                      key={fm.id}
                      onClick={() => onSelectMember(fm)}
                      className={`
                        flex items-center gap-4 sm:gap-5
                        p-3 sm:p-5
                        rounded-xl sm:rounded-[2rem]
                        bg-white border border-slate-50
                        shadow-sm transition-all group text-left
                        ${isActive ? 'hover:shadow-md hover:border-blue-100' : ''}
                        ${!isActive ? 'opacity-50' : ''}
                      `}
                    >

                        <div
                          className={`
                            relative flex items-center justify-center
                            w-12 h-12 sm:w-14 sm:h-14
                            rounded-lg sm:rounded-2xl
                            ${fmRoleBg}
                            flex-shrink-0
                            overflow-hidden
                            ring-1 ring-slate-100
                            ${!fm.photo_url ? 'opacity-40' : 'opacity-100'}
                          `}
                        >
                          {fm.photo_url ? (
                            <img
                              src={getMemberPhotoUrl(fm.photo_url)}
                              alt={fm.korean_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center ${fmRoleText}`}>
                              <Users className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1} />
                            </div>
                          )}

                          {isFmHead && <CrownBadge />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm sm:text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors break-words">{fm.korean_name}</p>
                          <p className="text-xs text-slate-500 tracking-wide flex items-center gap-2 flex-wrap capitalize">
                            {displayRelationship} <span className="text-slate-500">·</span> <span>{fmAge ? `${fmAge} yrs` : '-'}</span>
                            {fm.tags?.map(tag => (
                              <span key={tag} className="text-[10px] font-bold text-slate-400">#{tag}</span>
                            ))}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                  {otherFamilyMembers.length === 0 && (
                    <div className="col-span-1 md:col-span-2 py-8 sm:py-12 text-center bg-slate-50/50 rounded-xl sm:rounded-[2rem] border border-dashed border-slate-200">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No family records found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Admin Memo Column */}
            {userRole === 'admin' && (
              <div className="w-full lg:w-80 xl:w-96 bg-white flex flex-col border-t lg:border-t-0 lg:border-l lg:border-slate-100">
                
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-white lg:sticky top-0 z-10">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0 opacity-60">
                      <svg
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-sm sm:text-sm font-bold text-slate-500">
                      Memos
                    </h3>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 lg:overflow-y-auto custom-scrollbar p-4 sm:p-5 bg-white">
                  <MemoSection member={member} onRefresh={onRefresh} />
                </div>

              </div>
            )}

        </div>
      </div>
    </div>
  );
}

/* ================= ADMIN MEMO MODAL ================= */
function AdminMemoModal({
  member,
  isOpen,
  onClose,
  onRefresh
}: {
  member: Member;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  if (!isOpen) return null;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl h-[90dvh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-black text-slate-800">
            Admin Memos · {member.korean_name}
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <MemoSection member={member} onRefresh={onRefresh} />
        </div>
      </div>
    </div>
  );
}

/* ================= MAIN APP ================= */
function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const placeholder = useTypingPlaceholder(placeholders[index]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyView, setFamilyView] = useState(false);
  const [activeOnly, setActiveOnly] = useState<boolean>(true);
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'age' | 'birthday' | 'recent'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [activeMenu, setActiveMenu] = useState<MenuKey>('active');
  const [selectedFilter, setSelectedFilter] = useState<ChildList | null>(null);
  const [parentLists, setParentLists] = useState<ParentList[]>([]);
  const [childLists, setChildLists] = useState<ChildList[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [isGlobalLogOpen, setIsGlobalLogOpen] = useState(false); 
  
  const [activeBirthdayMonth, setActiveBirthdayMonth] = useState(new Date().getMonth());
  const [recentDateRange, setRecentDateRange] = useState<{ from: string; to: string }>({
    from: new Date(new Date().setFullYear(new Date().getFullYear() - 3)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    // members 데이터가 로드된 후에 실행되어야 합니다.
    if (members.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const memberId = params.get('id');
      
      if (memberId) {
        const target = members.find(m => m.id === memberId);
        if (target) {
          setSelectedMember(target);
          // 주소창의 ?id=... 부분을 제거해서 깔끔하게 만듦 (새로고침 시 계속 뜨는 것 방지)
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    }
  }, [members]); // members가 로딩될 때마다 체크
  
  // 데이터 로드
  const load = async (actionType?: 'save' | 'delete', memberId?: string, showLoader: boolean = false) => {
  try {
    // showLoader가 true이거나 데이터가 아예 없으면 로딩 화면 표시
    if (showLoader || members.length === 0) setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUserRole(null);
      setLoading(false);
      return;
    }

    // 최신 데이터를 다시 가져옴 (No-cache 효과)
    const [membersRes, familiesRes, rolesRes, profileRes] = await Promise.all([
      supabase.from('members').select('*'),
      supabase.from('families').select('*'),
      supabase.from('roles').select('*'),
      supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    ]);
    
    const newMembers = (membersRes.data || []).map(m => normalizeMember(m));
    
    setMembers(newMembers);
    setFamilies(familiesRes.data || []);
    setRoles(rolesRes.data || []);
    setUserRole((profileRes.data?.role as 'admin' | 'user') || 'user');

    if (actionType === 'save') {
      await fetchSystemLists();
    }

    // 특정 멤버 선택 유지 로직
    if (memberId) {
      const target = newMembers.find(m => m.id === memberId);
      if (target) setSelectedMember(target);
    } else if (selectedMember && actionType !== 'delete') {
      const updated = newMembers.find(m => m.id === selectedMember.id);
      if (updated) setSelectedMember(updated);
    } else if (actionType === 'delete') {
      setSelectedMember(null);
    }

  } catch (e) {
    console.error('Load error:', e);
  } finally {
    setLoading(false);
  }
};

  const handleEditMember = (member: any) => {
    const latestMemberData = members.find(m => m.id === member.id) || member;
    setEditingMember(latestMemberData);
    setIsMemberFormOpen(true);
  };

  const handleNewMember = () => { setEditingMember(null); setIsMemberFormOpen(true); };

  const handleSignOut = async () => {
    try { await supabase.auth.signOut(); setUserRole(null); setMembers([]); } catch (e) { console.error("Sign out error:", e); }
  };

  const fetchSystemLists = async () => {
    const { data: parents } = await supabase.from('parent_lists').select('*').order('order')
    const { data: children } = await supabase.from('child_lists').select('*').order('order')
    setParentLists(parents || [])
    setChildLists(children || [])
  }

  useEffect(() => {
    let isInitialLoad = true;

    // ✅ 추가: 앱 마운트 시 초기 세션 유무를 강제로 체크하여 로딩 문제 해결
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { 
        setUserRole(null); 
        setMembers([]); 
        setLoading(false); // ✅ 로그아웃 시 로딩 해제
      }
      else if (session?.user && isInitialLoad) { 
        fetchSystemLists(); 
        load(); 
        isInitialLoad = false; 
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const resetToInitialView = async (menu: MenuKey = 'active') => {
  // 1. 상태 초기화
  setSidebarOpen(false);
  setActiveMenu(menu);
  setSelectedFilter(null);
  setSearchQuery('');
  setActiveOnly(true);
  setFamilyView(false);
  setSelectedMember(null);

  // 2. 강제 로딩과 함께 데이터 새로고침 (세 번째 인자 true가 강제 로딩)
  await load(undefined, undefined, true);

  // 3. 스크롤을 맨 위로 이동
  requestAnimationFrame(() => { 
    if (mainScrollRef.current) mainScrollRef.current.scrollTo({ top: 0, behavior: 'auto' }); 
    });
  };

  const goToFilter = (parentType: string, child: ChildList) => {
    setActiveMenu('filter');
    setSelectedFilter(child);
    const parent = parentLists.find(p => p.id === child.parent_id);
    if (parent?.name?.includes('상태') && child.name.toLowerCase() === 'inactive') setActiveOnly(false);
    else setActiveOnly(true);
    setSidebarOpen(false);
  };

  const getFamilyLabel = (familyId: string) => {
    const fam = families.find((f) => f.id === familyId);
    if (fam?.family_name) return fam.family_name;
    const head = members.find((m) => m.family_id === familyId && ['head', 'self'].includes(m.relationship?.toLowerCase() || ''));
    return head ? head.korean_name : 'Family';
  };

  // 메인 데이터 계산 로직
  const { displayedMembers, displayedFamilies, totalFamiliesCount, totalPeopleCount, activeMembersCount, familiesCount, birthdaysCount } = useMemo(() => {
    let filterMatchedMembers = members;
 
  if (activeMenu === 'birthdays') {
    filterMatchedMembers = filterMatchedMembers.filter((m) => {
      if (!m.birthday) return false;
      // '2024-02-01' -> ['2024', '02', '01'] -> 두 번째 값 '02'를 숫자로 변환
      const birthMonth = parseInt(m.birthday.split('-')[1], 10); 
      // parseInt('02')는 2이므로, 0부터 시작하는 index와 비교하기 위해 1을 뺍니다.
      return (birthMonth - 1) === activeBirthdayMonth;
    });

    } else if (activeMenu === 'recent') {
      filterMatchedMembers = filterMatchedMembers.filter((m) => m.registration_date && m.registration_date >= recentDateRange.from && m.registration_date <= recentDateRange.to);
    } else if (activeMenu === 'filter' && selectedFilter) {
      const parent = parentLists.find(p => p.id === selectedFilter.parent_id);
      const pType = (parent?.type || '').trim().toLowerCase();
      const cName = selectedFilter.name.trim().toLowerCase().replace(/\s+/g, '');
      filterMatchedMembers = filterMatchedMembers.filter(m => {
        const val = (m as any)[pType];
        if (Array.isArray(val)) return val.some(v => (v || '').toString().trim().toLowerCase().replace(/\s+/g, '') === cName);
        return val?.toString().trim().toLowerCase().replace(/\s+/g, '') === cName;
      });
    }

    if (activeOnly) {
      filterMatchedMembers = filterMatchedMembers.filter((m) => m.status?.toLowerCase() === 'active');
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      filterMatchedMembers = filterMatchedMembers.filter((m) => {
        const nameKo = (m.korean_name || '').toLowerCase();
        const nameEn = (m.english_name || '').toLowerCase();
        const phoneDigits = (m.phone || '').replace(/[^0-9]/g, '');
        const queryDigits = query.replace(/[^0-9]/g, '');
        return nameKo.includes(query) || nameEn.includes(query) || (queryDigits && phoneDigits.includes(queryDigits));
      });
    }

    const matchedFamilyIdsSet = new Set(filterMatchedMembers.map(m => m.family_id).filter(Boolean));

    const finalMembersToShow = familyView 
      ? (activeOnly 
          ? members.filter(m => matchedFamilyIdsSet.has(m.family_id) && m.status?.toLowerCase() === 'active')
          : members.filter(m => matchedFamilyIdsSet.has(m.family_id))
        )
      : filterMatchedMembers;

    const sorted = [...finalMembersToShow].sort((a, b) => {
      if (activeMenu === 'birthdays') {
        const dA = a.birthday ? parseInt(a.birthday.split('-')[2], 10) : 0;
        const dB = b.birthday ? parseInt(b.birthday.split('-')[2], 10) : 0;
        return dA - dB || a.korean_name.localeCompare(b.korean_name, 'ko');
      }

      if (query) {
        const isMatch = (m: Member) => {
          const nK = m.korean_name.toLowerCase();
          const nE = (m.english_name || '').toLowerCase();
          const pD = (m.phone || '').replace(/[^0-9]/g, '');
          const qD = query.replace(/[^0-9]/g, '');
          return nK.includes(query) || nE.includes(query) || (qD && pD.includes(qD));
        };
        const aM = isMatch(a) ? 0 : 1; const bM = isMatch(b) ? 0 : 1;
        if (aM !== bM) return aM - bM; 
        const aH = ['head', 'self'].includes(a.relationship?.toLowerCase() || '') ? 0 : 1;
        const bH = ['head', 'self'].includes(b.relationship?.toLowerCase() || '') ? 0 : 1;
        if (aH !== bH) return aH - bH;
        return (calcAge(b.birthday) || 0) - (calcAge(a.birthday) || 0);
      }

      if (activeMenu === 'recent') {
        return (b.registration_date || '').localeCompare(a.registration_date || '') || a.korean_name.localeCompare(b.korean_name, 'ko');
      }

      let res = 0;
      if (sortBy === 'name') res = a.korean_name.localeCompare(b.korean_name, 'ko');
      else if (sortBy === 'age') res = (calcAge(a.birthday) || 0) - (calcAge(b.birthday) || 0);
      return sortOrder === 'asc' ? res : -res;
    });

    const sortedFamilyIds = Array.from(matchedFamilyIdsSet).sort((idA, idB) => 
      getFamilyLabel(idA).localeCompare(getFamilyLabel(idB), 'ko')
    );

    const activePeople = members.filter(m => m.status?.toLowerCase() === 'active');
    const vancouverNow = new Date().toLocaleString("en-US", {timeZone: "America/Vancouver"});
    const currentVancouverMonth = new Date(vancouverNow).getMonth();

    return { 
      displayedMembers: sorted, 
      displayedFamilies: sortedFamilyIds,
      totalFamiliesCount: matchedFamilyIdsSet.size,
      totalPeopleCount: filterMatchedMembers.length,
      activeMembersCount: activePeople.length, 
      familiesCount: new Set(activePeople.map(m => m.family_id)).size, 
      birthdaysCount: members.filter(m => {
    if (!m.birthday) return false;
    const birthMonth = parseInt(m.birthday.split('-')[1], 10);
    return (birthMonth - 1) === currentVancouverMonth; // 현재 밴쿠버 월과 비교
  }).length 
};
    }, [members, searchQuery, activeOnly, sortBy, sortOrder, activeMenu, selectedFilter, parentLists, recentDateRange, activeBirthdayMonth, familyView]);

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-400">Loading...</div>;
  if (!userRole) return <Login onLogin={(role) => { setUserRole(role); load(); }} />;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 flex" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      <Sidebar
        activeMembersCount={activeMembersCount} familiesCount={familiesCount} birthdaysCount={birthdaysCount}
        activeOnly={activeOnly} sidebarOpen={sidebarOpen} onCloseSidebar={() => setSidebarOpen(false)}
        onClickActiveMembers={() => resetToInitialView('active')} // 여기서도 로딩 발생
        onSelectMenu={(menu) => resetToInitialView(menu)}
        onSelectFilter={goToFilter}
        activeMenu={activeMenu} selectedFilter={selectedFilter} parentLists={parentLists} childLists={childLists}
        members={members} onNewMember={handleNewMember} onSignOut={handleSignOut} userRole={userRole}  onOpenGlobalLog={() => setIsGlobalLogOpen(true)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/95 backdrop-blur-lg border-b border-slate-200 shadow-sm sticky top-0 z-30">
          <div className="px-4 lg:px-6 py-3">
            <div className="flex items-center gap-2 lg:gap-3">
              <button 
              onClick={() => resetToInitialView('active')} // 이제 클릭 시 로딩바가 돌면서 새로고침됨
              className="p-1 rounded-lg hover:bg-slate-100 transition flex-shrink-0" >
              <img src="/apple-touch-icon.png" alt="Home" className="w-8 h-8 object-contain" />
            </button>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input ref={searchInputRef} type="text" placeholder={placeholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setSearchQuery(''); }} className="w-full pl-9 pr-9 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-100 text-sm text-slate-700" />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={16} /></button>}
              </div>
              {!sidebarOpen && (
                <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 transition flex-shrink-0 ml-auto lg:hidden">
                  <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
              )}
            </div>
          </div>
        </header>

        {activeMenu === 'birthdays' && (
          <div className="bg-white border-b border-slate-100 sticky top-0 z-20 overflow-x-auto no-scrollbar">
            <div className="flex gap-2 p-3 px-6 min-w-max">
              {monthNames.map((m, idx) => (
                <button key={m} onClick={() => setActiveBirthdayMonth(idx)} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeBirthdayMonth === idx ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{m}</button>
              ))}
            </div>
          </div>
        )}

        <main ref={mainScrollRef} className="flex-1 overflow-y-auto px-4 lg:px-6 py-5">
          {activeMenu !== 'settings' && (
            <div className="mb-6 flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-800">
                    {activeMenu === 'active' ? (activeOnly ? 'Active Members' : 'All Members') : 
                     activeMenu === 'birthdays' ? `Birthdays in ${new Date(2024, activeBirthdayMonth).toLocaleString('en-US', { month: 'long' })}` :
                     activeMenu === 'recent' ? '최신 등록교인' : activeMenu === 'filter' ? selectedFilter?.name : 'VGMC'}
                  </h2>
                  <p className="text-slate-500 text-sm sm:text-base mt-0.5">{totalFamiliesCount} 가정, {totalPeopleCount} 명</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setActiveOnly(!activeOnly)} className={`flex items-center justify-center p-2 rounded-lg border transition-all ${activeOnly ? 'border-emerald-400 text-emerald-600 bg-emerald-50' : 'border-slate-200 text-slate-400 bg-white'}`}>
                    <Check className="w-5 h-5" /><span className="hidden sm:inline ml-1.5 text-xs font-semibold">Active Only</span>
                  </button>
                  <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
  {/* Card View */}
  <div className="relative group">
    <button
      onClick={() => setFamilyView(false)}
      className={`
        p-2 rounded-md transition-all
        ${!familyView
          ? 'bg-white shadow-sm text-slate-800 opacity-100'
          : 'text-slate-400 opacity-40 hover:opacity-80'}
      `}
    >
      <LayoutGrid size={18} />
    </button>

    {/* Tooltip */}
    <div className="
      absolute -bottom-8 left-1/2 -translate-x-1/2
      px-2 py-1 rounded-md bg-slate-800 text-white
      text-[10px] font-semibold whitespace-nowrap
      opacity-0 group-hover:opacity-100
      transition-opacity pointer-events-none
    ">
      Card View
    </div>
  </div>

  {/* Family View */}
  <div className="relative group">
    <button
      onClick={() => setFamilyView(true)}
      className={`
        p-2 rounded-md transition-all
        ${familyView
          ? 'bg-white shadow-sm text-slate-800 opacity-100'
          : 'text-slate-400 opacity-40 hover:opacity-80'}
      `}
    >
      <Users size={18} />
    </button>

    {/* Tooltip */}
    <div className="
      absolute -bottom-8 left-1/2 -translate-x-1/2
      px-2 py-1 rounded-md bg-slate-800 text-white
      text-[10px] font-semibold whitespace-nowrap
      opacity-0 group-hover:opacity-100
      transition-opacity pointer-events-none
    ">
      Family View
    </div>
  </div>
</div>

                  <div className="hidden sm:flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                    <div className="relative">
                      <button onClick={() => setShowSortDropdown(!showSortDropdown)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-white shadow-sm text-slate-700">
                        Sort: {sortBy === 'name' ? '이름' : '나이'} <ChevronDown size={14} className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      {showSortDropdown && (
                        <div className="absolute right-0 mt-1 w-28 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1">
                          {['name', 'age'].map((key) => (
                            <button key={key} onClick={() => { setSortBy(key as any); setShowSortDropdown(false); }} className={`w-full px-4 py-2 text-left text-xs hover:bg-slate-50 font-medium ${sortBy === key ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}>{key === 'name' ? '이름' : '나이'}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="p-1.5 hover:bg-white rounded-md text-slate-600 transition-all">
                      <ArrowUpDown className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'recent' && (
            <div className="mb-8 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center"><Calendar className="w-6 h-6 text-blue-500" /></div>
                <div><div className="text-sm font-black text-slate-800">등록일 기간 설정</div><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">REGISTRATION DATE RANGE</div></div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FROM</span><input type="date" value={recentDateRange.from} onChange={(e) => setRecentDateRange(prev => ({ ...prev, from: e.target.value }))} className="px-3 py-2 rounded-xl bg-slate-50 border-transparent text-sm font-bold text-slate-700" /></div>
                <div className="flex items-center gap-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TO</span><input type="date" value={recentDateRange.to} onChange={(e) => setRecentDateRange(prev => ({ ...prev, to: e.target.value }))} className="px-3 py-2 rounded-xl bg-slate-50 border-transparent text-sm font-bold text-slate-700" /></div>
                <div className="flex gap-2 ml-2">
                  <button onClick={() => setRecentDateRange({ from: new Date(new Date().setFullYear(new Date().getFullYear() - 3)).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] })} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-black hover:bg-slate-200">최근 3년</button>
                  <button onClick={() => setRecentDateRange({ from: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] })} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-black hover:bg-slate-200">최근 1년</button>
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'birthdays' && (
            <div className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-rose-400 via-pink-500 to-orange-400 p-4 sm:p-6 text-white shadow-lg mb-8 max-w-[280px] sm:max-w-[400px]">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><Cake className="w-6 h-6 text-white" /></div>
              <div className="min-w-0"><h3 className="text-lg sm:text-xl font-black">Celebration Time!</h3><p className="text-xs sm:text-sm text-white/90 font-medium">Let's celebrate together!</p></div>
            </div>
          )}

          {activeMenu === 'settings' ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"><SettingsPage parentLists={parentLists} childLists={childLists} onUpdate={fetchSystemLists} /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeMenu === 'birthdays' ? (
                displayedMembers.map(m => <BirthdayCard key={m.id} member={m} roles={roles} onClick={() => setSelectedMember(m)} />)
              ) : activeMenu === 'recent' ? (
                displayedMembers.map(m => <RecentMemberCard key={m.id} member={m} roles={roles} onClick={() => setSelectedMember(m)} />)
              ) : !familyView ? (
                displayedMembers.map(m => <MemberCard key={m.id} member={m} age={calcAge(m.birthday)} roles={roles} childLists={childLists} onClick={() => setSelectedMember(m)} />)
              ) : (
                displayedFamilies.map((fid: any) => (
                  <FamilyCard key={fid} familyLabel={getFamilyLabel(fid)} members={displayedMembers.filter(m => m.family_id === fid)} roles={roles} familyAddress={displayedMembers.find(m => m.family_id === fid && m.address)?.address} onMemberClick={(m) => setSelectedMember(m)} childLists={childLists} />
                ))
              )}
            </div>
          )}
          {displayedMembers.length === 0 && <div className="text-center py-20 text-slate-400 font-medium">No results found</div>}
        </main>
      </div>

      {selectedMember && (
        <MemberDetailModal member={selectedMember} onClose={() => setSelectedMember(null)} roles={roles} familyMembers={members.filter(m => m.family_id === selectedMember.family_id)} onSelectMember={(m) => setSelectedMember(m)} onEdit={handleEditMember} userRole={userRole as any} onRefresh={() => load()} />
      )}

      <MemberForm
        isOpen={isMemberFormOpen} onClose={() => { setIsMemberFormOpen(false); setEditingMember(null); }}
        onSuccess={async (type, id) => { setIsMemberFormOpen(false); setEditingMember(null); await load(type, id); if (type === 'delete') resetToInitialView(); }}
        initialData={editingMember} parentLists={parentLists} childLists={childLists}
      />
      
      <GlobalLogModal 
        isOpen={isGlobalLogOpen} 
        onClose={() => setIsGlobalLogOpen(false)} 
        members={members} 
        // 1. 에러 해결: onRefresh에 실제 데이터 로드 함수 전달
        onRefresh={() => load()} 
        // 2. 성도 선택 시 로그 모달은 그대로 두고 성도만 선택
        onSelectMember={(m) => setSelectedMember(m)} 
      />
    </div>
  );
}
export default App;

function useTypingPlaceholder(text: string, speed = 80) {
  const [display, setDisplay] = useState('');
  
  // Use a ref to always have the latest text without triggering re-renders
  const textRef = useRef(text);
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    setDisplay('');
    if (!text) return;

    let i = 0;
    const interval = setInterval(() => {
      // Always check against the current text length
      if (i < textRef.current.length) {
        const char = textRef.current[i];
        if (typeof char === 'string') {
          setDisplay((prev) => prev + char);
          i++;
        } else {
          clearInterval(interval);
        }
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return display;
}
