import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, UserPlus, Users, Camera, Crown, Calendar, User, Briefcase, MapPin, Phone, Mail, FileText, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { Member, MemberStatus, Position } from '../types';

interface MemberFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (members: Member[]) => void;
  onDelete?: (id: string) => void;
  initialData?: Member | null;
  allMembers: Member[];
  mokjangList: string[];
  positionList: string[];
  statusList: string[];
  tagList: string[];
}

// Expanded Draft for Family Members to include ALL fields
interface FamilyMemberDraft extends Partial<Member> {
  tempId: string; // Internal ID for keying
  isExpanded?: boolean;
}

const MemberForm: React.FC<MemberFormProps> = ({ 
  isOpen, onClose, onSubmit, onDelete, initialData, allMembers, 
  mokjangList, positionList, statusList, tagList
}) => {
  const [formData, setFormData] = useState<Partial<Member>>({});
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberDraft[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [currentRepName, setCurrentRepName] = useState('');

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const calculateAge = (dob?: string) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const ageDifMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ ...initialData });
        const tags = new Set(initialData.tags || []);
        if (initialData.isBaptized) tags.add('세례');
        
        setSelectedTags(tags);
        setCurrentRepName(initialData.representative);
        
        const repName = initialData.representative;
        const existingFamily = allMembers.filter(m => 
          m.representative === repName && 
          m.id !== initialData.id && 
          m.status !== 'Deceased' 
        );

        existingFamily.sort((a, b) => {
             if (a.relationship === 'Spouse') return -1;
             if (b.relationship === 'Spouse') return 1;
             const ageA = calculateAge(a.birthday);
             const ageB = calculateAge(b.birthday);
             return (Number(ageB) || 0) - (Number(ageA) || 0);
        });

        setFamilyMembers(existingFamily.map(m => ({
          ...m,
          tempId: crypto.randomUUID(),
          isExpanded: false
        })));
      } else {
        setFormData({
          status: statusList[0] || 'Active',
          position: '서리집사',
          forSlip: '',
          mokjang: 'Unassigned',
          registrationDate: new Date().toISOString().split('T')[0],
          relationship: 'Self',
          gender: 'Male'
        });
        setFamilyMembers([]);
        setSelectedTags(new Set());
        setCurrentRepName('');
      }
      setErrors({});
    }
  }, [initialData, isOpen, positionList, statusList, allMembers]);

  if (!isOpen) return null;

  const handleChange = (field: keyof Member, value: any) => {
    let finalValue = value;
    if (field === 'phone') {
      const clean = value.replace(/\D/g, '');
      const match = clean.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
      if (match) {
        finalValue = !match[2] ? match[1] : `${match[1]}-${match[2]}${match[3] ? `-${match[3]}` : ''}`;
      }
    }
    setFormData(prev => ({ ...prev, [field]: finalValue }));
    
    if (field === 'koreanName') {
        if ((!formData.id && formData.relationship === 'Self') || (formData.koreanName === currentRepName)) {
            setCurrentRepName(finalValue);
        }
    }

    if (field === 'relationship') {
        if (value === 'Son') setFormData(prev => ({ ...prev, gender: 'Male' }));
        else if (value === 'Daughter') setFormData(prev => ({ ...prev, gender: 'Female' }));
        else if (value === 'Father') setFormData(prev => ({ ...prev, gender: 'Male' }));
        else if (value === 'Mother') setFormData(prev => ({ ...prev, gender: 'Female' }));
    }

    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const toggleTag = (tag: string) => {
    const next = new Set(selectedTags);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    setSelectedTags(next);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, pictureUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Family Handling ---

  const handleFamilyChange = (index: number, field: keyof Member, value: any) => {
    const updated = [...familyMembers];
    updated[index] = { ...updated[index], [field]: value };
    
    // Logic for gender auto-set
    if (field === 'relationship') {
        const val = value as string;
        if (val === 'Son') updated[index].gender = 'Male';
        else if (val === 'Daughter') updated[index].gender = 'Female';
        else if (val === 'Father') updated[index].gender = 'Male';
        else if (val === 'Mother') updated[index].gender = 'Female';
        
        // Smart Spouse Gender Logic
        if (val === 'Spouse') {
            const headGender = formData.gender || 'Male';
            updated[index].gender = headGender === 'Male' ? 'Female' : 'Male';
        }
    }

    // Phone Formatting
    if (field === 'phone') {
        const clean = (value as string).replace(/\D/g, '');
        const match = clean.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
        if (match) {
            updated[index].phone = !match[2] ? match[1] : `${match[1]}-${match[2]}${match[3] ? `-${match[3]}` : ''}`;
        }
    }

    // Name Sync for Rep
    if (field === 'koreanName' && updated[index].koreanName && familyMembers[index].koreanName === currentRepName) {
        setCurrentRepName(value);
    }

    setFamilyMembers(updated);
  };

  const toggleFamilyTag = (index: number, tag: string) => {
      const updated = [...familyMembers];
      const currentTags = new Set(updated[index].tags || []);
      if (currentTags.has(tag)) currentTags.delete(tag);
      else currentTags.add(tag);
      updated[index].tags = Array.from(currentTags);
      
      // Sync baptism boolean
      if (tag === '세례') updated[index].isBaptized = currentTags.has('세례');
      
      setFamilyMembers(updated);
  };

  const toggleExpand = (index: number) => {
      const updated = [...familyMembers];
      updated[index].isExpanded = !updated[index].isExpanded;
      setFamilyMembers(updated);
  };

  const addFamilyMemberRow = () => {
    // Smart Gender Default for Spouse
    const headGender = formData.gender || 'Male';
    const spouseGender = headGender === 'Male' ? 'Female' : 'Male';

    setFamilyMembers(prev => [...prev, {
      tempId: crypto.randomUUID(),
      isExpanded: true, // Start Expanded
      koreanName: '',
      englishName: '',
      gender: spouseGender, // Default smart gender
      relationship: 'Spouse', 
      birthday: '',
      phone: formData.phone || '', // Default to Rep
      email: formData.email || '', // Default to Rep
      address: formData.address || '', // Default to Rep
      mokjang: formData.mokjang || 'Unassigned', // Default to Rep
      position: Position.MEMBER,
      offeringNumber: formData.offeringNumber || '', // Default
      forSlip: formData.forSlip || '', // Default
      registrationDate: formData.registrationDate || new Date().toISOString().split('T')[0],
      status: 'Active',
      tags: [],
      isBaptized: false
    }]);
  };

  const removeFamilyMemberRow = (index: number) => {
    setFamilyMembers(prev => prev.filter((_, i) => i !== index));
  };

  const setAsRepresentative = (index: number | 'self') => {
    const oldRepName = currentRepName;
    let newRepName = '';
    let newHeadPrevRel = ''; 

    if (index === 'self') {
        newRepName = formData.koreanName || '';
        newHeadPrevRel = formData.relationship || 'Other';
    } else {
        newRepName = familyMembers[index].koreanName || '';
        newHeadPrevRel = familyMembers[index].relationship || 'Other';
    }

    if (!newRepName.trim()) {
        alert("Please enter a name for this member before setting them as Head.");
        return;
    }

    if (newRepName === oldRepName) return; 

    let newRelForOldHead = 'Other';
    if (newHeadPrevRel === 'Spouse') newRelForOldHead = 'Spouse';
    else if (['Son', 'Daughter', 'Child'].includes(newHeadPrevRel)) newRelForOldHead = 'Parent';
    else if (['Parent', 'Father', 'Mother'].includes(newHeadPrevRel)) newRelForOldHead = 'Child';
    else newRelForOldHead = 'Spouse'; 

    setCurrentRepName(newRepName);

    if (index === 'self' || formData.koreanName === newRepName) {
         setFormData(prev => ({ ...prev, relationship: 'Self' }));
    } else if (formData.koreanName === oldRepName) {
         setFormData(prev => ({ ...prev, relationship: newRelForOldHead }));
    }

    setFamilyMembers(prev => prev.map((fm, idx) => {
        if (idx === index || fm.koreanName === newRepName) {
            return { ...fm, relationship: 'Self' };
        }
        if (fm.koreanName === oldRepName) {
             return { ...fm, relationship: newRelForOldHead };
        }
        return fm;
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.koreanName) newErrors.koreanName = "Name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      alert("Please check the form for errors.");
      return;
    }

    const mainId = formData.id || crypto.randomUUID();
    let finalRepName = currentRepName;
    if (!finalRepName) {
        if (formData.relationship === 'Self') finalRepName = formData.koreanName!;
        else finalRepName = formData.representative || formData.koreanName!;
    }
    const mainIsRep = formData.koreanName === finalRepName;
    const finalTags = Array.from(selectedTags);

    const mainMember = {
      ...formData,
      id: mainId,
      representative: finalRepName,
      relationship: mainIsRep ? 'Self' : (formData.relationship === 'Self' ? 'Other' : formData.relationship), 
      tags: finalTags,
      isBaptized: finalTags.includes('세례'),
      isRegularMember: false,
    } as Member;

    const processedFamily: Member[] = familyMembers.map(fm => {
       const existingOriginal = fm.id ? allMembers.find(m => m.id === fm.id) : null;
       const isThisMemberRep = fm.koreanName === finalRepName;
       let finalRel = fm.relationship || 'Other';
       if (isThisMemberRep) finalRel = 'Self';
       else if (finalRel === 'Self') finalRel = 'Other'; 

       const fmTags = fm.tags || [];

       return {
         ...fm,
         id: fm.id || crypto.randomUUID(),
         representative: finalRepName,
         relationship: finalRel,
         isBaptized: fmTags.includes('세례'),
         tags: fmTags,
         // Ensure fallback to main member data if missing
         address: fm.address || mainMember.address,
         mokjang: fm.mokjang || mainMember.mokjang,
         memo: fm.memo || existingOriginal?.memo || `Family of ${mainMember.koreanName}`
       } as Member;
    });

    onSubmit([mainMember, ...processedFamily]);
    onClose();
  };

  // Helper Styles - High Contrast
  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-brand-500 bg-white text-slate-900 shadow-sm focus:ring-2 focus:ring-brand-200 transition-all placeholder:text-slate-300";
  const labelClass = "text-[10px] uppercase font-bold text-slate-500 mb-1 block tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
            filter: invert(0); /* Force black icon */
            cursor: pointer;
        }
        /* Ensure dark icon on all browsers even in dark mode preferred schemes */
        input[type="date"] {
            color-scheme: light;
        }
      `}</style>
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[95vh] ring-1 ring-slate-900/5">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              {initialData ? <Users className="w-6 h-6 text-brand-600"/> : <UserPlus className="w-6 h-6 text-brand-600"/>}
              {initialData ? 'Edit Profile' : 'New Member Registration'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 lg:p-10 bg-slate-50/50">
          {/* LAYOUT GRID: Left (Personal) | Right (Church) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            
            {/* --- LEFT COLUMN: PERSONAL INFO --- */}
            <div className="space-y-6">
               <h3 className="text-sm font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-2">
                  <User className="w-4 h-4" /> Personal Information
               </h3>
               
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-6">
                  {/* Photo & Basic Identity */}
                  <div className="flex gap-6">
                      <div className="flex flex-col items-center gap-2 shrink-0">
                          <div className="relative group w-32 h-32">
                              <div className="w-full h-full rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden transition-colors hover:border-brand-400 hover:bg-brand-50">
                                  {formData.pictureUrl ? (
                                      <img src={formData.pictureUrl} alt="Profile" className="w-full h-full object-cover" />
                                  ) : (
                                      <div className="text-center text-slate-300 group-hover:text-brand-300">
                                          <User className="w-12 h-12 mx-auto" />
                                      </div>
                                  )}
                                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white flex-col gap-1">
                                      <Camera className="w-6 h-6" />
                                      <span className="text-[10px] font-bold">CHANGE</span>
                                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                  </label>
                              </div>
                          </div>
                          {formData.birthday && (
                              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                  Age: {calculateAge(formData.birthday)}
                              </span>
                          )}
                      </div>
                      
                      <div className="flex-1 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-1">
                                <label className={labelClass}>Korean Name *</label>
                                <input 
                                    value={formData.koreanName || ''} 
                                    onChange={e => handleChange('koreanName', e.target.value)}
                                    className={`${inputClass} font-bold text-lg ${errors.koreanName ? 'border-red-500 bg-red-50' : ''}`}
                                    placeholder="홍길동"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className={labelClass}>English Name</label>
                                <input 
                                    value={formData.englishName || ''} 
                                    onChange={e => handleChange('englishName', e.target.value)}
                                    className={inputClass}
                                    placeholder="Gil Dong"
                                />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className={labelClass}>Birthday</label>
                                <input 
                                    type="date"
                                    max="9999-12-31"
                                    value={formData.birthday || ''} 
                                    onChange={e => handleChange('birthday', e.target.value)}
                                    className={inputClass}
                                />
                             </div>
                             <div>
                                <label className={labelClass}>Gender</label>
                                <div className="flex bg-slate-50 p-1 rounded-xl">
                                    <button type="button" onClick={() => handleChange('gender', 'Male')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.gender === 'Male' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>Male</button>
                                    <button type="button" onClick={() => handleChange('gender', 'Female')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.gender === 'Female' ? 'bg-white text-pink-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>Female</button>
                                </div>
                             </div>
                          </div>
                      </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                      <div>
                          <label className={`flex items-center gap-1.5 ${labelClass}`}>
                             <Phone className="w-3 h-3" /> Phone
                          </label>
                          <input 
                            value={formData.phone || ''} 
                            onChange={e => handleChange('phone', e.target.value)}
                            className={inputClass}
                            placeholder="xxx-xxx-xxxx"
                          />
                      </div>
                      <div>
                          <label className={`flex items-center gap-1.5 ${labelClass}`}>
                             <Mail className="w-3 h-3" /> Email
                          </label>
                          <input 
                            type="email"
                            value={formData.email || ''} 
                            onChange={e => handleChange('email', e.target.value)}
                            className={inputClass}
                            placeholder="email@address.com"
                          />
                      </div>
                      <div className="md:col-span-2">
                          <label className={`flex items-center gap-1.5 ${labelClass}`}>
                             <MapPin className="w-3 h-3" /> Address
                          </label>
                          <input 
                            value={formData.address || ''} 
                            onChange={e => handleChange('address', e.target.value)}
                            className={inputClass}
                            placeholder="Full Address"
                          />
                      </div>
                  </div>
                  
                  {/* Memo */}
                  <div className="pt-2">
                     <label className={`flex items-center gap-1.5 ${labelClass}`}>
                        <FileText className="w-3 h-3" /> Notes
                     </label>
                     <textarea 
                        value={formData.memo || ''} 
                        onChange={e => handleChange('memo', e.target.value)}
                        rows={2}
                        className={inputClass}
                     />
                  </div>
               </div>
            </div>

            {/* --- RIGHT COLUMN: CHURCH INFO --- */}
            <div className="space-y-6">
                <h3 className="text-sm font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Briefcase className="w-4 h-4" /> Church Admin
               </h3>
               
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-6">
                   <div className="grid grid-cols-2 gap-4">
                       <div>
                           <label className={labelClass}>Registration Date</label>
                           <input 
                                type="date"
                                max="9999-12-31"
                                value={formData.registrationDate || ''} 
                                onChange={e => handleChange('registrationDate', e.target.value)}
                                className={inputClass}
                           />
                       </div>
                       <div>
                           <label className={labelClass}>Status</label>
                           <select 
                                value={formData.status} 
                                onChange={e => handleChange('status', e.target.value)}
                                className={inputClass}
                           >
                                {statusList.map(st => <option key={st} value={st}>{st}</option>)}
                           </select>
                       </div>
                   </div>

                   {formData.status === 'Deceased' && (
                       <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                            <label className={labelClass}>Date of Death</label>
                            <input 
                                type="date"
                                max="9999-12-31"
                                value={formData.deceasedDate || ''}
                                onChange={(e) => handleChange('deceasedDate', e.target.value)}
                                className={inputClass}
                            />
                       </div>
                   )}

                   <div className="grid grid-cols-2 gap-4">
                       <div>
                           <label className={labelClass}>Mokjang (Cell)</label>
                           <select 
                                value={formData.mokjang || ''} 
                                onChange={e => handleChange('mokjang', e.target.value)}
                                className={inputClass}
                           >
                                <option value="Unassigned">Unassigned</option>
                                {mokjangList.map(m => <option key={m} value={m}>{m}</option>)}
                           </select>
                       </div>
                       <div>
                           <label className={labelClass}>Role / Position</label>
                           <select 
                                value={formData.position || ''} 
                                onChange={e => handleChange('position', e.target.value)}
                                className={inputClass}
                           >
                                {positionList.map(p => <option key={p} value={p}>{p}</option>)}
                           </select>
                       </div>
                   </div>
                   
                   {/* Finance */}
                   <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className={labelClass}>Offering #</label>
                           <input 
                                value={formData.offeringNumber || ''} 
                                onChange={e => handleChange('offeringNumber', e.target.value)}
                                className={`${inputClass} font-mono`}
                                placeholder="####"
                           />
                        </div>
                        <div>
                           <label className={labelClass}>Slip #</label>
                           <input 
                                value={formData.forSlip || ''} 
                                onChange={e => handleChange('forSlip', e.target.value)}
                                className={`${inputClass} font-mono`}
                                placeholder="Year-###"
                           />
                        </div>
                   </div>

                   {/* Tags Section */}
                   <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                       <label className={`${labelClass} mb-3`}>Tags</label>
                       <div className="grid grid-cols-2 gap-2">
                            {tagList.map(tag => (
                                <label key={tag} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:border-brand-300 cursor-pointer shadow-sm transition-all hover:bg-slate-50">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedTags.has(tag)} 
                                        onChange={() => toggleTag(tag)}
                                        className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500" 
                                    />
                                    <span className="text-sm font-medium text-slate-700">{tag}</span>
                                </label>
                            ))}
                       </div>
                       {selectedTags.has('세례') && (
                           <div className="mt-3 pt-3 border-t border-slate-200 animate-in slide-in-from-top-2">
                               <label className={labelClass}>세례일 (Baptism Date)</label>
                               <input 
                                    type="date"
                                    max="9999-12-31"
                                    value={formData.baptismDate || ''}
                                    onChange={(e) => handleChange('baptismDate', e.target.value)}
                                    className={inputClass}
                               />
                           </div>
                       )}
                   </div>

                   {/* Relationship Manager (Brief) */}
                   <div className="border-t border-slate-100 pt-4">
                       <label className={labelClass}>Family Role</label>
                       <div className="flex items-center gap-4">
                           <div className="flex-1">
                               {formData.koreanName === currentRepName ? (
                                    <div className="bg-amber-50 text-amber-700 font-bold px-4 py-2 rounded-xl text-center border border-amber-200 text-sm flex items-center justify-center gap-2">
                                        <Crown className="w-4 h-4" /> Head of Household
                                    </div>
                               ) : (
                                   <select 
                                        value={formData.relationship || 'Self'} 
                                        onChange={e => handleChange('relationship', e.target.value)}
                                        className={inputClass}
                                   >
                                        <option value="Spouse">Spouse</option>
                                        <option value="Son">Son</option>
                                        <option value="Daughter">Daughter</option>
                                        <option value="Parent">Parent</option>
                                        <option value="Sibling">Sibling</option>
                                        <option value="Other">Other</option>
                                   </select>
                               )}
                           </div>
                       </div>
                   </div>

               </div>
            </div>

          </div>

          {/* --- BOTTOM SECTION: FAMILY MEMBERS --- */}
          <div className="space-y-6 pb-12">
               <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                    <h3 className="text-sm font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Users className="w-4 h-4" /> Family Management
                    </h3>
                    <button 
                        type="button"
                        onClick={addFamilyMemberRow}
                        className="text-sm bg-brand-50 border border-brand-200 text-brand-700 px-4 py-2 rounded-xl hover:bg-brand-100 font-bold transition-colors shadow-sm flex items-center gap-2"
                    >
                        <UserPlus className="w-4 h-4" /> Add Family Member
                    </button>
               </div>
               
               <div className="space-y-4">
                   {familyMembers.length === 0 ? (
                       <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                           No family members added yet. Click the button above to add spouse or children.
                       </div>
                   ) : (
                       familyMembers.map((fm, idx) => {
                           const isRep = fm.koreanName === currentRepName;
                           return (
                               <div key={fm.tempId} className={`bg-white rounded-2xl border shadow-sm transition-all overflow-hidden ${isRep ? 'border-amber-300 ring-1 ring-amber-100' : 'border-slate-200'}`}>
                                    {/* Family Card Header */}
                                    <div className="p-4 bg-slate-50/50 flex items-center gap-4 cursor-pointer hover:bg-slate-50 border-b border-slate-100" onClick={() => toggleExpand(idx)}>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                type="button"
                                                onClick={() => setAsRepresentative(idx)}
                                                className={`p-2 rounded-full transition-all border ${isRep ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-white text-slate-300 border-slate-200 hover:text-amber-500 hover:border-amber-300'}`}
                                                title="Set as Head"
                                            >
                                                <Crown className="w-4 h-4" fill={isRep ? "currentColor" : "none"} />
                                            </button>
                                        </div>
                                        
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-slate-800 text-lg">{fm.koreanName || '(New Member)'}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${isRep ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                                                    {isRep ? 'Head' : fm.relationship}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5 flex gap-2">
                                                <span>{fm.gender}</span> &middot; 
                                                <span>{fm.position}</span> &middot; 
                                                <span>{calculateAge(fm.birthday) ? `${calculateAge(fm.birthday)} yrs` : 'Age N/A'}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button type="button" className="p-2 text-slate-400 hover:text-slate-600">
                                                {fm.isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); removeFamilyMemberRow(idx); }}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expandable Form Body */}
                                    {fm.isExpanded && (
                                        <div className="p-6 bg-white animate-in slide-in-from-top-2">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                {/* 1. Relation & Names */}
                                                <div>
                                                    <label className={labelClass}>Relation</label>
                                                    <select value={fm.relationship} onChange={e => handleFamilyChange(idx, 'relationship', e.target.value)} className={inputClass} disabled={isRep}>
                                                        <option value="Self">Self (Head)</option>
                                                        <option value="Spouse">Spouse</option>
                                                        <option value="Son">Son</option>
                                                        <option value="Daughter">Daughter</option>
                                                        <option value="Parent">Parent</option>
                                                        <option value="Sibling">Sibling</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Name (Korean)</label>
                                                    <input value={fm.koreanName} onChange={e => handleFamilyChange(idx, 'koreanName', e.target.value)} className={inputClass} placeholder="홍길동" />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Name (English)</label>
                                                    <input value={fm.englishName} onChange={e => handleFamilyChange(idx, 'englishName', e.target.value)} className={inputClass} placeholder="Gil Dong" />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Birthday</label>
                                                    <input type="date" max="9999-12-31" value={fm.birthday} onChange={e => handleFamilyChange(idx, 'birthday', e.target.value)} className={inputClass} />
                                                </div>

                                                {/* 2. Demographics */}
                                                <div>
                                                    <label className={labelClass}>Gender</label>
                                                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                                                        <button type="button" onClick={() => handleFamilyChange(idx, 'gender', 'Male')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${fm.gender === 'Male' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>Male</button>
                                                        <button type="button" onClick={() => handleFamilyChange(idx, 'gender', 'Female')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${fm.gender === 'Female' ? 'bg-white shadow-sm text-pink-600' : 'text-slate-400'}`}>Female</button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Phone</label>
                                                    <input value={fm.phone} onChange={e => handleFamilyChange(idx, 'phone', e.target.value)} className={inputClass} placeholder="Defaults to Rep" />
                                                </div>
                                                <div className="lg:col-span-2">
                                                    <label className={labelClass}>Email</label>
                                                    <input type="email" value={fm.email} onChange={e => handleFamilyChange(idx, 'email', e.target.value)} className={inputClass} placeholder="Defaults to Rep" />
                                                </div>

                                                {/* 3. Church Info */}
                                                <div>
                                                    <label className={labelClass}>Registration Date</label>
                                                    <input type="date" max="9999-12-31" value={fm.registrationDate} onChange={e => handleFamilyChange(idx, 'registrationDate', e.target.value)} className={inputClass} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Status</label>
                                                    <select value={fm.status || 'Active'} onChange={e => handleFamilyChange(idx, 'status', e.target.value)} className={inputClass}>
                                                        {statusList.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Mokjang</label>
                                                    <select value={fm.mokjang} onChange={e => handleFamilyChange(idx, 'mokjang', e.target.value)} className={inputClass}>
                                                        <option value="Unassigned">Unassigned</option>
                                                        {mokjangList.map(m => <option key={m} value={m}>{m}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Position</label>
                                                    <select value={fm.position} onChange={e => handleFamilyChange(idx, 'position', e.target.value)} className={inputClass}>
                                                        {positionList.map(p => <option key={p} value={p}>{p}</option>)}
                                                    </select>
                                                </div>

                                                {/* 4. Admin & Tags */}
                                                <div>
                                                    <label className={labelClass}>Offering #</label>
                                                    <input value={fm.offeringNumber} onChange={e => handleFamilyChange(idx, 'offeringNumber', e.target.value)} className={`${inputClass} font-mono`} placeholder="#" />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Slip #</label>
                                                    <input value={fm.forSlip} onChange={e => handleFamilyChange(idx, 'forSlip', e.target.value)} className={`${inputClass} font-mono`} placeholder="Slip#" />
                                                </div>
                                                <div className="lg:col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    <label className={`${labelClass} mb-2`}>Tags & Sacraments</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {tagList.map(tag => (
                                                            <label key={tag} className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-200 cursor-pointer shadow-sm hover:bg-slate-50 transition-colors">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={fm.tags?.includes(tag)} 
                                                                    onChange={() => toggleFamilyTag(idx, tag)}
                                                                    className="w-3.5 h-3.5 text-brand-600 rounded" 
                                                                />
                                                                <span className="text-xs font-medium text-slate-700">{tag}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                    {fm.tags?.includes('세례') && (
                                                        <div className="mt-3 pt-2 border-t border-slate-200 animate-in slide-in-from-top-1">
                                                            <label className={labelClass}>세례일 (Baptism Date)</label>
                                                            <input type="date" max="9999-12-31" value={fm.baptismDate} onChange={e => handleFamilyChange(idx, 'baptismDate', e.target.value)} className={inputClass} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                               </div>
                           );
                       })
                   )}
               </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-8 py-5 bg-white border-t border-slate-100 flex justify-between items-center z-20">
            {initialData && onDelete ? (
              <button 
                onClick={() => {
                  if(window.confirm('Are you sure you want to delete this member?')) {
                    onDelete(initialData.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-2 text-red-500 hover:text-red-700 font-semibold px-4 py-2 hover:bg-red-50 rounded-xl transition-colors"
              >
                <Trash2 className="w-5 h-5" /> Delete
              </button>
            ) : <div></div>}

          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors font-semibold"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              className="px-8 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors font-bold shadow-lg shadow-brand-200 flex items-center gap-2"
            >
              <Save className="w-5 h-5" /> 
              Save Records
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberForm;