
import { Member, MemberStatus, Position } from './types';

// Helper to generate consistent avatars
const getAvatar = (name: string) => ''; 

// Helper to get the base color name for Tailwind classes (e.g., 'rose', 'blue')
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
    
    // Default
    case '일반성도': 
    default: return 'slate';
  }
};

// Shared Role Style Function (Badge Styles)
export const getRoleStyle = (position: string) => {
  const color = getRoleBaseColor(position);
  // Using explicit classes for Tailwind generic matching guarantees
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

export const INITIAL_MEMBERS: Member[] = [
  // Family 1: Kim (Standard Family)
  {
    id: '1',
    koreanName: '김철수',
    englishName: 'Charles Kim',
    gender: 'Male',
    pictureUrl: '',
    birthday: '1980-05-15',
    phone: '213-555-0101',
    email: 'charles.kim@example.com',
    address: '1234 Wilshire Blvd, Los Angeles, CA 90010',
    mokjang: 'Joy Mokjang',
    representative: '김철수',
    relationship: 'Self',
    isBaptized: true,
    baptismDate: '2000-05-05',
    isRegularMember: true,
    offeringNumber: '1001',
    position: Position.DEACON,
    registrationDate: '2015-01-05',
    status: MemberStatus.ACTIVE,
    memo: 'Choir member.',
    forSlip: '2024-001',
    tags: ['세례']
  },
  {
    id: '2',
    koreanName: '이영희',
    englishName: 'Younghee Lee',
    gender: 'Female',
    pictureUrl: '',
    birthday: '1982-08-20',
    phone: '213-555-0102',
    email: 'younghee.lee@example.com',
    address: '1234 Wilshire Blvd, Los Angeles, CA 90010',
    mokjang: 'Joy Mokjang',
    representative: '김철수',
    relationship: 'Spouse',
    isBaptized: true,
    isRegularMember: true,
    offeringNumber: '1001',
    position: Position.MEMBER,
    registrationDate: '2015-01-05',
    status: MemberStatus.ACTIVE,
    memo: 'Sunday school teacher.',
    forSlip: '2024-001',
    tags: ['세례']
  },
  {
    id: '3',
    koreanName: '김이서',
    englishName: 'Yiseo Kim',
    gender: 'Female',
    pictureUrl: '',
    birthday: '2010-03-15',
    phone: '213-555-0101',
    email: 'charles.kim@example.com',
    address: '1234 Wilshire Blvd, Los Angeles, CA 90010',
    mokjang: 'Joy Mokjang',
    representative: '김철수',
    relationship: 'Daughter',
    isBaptized: false,
    isRegularMember: false,
    offeringNumber: '',
    position: Position.MEMBER,
    registrationDate: '2015-01-05',
    status: MemberStatus.ACTIVE,
    memo: 'Youth group.',
    forSlip: '2024-001',
    tags: []
  },

  // Family 2: Park (Young Couple - New Family)
  {
    id: '4',
    koreanName: '박준호',
    englishName: 'Junho Park',
    gender: 'Male',
    pictureUrl: '',
    birthday: '1995-12-10',
    phone: '714-555-0909',
    email: 'junho.p@example.com',
    address: '5678 Irvine Center Dr, Irvine, CA 92618',
    mokjang: 'Faith Mokjang',
    representative: '박준호',
    relationship: 'Self',
    isBaptized: true,
    isRegularMember: false,
    offeringNumber: '1045',
    position: Position.MEMBER,
    registrationDate: '2023-11-01',
    status: MemberStatus.ACTIVE,
    memo: 'Praise team guitar.',
    forSlip: '2024-045',
    tags: ['세례', '새가족']
  },
  {
    id: '5',
    koreanName: '최수진',
    englishName: 'Sujin Choi',
    gender: 'Female',
    pictureUrl: '',
    birthday: '1996-02-14',
    phone: '714-555-0910',
    email: 'sujin.c@example.com',
    address: '5678 Irvine Center Dr, Irvine, CA 92618',
    mokjang: 'Faith Mokjang',
    representative: '박준호',
    relationship: 'Spouse',
    isBaptized: true,
    isRegularMember: false,
    offeringNumber: '1045',
    position: Position.MEMBER,
    registrationDate: '2023-11-01',
    status: MemberStatus.ACTIVE,
    memo: '',
    forSlip: '2024-045',
    tags: ['세례', '새가족']
  },

  // Family 3: Elder Choi (Senior)
  {
    id: '6',
    koreanName: '최민석',
    englishName: 'Minseok Choi',
    gender: 'Male',
    pictureUrl: '',
    birthday: '1960-01-01',
    phone: '213-555-8888',
    email: 'ms.choi@example.com',
    address: '999 Olympic Blvd, Los Angeles, CA 90015',
    mokjang: 'Love Mokjang',
    representative: '최민석',
    relationship: 'Self',
    isBaptized: true,
    isRegularMember: true,
    offeringNumber: '1002',
    position: Position.ELDER,
    registrationDate: '2000-01-01',
    status: MemberStatus.ACTIVE,
    memo: 'Head Elder.',
    forSlip: '2024-002',
    tags: ['세례']
  },
  {
    id: '7',
    koreanName: '강미경',
    englishName: 'Mikyung Kang',
    gender: 'Female',
    pictureUrl: '',
    birthday: '1962-05-05',
    phone: '213-555-8889',
    email: 'mk.kang@example.com',
    address: '999 Olympic Blvd, Los Angeles, CA 90015',
    mokjang: 'Love Mokjang',
    representative: '최민석',
    relationship: 'Spouse',
    isBaptized: true,
    isRegularMember: true,
    offeringNumber: '1002',
    position: Position.KWONSA,
    registrationDate: '2000-01-01',
    status: MemberStatus.ACTIVE,
    memo: 'Kitchen ministry lead.',
    forSlip: '2024-002',
    tags: ['세례']
  },

  // Single Members & Others
  {
    id: '8',
    koreanName: '정우성',
    englishName: 'Woosung Jung',
    gender: 'Male',
    pictureUrl: '',
    birthday: '1990-07-07',
    phone: '323-555-1234',
    email: 'ws.jung@example.com',
    address: '456 Sunset Blvd, Los Angeles, CA 90026',
    mokjang: 'Hope Mokjang',
    representative: '정우성',
    relationship: 'Self',
    isBaptized: true,
    isRegularMember: true,
    offeringNumber: '1088',
    position: Position.DEACON,
    registrationDate: '2018-03-15',
    status: MemberStatus.ACTIVE,
    memo: 'Audio team.',
    forSlip: '2024-088',
    tags: ['세례']
  },
  // Generating more members
  ...Array.from({ length: 25 }, (_, i) => {
    const id = (i + 10).toString();
    const isMale = i % 2 === 0;
    
    const lastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권'];
    const maleFirstNames = ['민준', '서준', '도윤', '예준', '시우', '하준', '지호', '지후', '준우', '준서', '현우'];
    const femaleFirstNames = ['서아', '이서', '지안', '하윤', '서윤', '지우', '민서', '채원', '수아', '지유', '서현'];

    const lastName = lastNames[i % lastNames.length];
    const firstName = isMale ? maleFirstNames[i % maleFirstNames.length] : femaleFirstNames[i % femaleFirstNames.length];
    const koreanName = `${lastName}${firstName}`;
    
    // Random Registration Year for stats (2022, 2023, 2024)
    const regYear = 2022 + (i % 3); 
    const regDate = `${regYear}-0${(i % 9) + 1}-15`;

    return {
      id,
      koreanName: koreanName,
      englishName: `Member ${id}`,
      gender: isMale ? 'Male' : 'Female',
      pictureUrl: '',
      birthday: `19${80 + (i % 20)}-0${(i % 9) + 1}-15`,
      phone: `213-555-99${i < 10 ? '0' + i : i}`,
      email: `user${i}@example.com`,
      address: `${100 + i} Main St, Los Angeles, CA`,
      mokjang: 'Joy Mokjang',
      representative: koreanName,
      relationship: 'Self',
      isBaptized: i % 3 !== 0,
      isRegularMember: i % 4 !== 0,
      offeringNumber: `${2000 + i}`,
      position: i % 5 === 0 ? Position.DEACON : Position.MEMBER,
      registrationDate: regDate,
      status: MemberStatus.ACTIVE,
      memo: 'Auto-generated member.',
      forSlip: `2024-2${i < 10 ? '0' + i : i}`,
      tags: i % 3 !== 0 ? ['세례'] : ['새가족']
    } as Member;
  })
];

export const MOKJANG_LIST = ['Joy Mokjang', 'Faith Mokjang', 'Love Mokjang', 'Hope Mokjang', 'Peace Mokjang'];
