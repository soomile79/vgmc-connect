import React, { useState, useMemo, useEffect, memo } from 'react';
import { supabase } from '../lib/supabase';
import {
  DndContext,
  DragEndEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Users, Search, Home, ChevronDown, ChevronRight, ShieldCheck, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

/* ================= 1. Draggable Member (성도 카드) ================= */
const DraggableMember = memo(({ member, isLeader, leaderType, onSelectMember, isHighlighted }: any) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `member:${member.id}`,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 9999 : undefined,
  };

  const isBlueLeader = ['목자', '부목자'].includes(leaderType);
  const isPinkLeader = ['목녀', '부목녀'].includes(leaderType);

  const colorClass = isBlueLeader ? 'border-sky-200 text-sky-700' : 
                     isPinkLeader ? 'border-pink-200 text-pink-500' : 
                     'border-slate-100 text-slate-600';
  
  const bgClass = isHighlighted ? 'bg-yellow-100 border-yellow-400' : 'bg-white';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (onSelectMember) onSelectMember(member);
      }}
      className={`flex items-center justify-between p-1.5 rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-300 transition-all ${colorClass} ${bgClass}`}
    >
      <span className="text-[10px] lg:text-[14px] font-bold truncate pointer-events-none">
        {member.korean_name}
      </span>
      {leaderType && (
        <span className={`text-[7px] lg:text-[11px] font-black px-1 rounded uppercase pointer-events-none ${isBlueLeader ? 'bg-sky-50' : 'bg-rose-50'}`}>
          {leaderType}
        </span>
      )}
    </div>
  );
});

/* ================= 2. Droppable Zone (공통 드롭 구역) ================= */
function DroppableZone({ id, children, className, activeClass }: any) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? activeClass : ''}`}>
      {children}
    </div>
  );
}

/* ================= 3. Main Org View ================= */
export default function MokjangOrgView({ members, chowonLists, childLists, onRefresh, onSelectMember }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showUnassigned, setShowUnassigned] = useState(false); // 🚀 디폴트를 false(숨김)로 설정
  
  const [localMembers, setLocalMembers] = useState(members);
  const [localChildLists, setLocalChildLists] = useState(childLists);
  
  const isUpdating = React.useRef(false);

  useEffect(() => { 
    if (!isUpdating.current) {
      setLocalMembers(members); 
      setLocalChildLists(childLists); 
    }
  }, [members, childLists]);

  useEffect(() => {
    if (!searchTerm.trim()) return;

    const newExpanded = { ...expanded };
    let changed = false;

    localMembers.forEach((m: any) => {
      if (m.mokjang && m.korean_name.includes(searchTerm)) {
        const targetMokjang = localChildLists.find((c: any) => c.name === m.mokjang);
        if (targetMokjang && !newExpanded[targetMokjang.id]) {
          newExpanded[targetMokjang.id] = true;
          changed = true;
        }
      }
    });

    if (changed) setExpanded(newExpanded);
  }, [searchTerm, localMembers, localChildLists]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }));

  const handleChowonToggleAll = (chowonId: string, expand: boolean) => {
    const mokjangsInChowon = localChildLists.filter((c: any) => c.chowon_id === chowonId);
    setExpanded(prev => {
      const newState = { ...prev };
      mokjangsInChowon.forEach((m: any) => {
        newState[m.id] = expand;
      });
      return newState;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const [activeType, activeId] = (active.id as string).split(':');
    const [overType, overId] = (over.id as string).split(':');

    isUpdating.current = true;

    try {
      if (activeType === 'member') {
        let mokjangName = '';
        if (overType === 'mokjang') {
          const targetMokjang = localChildLists.find((c: any) => c.id === overId);
          if (targetMokjang) mokjangName = targetMokjang.name;
        } else if (overType !== 'unassigned') {
          isUpdating.current = false;
          return;
        }

        setLocalMembers((prev: any) => prev.map((m: any) => m.id === activeId ? { ...m, mokjang: mokjangName } : m));
        await supabase.from('members').update({ mokjang: mokjangName }).eq('id', activeId);
      }

      if (activeType === 'mokjang' && overType === 'chowon') {
        setLocalChildLists((prev: any) => prev.map((c: any) => c.id === activeId ? { ...c, chowon_id: overId } : c));
        const { error } = await supabase.from('child_lists').update({ chowon_id: overId }).eq('id', activeId);
        if (error) throw error;
      }

      if (onRefresh) await onRefresh();
    } catch (e) {
      console.error(e);
      setLocalMembers(members);
      setLocalChildLists(childLists);
    } finally {
      setTimeout(() => { isUpdating.current = false; }, 500); 
    }
  };

  const unassigned = useMemo(() => {
    return localMembers
      .filter((m: any) => (!m.mokjang || m.mokjang === '') && (m.korean_name || "").includes(searchTerm))
      .sort((a: any, b: any) => (a.korean_name || "").localeCompare(b.korean_name || "", "ko"));
  }, [localMembers, searchTerm]);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-4 overflow-hidden p-1 relative">
        
        {/* 목장 배정 명단 사이드바 */}
        <div className={`
          flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out
          ${showUnassigned ? 'w-full lg:w-44 opacity-100 h-64 lg:h-full' : 'w-0 opacity-0 pointer-events-none h-0 lg:h-full overflow-hidden'}
        `}>
          <DroppableZone id="unassigned:root" className="flex-1 bg-white border border-slate-200 rounded-[1.5rem] flex flex-col overflow-hidden shadow-sm" activeClass="ring-4 ring-sky-100 border-sky-400 bg-sky-50/30">
            <div className="p-3 lg:p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                  <Users size={12} className="text-sky-700" /> 목장 배정 명단
                </h3>
                <button onClick={() => setShowUnassigned(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <PanelLeftClose size={16} />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={10} />
                <input 
                  type="text" 
                  placeholder="성도 찾기" 
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-blue-100" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)} 
                  onKeyDown={(e) => { if (e.key === 'Escape') setSearchTerm(''); }}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 lg:p-3 space-y-1.5 custom-scrollbar min-h-[100px]">
              {unassigned.map((m: any) => <DraggableMember key={m.id} member={m} onSelectMember={onSelectMember} />)}
            </div>
          </DroppableZone>
        </div>

        {/* 사이드바 열기 플로팅 버튼 (숨겨져 있을 때만 보임) */}
        {!showUnassigned && (
          <button 
            onClick={() => setShowUnassigned(true)}
            className="absolute top-2 z-50 p-2 bg-white border border-slate-200 rounded-xl shadow-md text-sky-700 hover:bg-blue-50 transition-all"
          >
            <PanelLeftOpen size={18} />
          </button>
        )}

        {/* 메인 조직도 영역 */}
        <div className="flex-1 overflow-y-auto pr-1 lg:pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 gap-6 pb-20">
            {chowonLists.map((chowon: any) => (
              <DroppableZone key={chowon.id} id={`chowon:${chowon.id}`} className="bg-slate-50/50 border border-slate-200 rounded-[1.5rem] lg:rounded-[2rem] p-5 space-y-4 min-h-[150px]" activeClass="ring-4 ring-indigo-200 border-indigo-400">
                <div className="flex justify-between items-center border-b border-neutral-200 pb-3 ml-2">
                  <div className={!showUnassigned ? "pl-8 lg:pl-0 transition-all" : ""}>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <ShieldCheck className="text-indigo-600" size={20} /> {chowon.name}
                    </h2>
                    <p className="text-sm text-neutral-500 mt-1 font-bold">  
                      교역자: {chowon.pastor || '-'} | 초원지기: {chowon.leader || '-'}
                    </p>
                  </div>
                  <div className="flex gap-2 mr-2">
                    <button onClick={() => handleChowonToggleAll(chowon.id, true)} className="p-1.5 bg-white rounded-lg border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-1 text-[10px] font-bold">
                      <Maximize2 size={12} /> 펼치기
                    </button>
                    <button onClick={() => handleChowonToggleAll(chowon.id, false)} className="p-1.5 bg-white rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-1 text-[10px] font-bold">
                      <Minimize2 size={12} /> 접기
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
                  {localChildLists.filter((c: any) => c.chowon_id === chowon.id).map((mokjang: any) => {
                    const mIn = localMembers.filter((m:any) => m.mokjang === mokjang.name);
                    return (
                      <MokjangCard 
                        key={mokjang.id} 
                        mokjang={mokjang} 
                        mIn={mIn} 
                        members={localMembers} 
                        isExpanded={expanded[mokjang.id]} 
                        onToggle={() => setExpanded(p => ({ ...p, [mokjang.id]: !p[mokjang.id] }))} 
                        onSelectMember={onSelectMember} 
                        searchTerm={searchTerm} 
                      />
                    );
                  })}
                </div>
              </DroppableZone>
            ))}
          </div>
        </div>
      </div>
    </DndContext>
  );
}

/* ================= 4. Mokjang Card ================= */
const MokjangCard = memo(({ mokjang, mIn, members, isExpanded, onToggle, onSelectMember, searchTerm }: any) => {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `mokjang:${mokjang.id}` });
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: `mokjang:${mokjang.id}`,
  });

  const mokja = members.find((m: any) => m.id === mokjang.mokja_id);
  const moknyeo = members.find((m: any) => m.id === mokjang.moknyeo_id);

  const familyGroups = useMemo(() => {
    const getRelWeight = (rel: string) => {
      const r = rel?.toLowerCase();
      if (r === 'head' || r === 'self') return 0;
      if (r === 'spouse') return 1;
      return 2;
    };

    const groups: Record<string, any[]> = {};
    const singles: any[] = [];

    mIn.forEach((m: any) => {
      if (m.family_id) {
        if (!groups[m.family_id]) groups[m.family_id] = [];
        groups[m.family_id].push(m);
      } else {
        singles.push(m);
      }
    });

    const sortedGroups = Object.values(groups).map(gMembers => {
      return gMembers.sort((a, b) => getRelWeight(a.relationship) - getRelWeight(b.relationship));
    });

    sortedGroups.sort((a, b) => a[0].korean_name.localeCompare(b[0].korean_name, 'ko'));
    singles.sort((a, b) => a.korean_name.localeCompare(b.korean_name, 'ko'));

    return { sortedGroups, singles };
  }, [mIn]);

  return (
    <div ref={setDropRef} className={`bg-white rounded-xl lg:rounded-2xl border transition-all min-h-[50px] flex flex-col ${isOver ? 'ring-4 ring-sky-200 border-sky-400 bg-sky-50' : 'border-slate-200 shadow-sm'}`}>
      <div ref={setDragRef} style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }} {...listeners} {...attributes} className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Home size={14} className="text-indigo-400 flex-shrink-0" />
          <span className="font-black text-slate-800 text-xs lg:text-base whitespace-nowrap">{mokjang.name}</span>
          {(mokja || moknyeo) && (
            <div className="text-[10px] lg:text-[13px] font-bold text-slate-400 truncate ml-1 flex items-center">
              (<span className="text-sky-700">{mokja?.korean_name}</span>
              {mokja && moknyeo && <span className="mx-0.5 lg:mx-1 text-slate-200">|</span>}
              <span className="text-pink-500">{moknyeo?.korean_name}</span>)
            </div>
          )}
        </div>
        <div onClick={(e) => { e.stopPropagation(); onToggle(); }} className="flex items-center gap-1 p-1 hover:bg-slate-100 rounded pointer-events-auto">
          <span className="text-[9px] lg:text-[11px] font-bold text-slate-500">{mIn.length}명</span>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 pt-2 border-t border-slate-50 bg-slate-50/20 min-h-[80px] space-y-2">
          {familyGroups.sortedGroups.map((gMembers, idx) => (
            <div key={idx} className={`p-1.5 rounded-xl border border-dashed transition-all ${gMembers.length > 1 ? 'bg-white border-slate-200' : 'border-transparent'}`}>
              <div className="grid grid-cols-2 gap-1.5">
                {gMembers.map((mem: any) => {
                  let lType = '';
                  if (mem.id === mokjang.mokja_id) lType = '목자';
                  else if (mem.id === mokjang.moknyeo_id) lType = '목녀';
                  else if (mem.tags?.includes('부목자')) lType = '부목자';
                  else if (mem.tags?.includes('부목녀')) lType = '부목녀';

                  return (
                    <DraggableMember 
                      key={mem.id} member={mem} 
                      onSelectMember={onSelectMember}
                      isLeader={!!lType}
                      leaderType={lType}
                      isHighlighted={searchTerm && mem.korean_name.includes(searchTerm)}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {familyGroups.singles.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 px-1.5">
              {familyGroups.singles.map((mem: any) => {
                let lType = '';
                if (mem.id === mokjang.mokja_id) lType = '목자';
                else if (mem.id === mokjang.moknyeo_id) lType = '목녀';
                else if (mem.tags?.includes('부목자')) lType = '부목자';
                else if (mem.tags?.includes('부목녀')) lType = '부목녀';

                return (
                  <DraggableMember 
                    key={mem.id} member={mem} 
                    onSelectMember={onSelectMember}
                    isLeader={!!lType}
                    leaderType={lType}
                    isHighlighted={searchTerm && mem.korean_name.includes(searchTerm)}
                  />
                );
              })}
            </div>
          )}

          {mIn.length === 0 && <div className="col-span-2 flex items-center justify-center h-16 border-2 border-dashed border-slate-200 rounded-xl text-[10px] text-slate-400 font-bold bg-white/50">여기로 성도 드래그</div>}
        </div>
      )}
    </div>
  );
});
