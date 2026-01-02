import { Member } from './types';

// Helper to get the base color name for Tailwind classes
export const getRoleBaseColor = (position: string): string => {
  switch (position) {
    case '교역자': return 'violet';
    case '장로': return 'blue';
    case '권사': return 'rose';
    case '안수집사': return 'indigo';
    case '서리집사': return 'sky';
    case '새가족': return 'amber';

    // Next Generation
    case '영아부': return 'pink';
    case '유치부': return 'orange';
    case '어린이부': return 'yellow';
    case '청소년부': return 'lime';
    case '청년부': return 'teal';

    default:
      return 'slate';
  }
};

// Shared Role Style Function
export const getRoleStyle = (position: string) => {
  const color = getRoleBaseColor(position);
  switch (color) {
    case 'violet': return 'bg-violet-100 text-violet-700 border-violet-200';
    case 'blue': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'rose': return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'indigo': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'sky': return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'amber': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'pink': return 'bg-pink-100 text-pink-700 border-pink-200';
    case 'orange': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'yellow': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'lime': return 'bg-lime-100 text-lime-700 border-lime-200';
    case 'teal': return 'bg-teal-100 text-teal-700 border-teal-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

export const INITIAL_MEMBERS: Member[] = [];

/* =========================
   ✅ 한글 목장 리스트
   ========================= */
export const MOKJANG_LIST = [
  '기쁨 목장',
  '믿음 목장',
  '사랑 목장',
  '소망 목장',
  '평안 목장',
];

/* =========================
   ✅ Sidebar Labels
   ========================= */
export const SIDEBAR_LABELS = {
  mokjang: '목장',
  position: '직분',
  status: '상태',
  tag: '태그',
};
