import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ChevronRight,
  Clock,
  Wallet,
  User,
  Menu
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
type Role = { name: string; bg_color: string; text_color: string; };
type Member = {
  id: string; family_id: string | null; korean_name: string; english_name?: string | null;
  gender?: 'Male' | 'Female' | null; birthday?: string | null; phone?: string | null;
  email?: string | null; address?: string | null; mokjang?: string | null;
  relationship?: string | null; is_baptized?: boolean; baptism_date?: string | null;
  role?: string | null; registration_date?: string | null; status?: string | null;
  memo?: string | null; offering_number?: string | null; for_slip?: string | null;
  tags?: string[] | null; photo_url?: string | null;
};
type Family = { id: string; family_name?: string | null; };
type MenuKey = 'active' | 'birthdays' | 'recent' | 'settings' | string;
type ParentList = { id: string; type: string; name: string; order: number; };
type ChildList = { id: string; parent_id: string; name: string; order: number; bg_color?: string | null; text_color?: string | null; };

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

/* ================= SUB-COMPONENTS ================= */

function Sidebar({ activeMembersCount, familiesCount, birthdaysCount, activeOnly, sidebarOpen, onCloseSidebar, onClickActiveMembers, onSelectMenu, parentLists, childLists, onSelectFilter, activeMenu, selectedFilter, members, onNewMember, onSignOut, userRole }: any) {
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const toggleParent = (parentId: string) => {
    setExpandedParents(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  const getChildStats = (parentType: string, parentName: string, childName: string) => {
    const pType = (parentType || '').trim().toLowerCase();
    const cName = (childName || '').trim().toLowerCase().replace(/\s+/g, '');
    const filtered = members.filter((m: any) => {
      const val = m[pType];
      if (Array.isArray(val)) return val.some(v => (v || '').toString().trim().toLowerCase().replace(/\s+/g, '') === cName);
      return val?.toString().trim().toLowerCase().replace(/\s+/g, '') === cName;
    });
    return { people: filtered.length, families: new Set(filtered.map((m: any) => m.family_id)).size };
  };

  return (
    <>
      {sidebarOpen && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden" onClick={onCloseSidebar} />}
      <aside className={`fixed left-0 top-0 h-[100dvh] w-64 bg-white border-r border-slate-200 z-50 flex flex-col overflow-hidden transform transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
        <div className="flex items-center justify-end px-4 py-3">
          <button onClick={onCloseSidebar} className="p-2 lg:hidden"><X className="w-5 h-5 text-slate-300" /></button>
        </div>
        <h1 className="text-lg font-bold text-slate-500 ml-7">VGMC CONNECT</h1>     
        {userRole === 'admin' && (
          <div className="p-4">
            <button onClick={onNewMember} style={{ backgroundColor: '#3c8fb5' }} className="w-full text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-semibold hover:opacity-90 transition-opacity"><Plus size={20} />New Member</button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          <nav className="px-4 py-2">
            <button onClick={onClickActiveMembers} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border mb-3 transition-all ${activeMenu === 'active' ? 'bg-sky-50 border-sky-200 shadow-sm' : 'bg-white border-slate-200'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeMenu === 'active' ? 'bg-sky-100' : 'bg-blue-50'}`}><Users className="text-blue-600" /></div>
              <div className="text-left"><div className="text-sm font-bold">Active Members</div><div className="text-xs text-slate-500">{familiesCount} 가정 | {activeMembersCount} 명</div></div>
            </button>
            <button onClick={() => onSelectMenu('birthdays')} className={`w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-lg ${activeMenu === 'birthdays' ? 'bg-amber-50' : ''}`}><Cake size={18} className="text-amber-600"/><span className="flex-1 text-left text-sm font-semibold">Birthdays</span>{birthdaysCount > 0 && <span className="text-xs font-bold text-amber-700">{birthdaysCount}</span>}</button>
            <button onClick={() => onSelectMenu('recent')} className={`w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-lg ${activeMenu === 'recent' ? 'bg-emerald-50' : ''}`}><UserCog size={18} className="text-emerald-600"/><span className="flex-1 text-left text-sm font-semibold">최신 등록교인</span></button>
            {parentLists.map((parent: any) => (
              <div key={parent.id}>
                <button onClick={() => toggleParent(parent.id)} className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-slate-50">
                  <span className="text-sm font-bold text-slate-700">{parent.name}</span>
                  <ChevronDown size={14} className={`transition-transform ${expandedParents[parent.id] ? 'rotate-180' : ''}`} />
                </button>
                {expandedParents[parent.id] && childLists.filter((c: any) => c.parent_id === parent.id).map((child: any) => (
                  <button key={child.id} onClick={() => onSelectFilter(parent.type, child)} className={`w-full flex items-center justify-between px-10 py-2 rounded-lg text-xs ${selectedFilter?.id === child.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-500'}`}>
                    <span>{child.name}</span>
                    <span>{getChildStats(parent.type, parent.name, child.name).people}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t space-y-2">
          {userRole === 'admin' && <button onClick={() => onSelectMenu('settings')} className="w-full py-2 border rounded-xl flex items-center justify-center gap-2 text-sm font-semibold hover:bg-slate-50 transition-colors"><Settings size={16}/>Settings</button>}
          <button onClick={onSignOut} className="w-full py-2 bg-slate-100 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold hover:bg-slate-200 transition-colors"><LogOut size={16}/>Sign Out</button>
        </div>
      </aside>
    </>
  );
}

function MemberCard({ member, age, roles, onClick, childLists }: any) {
  const roleMeta = roles.find((r: any) => r.name === member.role);
  const statusColor = STATUS_COLORS[member.status?.toLowerCase()] || 'bg-gray-300';
  const isHead = ['head', 'self'].includes(member.relationship?.toLowerCase() || '');

  return (
    <div onClick={onClick} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[5rem] -mr-8 -mt-8 group-hover:bg-blue-50/50" />
      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0">
            {member.photo_url ? <img src={member.photo_url} className="w-full h-full object-cover" /> : <User className="opacity-20 text-slate-400" />}
            {isHead && <div className="absolute -top-1 -left-1 bg-white rounded-full p-1 shadow-sm"><Award size={14} className="text-amber-500 fill-amber-500"/></div>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <h3 className="text-lg font-bold text-slate-800">{member.korean_name}</h3>
              <span className="text-xs text-slate-400">{age} · {member.gender?.[0]}</span>
              <span className={`w-2 h-2 rounded-full ${statusColor}`} />
            </div>
            <div className="text-xs text-slate-400">{member.english_name}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {member.role && <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${roleMeta?.bg_color || 'bg-slate-50'} ${roleMeta?.text_color || 'text-slate-400'}`}>{member.role}</span>}
          {member.mokjang && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">{member.mokjang}</span>}
          {Array.from(new Set(member.tags || [])).map((tag: any) => (
            <span key={tag} className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-white border border-slate-200 text-slate-500">#{getTagLabel(tag, childLists)}</span>
          ))}
        </div>
        <div className="space-y-1">
          {member.address && (
            <div className="flex items-start gap-1.5 text-xs text-slate-600">
              <MapPin size={14} className="mt-0.5 shrink-0" />
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(member.address)}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:text-blue-600 hover:underline">{member.address}</a>
            </div>
          )}
          {member.phone && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Smartphone size={14} />
              <a href={`tel:${member.phone.replace(/[^0-9+]/g, '')}`} onClick={(e) => e.stopPropagation()} className="hover:text-blue-600 hover:underline">{member.phone}</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FamilyCard({ familyLabel, members, roles, familyAddress, onMemberClick, childLists }: any) {
  if (!members.length) return null;
  const sorted = [...members].sort((a, b) => {
    const getRank = (m: any) => ['head', 'self'].includes(m.relationship?.toLowerCase()) ? 0 : (m.relationship?.toLowerCase() === 'spouse' ? 1 : 2);
    return getRank(a) - getRank(b) || (calcAge(b.birthday) || 0) - (calcAge(a.birthday) || 0);
  });
  return (
    <div className="bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden">
      <div className="bg-slate-50 px-5 py-4 border-b">
        <div className="flex justify-between items-center mb-2"><h2 className="text-lg font-bold text-slate-700">{familyLabel}'s Family</h2><span className="text-xs bg-white px-2 py-0.5 rounded border">{members.length}</span></div>
        {familyAddress && <div className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={12}/>{familyAddress}</div>}
      </div>
      <div className="p-4 space-y-2">
        {sorted.map((m: any) => (
          <div key={m.id} onClick={() => onMemberClick(m)} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">{m.photo_url ? <img src={m.photo_url} className="w-full h-full object-cover" /> : <User size={16} className="m-3 opacity-20 text-slate-400"/>}</div>
            <div className="flex-1"><div className="text-sm font-bold">{m.korean_name} <span className="text-[10px] font-normal text-slate-400">· {m.relationship}</span></div><div className="text-xs text-slate-400">{m.english_name}</div></div>
            <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[m.status?.toLowerCase()] || 'bg-slate-200'}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentMemberCard({ member, roles, onClick }: any) {
  const age = calcAge(member.birthday);
  const statusColor = STATUS_COLORS[member.status?.toLowerCase()] || 'bg-gray-300';
  const roleMeta = roles.find((r: any) => r.name === member.role);

  return (
    <div onClick={onClick} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden group">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner">
          {member.photo_url ? <img src={member.photo_url} className="w-full h-full object-cover" /> : <User className="text-slate-200 w-8 h-8" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2"><h3 className="text-xl font-black text-slate-800">{member.korean_name}</h3><span className={`w-2 h-2 rounded-full ${statusColor}`} /></div>
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{member.english_name}</div>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black border border-blue-100 flex items-center gap-1.5"><Calendar size={12}/>{member.registration_date}</span>
        <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase ${roleMeta?.bg_color || 'bg-slate-100'} ${roleMeta?.text_color || 'text-slate-500'}`}>{member.role || 'Member'}</span>
      </div>
    </div>
  );
}

function BirthdayCard({ member, roles, onClick }: any) {
  const age = calcAge(member.birthday);
  const roleMeta = roles.find((r: any) => r.name === member.role);
  const date = member.birthday ? new Date(member.birthday) : null;
  const month = date?.toLocaleString('en', { month: 'short' }).toUpperCase();
  const day = date ? date.getDate() : '';

  return (
    <div onClick={onClick} className="bg-white rounded-2xl border border-slate-100 px-4 py-3 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group">
      <div className="w-12 h-14 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center flex-shrink-0 group-hover:bg-rose-50 transition-colors">
        <div className="text-[10px] font-black text-rose-500">{month}</div>
        <div className="text-xl font-black text-slate-800">{day}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2"><span className="text-lg font-black text-slate-800 truncate">{member.korean_name}</span><span className="text-sm font-bold text-slate-400 whitespace-nowrap">Turning {age !== null ? age + 1 : '-'}</span></div>
        <div className="mt-0.5"><span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black ${roleMeta?.bg_color || 'bg-slate-100'} ${roleMeta?.text_color || 'text-slate-600'} bg-opacity-30`}>{member.role || 'Member'}</span></div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-500 transition-colors" />
    </div>
  );
}

function MemoSection({ member, onRefresh }: { member: Member; onRefresh: () => void; }) {
  const [newMemo, setNewMemo] = useState('');
  const [editingMemoIndex, setEditingMemoIndex] = useState<number | null>(null);
  const [editingMemoText, setEditingMemoText] = useState('');
  const [loading, setLoading] = useState(false);

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
      const ts = new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
      const updated = [`[${ts}] ${newMemo.trim()}`, ...memoList].join('\n\n');
      await supabase.from('members').update({ memo: updated }).eq('id', member.id);
      setNewMemo(''); onRefresh();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleUpdateMemo = async (index: number) => {
    if (!editingMemoText.trim() || loading || !member?.id) return;
    try {
      setLoading(true);
      const updated = [...memoList];
      const match = updated[index].match(/^\[(.*?)\] (.*)$/s);
      const ts = match ? match[1] : new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
      updated[index] = `[${ts}] ${editingMemoText.trim()}`;
      await supabase.from('members').update({ memo: updated.join('\n\n') }).eq('id', member.id);
      setEditingMemoIndex(null); setEditingMemoText(''); onRefresh();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleDeleteMemo = async (index: number) => {
    if (!confirm('이 메모를 삭제하시겠습니까?') || loading || !member?.id) return;
    try {
      setLoading(true);
      const updated = memoList.filter((_, i) => i !== index).join('\n\n');
      await supabase.from('members').update({ memo: updated }).eq('id', member.id);
      onRefresh();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex gap-2">
        <textarea value={newMemo} onChange={(e) => setNewMemo(e.target.value)} placeholder="New memo..." className="flex-1 px-4 py-3 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium min-h-[80px]" />
        <button onClick={handleAddMemo} disabled={loading} className="px-5 bg-blue-600 text-white rounded-2xl font-black text-xs hover:bg-blue-700 transition-colors disabled:opacity-50">POST</button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {memoList.map((entry, i) => {
          const isEditing = editingMemoIndex === i;
          const match = entry.match(/^\[(.*?)\] (.*)$/s);
          const ts = match ? match[1] : 'LOG';
          const content = match ? match[2] : entry;
          return (
            <div key={i} className="group/item p-4 rounded-2xl bg-white border border-slate-100 hover:shadow-sm transition-all relative">
              {isEditing ? (
                <div className="space-y-3">
                  <textarea autoFocus value={editingMemoText} onChange={(e) => setEditingMemoText(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 border-none text-sm font-medium" rows={3} />
                  <div className="flex justify-end gap-2"><button onClick={() => setEditingMemoIndex(null)} className="px-3 py-1.5 text-xs font-bold text-slate-400">Cancel</button><button onClick={() => handleUpdateMemo(i)} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold">Save</button></div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-md">{ts}</span>
                    <div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex gap-1">
                      <button onClick={() => { setEditingMemoIndex(i); setEditingMemoText(content); }} className="p-1 hover:text-blue-600 transition-colors"><Edit size={12}/></button>
                      <button onClick={() => handleDeleteMemo(i)} className="p-1 hover:text-rose-600 transition-colors"><Trash2 size={12}/></button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">{content}</p>
                </>
              )}
            </div>
          );
        })}
        {memoList.length === 0 && <div className="py-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border-2 border-dashed rounded-2xl">No memos yet</div>}
      </div>
    </div>
  );
}

function MemberDetailModal({ member, onClose, roles, familyMembers, onSelectMember, onEdit, userRole, onRefresh }: any) {
  if (!member) return null;
  const age = calcAge(member.birthday);
  const roleMeta = roles.find((r: any) => r.name === member.role);
  const regInfo = calcYearsMonths(member.registration_date);
  const otherFamily = familyMembers.filter((fm: any) => fm.id !== member.id).sort((a: any, b: any) => (calcAge(b.birthday) || 0) - (calcAge(a.birthday) || 0));

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className={`p-8 ${roleMeta?.bg_color || 'bg-slate-100'} bg-opacity-30 flex justify-between items-start`}>
          <div className="flex gap-8 items-end">
            <div className="w-32 h-32 rounded-3xl bg-white shadow-xl overflow-hidden flex items-center justify-center relative ring-4 ring-white">
              {member.photo_url ? <img src={member.photo_url} className="w-full h-full object-cover" /> : <User size={48} className="opacity-10 text-slate-400"/>}
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-800">{member.korean_name} <span className="text-xl text-slate-400 font-bold">{age} · {member.gender?.[0]}</span></h2>
              <div className="mt-4 flex gap-2">
                <span className={`px-3 py-1 rounded-lg text-xs font-black ${roleMeta?.bg_color || 'bg-white'} ${roleMeta?.text_color || 'text-slate-600'} bg-opacity-50 border border-black/5`}>{member.role || 'Member'}</span>
                {member.mokjang && <span className="px-3 py-1 rounded-lg text-xs font-black bg-blue-50 text-blue-600 border border-blue-100">목장: {member.mokjang}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {userRole === 'admin' && <button onClick={() => onEdit(member)} className="p-3 bg-white rounded-full shadow-sm hover:text-blue-600 transition-all hover:shadow-md active:scale-95"><Edit size={20}/></button>}
            <button onClick={onClose} className="p-3 bg-white rounded-full shadow-sm hover:text-rose-600 transition-all hover:shadow-md active:scale-95"><X size={20}/></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-10 custom-scrollbar">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4"><Smartphone className="text-slate-400"/><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Mobile</p><a href={`tel:${member.phone}`} className="text-lg font-bold text-slate-700 hover:text-blue-600 transition-colors">{member.phone || '-'}</a></div></div>
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4"><Mail className="text-slate-400"/><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Email</p><a href={`mailto:${member.email}`} className="text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors">{member.email || '-'}</a></div></div>
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4 md:col-span-2"><MapPin className="text-slate-400"/><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Address</p><p className="text-sm font-bold text-slate-700">{member.address || '-'}</p></div></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 py-8 border-y border-slate-100">
              <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Birthday</p><p className="font-bold text-slate-600">{member.birthday || '-'}</p></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Registration</p><p className="font-bold text-slate-600">{member.registration_date || '-'}</p>{regInfo && <p className="text-[10px] font-bold text-slate-400 mt-1">{regInfo.years}y {regInfo.months}m</p>}</div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Baptism</p><p className="font-bold text-slate-600">{member.is_baptized ? (member.baptism_date || 'Yes') : 'No'}</p></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest text-blue-500">Mokjang</p><p className="font-bold text-blue-600">{member.mokjang || '-'}</p></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Offering #</p><p className="font-bold text-slate-600">{member.offering_number || '-'}</p></div>
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-[0.2em] border-l-4 border-blue-500 pl-3">Family Members</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {otherFamily.map((fm: any) => (
                  <button key={fm.id} onClick={() => onSelectMember(fm)} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left group">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">{fm.photo_url ? <img src={fm.photo_url} className="w-full h-full object-cover" /> : <User size={20} className="m-3.5 opacity-10 text-slate-400"/>}</div>
                    <div><p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{fm.korean_name}</p><p className="text-xs text-slate-400 font-bold uppercase">{fm.relationship} · {calcAge(fm.birthday)} yrs</p></div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-slate-50/50 rounded-[2rem] p-6 border border-slate-100 flex flex-col h-full">
            <h3 className="text-xs font-black text-slate-400 uppercase mb-6 tracking-[0.2em] flex items-center gap-2"><Briefcase size={16}/> Admin Memo</h3>
            <div className="flex-1 min-h-0"><MemoSection member={member} onRefresh={onRefresh} /></div>
          </div>
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
  const [families, setFamilies] = useState<Family[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyView, setFamilyView] = useState(false);
  const [activeOnly, setActiveOnly] = useState<boolean>(true);
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'age'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [activeMenu, setActiveMenu] = useState<MenuKey>('active');
  const [selectedFilter, setSelectedFilter] = useState<ChildList | null>(null);
  const [parentLists, setParentLists] = useState<ParentList[]>([]);
  const [childLists, setChildLists] = useState<ChildList[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  
  const [activeBirthdayMonth, setActiveBirthdayMonth] = useState(new Date().getMonth());
  const [recentDateRange, setRecentDateRange] = useState<{ from: string; to: string }>({
    from: new Date(new Date().setFullYear(new Date().getFullYear() - 3)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  const fetchSystemLists = async () => {
    const { data: parents } = await supabase.from('parent_lists').select('*').order('order');
    const { data: children } = await supabase.from('child_lists').select('*').order('order');
    setParentLists(parents || []);
    setChildLists(children || []);
  };

  const load = async (actionType?: 'save' | 'delete', memberId?: string) => {
    try {
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
        supabase.from('profiles').select('role').eq('id', user.id).single()
      ]);
      await fetchSystemLists();
      const newMembers = (membersRes.data || []).map(m => normalizeMember(m));
      setMembers(newMembers);
      setFamilies(familiesRes.data || []);
      setRoles(rolesRes.data || []);
      setUserRole(profileRes.data?.role || 'user');
      if (memberId) {
        const target = newMembers.find(m => m.id === memberId);
        if (target) setSelectedMember(target);
      } else if (selectedMember && actionType !== 'delete') {
        const updated = newMembers.find(m => m.id === selectedMember.id);
        if (updated) setSelectedMember(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await load();
      else setLoading(false);
    };
    initializeAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') load();
      else if (event === 'SIGNED_OUT') {
        setUserRole(null);
        setMembers([]);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const resetToInitialView = (menu: MenuKey = 'active') => {
    setActiveMenu(menu); setSelectedFilter(null); setSearchQuery('');
    setActiveOnly(true); setFamilyView(false); setSelectedMember(null); setSidebarOpen(false);
    load();
    requestAnimationFrame(() => { if (mainScrollRef.current) mainScrollRef.current.scrollTo({ top: 0, behavior: 'auto' }); });
  };

  const goToFilter = (parentType: string, child: ChildList) => {
    setActiveMenu('filter'); setSelectedFilter(child);
    const parent = parentLists.find(p => p.id === child.parent_id);
    setActiveOnly(!(parent?.name?.includes('상태') && child.name.toLowerCase() === 'inactive'));
    setSidebarOpen(false);
  };

  const getFamilyLabel = (familyId: string) => {
    const fam = families.find((f) => f.id === familyId);
    if (fam?.family_name) return fam.family_name;
    const head = members.find((m) => m.family_id === familyId && ['head', 'self'].includes(m.relationship?.toLowerCase() || ''));
    return head ? head.korean_name : 'Family';
  };

  const handleEditMember = (member: any) => {
    const latest = members.find(m => m.id === member.id) || member;
    setEditingMember(latest); setIsMemberFormOpen(true);
  };

  const { displayedMembers, displayedFamilies, totalFamiliesCount, totalPeopleCount, activeMembersCount, familiesCount, birthdaysCount } = useMemo(() => {
    let filterMatchedMembers = members;
    if (activeMenu === 'birthdays') {
      filterMatchedMembers = filterMatchedMembers.filter((m) => m.birthday && (new Date(m.birthday).getMonth()) === activeBirthdayMonth);
    } else if (activeMenu === 'recent') {
      filterMatchedMembers = filterMatchedMembers.filter((m) => m.registration_date && m.registration_date >= recentDateRange.from && m.registration_date <= recentDateRange.to);
    } else if (activeMenu === 'filter' && selectedFilter) {
      const parent = parentLists.find(p => p.id === selectedFilter.parent_id);
      const pType = (parent?.type || '').trim().toLowerCase();
      filterMatchedMembers = filterMatchedMembers.filter(m => {
        const val = (m as any)[pType];
        const targetName = selectedFilter.name.trim().toLowerCase().replace(/\s+/g, '');
        if (Array.isArray(val)) return val.some(v => (v || '').toString().trim().toLowerCase().replace(/\s+/g, '') === targetName);
        return val?.toString().trim().toLowerCase().replace(/\s+/g, '') === targetName;
      });
    }

    if (activeOnly && activeMenu !== 'filter') filterMatchedMembers = filterMatchedMembers.filter((m) => m.status?.toLowerCase() === 'active');

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      filterMatchedMembers = filterMatchedMembers.filter((m) => {
        const nK = m.korean_name.toLowerCase();
        const nE = (m.english_name || '').toLowerCase();
        const pD = (m.phone || '').replace(/[^0-9]/g, '');
        const qD = query.replace(/[^0-9]/g, '');
        return nK.includes(query) || nE.includes(query) || (qD && pD.includes(qD));
      });
    }

    const matchedFamilyIdsSet = new Set(filterMatchedMembers.map(m => m.family_id).filter(Boolean));
    const finalMembersToShow = familyView ? members.filter(m => matchedFamilyIdsSet.has(m.family_id)) : filterMatchedMembers;

    const sorted = [...finalMembersToShow].sort((a, b) => {
      if (activeMenu === 'birthdays') return (a.birthday?.split('-')[2] || 0) - (b.birthday?.split('-')[2] || 0);
      if (query) {
        const isMatch = (m: Member) => m.korean_name.toLowerCase().includes(query) || (m.english_name || '').toLowerCase().includes(query);
        const aM = isMatch(a) ? 0 : 1; const bM = isMatch(b) ? 0 : 1;
        if (aM !== bM) return aM - bM;
        const aH = ['head', 'self'].includes(a.relationship?.toLowerCase() || '') ? 0 : 1;
        const bH = ['head', 'self'].includes(b.relationship?.toLowerCase() || '') ? 0 : 1;
        if (aH !== bH) return aH - bH;
        return (calcAge(b.birthday) || 0) - (calcAge(a.birthday) || 0);
      }
      if (sortBy === 'name') return a.korean_name.localeCompare(b.korean_name, 'ko');
      return (calcAge(b.birthday) || 0) - (calcAge(a.birthday) || 0);
    });

    const sortedFamilyIds = Array.from(matchedFamilyIdsSet).sort((a, b) => getFamilyLabel(a).localeCompare(getFamilyLabel(b), 'ko'));

    return { 
      displayedMembers: sorted, displayedFamilies: sortedFamilyIds,
      totalFamiliesCount: matchedFamilyIdsSet.size, totalPeopleCount: filterMatchedMembers.length,
      activeMembersCount: members.filter(m => m.status?.toLowerCase() === 'active').length,
      familiesCount: new Set(members.filter(m => m.status?.toLowerCase() === 'active').map(m => m.family_id)).size,
      birthdaysCount: members.filter(m => m.birthday && (new Date(m.birthday).getMonth()) === new Date().getMonth()).length
    };
  }, [members, searchQuery, activeOnly, sortBy, sortOrder, activeMenu, selectedFilter, parentLists, recentDateRange, activeBirthdayMonth, familyView]);

  const placeholder = useTypingPlaceholder(placeholders[index]);
  useEffect(() => {
    const timer = setTimeout(() => setIndex((prev) => (prev + 1) % placeholders.length), 3000);
    return () => clearTimeout(timer);
  }, [index]);

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-400 font-bold animate-pulse">Loading...</div>;
  if (!userRole) return <Login onLogin={(role) => { setUserRole(role); load(); }} />;

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 flex" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      <Sidebar {...{ activeMembersCount, familiesCount, birthdaysCount, activeOnly, sidebarOpen, activeMenu, selectedFilter, parentLists, childLists, members, userRole }} onCloseSidebar={() => setSidebarOpen(false)} onClickActiveMembers={() => resetToInitialView('active')} onSelectMenu={(menu: any) => resetToInitialView(menu)} onSelectFilter={goToFilter} onNewMember={() => { setEditingMember(null); setIsMemberFormOpen(true); }} onSignOut={() => supabase.auth.signOut()} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/95 border-b border-slate-200 px-4 lg:px-6 py-3 sticky top-0 z-30 flex items-center gap-3">
          <button onClick={() => resetToInitialView('active')} className="p-1 hover:bg-slate-100 rounded-lg transition-colors"><img src="/favicon-32.png" className="w-8 h-8" alt="Logo" /></button>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input ref={searchInputRef} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setSearchQuery('')} className="w-full pl-9 pr-9 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-100 outline-none text-sm" placeholder={placeholder} />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-rose-500"><X size={16}/></button>}
          </div>
          {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="p-2 lg:hidden ml-auto hover:bg-slate-100 rounded-lg transition-colors"><Menu size={24} className="text-slate-600"/></button>}
        </header>

        {activeMenu === 'birthdays' && (
          <div className="bg-white border-b sticky top-0 z-20 overflow-x-auto no-scrollbar py-3 px-6 flex gap-2">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
              <button key={m} onClick={() => setActiveBirthdayMonth(i)} className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${activeBirthdayMonth === i ? 'bg-rose-500 text-white shadow-md scale-105' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{m}</button>
            ))}
          </div>
        )}

        <main ref={mainScrollRef} className="flex-1 overflow-y-auto px-4 lg:px-6 py-5">
          {activeMenu !== 'settings' && (
            <div className="mb-6 flex justify-between items-end gap-4">
              <div><h2 className="text-2xl font-black text-slate-800 tracking-tight">{activeMenu.toUpperCase()}</h2><p className="text-sm font-medium text-slate-500">{totalFamiliesCount} 가정, {totalPeopleCount} 명</p></div>
              <div className="flex gap-2">
                <button onClick={() => setActiveOnly(!activeOnly)} className={`px-3 py-2 rounded-lg border text-sm font-bold transition-all ${activeOnly ? 'bg-emerald-50 border-emerald-400 text-emerald-600 shadow-sm' : 'bg-white text-slate-400'}`}><Check size={16}/></button>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button onClick={() => setFamilyView(false)} className={`p-1.5 rounded transition-all ${!familyView ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}><LayoutGrid size={18}/></button>
                  <button onClick={() => setFamilyView(true)} className={`p-1.5 rounded transition-all ${familyView ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}><Users size={18}/></button>
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'settings' ? <SettingsPage parentLists={parentLists} childLists={childLists} onUpdate={fetchSystemLists} /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeMenu === 'birthdays' ? displayedMembers.map(m => <BirthdayCard key={m.id} member={m} roles={roles} onClick={() => setSelectedMember(m)} />) :
               activeMenu === 'recent' ? displayedMembers.map(m => <RecentMemberCard key={m.id} member={m} roles={roles} onClick={() => setSelectedMember(m)} />) :
               !familyView ? displayedMembers.map(m => <MemberCard key={m.id} member={m} age={calcAge(m.birthday)} roles={roles} childLists={childLists} onClick={() => setSelectedMember(m)} />) :
               displayedFamilies.map((fid: any) => <FamilyCard key={fid} familyLabel={getFamilyLabel(fid)} members={displayedMembers.filter(m => m.family_id === fid)} roles={roles} familyAddress={displayedMembers.find(m => m.family_id === fid && m.address)?.address} onMemberClick={setSelectedMember} childLists={childLists} />)
              }
            </div>
          )}
          {displayedMembers.length === 0 && <div className="text-center py-20 text-slate-400 font-bold bg-slate-50/50 rounded-[2rem] border-2 border-dashed">No results found</div>}
        </main>
      </div>

      {selectedMember && <MemberDetailModal member={selectedMember} onClose={() => setSelectedMember(null)} roles={roles} familyMembers={members.filter(m => m.family_id === selectedMember.family_id)} onSelectMember={setSelectedMember} onEdit={handleEditMember} userRole={userRole as any} onRefresh={() => load()} />}
      <MemberForm isOpen={isMemberFormOpen} onClose={() => { setIsMemberFormOpen(false); setEditingMember(null); }} onSuccess={async (t, id) => { setIsMemberFormOpen(false); setEditingMember(null); await load(t, id); }} initialData={editingMember} parentLists={parentLists} childLists={childLists} />
    </div>
  );
}

function useTypingPlaceholder(text: string, speed = 80) {
  const [display, setDisplay] = useState('');
  const textRef = useRef(text);
  useEffect(() => { textRef.current = text; }, [text]);
  useEffect(() => {
    setDisplay('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < textRef.current.length) { setDisplay((prev) => prev + textRef.current[i]); i++; }
      else clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text]);
  return display;
}

export default App;
