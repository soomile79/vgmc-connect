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
  DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Users, Search, Home, ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react';

/* ================= 1. Draggable Member (성도 카드) ================= */
const DraggableMember = memo(({ member, isLeader, leaderType, onSelectMember }: any) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `member:${member.id}`,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 9999 : undefined,
  };

  const colorClass = leaderType === '목자' ? 'border-sky-200 text-sky-700' : 
                     leaderType === '목녀' ? 'border-pink-200 text-pink-500' : 
                     'border-slate-100 text-slate-600';

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
      className={`flex items-center justify-between p-1.5 rounded-lg border bg-white shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-300 transition-all ${colorClass}`}
    >
      <span className="text-[10px] lg:text-[13px] font-bold truncate pointer-events-none">
        {member.korean_name}
      </span>
      {isLeader && (
        <span className={`text-[7px] lg:text-[10px] font-black px-1 rounded uppercase pointer-events-none ${leaderType === '목자' ? 'bg-sky-50' : 'bg-rose-50'}`}>
          {leaderType}
        </span>
      )}
    </div>
  );
});

/* ================= 2. Droppable Container (공통 드롭 구역) ================= */
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
  
  const [localMembers, setLocalMembers] = useState(members);
  const [localChildLists, setLocalChildLists] = useState(childLists);
  
  const isUpdating = React.useRef(false);

  useEffect(() => { 
    if (!isUpdating.current) {
      setLocalMembers(members); 
      setLocalChildLists(childLists); 
    }
  }, [members, childLists]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }));

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

      if (onRefresh) {
        await onRefresh();
      }
    } catch (e) {
      console.error(e);
      setLocalMembers(members);
      setLocalChildLists(childLists);
    } finally {
      setTimeout(() => {
        isUpdating.current = false;
      }, 500); 
    }
  };

  const unassigned = useMemo(() => {
    return localMembers
      .filter((m: any) => (!m.mokjang || m.mokjang === '') && (m.korean_name || "").includes(searchTerm))
      .sort((a: any, b: any) => (a.korean_name || "").localeCompare(b.korean_name || "", "ko"));
  }, [localMembers, searchTerm]);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-4 overflow-hidden p-1">
        
        <div className="w-full lg:w-64 flex flex-col flex-shrink-0 h-48 lg:h-full">
          <DroppableZone id="unassigned:root" className="flex-1 bg-white border border-slate-200 rounded-[1.5rem] flex flex-col overflow-hidden shadow-sm" activeClass="ring-4 ring-sky-100 border-sky-400 bg-sky-50/30">
            <div className="p-3 lg:p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Users size={14} className="text-blue-500" /> 목장 배정 명단
              </h3>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                <input type="text" placeholder="검색..." className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[12px] outline-none" onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 lg:p-3 space-y-1.5 custom-scrollbar min-h-[100px]">
              {unassigned.map((m: any) => <DraggableMember key={m.id} member={m} onSelectMember={onSelectMember} />)}
            </div>
          </DroppableZone>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 lg:pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 gap-6 pb-20">
            {chowonLists.map((chowon: any) => (
              <DroppableZone key={chowon.id} id={`chowon:${chowon.id}`} className="bg-slate-50/50 border border-slate-200 rounded-[1.5rem] lg:rounded-[2rem] p-5 space-y-4 min-h-[150px]" activeClass="ring-4 ring-indigo-200 border-indigo-400">
                {/* 🚀 초원 헤더 부분 복구 완료 */}
                <div className="flex justify-between items-end border-b border-neutral-200 pb-3 ml-2">
                  <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <ShieldCheck className="text-indigo-600" size={20} /> {chowon.name}
                    </h2>
                    {/* ⬇️ 교역자 및 초원지기 정보 추가 */}
                    <p className="text-sm text-neutral-500 mt-1 font-bold">  
                      교역자: {chowon.pastor || '-'} | 초원지기: {chowon.leader || '-'}
                    </p>
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

/* ================= 4. Mokjang Card (Draggable Header + Droppable Body) ================= */
const MokjangCard = memo(({ mokjang, mIn, members, isExpanded, onToggle, onSelectMember }: any) => {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `mokjang:${mokjang.id}` });
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: `mokjang:${mokjang.id}`,
  });

  const mokja = members.find((m: any) => m.id === mokjang.mokja_id);
  const moknyeo = members.find((m: any) => m.id === mokjang.moknyeo_id);

  const sorted = mIn.sort((a: any, b: any) => {
    const getW = (id: string) => (id === mokjang.mokja_id ? 0 : id === mokjang.moknyeo_id ? 1 : 2);
    return getW(a.id) - getW(b.id) || a.korean_name.localeCompare(b.korean_name, 'ko');
  });

  return (
    <div ref={setDropRef} className={`bg-white rounded-xl lg:rounded-2xl border transition-all min-h-[50px] flex flex-col ${isOver ? 'ring-4 ring-sky-200 border-sky-400 bg-sky-50' : 'border-slate-200 shadow-sm'}`}>
      <div ref={setDragRef} style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }} {...listeners} {...attributes} className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Home size={14} className="text-indigo-400 flex-shrink-0" />
          <span className="font-black text-slate-800 text-xs lg:text-base whitespace-nowrap">{mokjang.name}</span>
          {(mokja || moknyeo) && (
            <div className="text-[10px] lg:text-[14px] font-bold text-slate-400 truncate ml-1 flex items-center">
              (<span className="text-sky-700">{mokja?.korean_name}</span>
              {mokja && moknyeo && <span className="mx-0.5 lg:mx-1 text-slate-200">|</span>}
              <span className="text-pink-500">{moknyeo?.korean_name}</span>)
            </div>
          )}
        </div>
        <div onClick={(e) => { e.stopPropagation(); onToggle(); }} className="flex items-center gap-1 p-1 hover:bg-slate-100 rounded pointer-events-auto">
          <span className="text-[9px] lg:text-[12px] font-bold text-slate-500">{mIn.length}명</span>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 pt-2 border-t border-slate-50 bg-slate-50/20 min-h-[80px]">
          <div className="grid grid-cols-2 gap-1.5 min-h-[60px]">
            {sorted.map((mem: any) => (
              <DraggableMember 
                key={mem.id} member={mem} 
                onSelectMember={onSelectMember}
                isLeader={mem.id === mokjang.mokja_id || mem.id === mokjang.moknyeo_id}
                leaderType={mem.id === mokjang.mokja_id ? '목자' : mem.id === mokjang.moknyeo_id ? '목녀' : ''} 
              />
            ))}
            {mIn.length === 0 && <div className="col-span-2 flex items-center justify-center h-16 border-2 border-dashed border-slate-200 rounded-xl text-[12px] text-slate-400 font-bold bg-white/50">여기로 성도 드래그</div>}
          </div>
        </div>
      )}
    </div>
  );
});
