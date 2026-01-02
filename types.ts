
export enum MemberStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

export enum Position {
  PASTOR = '교역자',
  ELDER = '장로',
  KWONSA = '권사',
  ORDAINED_DEACON = '안수집사',
  DEACON = '서리집사',
  MEMBER = '일반성도',
  INFANT = '영아부',
  KINDER = '유치부',
  ELEMENTARY = '어린이부',
  YOUTH = '청소년부',
  YOUNG_ADULT = '청년부',
}

export interface Member {
  id: string;
  // Personal Info
  koreanName: string;
  englishName: string;
  gender: 'Male' | 'Female'; // New field
  pictureUrl?: string;
  birthday: string; // YYYY-MM-DD
  phone: string; // xxx-xxx-xxxx
  email: string;
  address: string;
  
  // Church Info
  mokjang: string; // Cell Group
  familyPictureUrl?: string;
  representative: string; // Head of household
  relationship: string; // Relation to head
  isBaptized: boolean; // Legacy support (synced with tags)
  baptismDate?: string; // New field
  isRegularMember: boolean; // Legacy support (synced with tags)
  offeringNumber?: string;
  position: Position | string;
  registrationDate: string;
  status: string; // Changed to string to support dynamic statuses
  deceasedDate?: string; // New field for date of passing
  
  // Admin / Internal
  memo: string;
  forSlip: string;
  tags?: string[]; // New: Custom sacraments/checkboxes
}

export type GroupingType = 'all' | 'mokjang' | 'position' | 'status' | 'tag' | 'birthday';