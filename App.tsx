import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { supabase } from './lib/supabase';
import SettingsPage from './components/SettingsPage';
import MemberForm from './components/MemberForm';
import Login from './components/Login';
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
  ArrowsUpDown,
  ChevronRight,
  ChevronUp,
  Crown,
  Clock,
  Wallet
} from 'lucide-react';


const getTagLabel = (tag: string, childLists: ChildList[]) => {
  const matched = childLists.find(
    c => c.name.trim().toLowerCase() === tag.trim().toLowerCase()
  );
  return matched ? matched.name : tag;
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
      photo_url: m.photo_url || null,
    };
  } catch (e) {
    console.error("Normalization error:", e);
    return { id: '', korean_name: 'Error', tags: [], memo: '' } as any;
  }
};

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
  active: 'bg-emerald-500',
  inactive: 'bg-slate-300',
  pending: 'bg-amber-400',
};

/* ================= SIDEBAR Left Bar================= */

function Sidebar({ activeMembersCount, familiesCount, birthdaysCount, activeOnly, sidebarOpen, onCloseSidebar, onClickActiveMembers, onSelectMenu, parentLists, childLists, onSelectFilter, activeMenu, selectedFilter, members, onNewMember, onSignOut, userRole }: { activeMembersCount: number; familiesCount: number; birthdaysCount: number; activeOnly: boolean; sidebarOpen: boolean; onCloseSidebar: () => void; onClickActiveMembers: () => void; onSelectMenu: (menu: MenuKey) => void; parentLists: ParentList[]; childLists: ChildList[]; onSelectFilter: (parentType: string, child: ChildList) => void; activeMenu: MenuKey; selectedFilter: ChildList | null; members: Member[]; onNewMember: () => void; onSignOut: () => void; userRole: 'admin' | 'user' | null; }) {
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
        <div className="p-6 border-b border-slate-50">
        <div className="flex items-center">
          <img
            src="https://img.sanishtech.com/u/1374ca1a4cc438435777e853910bd1b5.png"
            alt="VGMC Connect"
            className="h-10 w-auto"
            loading="lazy"
          />
           <h1 className="text-lg font-bold text-slate-400 ml-2">VGMC CONNECT</h1>
        </div>
      </div>
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
            <button onClick={() => onSelectMenu('recent')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${activeMenu === 'recent' ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeMenu === 'recent' ? 'bg-emerald-100' : 'bg-slate-50'}`}><UserCog className={`w-5 h-5 ${activeMenu === 'recent' ? 'text-emerald-600' : 'text-slate-600'}`} /></div>
              <div className="flex-1 text-left"><div className={`text-sm font-semibold ${activeMenu === 'recent' ? 'text-emerald-700' : 'text-slate-700'}`}>최신 등록교인</div></div>
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
                      {parent.type === 'cell' ? <Home className="w-4 h-4 text-slate-400" /> : 
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
                              {parent.type === 'cell' ? `${stats.families}가정 · ${stats.people}명` : stats.people}
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
function MemberCard({
    member,
    age,
    roles,
    onClick,
    childLists
  }: {
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
          <div className={`relative flex items-center justify-center w-14 h-14 rounded-2xl ${roleBg} shadow-inner flex-shrink-0 overflow-hidden`}>
            {member.photo_url ? <img src={member.photo_url} alt={member.korean_name} className="w-full h-full object-cover" /> : <svg className={`w-6 h-6 ${roleText}`} style={{ opacity: 0.5 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            {isHead && <CrownBadge />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-slate-800">{member.korean_name}</h3>
              {(age !== null || genderLabel) && <span className="text-xs text-slate-400 font-medium">{age !== null && `${age}`}{age !== null && genderLabel && ' · '}{genderLabel}</span>}
              <span className={`w-2 h-2 rounded-full ${statusColor} flex-shrink-0`}></span>
            </div>
            {member.english_name && <div className="text-xs text-slate-400 font-medium mt-0.5">{member.english_name}</div>}
          </div>
        </div>
        {(member.role || (member.tags && member.tags.length > 0)) && (
          <div className="flex flex-wrap gap-1.5">
            {member.role && <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${roleBg} ${roleText}`} style={{ opacity: 0.6 }}>{member.role}</span>}
            {member.tags?.map((tag) => <span key={tag} className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-white border border-slate-200 text-slate-500">#{getTagLabel(tag, childLists)}</span>)}
          </div>
        )}
        {member.address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(member.address)}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-start gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span className="break-words">{member.address}</span></a>}
        {member.phone && <a href={`tel:${member.phone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 font-medium transition-colors"><Smartphone className="w-3.5 h-3.5" />{member.phone}</a>}
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
            <div className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-500" /><h2 className="text-base font-bold text-slate-800">{familyLabel}{"'s Family"}</h2></div>
            <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md shadow-sm">{members.length}</span>
          </div>
          {familyAddress && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(familyAddress)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors"><MapPin className="w-3.5 h-3.5 shrink-0" /><span>{familyAddress}</span></a>}
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
                <div className={`relative flex items-center justify-center w-10 h-10 rounded-lg ${bg} flex-shrink-0`} style={{ opacity: 0.3 }}>
                  {member.photo_url ? <img src={member.photo_url} alt={member.korean_name} className="w-full h-full rounded-lg object-cover" /> : <svg className={`w-5 h-5 ${text}`} style={{ opacity: 0.5 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                  {isHead && <CrownBadge />}
                </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap"><span className="text-sm font-bold text-slate-800">{member.korean_name}</span>{(age !== null || gender) && <span className="text-[10px] text-slate-400 font-bold">{age !== null && age}{age !== null && gender && ' · '}{gender}</span>}</div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {member.english_name && <span className="text-[10px] text-slate-400 font-bold">{member.english_name}</span>}
                      {member.relationship && <span className={`text-[10px] font-black uppercase tracking-widest ${isHead ? 'text-[#4292b8]' : 'text-slate-400'}`}>· {member.relationship}</span>}
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
            max-w-[280px] w-full sm:max-w-[640x]
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
  const age = calcAge(member.birthday);
  const roleMeta = roles.find(r => r.name === member.role);

  const date = member.birthday ? new Date(member.birthday) : null;
  const month = date?.toLocaleString('en', { month: 'short' }).toUpperCase();
  const day = date ? date.getDate() : '';

  return (
    <div
        onClick={onClick}
        className="
          bg-white
          rounded-2xl
          border border-slate-100
          px-4 py-3
          shadow-sm
          hover:shadow-md
          transition
          cursor-pointer
          flex items-center gap-4
          w-full
        "
      >


      {/* Date */}
      <div className="w-12 h-14 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center flex-shrink-0">
        <div className="text-[10px] font-bold text-pink-500">{month}</div>
        <div className="text-xl font-black text-slate-800">{day}</div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-slate-800 truncate">
            {member.korean_name}
          </span>
          <span className="text-base font-extrabold text-slate-600 whitespace-nowrap">
            Turning {age !== null ? age + 1 : '-'}
          </span>
        </div>

        <div className="mt-1">
          <span
            className={`
              inline-block
              px-2.5 py-1
              rounded-md
              text-[11px]
              font-bold
              ${roleMeta?.bg_color || 'bg-slate-100'}
              ${roleMeta?.text_color || 'text-slate-600'}
              bg-opacity-20
            `}
          >
            {member.role || 'Member'}
          </span>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
    </div>
  );
}


/* ================= MEMO SECTION ================= */
function MemoSection({ member, onRefresh }: { member: Member; onRefresh: () => void; }) {
  const [newMemo, setNewMemo] = useState('');
  const [editingMemoIndex, setEditingMemoIndex] = useState<number | null>(null);
  const [editingMemoText, setEditingMemoText] = useState('');
  const [loading, setLoading] = useState(false);

  // Use member.memo directly but safely
  const memoList = useMemo(() => {
    try {
      const raw = member?.memo ? String(member.memo) : '';
      return raw.split('\n\n').map(m => String(m).trim()).filter(Boolean);
    } catch (e) { return []; }
  }, [member?.memo]);

  const handleAddMemo = async () => {
    if (!newMemo.trim() || loading || !member?.id) return;
    try {
      setLoading(true);
      const timestamp = new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
      const memoEntry = `[${timestamp}] ${newMemo.trim()}`;
      const updatedMemo = [memoEntry, ...memoList].join('\n\n');
      const { error } = await supabase.from('members').update({ memo: updatedMemo }).eq('id', member.id);
      if (!error) {
        setNewMemo('');
        onRefresh();
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleUpdateMemo = async (index: number) => {
    if (!editingMemoText.trim() || loading || !member?.id) return;
    try {
      setLoading(true);
      const currentMemos = [...memoList];
      const entry = String(currentMemos[index] || '');
      const match = entry.match(/^\[(.*?)\] (.*)$/s);
      const timestamp = match ? match[1] : new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
      currentMemos[index] = `[${timestamp}] ${editingMemoText.trim()}`;
      const { error } = await supabase.from('members').update({ memo: currentMemos.join('\n\n') }).eq('id', member.id);
      if (!error) {
        setEditingMemoIndex(null);
        setEditingMemoText('');
        onRefresh();
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleDeleteMemo = async (index: number) => {
    if (!confirm('이 메모를 삭제하시겠습니까?') || loading || !member?.id) return;
    try {
      setLoading(true);
      const updatedMemos = memoList.filter((_, i) => i !== index);
      const { error } = await supabase.from('members').update({ memo: updatedMemos.join('\n\n') }).eq('id', member.id);
      if (!error) onRefresh();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (!member) return null;

  return (
    <div className="space-y-6">
      {/* <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memo Log</div> */}
      <div className="flex gap-2">
        <textarea
          value={newMemo}
          onChange={(e) => setNewMemo(e.target.value)}
          placeholder="새로운 메모를 입력하세요..."
          className="
            flex-1
            px-3 py-2
            rounded-xl
            bg-slate-50
            border border-transparent
            focus:bg-white
            focus:border-[#3c8fb5]
            focus:ring-1 focus:ring-blue-50
            transition-all
            font-medium
            text-slate-700
            min-h-[56px]
            text-sm
          "
        />

        <button
          onClick={handleAddMemo}
          disabled={loading}
          className="
            px-3
            h-[56px]
            bg-[#3c8fb5]
            text-white
            rounded-xl
            font-bold
            tracking-wide
            hover:bg-[#327a9c]
            transition-colors
            text-xs
            disabled:opacity-50
            flex items-center justify-center
          "
        >
          등록
        </button>
      </div>

      <div className="space-y-4">
        {memoList.map((entry, i) => {
          const safeEntry = String(entry || '');
          const match = safeEntry.match(/^\[(.*?)\] (.*)$/s);
          const timestamp = match ? match[1] : '';
          const content = match ? match[2] : safeEntry;
          return (
            <div key={i} className="group/memo p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 relative">
              {editingMemoIndex === i ? (
                <div className="space-y-3">
                  <textarea value={editingMemoText} onChange={(e) => setEditingMemoText(e.target.value)} className="w-full p-4 rounded-2xl border-slate-200 text-sm focus:border-[#3c8fb5] focus:ring-2 focus:ring-blue-50" rows={3} />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingMemoIndex(null)} className="px-4 py-2 text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest">취소</button>
                    <button onClick={() => handleUpdateMemo(i)} className="px-4 py-2 text-xs font-black text-white bg-[#3c8fb5] rounded-xl uppercase tracking-widest">저장</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <div className="text-[10px] font-black text-[#3c8fb5] uppercase tracking-widest">{timestamp || '기존 메모'}</div>
                    <div className="flex gap-1 opacity-0 group-hover/memo:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingMemoIndex(i); setEditingMemoText(content); }} className="p-1 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteMemo(i)} className="p-1 hover:bg-red-100 rounded-lg text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">{content}</div>
                </>
              )}
            </div>
          );
        })}
        {memoList.length === 0 && (
          <div className="
            py-6
            text-center
            text-slate-400
            text-xs
            bg-slate-50
            rounded-xl
            border border-dashed border-slate-200
          ">
            등록된 메모가 없습니다.
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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300" onClick={onClose}>
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
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-xl sm:rounded-[1.5rem] bg-white shadow-xl flex items-center justify-center overflow-hidden ring-1 ring-black/5 opacity-70">
                  {member.photo_url ? (
                    <img src={member.photo_url} alt={member.korean_name} className="w-full h-full object-cover" />
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
                    <p className="text-[10px] sm:text-[10.5px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1">Mobile Phone</p>
                    <a href={`tel:${member.phone}`} className="text-sm sm:text-base font-bold text-slate-500 hover:text-blue-300 transition-colors break-all">{member.phone || ''}</a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border-slate-50 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                    <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-[10.5px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1">Email Address</p>
                    <a href={`mailto:${member.email}`} className="text-sm sm:text-base font-bold text-slate-500 hover:text-blue-300 transition-colors break-all">{member.email || ''}</a>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border-slate-50 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-[10.5px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1">Home Address</p>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(member.address || '')}`} target="_blank" rel="noopener noreferrer" className="text-sm sm:text-m font-bold text-slate-500 hover:text-blue-300 transition-colors break-words">{member.address || ''}</a>
                  </div>
                </div>
              </div>
              
              <hr className="border-t border-slate-200 " />
              
              {/* Detailed Info Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 py-6 sm:py-8 border-t border-slate-50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2 sm:mb-2">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                    <p className="text-[10px] sm:text-[10.5px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1">Birthday</p>
                  </div>
                  <p className="text-sm sm:text-sm font-bold text-slate-600 break-words ml-6">{member.birthday || ''}</p>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2 sm:mb-2">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest">Registration</p>
                  </div>
                  <p className="text-sm sm:text-sm font-bold text-slate-600 break-words ml-6">{member.registration_date || '-'}</p>
                  {regInfo && <p className="text-[10px] sm:text-[12px] text-slate-500 mt-1 ml-6">{regInfo.years} years, {regInfo.months} months</p>}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2 sm:mb-2">
                    <Award className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                    <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest">세례 (Baptism)</p>
                  </div>
                  <p className="text-sm sm:text-sm font-bold text-slate-600 break-words ml-6">{member.baptism_date || ''}</p>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2 sm:mb-2">
                    <Wallet className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                    <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest">Offering #</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm sm:text-sm font-bold text-slate-600 break-words ml-6"> <span className="text-slate-700">{member.offering_number || ''}</span></p>
                    {/* <p className="text-sm sm:text-sm font-bold text-slate-600">Slip #: <span className="text-slate-700">{member.for_slip || ''}</span></p> */}
                  </div>
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

                    return (
                      <button key={fm.id} onClick={() => onSelectMember(fm)} className="flex items-center gap-4 sm:gap-5 p-3 sm:p-5 rounded-xl sm:rounded-[2rem] bg-white border border-slate-50 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group text-left">
                        <div className="relative flex-shrink-0">
                          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl ${fmRoleBg} flex items-center justify-center overflow-hidden ring-1 ring-slate-100 opacity-30`}>
                            {fm.photo_url ? (
                              <img src={fm.photo_url} alt={fm.korean_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center ${fmRoleText}`}>
                                <Users className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1} />
                              </div>
                            )}
                          </div>
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyView, setFamilyView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'age'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [activeMenu, setActiveMenu] = useState<MenuKey>('active');

  const [selectedFilter, setSelectedFilter] = useState<ChildList | null>(null)
  const [parentLists, setParentLists] = useState<ParentList[]>([])
  const [childLists, setChildLists] = useState<ChildList[]>([])
  
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null)
  
  const resetToInitialView = () => {
    setSelectedMember(null);   // Detail 닫기
    goToActiveMembers();       // ⭐ Active Members 버튼 누른 것과 동일
  };
  const [recentDateRange, setRecentDateRange] = useState<{ from: string; to: string }>({
    from: new Date(new Date().setFullYear(new Date().getFullYear() - 3)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
  const handleCloseDetail = () => {
    setSelectedMember(null);
  };

  return () => window.removeEventListener('closeMemberDetail', handleCloseDetail);
}, []);
  
  useEffect(() => {
  const handleTagDeleted = (e: Event) => {
    const customEvent = e as CustomEvent<{ name: string }>;
    const deletedTagName = customEvent.detail.name;

    // ⭐ members 전체에서 해당 태그 제거 → 즉시 UI 반영
    setMembers(prevMembers =>
      prevMembers.map(member => ({
        ...member,
        tags: member.tags?.filter(t => t !== deletedTagName) ?? []
      }))
    );
  };

  window.addEventListener('tagDeleted', handleTagDeleted);
  return () => window.removeEventListener('tagDeleted', handleTagDeleted);
}, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUserRole(null);
        setMembers([]);
        setFamilies([]);
        setRoles([]);
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          fetchSystemLists();
          load();
          // Ensure default view on login
          goToActiveMembers();
        } else {
          setUserRole(null);
          setLoading(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function goToActiveMembers() { 
    setActiveMenu('active'); 
    setActiveOnly(true); 
    setSelectedFilter(null); 
    setSidebarOpen(false); 
    setSearchQuery('');
    setFamilyView(false);
  }
  function goToMenu(menu: MenuKey) { 
    setActiveMenu(menu); 
    setSelectedFilter(null); 
    setSidebarOpen(false); 
    if (menu === 'recent') {
      setRecentDateRange({
        from: new Date(new Date().setFullYear(new Date().getFullYear() - 3)).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
      });
    }
  }
  function goToFilter(parentType: string, child: ChildList) { 
    setActiveMenu('filter'); 
    setSelectedFilter(child); 
    
    // "Active Only" should be false only when selecting the "Inactive" status filter.
    // Otherwise, it should remain true (default).
    const parent = parentLists.find(p => p.id === child.parent_id);
    const isStatusParent = parent?.type?.toLowerCase() === 'status' || parent?.name?.includes('상태');
    const isInactiveChild = child.name.trim().toLowerCase() === 'inactive';
    
    if (isStatusParent && isInactiveChild) {
      setActiveOnly(false);
    } else {
      setActiveOnly(true);
    }
    
    setSidebarOpen(false); 
  }

  const handleEditMember = (member: any) => {
    setEditingMember(member);
    setIsMemberFormOpen(true);
  };

  const handleNewMember = () => {
    setEditingMember(null);
    setIsMemberFormOpen(true);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setUserRole(null);
    } catch (e) {
      console.error("Sign out error:", e);
    }
  };

  useEffect(() => { fetchSystemLists(); }, [])
  async function fetchSystemLists() {
    const { data: parents } = await supabase.from('parent_lists').select('*').order('order')
    const { data: children } = await supabase.from('child_lists').select('*').order('order')
    setParentLists(parents || [])
    setChildLists(children || [])
  }



  const load = async (actionType?: 'save' | 'delete', memberId?: string) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserRole(null);
        setLoading(false);
        return;
      }

      const [membersRes, familiesRes, rolesRes, profileRes] = await Promise.all([
        supabase.from('members').select('*'),
        supabase.from('families').select('*'),
        supabase.from('roles').select('*'),
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        fetchSystemLists()
      ]);
      
      const newMembers = membersRes.data || [];
      setMembers(newMembers);
      setFamilies(familiesRes.data || []);
      setRoles(rolesRes.data || []);
      setUserRole((profileRes.data?.role as 'admin' | 'user') || 'user');
      
      if (actionType === 'delete') {
        setSelectedMember(null);
      } else if (actionType === 'save' && memberId) {
        const savedMember = newMembers.find(m => m.id === memberId);
        if (savedMember) setSelectedMember(savedMember);
      } else if (selectedMember) {
        const updatedSelectedMember = newMembers.find(m => m.id === selectedMember.id);
        if (updatedSelectedMember) setSelectedMember(updatedSelectedMember);
      }
    } catch (e) { 
      console.error('Supabase load error:', e); 
    } finally { 
      setLoading(false); 
    }
  };

  const getFamilyLabel = (familyId: string) => {
    const fam = families.find((f) => f.id === familyId);
    if (fam?.family_name) return fam.family_name;
    const head = members.find((m) => m.family_id === familyId && ['head', 'self'].includes(m.relationship?.toLowerCase() || ''));
    return head ? head.korean_name : 'Family';
  };

  const familyGroups = useMemo(() => {
    const map: Record<string, Member[]> = {};
    members.forEach((m) => { if (!m.family_id) return; if (!map[m.family_id]) map[m.family_id] = []; map[m.family_id].push(m); });
    return map;
  }, [members]);

  const getFamilyMembers = (familyId: string) => familyGroups[familyId] || [];

  const { displayedMembers, displayedFamilies, activeMembersCount, familiesCount, birthdaysCount } = useMemo(() => {
    let filtered = members;
    if (activeMenu === 'birthdays') {
      const thisMonth = new Date().getMonth();
      filtered = filtered.filter((m) => {
        if (!m.birthday) return false;
        const parts = m.birthday.split('-');
        return parts.length >= 2 && (parseInt(parts[1], 10) - 1) === thisMonth;
      });
    } else if (activeMenu === 'recent') {
      filtered = filtered.filter((m) => {
        if (!m.registration_date) return false;
        return m.registration_date >= recentDateRange.from && m.registration_date <= recentDateRange.to;
      });
      // Sort by registration date descending
      filtered.sort((a, b) => (b.registration_date || '').localeCompare(a.registration_date || ''));
    } else if (activeMenu === 'filter' && selectedFilter) {
      const parent = parentLists.find(p => p.id === selectedFilter.parent_id);
      const pType = (parent?.type || '').trim().toLowerCase();
      const pName = (parent?.name || '').trim().toLowerCase();
      const cName = selectedFilter.name.trim().toLowerCase().replace(/\s+/g, '');
      
      filtered = filtered.filter((m) => {
        const memberValue = (m as any)[pType];
        
        if (Array.isArray(memberValue)) {
          if (memberValue.some(v => (v || '').toString().trim().toLowerCase().replace(/\s+/g, '') === cName)) return true;
        } else if (memberValue !== undefined && memberValue !== null) {
          if (memberValue.toString().trim().toLowerCase().replace(/\s+/g, '') === cName) return true;
        }
        
        // 폴백 로직
        if (pType === 'cell' || pName.includes('목장')) return (m.mokjang || '').trim().toLowerCase().replace(/\s+/g, '') === cName;
        if (pType === 'role' || pName.includes('직분')) return (m.role || '').trim().toLowerCase().replace(/\s+/g, '') === cName;
        if (pType === 'status' || pName.includes('상태')) return (m.status || '').trim().toLowerCase().replace(/\s+/g, '') === cName;
        if (pType === 'tag' || pType === 'tags' || pName.includes('태그')) return (m.tags || []).some(t => (t || '').trim().toLowerCase().replace(/\s+/g, '') === cName);
        
        return false;
      });
    }
    // Apply "Active Only" filter unless we are explicitly looking at the "Inactive" status filter
    const isInactiveFilter = activeMenu === 'filter' && 
                             selectedFilter && 
                             (parentLists.find(p => p.id === selectedFilter.parent_id)?.type?.toLowerCase() === 'status' || 
                              parentLists.find(p => p.id === selectedFilter.parent_id)?.name?.includes('상태')) &&
                             selectedFilter.name.trim().toLowerCase() === 'inactive';

    if (activeOnly && !isInactiveFilter) {
      filtered = filtered.filter((m) => m.status?.toLowerCase() === 'active');
    }
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      // 1. Find members who directly match the search query
      const matchedMembers = filtered.filter((m) => {
        const nameKo = (m.korean_name || '').toLowerCase(); const nameEn = (m.english_name || '').toLowerCase();
        const phoneDigits = (m.phone || '').replace(/[^0-9]/g, ''); const queryDigits = query.replace(/[^0-9]/g, '');
        return nameKo.includes(query) || nameEn.includes(query) || (queryDigits && phoneDigits.includes(queryDigits));
      });

      // 2. Show the matched person AND their family members for both Card View and Family View
      const matchedFamilyIds = Array.from(new Set(matchedMembers.map(m => m.family_id).filter(Boolean)));
      
      // Get all members of families that have at least one match
      filtered = members.filter(m => m.family_id && matchedFamilyIds.includes(m.family_id));
      
      // If some matched members don't have a family_id, include them too
      const noFamilyMatches = matchedMembers.filter(m => !m.family_id);
      filtered = [...filtered, ...noFamilyMatches];
    }
    const sorted = [...filtered].sort((a, b) => {
      // Priority 1: Birthday View sorting (by day of month, then name)
      if (activeMenu === 'birthdays') {
        const getDay = (dateStr?: string | null) => {
          if (!dateStr) return 0;
          const parts = dateStr.split('-');
          return parts.length >= 3 ? parseInt(parts[2], 10) : 0;
        };
        const dayA = getDay(a.birthday);
        const dayB = getDay(b.birthday);
        if (dayA !== dayB) return dayA - dayB;
        return (a.korean_name || '').localeCompare(b.korean_name || '', 'ko');
      }

      // Priority 2: Recent Members sorting (by registration date desc, then name asc)
      if (activeMenu === 'recent') {
        const dateA = a.registration_date || '';
        const dateB = b.registration_date || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return (a.korean_name || '').localeCompare(b.korean_name || '', 'ko');
      }

      // Priority 3: Search sorting (Matched Person -> Head -> Spouse -> Age)
      if (query) {
        const isMatch = (m: Member) => {
          const nameKo = (m.korean_name || '').toLowerCase(); const nameEn = (m.english_name || '').toLowerCase();
          const phoneDigits = (m.phone || '').replace(/[^0-9]/g, ''); const queryDigits = query.replace(/[^0-9]/g, '');
          return nameKo.includes(query) || nameEn.includes(query) || (queryDigits && phoneDigits.includes(queryDigits));
        };

        const matchA = isMatch(a);
        const matchB = isMatch(b);

        // 1. Matched person comes first
        if (matchA && !matchB) return -1;
        if (!matchA && matchB) return 1;

        // 2. If both are matches or both are family members of a match, sort by relationship
        const getRank = (m: Member) => {
          const rel = m.relationship?.toLowerCase();
          if (rel === 'head' || rel === 'self') return 0;
          if (rel === 'spouse') return 1;
          return 2;
        };
        const rankA = getRank(a);
        const rankB = getRank(b);
        if (rankA !== rankB) return rankA - rankB;
        
        // 3. Within same rank, sort by age (oldest first)
        const ageA = calcAge(a.birthday);
        const ageB = calcAge(b.birthday);
        if (ageA !== null && ageB !== null) return ageB - ageA;
        if (ageA !== null) return -1;
        if (ageB !== null) return 1;
        return 0;
      }
      
      // Default sorting
      if (sortBy === 'name') return sortOrder === 'asc' ? a.korean_name.localeCompare(b.korean_name, 'ko') : b.korean_name.localeCompare(a.korean_name, 'ko');
      const ageA = calcAge(a.birthday); const ageB = calcAge(b.birthday);
      if (ageA !== null && ageB !== null) return sortOrder === 'asc' ? ageB - ageA : ageA - ageB;
      return ageA !== null ? -1 : 1;
    });
    const searchedFamilyIds = Array.from(new Set(filtered.map((m) => m.family_id).filter(Boolean)));
    const sortedFamilyIds = searchedFamilyIds.sort((idA, idB) => getFamilyLabel(idA).localeCompare(getFamilyLabel(idB), 'ko'));
    const activeMembers = members.filter(m => m.status?.toLowerCase() === 'active');
    const activeFamilyIds = new Set(activeMembers.map(m => m.family_id));
    const birthdaysThisMonth = members.filter(m => {
      if (!m.birthday) return false;
      const parts = m.birthday.split('-');
      const bMonth = parts.length >= 2 ? parseInt(parts[1], 10) - 1 : -1;
      const thisMonth = new Date().getMonth();
      if (bMonth !== thisMonth) return false;
      return activeOnly ? m.status?.toLowerCase() === 'active' : true;
    }).length;
    return { displayedMembers: sorted, displayedFamilies: sortedFamilyIds, activeMembersCount: activeMembers.length, familiesCount: activeFamilyIds.size, birthdaysCount: birthdaysThisMonth };
  }, [members, searchQuery, activeOnly, sortBy, sortOrder, familyView, activeMenu, selectedFilter, parentLists, recentDateRange]);

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-400"><div className="text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto mb-3"></div><div className="text-sm font-medium">Loading...</div></div></div>;

  if (!userRole) {
    return <Login onLogin={(role) => { setUserRole(role); load(); }} />;
  }

  if (activeMenu === 'settings') {
    return (
      <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 flex" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
        <Sidebar activeMembersCount={activeMembersCount} familiesCount={familiesCount} birthdaysCount={birthdaysCount} activeOnly={activeOnly} sidebarOpen={sidebarOpen} onCloseSidebar={() => setSidebarOpen(false)} onClickActiveMembers={goToActiveMembers} onSelectMenu={goToMenu} parentLists={parentLists} childLists={childLists} onSelectFilter={goToFilter} activeMenu={activeMenu} selectedFilter={selectedFilter} members={members} onNewMember={handleNewMember} onSignOut={handleSignOut} userRole={userRole} />
        <div className="flex-1 overflow-y-auto"><SettingsPage parentLists={parentLists} childLists={childLists} onUpdate={fetchSystemLists} /></div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 flex" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      <Sidebar activeMembersCount={activeMembersCount} familiesCount={familiesCount} birthdaysCount={birthdaysCount} activeOnly={activeOnly} sidebarOpen={sidebarOpen} onCloseSidebar={() => setSidebarOpen(false)} onClickActiveMembers={goToActiveMembers} onSelectMenu={goToMenu} parentLists={parentLists} childLists={childLists} onSelectFilter={goToFilter} activeMenu={activeMenu} selectedFilter={selectedFilter} members={members} onNewMember={handleNewMember} onSignOut={handleSignOut} userRole={userRole} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/95 backdrop-blur-lg border-b border-slate-200 shadow-sm">
          <div className="px-4 lg:px-6 py-3">
            <div className="flex items-center gap-2 lg:gap-3">
              
              {/* Mobile sidebar button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition flex-shrink-0"
              >
                <svg
                  className="w-5 h-5 text-slate-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="이름이나 전화번호로 검색하세요."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent text-sm text-slate-700 placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Active Only */}
                <button
                  onClick={() => setActiveOnly(!activeOnly)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border transition-all ${
                    activeOnly
                      ? 'border-emerald-400 text-emerald-600 bg-emerald-50'
                      : 'border-slate-200 text-slate-400 bg-white'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span className="hidden lg:inline text-xs font-semibold">Active Only</span>
                </button>

                {/* ⭐ Mobile: Card / Family toggle */}
                <div className="flex md:hidden items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setFamilyView(false)}
                    className={`p-1.5 rounded-md transition-all ${
                      !familyView ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'
                    }`}
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button
                    onClick={() => setFamilyView(true)}
                    className={`p-1.5 rounded-md transition-all ${
                      familyView ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'
                    }`}
                  >
                    <Users size={16} />
                  </button>
                </div>

                {/* Desktop controls (기존 그대로) */}
                <div className="hidden md:flex items-center gap-2">
                  <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setFamilyView(false)}
                      className={`p-1.5 rounded-md transition-all ${
                        !familyView ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
                      }`}
                      title="Card View"
                    >
                      <LayoutGrid size={16} />
                    </button>
                    <button
                      onClick={() => setFamilyView(true)}
                      className={`p-1.5 rounded-md transition-all ${
                        familyView ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
                      }`}
                      title="Family View"
                    >
                      <Users size={16} />
                    </button>
                  </div>

                  <div className="w-px h-5 bg-slate-300" />

                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSortDropdown(!showSortDropdown);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                    >
                      <span className="text-slate-500">Sort:</span>
                      {sortBy === 'name' ? '이름' : '나이'}
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {showSortDropdown && (
                      <div className="absolute right-0 mt-1 w-28 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-30">
                        <button
                          onClick={() => {
                            setSortBy('name');
                            setShowSortDropdown(false);
                          }}
                          className={`w-full px-3 py-1.5 text-left text-xs font-semibold transition-colors ${
                            sortBy === 'name'
                              ? 'bg-slate-100 text-slate-800'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          이름
                        </button>
                        <button
                          onClick={() => {
                            setSortBy('age');
                            setShowSortDropdown(false);
                          }}
                          className={`w-full px-3 py-1.5 text-left text-xs font-semibold transition-colors ${
                            sortBy === 'age'
                              ? 'bg-slate-100 text-slate-800'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          나이
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-5">
          <div className="mb-6">
            <h2 className="text-3xl font-black text-slate-800">
              {activeMenu === 'active' && (activeOnly ? 'Active Members' : 'All Members')}
              {activeMenu === 'birthdays' && `Birthdays in ${new Date().toLocaleString('en-US', { month: 'long' })}`}
              {activeMenu === 'recent' && '최신 등록교인'}
              {activeMenu === 'filter' && selectedFilter && selectedFilter.name}
            </h2>
            <p className="text-slate-500 mt-1">
              {activeMenu === 'active' && <>{activeOnly ? `${familiesCount} 가정, ${activeMembersCount} 명 (Active)` : `${familiesCount} 가정, ${members.length} 명 (Total)`}</>}
              {activeMenu === 'birthdays' && `${displayedMembers.length} people celebrating this month`}
              {activeMenu === 'recent' && `${displayedMembers.length} members registered between ${recentDateRange.from} and ${recentDateRange.to}`}
              {activeMenu === 'filter' && selectedFilter && `${displayedMembers.length} members`}
            </p>
          </div>

          {activeMenu === 'recent' && (
            <div className="mb-8 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-800">등록일 기간 설정</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registration Date Range</div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From</span>
                  <input 
                    type="date" 
                    value={recentDateRange.from} 
                    onChange={(e) => setRecentDateRange(prev => ({ ...prev, from: e.target.value }))}
                    className="px-3 py-2 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition-all text-sm font-bold text-slate-700"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To</span>
                  <input 
                    type="date" 
                    value={recentDateRange.to} 
                    onChange={(e) => setRecentDateRange(prev => ({ ...prev, to: e.target.value }))}
                    className="px-3 py-2 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition-all text-sm font-bold text-slate-700"
                  />
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <button 
                    onClick={() => setRecentDateRange({
                      from: new Date(new Date().setFullYear(new Date().getFullYear() - 3)).toISOString().split('T')[0],
                      to: new Date().toISOString().split('T')[0]
                    })}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                  >
                    최근 3년
                  </button>
                  <button 
                    onClick={() => setRecentDateRange({
                      from: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0],
                      to: new Date().toISOString().split('T')[0]
                    })}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                  >
                    최근 1년
                  </button>
                </div>
              </div>
            </div>
          )}

         {activeMenu === 'birthdays' && (
          <div className="
            ml-0 max-w-[280px] w-full sm:max-w-[640px]    // 왼쪽 시작
            relative overflow-hidden rounded-2xl p-4 sm:p-6
            bg-gradient-to-r from-rose-400 via-pink-500 to-orange-400 
            text-white shadow-lg mb-8
          ">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-white/10 rounded-full blur-xl sm:w-32 sm:h-32" />
            <div className="relative flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Cake className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-black">Celebration Time!</h3>
                <p className="text-xs sm:text-sm text-white/90 font-medium">Let's celebrate together!</p>
              </div>
            </div>
          </div>
        )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeMenu === 'birthdays' ? (
              displayedMembers.map((member) => <BirthdayCard key={member.id} member={member} roles={roles} onClick={() => { if (member) setSelectedMember(member); }} />)
            ) : activeMenu === 'recent' ? (
              displayedMembers.map((member) => <RecentMemberCard key={member.id} member={member} roles={roles} onClick={() => { if (member) setSelectedMember(member); }} />)
            ) : !familyView ? (
              displayedMembers.map((member) => <MemberCard key={member.id} member={member} age={calcAge(member.birthday)} roles={roles} childLists={childLists} onClick={() => { if (member) setSelectedMember(member); }} />)
            ) : (
              displayedFamilies.map((familyId) => (
              <FamilyCard
                key={familyId}
                familyLabel={getFamilyLabel(familyId)}
                members={displayedMembers.filter(m => m.family_id === familyId)}
                roles={roles}
                familyAddress={displayedMembers
                  .filter(m => m.family_id === familyId)
                  .find(m => m.address)?.address}
                onMemberClick={(m) => {
                  if (m) setSelectedMember(m);
                }}
                childLists={childLists}   // ⭐ 이 줄 추가
              />
            ))

            )}
          </div>
          {displayedMembers.length === 0 && <div className="text-center py-12"><div className="text-slate-400 text-lg">No members found</div></div>}
        </main>
      </div>
      {selectedMember && (
        <MemberDetailModal 
          member={selectedMember} 
          onClose={() => setSelectedMember(null)} 
          roles={roles} 
          familyMembers={getFamilyMembers(selectedMember.family_id || '')} 
          onSelectMember={(m) => { if (m) setSelectedMember(m); }} 
          onEdit={handleEditMember} 
          userRole={userRole} 
          onRefresh={load} 
        />
      )}
      
      {/* Member Form Modal */}
      <MemberForm
        isOpen={isMemberFormOpen}
        onClose={() => setIsMemberFormOpen(false)}
        onSuccess={async (type, id) => {
          await load(type, id);

          if (type === 'delete') {
            resetToInitialView(); // ⭐ 핵심
          } else if (id) {
            const updated = members.find(m => m.id === id);
            if (updated) setSelectedMember(updated);
          }

          setIsMemberFormOpen(false);
          setEditingMember(null);
        }}

        initialData={editingMember}
        parentLists={parentLists}
        childLists={childLists}
      />
    </div>
  );
}

export default App;
