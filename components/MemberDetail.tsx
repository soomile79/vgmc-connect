import React, { useEffect } from 'react';
import { X, MapPin, Smartphone, Mail, Calendar, Users, Edit2, CreditCard, Droplets, Clock, User, Crown, FileText, Home } from 'lucide-react';
import { Member } from '../types';
import { getRoleStyle, getRoleBaseColor } from '../constants';

interface MemberDetailProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (member: Member) => void;
  allMembers: Member[];
  onMemberClick: (member: Member) => void;
}

const MemberDetail: React.FC<MemberDetailProps> = ({ 
  member, isOpen, onClose, onEdit, allMembers, onMemberClick 
}) => {
  
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !member) return null;

  const calculateAge = (dob: string) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const ageDifMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const calculateTenure = (regDateStr: string) => {
    if (!regDateStr) return null;
    const start = new Date(regDateStr);
    const now = new Date();

    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();

    if (days < 0) {
        months--;
        const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0);
        days += prevMonthLastDay.getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }
    
    return `${years} years, ${months} months`;
  };

  const familyMembers = allMembers
    .filter(m => 
      m.representative === member.representative && 
      m.id !== member.id &&
      m.status !== 'Deceased'
    )
    .sort((a, b) => {
       const getRank = (m: Member) => {
          if (m.relationship === 'Self') return 0;
          if (m.relationship === 'Spouse') return 1;
          return 2;
        };
        const rankA = getRank(a);
        const rankB = getRank(b);
        if (rankA !== rankB) return rankA - rankB;
        const ageA = calculateAge(a.birthday) === 'N/A' ? 0 : Number(calculateAge(a.birthday));
        const ageB = calculateAge(b.birthday) === 'N/A' ? 0 : Number(calculateAge(b.birthday));
        return ageB - ageA;
    });

  const googleMapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(member.address)}`;

  const getDisplayRelationship = (familyMember: Member) => {
    const myRel = member.relationship;
    const theirRel = familyMember.relationship;
    if (myRel === 'Self') {
      if (theirRel === 'Spouse') return 'Spouse';
      if (['Son', 'Daughter', 'Child'].includes(theirRel)) return theirRel === 'Child' ? 'Child' : theirRel;
      return theirRel;
    }
    if (myRel === 'Spouse') {
      if (theirRel === 'Self') return 'Spouse (Head)';
      if (['Son', 'Daughter', 'Child'].includes(theirRel)) return theirRel === 'Child' ? 'Child' : theirRel;
      return theirRel;
    }
    if (['Son', 'Daughter', 'Child'].includes(myRel)) {
      if (theirRel === 'Self') return 'Parent (Head)';
      if (theirRel === 'Spouse') return 'Parent';
      if (['Son', 'Daughter', 'Child'].includes(theirRel)) return 'Sibling';
    }
    return theirRel === 'Self' ? 'Head of Household' : theirRel;
  };

  const getDisplayAvatar = (m: Member) => {
    if (m.pictureUrl && !m.pictureUrl.includes('ui-avatars.com')) return m.pictureUrl;
    return null;
  };

  // Theme based on role (using pastel 50/100 scales for BG)
  const roleBaseColor = getRoleBaseColor(member.position as string);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 perspective-[2000px]">
      <style>{`
          @keyframes flipIn {
            0% {
                transform: rotateY(90deg);
                opacity: 0;
            }
            100% {
                transform: rotateY(0deg);
                opacity: 1;
            }
          }
          .animate-flip-in {
            animation: flipIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            transform-origin: center;
          }
      `}</style>
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] relative animate-flip-in ring-1 ring-slate-900/5">
        
        {/* Header - Clean Pastel Background without Overlaps */}
        <div className={`flex flex-col relative bg-${roleBaseColor}-50`}>
           <div className="flex items-start justify-between p-4 sm:p-6 pb-6 sm:pb-8">
               <div className="flex gap-4 sm:gap-6 items-center">
                    <div className="relative shrink-0">
                        {getDisplayAvatar(member) ? (
                            <img 
                            src={getDisplayAvatar(member)!} 
                            alt={member.englishName}
                            className={`w-20 h-20 sm:w-28 sm:h-28 rounded-2xl shadow-sm object-cover bg-white border-4 border-white ${member.status === 'Deceased' ? 'grayscale' : ''}`}
                            />
                        ) : (
                            <div className={`w-20 h-20 sm:w-28 sm:h-28 rounded-2xl shadow-sm bg-white flex items-center justify-center text-${roleBaseColor}-300 border-4 border-white`}>
                                <User className="w-10 h-10 sm:w-12 sm:h-12" />
                            </div>
                        )}
                        {member.relationship === 'Self' && (
                            <div className="absolute -bottom-2 -right-2 bg-white text-amber-500 rounded-full p-1 border border-slate-100 shadow-sm" title="Head of Household">
                                <Crown className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" />
                            </div>
                        )}
                    </div>

                    <div className="pt-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-800 tracking-tight leading-none truncate">
                                {member.koreanName}
                            </h1>
                            <span className="text-sm sm:text-lg font-medium text-slate-500">
                                {calculateAge(member.birthday)} · {member.gender === 'Male' ? 'M' : 'F'}
                            </span>
                        </div>
                        <div className="text-sm sm:text-xl text-slate-500 font-medium mb-2 sm:mb-3 truncate">
                            {member.englishName} 
                        </div>
                        
                        {/* Compact Info Row */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            {/* Styled Badge - Pastel */}
                            <span className={`px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm font-bold rounded-lg uppercase tracking-wide border shadow-sm ${getRoleStyle(member.position as string)}`}>
                                {member.position}
                            </span>
                            {member.mokjang !== 'Unassigned' && (
                                <>
                                <span className="text-slate-300 text-xs">|</span>
                                <span className="text-xs sm:text-sm font-bold text-slate-600">
                                    {member.mokjang}
                                </span>
                                </>
                            )}
                            {member.tags && member.tags.length > 0 && (
                                <>
                                <span className="text-slate-300 text-xs">|</span>
                                <div className="flex flex-wrap gap-1">
                                {member.tags.filter(t => t !== 'New Family' && t !== '새가족').map(tag => (
                                    <span key={tag} className="px-1.5 py-0.5 bg-white text-slate-500 rounded border border-slate-200 text-[10px] sm:text-xs font-bold">
                                        #{tag}
                                    </span>
                                ))}
                                </div>
                                </>
                            )}
                            {(member.tags?.includes('New Family') || member.tags?.includes('새가족')) && (
                                <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] sm:text-xs font-bold border border-amber-200">
                                    새가족
                                </span>
                            )}
                             {member.status === 'Deceased' && (
                                <span className="px-2 py-0.5 bg-slate-800 text-white rounded text-[10px] sm:text-xs font-bold uppercase">
                                    Deceased
                                </span>
                            )}
                        </div>
                    </div>
               </div>

               <div className="flex gap-2">
                    <button 
                    onClick={() => onEdit(member)}
                    className="p-1.5 sm:p-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-brand-600 rounded-full transition-colors border border-slate-200 shadow-sm"
                    title="Edit Member"
                    >
                        <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button 
                    onClick={onClose}
                    className="p-1.5 sm:p-2 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors border border-slate-200 shadow-sm"
                    title="Close"
                    >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
               </div>
           </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-8 py-6 sm:py-8 flex-1 overflow-y-auto bg-white">
          <div className="space-y-6 sm:space-y-8">
            
            {/* Contact Information - CLEANED UP: Removed Gray Backgrounds */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="col-span-1 md:col-span-2 flex flex-col md:flex-row gap-4 sm:gap-6">
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-4 p-3 sm:p-4 rounded-2xl bg-white hover:bg-slate-50 transition-colors border border-white hover:border-slate-100">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shrink-0`}>
                                <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Mobile Phone</div>
                                <a href={`tel:${member.phone}`} className="text-base sm:text-xl font-bold text-slate-800 hover:text-brand-600 transition-colors">{member.phone || '-'}</a>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-3 sm:p-4 rounded-2xl bg-white hover:bg-slate-50 transition-colors border border-white hover:border-slate-100">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shrink-0`}>
                                <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email Address</div>
                                <a href={`mailto:${member.email}`} className="text-sm sm:text-base font-medium text-slate-700 hover:text-brand-600 break-all">{member.email || '-'}</a>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex items-start gap-4 p-3 sm:p-4 rounded-2xl bg-white hover:bg-slate-50 transition-colors border border-white hover:border-slate-100">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shrink-0`}>
                             <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0">
                             <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Home Address</div>
                             <a href={googleMapLink} target="_blank" className="text-sm sm:text-base font-medium text-slate-700 hover:text-brand-600 leading-relaxed block mt-1">
                                {member.address || '-'}
                             </a>
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-px bg-slate-100 w-full" />

            {/* Church Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] sm:text-xs font-bold uppercase mb-1">
                        <Calendar className="w-3.5 h-3.5" /> Birthday
                    </div>
                    <div className="text-sm sm:text-lg font-bold text-slate-900">{member.birthday || '-'}</div>
                </div>

                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] sm:text-xs font-bold uppercase mb-1">
                        <Clock className="w-3.5 h-3.5" /> Registration
                    </div>
                    <div className="text-sm sm:text-lg font-bold text-slate-900">{member.registrationDate || '-'}</div>
                    <div className="text-[10px] sm:text-xs text-slate-500 font-medium">{calculateTenure(member.registrationDate)}</div>
                </div>

                <div className="space-y-1">
                     <div className="flex items-center gap-2 text-slate-400 text-[10px] sm:text-xs font-bold uppercase mb-1">
                        <Droplets className="w-3.5 h-3.5" /> 세례 (Baptism)
                    </div>
                    <div className="text-sm sm:text-lg font-bold text-slate-900">{member.isBaptized ? '세례' : '-'}</div>
                    {member.isBaptized && member.baptismDate && <div className="text-[10px] sm:text-xs text-slate-500 font-medium">{member.baptismDate}</div>}
                </div>

                 <div className="space-y-1">
                     <div className="flex items-center gap-2 text-slate-400 text-[10px] sm:text-xs font-bold uppercase mb-1">
                        <CreditCard className="w-3.5 h-3.5" /> Financial
                    </div>
                    <div className="flex flex-col">
                        <div className="text-xs sm:text-sm font-medium text-slate-600">Offering: <span className="font-bold text-slate-900 ml-1">{member.offeringNumber || '-'}</span></div>
                        <div className="text-xs sm:text-sm font-medium text-slate-600">Slip #: <span className="font-bold text-slate-900 ml-1">{member.forSlip || '-'}</span></div>
                    </div>
                </div>
            </div>

            {/* Notes */}
            {member.memo && (
                <div className="p-4 sm:p-5 bg-yellow-50/50 rounded-2xl border border-yellow-100 text-slate-700 text-sm leading-relaxed relative mt-2">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 absolute top-4 sm:top-5 left-4 sm:left-5" />
                    <div className="pl-7 sm:pl-9 font-medium">{member.memo}</div>
                </div>
            )}
            
            <div className="h-px bg-slate-100 w-full" />

            {/* Family Members */}
            {familyMembers.length > 0 && (
                <div>
                     <h3 className="text-[10px] sm:text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Family Members
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {familyMembers.map(fm => {
                            const avatar = getDisplayAvatar(fm);
                            const fmRoleColor = getRoleBaseColor(fm.position as string);
                            return (
                                <button 
                                key={fm.id}
                                onClick={() => onMemberClick(fm)}
                                className="bg-white p-3 rounded-2xl border border-slate-200 hover:border-brand-300 hover:shadow-md transition-all text-left flex items-center gap-4 group"
                                >
                                <div className="relative shrink-0">
                                    {avatar ? (
                                        <img src={avatar} alt={fm.koreanName} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover bg-slate-100" />
                                    ) : (
                                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-${fmRoleColor}-50 flex items-center justify-center text-${fmRoleColor}-300`}>
                                            <User className="w-5 h-5 sm:w-6 sm:h-6" />
                                        </div>
                                    )}
                                    {fm.relationship === 'Self' && (
                                        <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 shadow-sm border border-slate-100">
                                            <Crown className="w-2.5 h-2.5 text-amber-500" fill="currentColor" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800 text-sm sm:text-base group-hover:text-brand-700">{fm.koreanName}</div>
                                    <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                                        <span className="text-brand-600 font-bold">{getDisplayRelationship(fm)}</span>
                                        <span className="w-0.5 h-0.5 rounded-full bg-slate-300"></span>
                                        <span>{calculateAge(fm.birthday)} yrs</span>
                                    </div>
                                </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDetail;
