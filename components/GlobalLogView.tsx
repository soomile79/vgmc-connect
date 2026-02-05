import React, { useMemo, useState } from 'react';
import { User, Calendar, ChevronRight, Edit, Trash2, Info, Heart, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase'; // 수정/삭제를 위해 필요

// 상위 App.tsx에 정의된 헬퍼 함수가 있다면 가져오고, 없다면 정의
const getMemberPhotoUrl = (path: string | null | undefined) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
};

type Member = any;

interface LogEntry {
  member: Member; // 원본 객체 전체 저장 (상세 이동용)
  memberId: string;
  memberName: string;
  photoUrl: string | null;
  timestamp: string;
  content: string;
  type: 'memo' | 'prayer_request';
  rawIndex: number; 
}

export default function GlobalLogView({ 
  members, 
  onSelectMember,
  onRefresh // 수정/삭제 후 데이터 갱신용
}: { 
  members: Member[], 
  onSelectMember: (m: Member) => void,
  onRefresh: () => void
}) {
  const [filterType, setFilterType] = useState<'all' | 'memo' | 'prayer_request'>('all');
  const [editingLog, setEditingLog] = useState<any | null>(null);

  const allLogs = useMemo(() => {
    const logs: LogEntry[] = [];
    
    members.forEach(member => {
      // 메모와 기도제목 두 쪽 다 파싱
      const types: ('memo' | 'prayer_request')[] = ['memo', 'prayer_request'];
      
      types.forEach(t => {
        const rawData = member[t] || '';
        const entries = rawData.split('\n\n').filter(Boolean);
        
        entries.forEach((entry: string, index: number) => {
          const match = entry.match(/^\[(.*?)\] (.*)$/s);
          logs.push({
            member: member,
            memberId: member.id,
            memberName: member.korean_name,
            photoUrl: member.photo_url,
            timestamp: match ? match[1] : 'Unknown',
            content: match ? match[2] : entry,
            type: t,
            rawIndex: index
          });
        });
      });
    });

    // 필터 적용 및 시간순 정렬
    return logs
      .filter(log => filterType === 'all' || log.type === filterType)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [members, filterType]);

  // 삭제 핸들러
  const handleDelete = async (e: React.MouseEvent, log: LogEntry) => {
    e.stopPropagation();
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;
    
    const updatedRaw = (log.member[log.type] || '').split('\n\n').filter((_: any, i: number) => i !== log.rawIndex).join('\n\n');
    const { error } = await supabase.from('members').update({ [log.type]: updatedRaw }).eq('id', log.memberId);
    
    if (!error) onRefresh();
  };

  // 수정 핸들러 (저장)
  const handleUpdate = async (log: LogEntry, newText: string) => {
    const rawLogs = (log.member[log.type] || '').split('\n\n');
    const match = rawLogs[log.rawIndex].match(/^\[(.*?)\]/);
    const ts = match ? match[1] : log.timestamp;
    
    rawLogs[log.rawIndex] = `[${ts}] ${newText.trim()}`;
    const { error } = await supabase.from('members').update({ [log.type]: rawLogs.join('\n\n') }).eq('id', log.memberId);
    
    if (!error) {
      setEditingLog(null);
      onRefresh();
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* 상단 헤더 및 필터 탭 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Mail className="text-blue-500" size={24} /> 전체 로그 관리
          </h3>
          <p className="text-sm text-slate-500 font-medium mt-1">성도들의 모든 메모와 기도제목을 한눈에 관리합니다.</p>
        </div>
        
        <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
          <button onClick={() => setFilterType('all')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>전체</button>
          <button onClick={() => setFilterType('memo')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'memo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>메모</button>
          <button onClick={() => setFilterType('prayer_request')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'prayer_request' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>기도제목</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {allLogs.map((log, i) => {
          const isEditing = editingLog?.memberId === log.memberId && editingLog?.rawIndex === log.rawIndex && editingLog?.type === log.type;

          return (
            <div 
              key={`${log.memberId}-${log.type}-${i}`}
              onClick={() => onSelectMember(log.member)}
              className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden"
            >
              {/* 타입 표시용 왼쪽 띠 */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${log.type === 'memo' ? 'bg-blue-400' : 'bg-rose-400'}`} />

              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex-shrink-0 overflow-hidden border border-slate-100">
                  {log.photoUrl ? (
                    <img src={getMemberPhotoUrl(log.photoUrl) || ''} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <User size={24} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-800 text-base">{log.memberName}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${log.type === 'memo' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                        {log.type === 'memo' ? '메모' : '기도제목'}
                      </span>
                    </div>
                    
                    {/* 수정/삭제 버튼 */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingLog({ ...log }); }} 
                        className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-blue-500"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(e, log)} 
                        className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3 mt-2" onClick={e => e.stopPropagation()}>
                      <textarea 
                        autoFocus
                        value={editingLog.content} 
                        onChange={e => setEditingLog({ ...editingLog, content: e.target.value })}
                        className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingLog(null)} className="px-3 py-1.5 text-xs font-bold text-slate-400">취소</button>
                        <button onClick={() => handleUpdate(log, editingLog.content)} className="px-4 py-1.5 text-xs font-bold bg-slate-800 text-white rounded-lg">저장</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap mb-2">
                        {log.content}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                        <Calendar size={12} /> {log.timestamp}
                      </div>
                    </>
                  )}
                </div>
                
                {!isEditing && (
                  <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors mt-1" size={20} />
                )}
              </div>
            </div>
          );
        })}

        {allLogs.length === 0 && (
          <div className="py-20 text-center text-slate-400 font-bold bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem]">
            기록된 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
