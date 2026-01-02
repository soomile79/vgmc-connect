import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Menu, 
  Users, 
  Briefcase, 
  Settings,
  Sparkles,
  Download,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Mail,
  ChevronDown,
  List,
  Tag,
  CheckSquare,
  LogOut,
  LayoutGrid,
  MapPin,
  Home,
  Crown,
  Printer,
  X,
  Calendar,
  UserCheck,
  Cake,
  Save,
  HardDrive,
  Cloud,
  CloudOff,
  RefreshCw,
  FileInput,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  Filter,
  User,
  Phone,
  Smartphone,
  Gift,
  PartyPopper,
  CalendarDays
} from 'lucide-react';

import { Member, GroupingType, Position } from './types';
import { INITIAL_MEMBERS, MOKJANG_LIST, getRoleStyle, getRoleBaseColor } from './constants';
import MemberForm from './components/MemberForm';
import MemberDetail from './components/MemberDetail';
import ImportModal from './components/ImportModal';
import SettingsModal from './components/SettingsModal';
import Login from './components/Login';
import Logo from './components/Logo';
import { askGeminiAboutMembers } from './services/geminiService';

const ITEMS_PER_PAGE = 24;

export function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('church-auth') === 'true';
  });

  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem('church-members');
    return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
  });

  // Global Filter State: Default is TRUE (Show Active Only)
  const [showActiveOnly, setShowActiveOnly] = useState<boolean>(true);

  // Cloud Sync State
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('church-server-url') || '');
  const [apiSecret, setApiSecret] = useState(() => localStorage.getItem('church-api-secret') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const [mokjangList, setMokjangList] = useState<string[]>(() => {
    const saved = localStorage.getItem('church-mokjangs');
    return saved ? JSON.parse(saved) : MOKJANG_LIST;
  });

  const [positionList, setPositionList] = useState<string[]>(() => {
    const saved = localStorage.getItem('church-positions');
    return saved ? JSON.parse(saved) : Object.values(Position);
  });

  const [statusList, setStatusList] = useState<string[]>(() => {
    const saved = localStorage.getItem('church-statuses');
    return saved ? JSON.parse(saved) : ['Active', 'Inactive', 'Away', 'Deceased'];
  });

  const [tagList, setTagList] = useState<string[]>(() => {
    const saved = localStorage.getItem('church-tags');
    return saved ? JSON.parse(saved) : ['세례', '새가족'];
  });

  // --- Auto-migration for Data Consistency (English -> Korean) ---
  useEffect(() => {
    // 1. Migrate Tags
    setTagList(prev => {
        const next = prev.map(t => {
            if (t === 'New Family') return '새가족';
            if (t === 'Baptized') return '세례';
            return t;
        }).filter(t => t !== 'Regular Member' && t !== '정회원'); // Cleanup legacy
        
        // Remove duplicates
        return Array.from(new Set(next));
    });

    // 2. Migrate Member Data (Roles & Tags)
    setMembers(prev => {
        let hasChanges = false;
        const updated = prev.map(m => {
            let copy = { ...m };
            let modified = false;

            // Migrate Positions (English to Korean)
            const posMap: Record<string, string> = {
                'Pastor': '교역자',
                'Elder': '장로',
                'Kwonsa': '권사',
                'Deacon': '서리집사',
                'Ordained Deacon': '안수집사',
                'Member': '일반성도',
                'New Family': '새가족',
                'Teacher': '일반성도'
            };
            if (posMap[m.position]) {
                copy.position = posMap[m.position];
                modified = true;
            }

            // Migrate Tags
            if (m.tags) {
                const newTags = m.tags.map(t => {
                    if (t === 'New Family') return '새가족';
                    if (t === 'Baptized') return '세례';
                    return t;
                }).filter(t => t !== 'Regular Member' && t !== '정회원');
                
                if (JSON.stringify(newTags) !== JSON.stringify(m.tags)) {
                    copy.tags = newTags;
                    modified = true;
                }
            }

            if (modified) {
                hasChanges = true;
                return copy;
            }
            return m;
        });
        
        return hasChanges ? updated : prev;
    });

    // 3. Migrate Position List Settings
    setPositionList(prev => {
        // Force reset to new Korean list if it contains old English terms
        if (prev.includes('Member') || prev.includes('Deacon') || prev.includes('Teacher')) {
            return Object.values(Position);
        }
        return prev;
    });

  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  
  // Default State
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [groupingType, setGroupingType] = useState<GroupingType>('all');
  
  // Year Filter State
  const [selectedRegistrationYears, setSelectedRegistrationYears] = useState<Set<number>>(new Set());
  
  // Sidebar State
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'mokjang': true,
    'position': false,
    'status': true, // Expanded by default for visibility
    'tag': false
  });

  // View Mode State
  const [viewMode, setViewMode] = useState<'card' | 'family'>('card');

  // Sorting State - Default to Name
  const [sortBy, setSortBy] = useState<'name' | 'rep' | 'age'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const [currentPage, setCurrentPage] = useState(1);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);

  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);

  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem('church-members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('church-mokjangs', JSON.stringify(mokjangList));
    localStorage.setItem('church-positions', JSON.stringify(positionList));
    localStorage.setItem('church-statuses', JSON.stringify(statusList));
    localStorage.setItem('church-tags', JSON.stringify(tagList));
  }, [mokjangList, positionList, statusList, tagList]);

  // Cloud Sync Functions
  const fetchFromCloud = async () => {
    if (!serverUrl) return;
    setIsSyncing(true);
    setSyncError('');
    try {
        const response = await fetch(serverUrl, {
            method: 'GET',
            headers: {
                'X-Api-Secret': apiSecret,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const text = await response.text();
            let msg = `Error ${response.status}`;
            try {
                const json = JSON.parse(text);
                if (json.error) msg = json.error;
            } catch {
                if (text.length < 100) msg = text; // Show short PHP errors
            }
            throw new Error(msg);
        }
        
        const data = await response.json();
        if (Array.isArray(data)) {
            // Logic: If cloud is empty but we have local data, assume it's first setup and upload local data.
            // This prevents wiping local data on first connect.
            if (data.length === 0 && members.length > 0) {
                 console.log("Cloud is empty. Uploading local data...");
                 await saveToCloud(members);
            } else {
                 setMembers(data);
                 setLastSyncTime(new Date());
                 localStorage.setItem('church-members', JSON.stringify(data));
            }
        } else if (data.error) {
            throw new Error(data.error);
        }
    } catch (e: any) {
        console.error("Sync Error:", e);
        setSyncError(e.message || 'Connection failed');
    } finally {
        setIsSyncing(false);
    }
  };

  const saveToCloud = async (newMembers: Member[]) => {
    if (!serverUrl) return;
    setIsSyncing(true);
    try {
        const response = await fetch(serverUrl, {
            method: 'POST',
            headers: {
                'X-Api-Secret': apiSecret,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newMembers)
        });
        
        if (!response.ok) {
             const text = await response.text();
             let msg = `Error ${response.status}`;
             try {
                const json = JSON.parse(text);
                if (json.error) msg = json.error;
             } catch {
                if (text.length < 100) msg = text;
             }
             throw new Error(msg);
        }
        
        const resJson = await response.json();
        if (resJson.success) {
            setLastSyncTime(new Date());
        } else {
            throw new Error(resJson.error || 'Unknown error during save');
        }
    } catch (e: any) {
        console.error("Save Error:", e);
        setSyncError('Failed to save: ' + e.message);
        // Do not alert on save error to avoid disrupting workflow, just show badge error
    } finally {
        setIsSyncing(false);
    }
  };

  // Initial Sync on Load
  useEffect(() => {
    if (isLoggedIn && serverUrl) {
        fetchFromCloud();
    }
  }, [isLoggedIn, serverUrl]);

  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem('church-auth', 'true');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('church-auth');
  };

  // Reset to page 1 on filter/view change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, groupingType, selectedGroup, sortBy, sortDirection, viewMode, selectedRegistrationYears, showActiveOnly]);

  // Reset Year filter when changing main grouping to avoid confusion
  useEffect(() => {
    setSelectedRegistrationYears(new Set());
  }, [groupingType, selectedGroup]);

  const toggleRegistrationYear = (year: number) => {
    setSelectedRegistrationYears(prev => {
        const next = new Set(prev);
        if (next.has(year)) next.delete(year);
        else next.add(year);
        return next;
    });
  };

  const stats = useMemo(() => {
    const uniqueFamilies = new Set(members.map(m => m.representative)).size;
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const regStats: Record<string, number> = {};
    const yearsToCheck = [currentYear, currentYear - 1, currentYear - 2];
    
    yearsToCheck.forEach(year => {
        regStats[year] = members.filter(m => {
            if (!m.registrationDate) return false;
            return new Date(m.registrationDate).getFullYear() === year;
        }).length;
    });

    const birthdaysThisMonth = members.filter(m => {
      if (m.status !== 'Active' || !m.birthday) return false;
      // String parsing to avoid timezone issues
      const parts = m.birthday.split('-');
      if (parts.length !== 3) return false;
      // parts[1] is "01".."12". Convert to 0-indexed month.
      return (parseInt(parts[1], 10) - 1) === currentMonth;
    }).length;

    return {
      total: members.length,
      active: members.filter(m => m.status === 'Active').length,
      families: uniqueFamilies,
      mokjangs: mokjangList.length,
      regStats,
      yearsToCheck,
      birthdaysThisMonth
    };
  }, [members, mokjangList]);

  const getSubgroupStats = (filterFn: (m: Member) => boolean) => {
      const subgroup = members.filter(m => {
          if (!filterFn(m)) return false;
          if (showActiveOnly) return m.status === 'Active';
          return true;
      });
      const fams = new Set(subgroup.map(m => m.representative)).size;
      return { count: subgroup.length, families: fams };
  };

  const getRawSubgroupStats = (filterFn: (m: Member) => boolean) => {
      const subgroup = members.filter(filterFn); 
      const fams = new Set(subgroup.map(m => m.representative)).size;
      return { count: subgroup.length, families: fams };
  };

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const ageDifMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const filteredMembers = useMemo(() => {
    let result = members;
    if (showActiveOnly) {
        result = result.filter(m => m.status === 'Active');
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(m => 
        m.koreanName.toLowerCase().includes(lower) || 
        m.englishName.toLowerCase().includes(lower) || 
        m.phone.includes(lower) || 
        m.mokjang.toLowerCase().includes(lower) ||
        m.representative.toLowerCase().includes(lower)
      );
    }
    
    if (groupingType === 'mokjang') {
      result = result.filter(m => m.mokjang === selectedGroup);
    } else if (groupingType === 'position') {
      result = result.filter(m => m.position === selectedGroup);
    } else if (groupingType === 'status') {
      result = result.filter(m => m.status === selectedGroup);
    } else if (groupingType === 'tag') {
      result = result.filter(m => m.tags?.includes(selectedGroup));
    } else if (groupingType === 'birthday') {
      const currentMonth = new Date().getMonth();
      result = result.filter(m => {
         if (!m.birthday) return false;
         // Parse string directly to avoid timezone off-by-one errors
         const parts = m.birthday.split('-');
         if (parts.length !== 3) return false;
         // Month is parts[1] (1-12), convert to 0-11
         return (parseInt(parts[1], 10) - 1) === currentMonth;
      });
      
      // Sort for Birthday View: Day -> Name -> Age
      return result.sort((a, b) => {
         const getDay = (dateStr: string) => parseInt(dateStr.split('-')[2], 10);
         const dayA = getDay(a.birthday);
         const dayB = getDay(b.birthday);
         
         // 1. Sort by Day
         if (dayA !== dayB) return dayA - dayB;
         
         // 2. Sort by Korean Name
         const nameCompare = a.koreanName.localeCompare(b.koreanName, 'ko');
         if (nameCompare !== 0) return nameCompare;
         
         // 3. Sort by Age (Older first)
         // Older people have smaller birth years (e.g. 1950 < 1990)
         // So sorting by string "YYYY-MM-DD" ascending puts older people first
         return a.birthday.localeCompare(b.birthday);
      });
    }

    if (selectedRegistrationYears.size > 0) {
      result = result.filter(m => {
        if (!m.registrationDate) return false;
        const year = new Date(m.registrationDate).getFullYear();
        return selectedRegistrationYears.has(year);
      });
    }

    return [...result].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'rep' || (sortBy === 'name' && searchTerm)) {
        const repCompare = a.representative.localeCompare(b.representative, 'ko');
        if (repCompare !== 0) {
          comparison = repCompare;
        } else {
          const getRank = (m: Member) => {
            if (m.relationship === 'Self') return 0;
            if (m.relationship === 'Spouse') return 1;
            return 2;
          };
          const rankA = getRank(a);
          const rankB = getRank(b);
          if (rankA !== rankB) {
             comparison = rankA - rankB; 
          } else {
             comparison = calculateAge(b.birthday) - calculateAge(a.birthday);
          }
        }
      } else if (sortBy === 'name') {
        comparison = a.koreanName.localeCompare(b.koreanName, 'ko');
      } else if (sortBy === 'age') {
        comparison = calculateAge(a.birthday) - calculateAge(b.birthday);
      }

      if (comparison === 0) {
        return a.id.localeCompare(b.id);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [members, searchTerm, groupingType, selectedGroup, sortBy, sortDirection, selectedRegistrationYears, showActiveOnly]);

  const familyGroups = useMemo(() => {
    if (viewMode !== 'family') return [];

    const groups: Record<string, Member[]> = {};
    filteredMembers.forEach(m => {
        const key = m.representative || m.koreanName;
        if (!groups[key]) groups[key] = [];
        groups[key].push(m);
    });

    const families = Object.values(groups).map(groupMembers => {
        groupMembers.sort((a, b) => {
            const getRank = (m: Member) => {
                if (m.relationship === 'Self') return 0;
                if (m.relationship === 'Spouse') return 1;
                return 2;
            };
            const rankA = getRank(a);
            const rankB = getRank(b);
            if (rankA !== rankB) return rankA - rankB;
            return calculateAge(b.birthday) - calculateAge(a.birthday);
        });

        return {
            id: groupMembers[0].id,
            repName: groupMembers[0].representative,
            members: groupMembers,
            head: groupMembers[0]
        };
    });

    families.sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'name' || sortBy === 'rep') {
            comparison = a.repName.localeCompare(b.repName, 'ko');
        } else if (sortBy === 'age') {
            comparison = calculateAge(a.head.birthday) - calculateAge(b.head.birthday);
        }
        return sortDirection === 'asc' ? comparison : -comparison;
    });

    return families;
  }, [filteredMembers, viewMode, sortBy, sortDirection]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    if (viewMode === 'family') {
        return familyGroups.slice(start, start + ITEMS_PER_PAGE);
    }
    return filteredMembers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMembers, familyGroups, currentPage, viewMode]);

  const totalPages = Math.ceil(
      (viewMode === 'family' ? familyGroups.length : filteredMembers.length) / ITEMS_PER_PAGE
  );

  const handleSaveMembers = (membersToSave: Member[]) => {
    const newIds = new Set(membersToSave.map(m => m.id));
    const filtered = members.filter(m => !newIds.has(m.id));
    const updatedMembers = [...filtered, ...membersToSave];
    
    setMembers(updatedMembers);
    setEditingMember(null);
    if (serverUrl) saveToCloud(updatedMembers);
  };

  const handleDeleteMember = (id: string) => {
    const updatedMembers = members.filter(m => m.id !== id);
    setMembers(updatedMembers);
    setIsDetailOpen(false);
    if (serverUrl) saveToCloud(updatedMembers);
  };

  const handleRenameItem = (type: string, oldVal: string, newVal: string) => {
    const updatedMembers = members.map(m => {
        const copy = { ...m };
        if (type === 'mokjang' && copy.mokjang === oldVal) copy.mokjang = newVal;
        if (type === 'position' && copy.position === oldVal) copy.position = newVal;
        if (type === 'status' && copy.status === oldVal) copy.status = newVal;
        
        if (type === 'tags' && copy.tags) {
            const updatedTags = copy.tags.map(t => t === oldVal ? newVal : t);
            copy.tags = Array.from(new Set(updatedTags));
        }
        return copy;
    });

    setMembers(updatedMembers);
    if (serverUrl) saveToCloud(updatedMembers);
  };

  const handleDeleteItem = (type: string, itemToDelete: string) => {
    const updatedMembers = members.map(m => {
        const copy = { ...m };
        if (type === 'mokjang' && copy.mokjang === itemToDelete) copy.mokjang = 'Unassigned';
        if (type === 'position' && copy.position === itemToDelete) copy.position = Position.MEMBER;
        
        if (type === 'tags' && copy.tags) {
            copy.tags = copy.tags.filter(t => t !== itemToDelete);
        }
        return copy;
    });

    setMembers(updatedMembers);
    if (serverUrl) saveToCloud(updatedMembers);
  };

  const handleGraduateNewFamilies = () => {
    const visibleCount = filteredMembers.length;
    if (visibleCount === 0) {
        alert("No members visible to graduate.");
        return;
    }
    if (!window.confirm(`Are you sure you want to remove the '새가족' tag from the ${visibleCount} members currently displayed?`)) {
      return;
    }
    const targetIds = new Set(filteredMembers.map(m => m.id));
    const tagsToRemove = ['New Family', '새가족'];
    let modifiedCount = 0;
    const updatedMembers = members.map(m => {
        if (targetIds.has(m.id) && m.tags?.some(t => tagsToRemove.includes(t))) {
           const currentTags = m.tags || [];
           const newTags = currentTags.filter(t => !tagsToRemove.includes(t));
           if (newTags.length !== currentTags.length) {
                modifiedCount++;
                return { ...m, tags: newTags };
           }
        }
        return m;
    });

    if (modifiedCount > 0) {
        setMembers([...updatedMembers]); 
        if (serverUrl) saveToCloud(updatedMembers);
        setTimeout(() => {
            alert(`Success! Removed '새가족' tag from ${modifiedCount} members.`);
        }, 50);
    } else {
        alert("No members with '새가족' tags were found in the current filtered list.");
    }
  };

  const handleEditClick = (member: Member) => {
    setEditingMember(member);
    setIsDetailOpen(false);
    setIsFormOpen(true);
  };

  const handleCardClick = (member: Member) => {
    setViewingMember(member);
    setIsDetailOpen(true);
  };

  const handleImport = (newMembers: Member[]) => {
    const updatedMembers = [...members, ...newMembers];
    setMembers(updatedMembers);
    if (serverUrl) saveToCloud(updatedMembers);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(members, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `vgmc_backup_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleAiAsk = async () => {
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    setAiResponse('');
    const answer = await askGeminiAboutMembers(aiQuery, members);
    setAiResponse(answer);
    setIsAiLoading(false);
  };

  const handleBulkEmail = () => {
    const emails = filteredMembers
        .map(m => m.email)
        .filter(email => email && email.includes('@'))
        .join(',');
    
    if (!emails) {
        alert('No valid emails found in the current list.');
        return;
    }
    window.location.href = `mailto:?bcc=${emails}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getDisplayAvatar = (m: Member) => {
    if (m.pictureUrl && !m.pictureUrl.includes('ui-avatars.com')) return m.pictureUrl;
    return null; 
  };

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // ... Sidebar Rendering Logic ...
  const renderSidebarSection = (title: string, type: GroupingType, icon: React.ReactNode, items: string[], statsFn: (item: string) => { count: number, families: number }) => {
    const isExpanded = expandedSections[type];
    return (
        <div className="mb-2">
            <div 
                onClick={() => toggleSection(type)}
                className="flex items-center justify-between px-4 py-2 cursor-pointer group hover:bg-slate-50 transition-colors rounded-lg mx-2"
            >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-brand-500">
                    {icon}
                    {title}
                </div>
                {isExpanded ? <ChevronDown className="w-3 h-3 text-slate-400"/> : <ChevronRight className="w-3 h-3 text-slate-400"/>}
            </div>
            
            {isExpanded && (
                <div className="space-y-1 mt-1 animate-in slide-in-from-top-2 duration-200">
                    {items.map(item => {
                        const { count, families } = statsFn(item);
                        const isActive = groupingType === type && selectedGroup === item;
                        return (
                            <div 
                                key={item}
                                onClick={() => { 
                                    setGroupingType(type); 
                                    setSelectedGroup(item); 
                                    setShowMobileSidebar(false); 
                                    if (type === 'mokjang') {
                                        setViewMode('family');
                                    } else {
                                        setViewMode('card');
                                    }
                                    if (type === 'status') {
                                        if (item === 'Active') setShowActiveOnly(true);
                                        else setShowActiveOnly(false);
                                    }
                                }}
                                className={`flex items-center gap-3 pl-16 pr-4 py-2 cursor-pointer transition-all duration-200 border-l-2 ${isActive ? 'border-brand-400 bg-brand-50/50 text-brand-700 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                            >
                                <span className="truncate text-sm flex-1">{item}</span>
                                {type === 'mokjang' ? (
                                    <span className={`text-[10px] ${isActive ? 'text-brand-600' : 'text-slate-400'}`}>
                                        {families}가정 · {count}명
                                    </span>
                                ) : (
                                    <span className={`text-xs font-medium ${isActive ? 'text-brand-500' : 'text-slate-600'}`}>{count}</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
  };

  const isActiveGroupSelected = groupingType === 'status' && selectedGroup === 'Active' && viewMode === 'card';
  const isFamilyViewSelected = viewMode === 'family';
  const isAllMembersSelected = groupingType === 'all' && !showActiveOnly;

  const getHeaderTitle = () => {
    if (groupingType === 'birthday') {
      return ''; // Handled in the special view
    }
    if (groupingType === 'all') return showActiveOnly ? 'Active Members' : 'All Members';
    return selectedGroup;
  };

  const getHeaderStats = () => {
      if (groupingType === 'birthday') return null;
      let filterFn = (m: Member) => true;
      if (groupingType === 'all') {} 
      else if (groupingType === 'mokjang') filterFn = m => m.mokjang === selectedGroup;
      else if (groupingType === 'position') filterFn = m => m.position === selectedGroup;
      else if (groupingType === 'status') filterFn = m => m.status === selectedGroup;
      else if (groupingType === 'tag') filterFn = m => m.tags?.includes(selectedGroup);

      if (groupingType === 'status') {
          const { count, families } = getRawSubgroupStats(filterFn);
           return (
            <span className="text-base text-brand-600 font-normal ml-3">
                {families}가정, {count}명
            </span>
           );
      }
      const { count, families } = getSubgroupStats(filterFn);
      return (
          <span className="text-base text-brand-600 font-normal ml-3">
              {families}가정, {count}명 {showActiveOnly ? '(Active)' : '(전체)'}
          </span>
      );
  };

  // Helper to render main content area cleanly
  const renderMainContent = () => {
    if (groupingType === 'birthday') {
        return (
              <div className="max-w-7xl mx-auto">
                  {/* Compact Header */}
                  <div className="bg-gradient-to-r from-pink-500 via-rose-400 to-orange-400 text-white px-6 py-4 rounded-2xl shadow-lg mb-8 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="relative z-10 flex items-center gap-4">
                           <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Cake className="w-5 h-5 text-white" />
                           </div>
                           <div>
                                <h1 className="text-lg sm:text-xl font-extrabold leading-tight">Birthdays in {new Date().toLocaleString('default', { month: 'long' })}</h1>
                                <p className="text-xs sm:text-sm opacity-90 font-medium">
                                    Let's celebrate the gift of life together!
                                </p>
                           </div>
                      </div>
                      
                      {/* Decorative Background */}
                      <div className="absolute top-0 right-0 w-64 h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                      <PartyPopper className="w-24 h-24 text-white opacity-10 absolute -right-4 -bottom-8 rotate-12" />
                  </div>

                  {paginatedItems.length === 0 ? (
                      <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                          <div className="bg-slate-50 p-6 rounded-full mb-4">
                            <CalendarDays className="w-12 h-12 text-slate-300" />
                          </div>
                          <h3 className="text-lg font-bold text-slate-600">No birthdays this month</h3>
                          <p className="text-slate-400 font-medium">Everyone is celebrating another time!</p>
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {(paginatedItems as Member[]).map(member => {
                              const avatar = getDisplayAvatar(member);
                              const baseColor = getRoleBaseColor(member.position as string);
                              // Fix: extract day from string directly to avoid timezone shift
                              const day = parseInt(member.birthday.split('-')[2], 10);
                              
                              // Logic for Turning Age
                              const birthYear = parseInt(member.birthday.split('-')[0], 10);
                              const currentYear = new Date().getFullYear();
                              const turningAge = currentYear - birthYear;
                              
                              return (
                                  <div 
                                    key={member.id}
                                    onClick={() => handleCardClick(member)}
                                    className={`group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden relative hover:-translate-y-1`}
                                  >
                                      {/* Decorative Background Pattern */}
                                      <div className={`absolute inset-0 bg-gradient-to-br from-white via-white to-${baseColor}-50/30 opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                                      
                                      <div className="p-4 flex flex-col gap-4 relative z-10">
                                          <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    {/* Calendar Date Block */}
                                                    <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-${baseColor}-50 text-${baseColor}-600 shrink-0 border border-${baseColor}-100 group-hover:scale-105 transition-transform`}>
                                                        <span className="text-[10px] font-extrabold uppercase tracking-wide opacity-70 leading-none mb-0.5">{new Date().toLocaleString('default', { month: 'short' })}</span>
                                                        <span className="text-2xl font-black leading-none">{day}</span>
                                                    </div>

                                                    <div className="min-w-0">
                                                        <h3 className="font-bold text-slate-800 text-lg truncate group-hover:text-brand-600 transition-colors">{member.koreanName}</h3>
                                                        <div className="flex flex-col">
                                                             <span className={`text-xs font-medium text-${baseColor}-600`}>
                                                                {member.position}
                                                             </span>
                                                             {member.mokjang !== 'Unassigned' && (
                                                                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                                                     {member.mokjang}
                                                                </span>
                                                             )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Turning Age Emphasis */}
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] text-pink-400 font-bold uppercase tracking-wide mb-0.5">Turning</span>
                                                    <span className="text-xl font-black text-slate-800 leading-none">{turningAge}</span>
                                                </div>
                                          </div>

                                          <div className="h-px bg-slate-50 w-full" />

                                          {/* Additional Info for Birthday Card (Tags & Phone) */}
                                          <div className="flex items-center justify-between">
                                              {/* Phone */}
                                              <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                  <Smartphone className="w-3 h-3 text-slate-300 group-hover:text-${baseColor}-400" />
                                                  {member.phone || '-'}
                                              </div>

                                              {/* Tags */}
                                              {member.tags && member.tags.length > 0 && (
                                                  <div className="flex flex-wrap items-center gap-1 justify-end">
                                                      {member.tags.filter(t => t !== 'New Family' && t !== '새가족').slice(0, 1).map(tag => (
                                                          <span key={tag} className="text-[9px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 group-hover:bg-white">#{tag}</span>
                                                      ))}
                                                      {(member.tags?.includes('New Family') || member.tags?.includes('새가족')) && <span className="bg-amber-50 text-amber-700 text-[9px] px-1.5 py-0.5 rounded border border-amber-100 font-bold group-hover:bg-white">새가족</span>}
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                              )
                          })}
                      </div>
                  )}
              </div>
        );
    }

    if ((viewMode === 'card' ? filteredMembers.length : familyGroups.length) === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <div className="bg-white p-6 rounded-full shadow-sm mb-4"><Users className="w-10 h-10 text-slate-300" /></div>
            <p className="text-lg font-medium text-slate-500">{showActiveOnly ? 'No Active members found in this group.' : 'No members found.'}</p>
            {showActiveOnly && <button onClick={() => setShowActiveOnly(false)} className="mt-2 text-brand-600 hover:underline text-sm font-bold">Try turning off "Active Only" filter</button>}
            </div>
        );
    }

    return (
        <>
            {/* === CARD VIEW (COMPACT & PASTEL & HOVER EFFECTS) === */}
            {viewMode === 'card' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-8 print:grid-cols-3 print:gap-4 print-grid">
                    {(paginatedItems as Member[]).map(member => {
                    const avatar = getDisplayAvatar(member);
                    const baseColor = getRoleBaseColor(member.position as string);
                    return (
                        <div 
                            key={member.id} 
                            onClick={() => handleCardClick(member)}
                            className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group flex flex-col border-t-4 border-t-${baseColor}-400 relative overflow-hidden hover:-translate-y-1`}
                        >
                            <div className="p-4 flex gap-4">
                                {/* Left: Avatar */}
                                <div className="relative shrink-0">
                                    {avatar ? (
                                        <img src={avatar} alt={member.englishName} className="w-14 h-14 rounded-lg object-cover bg-slate-50 border border-slate-100 group-hover:scale-105 transition-transform duration-300"/> 
                                    ) : (
                                        <div className={`w-14 h-14 rounded-lg bg-${baseColor}-50 flex items-center justify-center text-${baseColor}-400 border border-${baseColor}-100 group-hover:bg-${baseColor}-100 transition-colors`}>
                                            <User className="w-7 h-7" />
                                        </div>
                                    )}
                                    {member.relationship === 'Self' && (
                                        <div className="absolute -top-1.5 -left-1.5 bg-white p-0.5 rounded-full border border-slate-100 shadow-sm z-10" title="Head of Household">
                                            <Crown className="w-2.5 h-2.5 text-amber-500" fill="currentColor"/>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Info */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    {/* Name & Age Row - Adjusted Layout */}
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className="font-bold text-slate-800 text-base truncate">{member.koreanName}</h3>
                                        <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 whitespace-nowrap group-hover:bg-white group-hover:border-${baseColor}-100 transition-colors">
                                            {calculateAge(member.birthday)} · {member.gender === 'Male' ? 'M' : 'F'}
                                        </span>
                                    </div>
                                    
                                    <p className="text-xs text-slate-500 font-medium truncate mb-2">{member.englishName}</p>
                                    
                                    {/* Row: Role | Mokjang | Tags */}
                                    <div className="flex flex-wrap items-center gap-1.5 mb-2 leading-none">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getRoleStyle(member.position as string)}`}>
                                            {member.position}
                                        </span>
                                        {member.mokjang !== 'Unassigned' && (
                                            <>
                                                <span className="text-[10px] text-slate-300">|</span>
                                                <span className="text-[10px] font-bold text-slate-600 truncate max-w-[80px]">
                                                    {member.mokjang}
                                                </span>
                                            </>
                                        )}
                                        {member.tags && member.tags.length > 0 && (
                                            <>
                                                <span className="text-[10px] text-slate-300">|</span>
                                                <div className="flex gap-1">
                                                    {member.tags.filter(t => t !== 'New Family' && t !== '새가족').slice(0, 2).map(tag => (
                                                        <span key={tag} className="text-[9px] font-bold text-slate-500 bg-slate-50 px-1 rounded border border-slate-100 group-hover:bg-white">#{tag}</span>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                        {(member.tags?.includes('New Family') || member.tags?.includes('새가족')) && <span className="bg-amber-50 text-amber-700 text-[9px] px-1.5 py-0.5 rounded border border-amber-100 font-bold ml-auto group-hover:bg-white">새가족</span>}
                                    </div>

                                    <div className="mt-auto">
                                        <a 
                                            href={`tel:${member.phone}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-brand-600 px-2 py-1.5 rounded-lg border border-slate-100 transition-colors"
                                        >
                                            <Smartphone className="w-3 h-3 text-slate-400" />
                                            {member.phone || '-'}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                    })}
                </div>
            )}

            {/* === FAMILY VIEW === */}
            {viewMode === 'family' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-8 print:grid-cols-2 print:gap-4 print-grid">
                    {(paginatedItems as any[]).map(group => (
                        <div key={group.id} className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-200 overflow-hidden hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] hover:border-brand-300 transition-all duration-300 group flex flex-col print-break-inside-avoid print:shadow-none print:border-slate-300">
                            <div className="h-1.5 w-full bg-gradient-to-r from-brand-400 to-blue-500 opacity-80 group-hover:opacity-100 transition-opacity print:bg-slate-400 print:opacity-100"></div>
                            <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-100 flex items-center justify-between backdrop-blur-sm print:bg-slate-100">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2">
                                        <div className="p-1.5 bg-white rounded-lg shadow-sm text-brand-600 print:hidden"><Users className="w-5 h-5" /></div>
                                        {group.repName}'s Family
                                    </h3>
                                    {group.head.address && <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5 ml-1"><MapPin className="w-3 h-3 text-slate-400" /><span className="truncate max-w-[200px]">{group.head.address}</span></div>}
                                </div>
                                <span className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">{group.members.length}</span>
                            </div>
                            <div className="p-3 space-y-2 flex-1 bg-white">
                                {group.members.map((m: Member) => {
                                    const avatar = getDisplayAvatar(m);
                                    const baseColor = getRoleBaseColor(m.position as string);
                                    return (
                                    <div key={m.id} onClick={() => handleCardClick(m)} className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-slate-100 hover:bg-slate-50 cursor-pointer transition-all group/item print:p-2 print:border-b print:border-slate-100 print:rounded-none">
                                        <div className="relative">
                                            {avatar ? <img src={avatar} alt={m.englishName} className="w-12 h-12 rounded-full object-cover border border-slate-100 bg-slate-100 print:w-8 print:h-8"/> : <div className={`w-12 h-12 rounded-full bg-${baseColor}-50 flex items-center justify-center text-${baseColor}-300`}><User className="w-6 h-6" /></div>}
                                            {m.relationship === 'Self' && <div className="absolute -top-1 -right-1 bg-white text-amber-500 rounded-full p-0.5 border border-slate-100 shadow-sm z-10" title="Head of Household"><Crown className="w-3 h-3" fill="currentColor" /></div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-bold text-base truncate ${m.relationship === 'Self' ? 'text-slate-800' : 'text-slate-600'}`}>{m.koreanName}</span>
                                                    {(m.tags?.includes('New Family') || m.tags?.includes('새가족')) && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-bold">새가족</span>}
                                                </div>
                                                {m.status === 'Active' ? <div className="w-2 h-2 rounded-full bg-emerald-400 print:border print:border-slate-400"></div> : <div className="w-2 h-2 rounded-full bg-slate-300"></div>}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className={`font-medium ${m.relationship === 'Self' ? 'text-brand-600' : 'text-slate-400'}`}>{m.relationship === 'Self' ? 'Head' : m.relationship}</span>
                                                <span className="text-slate-300">|</span>
                                                <span className="text-slate-400">{calculateAge(m.birthday)} yrs</span>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ... Pagination (unchanged) ... */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 pb-20 print:hidden">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft className="w-5 h-5" /></button>
                <span className="text-sm font-bold text-slate-600">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight className="w-5 h-5" /></button>
                </div>
            )}
        </>
    );
  }

  // --- ADDED MISSING RETURN ---
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {showMobileSidebar && (
            <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setShowMobileSidebar(false)}></div>
        )}

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 lg:translate-x-0 lg:static flex flex-col shadow-xl lg:shadow-none ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="h-20 flex items-center px-6 border-b border-slate-100 bg-white">
                <Logo />
            </div>

            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6 scrollbar-hide">
                 {/* Navigation Sections */}
                 <div>
                    <div className="px-4 pb-2 text-xs font-extrabold text-slate-400 uppercase tracking-widest">Directory</div>
                    <div 
                        onClick={() => { setGroupingType('all'); setSelectedGroup('All'); setShowMobileSidebar(false); setViewMode('card'); setShowActiveOnly(true); }}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-colors mb-1 ${groupingType === 'all' && showActiveOnly ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Users className="w-5 h-5" />
                        <span>Active Members</span>
                    </div>
                    <div 
                        onClick={() => { setGroupingType('all'); setSelectedGroup('All'); setShowMobileSidebar(false); setViewMode('card'); setShowActiveOnly(false); }}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-colors ${groupingType === 'all' && !showActiveOnly ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <List className="w-5 h-5" />
                        <span>All Members (Archive)</span>
                    </div>
                     <div 
                        onClick={() => { setGroupingType('birthday'); setSelectedGroup('Birthdays'); setShowMobileSidebar(false); }}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-colors mt-1 ${groupingType === 'birthday' ? 'bg-gradient-to-r from-pink-50 to-orange-50 text-pink-600 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Cake className="w-5 h-5" />
                        <span>Birthdays</span>
                    </div>
                 </div>

                 <div>
                    <div className="px-4 pb-2 text-xs font-extrabold text-slate-400 uppercase tracking-widest mt-4">Groups</div>
                    {renderSidebarSection('Mokjang (Cells)', 'mokjang', <Home className="w-4 h-4"/>, mokjangList, (item) => getSubgroupStats(m => m.mokjang === item))}
                    {renderSidebarSection('Positions', 'position', <Briefcase className="w-4 h-4"/>, positionList, (item) => getSubgroupStats(m => m.position === item))}
                    {renderSidebarSection('Status', 'status', <UserCheck className="w-4 h-4"/>, statusList, (item) => getRawSubgroupStats(m => m.status === item))}
                    {renderSidebarSection('Tags', 'tag', <Tag className="w-4 h-4"/>, tagList, (item) => getSubgroupStats(m => m.tags?.includes(item)))}
                 </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-2 mb-3">
                    <span className="flex items-center gap-1.5"><Cloud className={`w-3 h-3 ${isSyncing ? 'text-blue-500 animate-pulse' : (serverUrl && !syncError ? 'text-green-500' : 'text-slate-300')}`} /> {isSyncing ? 'Syncing...' : (lastSyncTime ? 'Synced' : 'Offline')}</span>
                    {lastSyncTime && <span>{lastSyncTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                </div>
                <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-100 hover:text-slate-800 transition-all shadow-sm">
                    <Settings className="w-4 h-4" /> System Settings
                </button>
                <div className="mt-2 flex gap-2">
                     <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-300 transition-colors text-xs">
                        <LogOut className="w-3 h-3" /> Logout
                     </button>
                </div>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-white lg:bg-slate-50 relative">
            
            {/* Top Bar */}
            <div className="h-20 px-4 lg:px-8 border-b border-slate-200 bg-white/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-30 shadow-sm lg:shadow-none">
                <div className="flex items-center gap-4">
                    <button onClick={() => setShowMobileSidebar(true)} className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                        <Menu className="w-6 h-6" />
                    </button>
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                            {getHeaderTitle()}
                            {getHeaderStats()}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                     <div className="hidden md:flex items-center bg-slate-100 rounded-xl px-3 py-2 border border-slate-200 focus-within:ring-2 focus-within:ring-brand-500 focus-within:bg-white transition-all w-64 lg:w-80 group">
                        <Search className="w-5 h-5 text-slate-400 group-focus-within:text-brand-500" />
                        <input 
                            type="text" 
                            placeholder="Search members..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm ml-2 w-full text-slate-800 placeholder-slate-400"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400">
                                <X className="w-3 h-3" />
                            </button>
                        )}
                     </div>

                     <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                     <button 
                        onClick={() => setShowAiPanel(true)}
                        className="p-2 sm:px-4 sm:py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center gap-2 group"
                     >
                        <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                        <span className="hidden sm:inline">AI Assistant</span>
                     </button>

                     <button 
                        onClick={() => setIsImportOpen(true)}
                        className="p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-600 rounded-xl transition-colors border border-transparent hover:border-slate-200 hidden sm:block"
                        title="Import / Restore"
                     >
                        <Download className="w-5 h-5" />
                     </button>

                     <button 
                        onClick={() => { setEditingMember(null); setIsFormOpen(true); }}
                        className="p-2 sm:px-4 sm:py-2 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-200 hover:bg-brand-700 hover:shadow-brand-300 transition-all flex items-center gap-2"
                     >
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">New Member</span>
                     </button>
                </div>
            </div>

            {/* Filter / Toolbar Bar */}
            {groupingType !== 'birthday' && (
                <div className="px-4 lg:px-8 py-4 flex flex-col sm:flex-row gap-4 items-center justify-between z-20">
                    {/* View Toggles */}
                    <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-full sm:w-auto">
                        <button 
                            onClick={() => setViewMode('card')}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'card' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutGrid className="w-4 h-4" /> Cards
                        </button>
                        <button 
                            onClick={() => setViewMode('family')}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'family' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Users className="w-4 h-4" /> Family
                        </button>
                    </div>

                    {/* Filter / Sort Actions */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end overflow-x-auto">
                        {/* Year Filter Pills - Only show recent years for quick access */}
                        {groupingType === 'all' && (
                            <div className="flex items-center gap-2 mr-2">
                                {stats.yearsToCheck.map(year => (
                                    <button
                                        key={year}
                                        onClick={() => toggleRegistrationYear(year)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${selectedRegistrationYears.has(year) ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-200 text-slate-500 hover:border-brand-200 hover:text-brand-600'}`}
                                    >
                                        {year} ({stats.regStats[year] || 0})
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center bg-white rounded-xl border border-slate-200 shadow-sm p-1">
                             <select 
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="text-sm font-bold text-slate-600 bg-transparent outline-none pl-2 pr-1 py-1 cursor-pointer hover:text-brand-600"
                            >
                                <option value="name">Name</option>
                                <option value="rep">Head of Household</option>
                                <option value="age">Age</option>
                            </select>
                            <button onClick={toggleSortDirection} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                                {sortDirection === 'asc' ? <ArrowUp className="w-4 h-4"/> : <ArrowDown className="w-4 h-4"/>}
                            </button>
                        </div>
                        
                        <div className="h-6 w-px bg-slate-200 mx-1"></div>

                        {/* Special Actions Context Menu */}
                        <div className="flex gap-1">
                            {/* Graduation Button for New Family */}
                            {(groupingType === 'tag' && (selectedGroup === '새가족' || selectedGroup === 'New Family')) && (
                                <button 
                                    onClick={handleGraduateNewFamilies}
                                    className="p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl border border-transparent hover:border-emerald-200 transition-colors"
                                    title="Graduate All (Remove 'New Family' Tag)"
                                >
                                    <UserCheck className="w-5 h-5" />
                                </button>
                            )}
                            <button 
                                onClick={handleBulkEmail}
                                className="p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl border border-transparent hover:border-blue-200 transition-colors"
                                title="Email this list"
                            >
                                <Mail className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={handlePrint}
                                className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-xl border border-transparent hover:border-slate-200 transition-colors"
                                title="Print View"
                            >
                                <Printer className="w-5 h-5" />
                            </button>
                             <button 
                                onClick={handleExport}
                                className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-xl border border-transparent hover:border-slate-200 transition-colors"
                                title="Export JSON"
                            >
                                <HardDrive className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 relative">
                 {renderMainContent()}
            </div>
        </div>

        {/* --- MODALS --- */}

        {/* AI Assistant Panel */}
        {showAiPanel && (
            <div className="fixed inset-0 z-[60] flex justify-end animate-in slide-in-from-right duration-300">
                 <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowAiPanel(false)}></div>
                 <div className="w-full max-w-md bg-white shadow-2xl h-full relative flex flex-col">
                      <div className="p-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex justify-between items-center">
                          <h3 className="font-bold text-lg flex items-center gap-2">
                             <Sparkles className="w-5 h-5" /> AI Assistant
                          </h3>
                          <button onClick={() => setShowAiPanel(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                          {aiResponse ? (
                              <div className="space-y-4">
                                  <div className="bg-white p-4 rounded-2xl rounded-tr-none shadow-sm border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-wrap">
                                      {aiResponse}
                                  </div>
                                  <div className="text-right">
                                      <button onClick={() => setAiResponse('')} className="text-xs text-brand-600 font-bold hover:underline">Ask another question</button>
                                  </div>
                              </div>
                          ) : (
                              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center opacity-60">
                                   <Sparkles className="w-12 h-12 mb-4 text-indigo-300" />
                                   <p className="text-sm font-medium">Ask me anything about the member data.<br/>Try "How many families are in Joy Mokjang?"</p>
                              </div>
                          )}
                          
                          {isAiLoading && (
                              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
                                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent"></div>
                              </div>
                          )}
                      </div>
                      <div className="p-4 border-t border-slate-200 bg-white">
                           <div className="flex gap-2">
                               <input 
                                  value={aiQuery}
                                  onChange={(e) => setAiQuery(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAiAsk()}
                                  placeholder="Ask a question..."
                                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                  autoFocus
                               />
                               <button 
                                  onClick={handleAiAsk}
                                  disabled={!aiQuery.trim() || isAiLoading}
                                  className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:opacity-50 transition-colors"
                               >
                                  <ArrowUp className="w-5 h-5" />
                               </button>
                           </div>
                      </div>
                 </div>
            </div>
        )}

        <MemberForm
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSubmit={handleSaveMembers}
            onDelete={editingMember ? handleDeleteMember : undefined}
            initialData={editingMember}
            allMembers={members}
            mokjangList={mokjangList}
            positionList={positionList}
            statusList={statusList}
            tagList={tagList}
        />

        <MemberDetail
            isOpen={isDetailOpen}
            onClose={() => setIsDetailOpen(false)}
            member={viewingMember}
            onEdit={handleEditClick}
            allMembers={members}
            onMemberClick={handleCardClick}
        />

        <ImportModal
            isOpen={isImportOpen}
            onClose={() => setIsImportOpen(false)}
            onImport={handleImport}
        />

        <SettingsModal 
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            mokjangList={mokjangList}
            positionList={positionList}
            statusList={statusList}
            tagList={tagList}
            onUpdateMokjangs={setMokjangList}
            onUpdatePositions={setPositionList}
            onUpdateStatuses={setStatusList}
            onUpdateTags={setTagList}
            onRenameItem={handleRenameItem}
            onDeleteItem={handleDeleteItem}
        />

    </div>
  );
}
