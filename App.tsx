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

function App() {
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
        
        if (!response.ok) throw new Error('Failed to connect to server');
        
        const data = await response.json();
        if (Array.isArray(data)) {
            setMembers(data);
            setLastSyncTime(new Date());
            localStorage.setItem('church-members', JSON.stringify(data));
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
             const txt = await response.text();
             throw new Error('Save failed: ' + txt);
        }
        
        const resJson = await response.json();
        if (resJson.success) {
            setLastSyncTime(new Date());
        } else {
            throw new Error(resJson.error || 'Unknown error during save');
        }
    } catch (e: any) {
        console.error("Save Error:", e);
        setSyncError('Failed to save to cloud: ' + e.message);
        alert('Warning: Could not save to cloud server. Data is saved locally only.');
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
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* ... CSS & Sidebar ... */}
      <style>{`
        @media print {
          @page { margin: 0.5cm; size: auto; }
          html, body { height: auto !important; min-height: 100% !important; margin: 0 !important; padding: 0 !important; background: white !important; overflow: visible !important; }
          #root, main { position: static !important; overflow: visible !important; height: auto !important; display: block !important; }
          aside, button, input, select, .no-print, .print-hidden { display: none !important; }
          .print-content { position: static !important; width: 100% !important; margin: 0 !important; padding: 0 !important; display: block !important; overflow: visible !important; background: white !important; }
          .print-scroll-reset { position: static !important; height: auto !important; overflow: visible !important; display: block !important; }
          .print-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 1rem !important; page-break-inside: auto; }
          .print-break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
          ::-webkit-scrollbar { display: none; }
        }
      `}</style>
      
      {/* Sidebar (Existing Code) */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'} flex flex-col print:hidden`}>
          <div className="h-20 flex items-center px-6 border-b border-slate-100 shrink-0">
             <Logo className="w-full" />
          </div>

          <div className="p-4 shrink-0">
             <button onClick={() => { setEditingMember(null); setIsFormOpen(true); }} className="group w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-brand-200 transition-all duration-300 transform hover:-translate-y-0.5">
               <Plus className="w-5 h-5" /> <span>Add Member</span>
             </button>
          </div>

          <nav className="flex-1 overflow-y-auto space-y-4 no-scrollbar pb-6">
            <div className="grid grid-cols-2 gap-2 px-4 mb-4">
               <div onClick={() => { setShowActiveOnly(true); setGroupingType('all'); setSelectedGroup('All'); setViewMode('card'); setShowMobileSidebar(false); }} className={`p-3 rounded-xl border shadow-sm text-center cursor-pointer transition-all group relative overflow-hidden ${showActiveOnly ? 'bg-brand-500 border-brand-600 ring-2 ring-brand-200 text-white shadow-brand-200' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}>
                  <div className={`text-[10px] font-bold uppercase mb-1 flex items-center justify-center gap-1 ${showActiveOnly ? 'text-brand-100' : 'text-slate-400'}`}>
                      <CheckSquare className="w-3 h-3"/> Active Only
                  </div>
                  <div className={`text-2xl font-extrabold ${showActiveOnly ? 'text-white' : 'text-slate-700'}`}>{stats.active}</div>
                  <div className={`text-[9px] mt-1 font-medium ${showActiveOnly ? 'text-brand-100' : 'text-slate-400'}`}>Current Active</div>
               </div>

               <div onClick={() => { setGroupingType('all'); setSelectedGroup('All'); setViewMode('family'); setShowMobileSidebar(false); }} className={`p-3 rounded-xl border shadow-sm text-center cursor-pointer transition-all group ${isFamilyViewSelected ? 'bg-brand-50 border-brand-200 ring-1 ring-brand-100' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-brand-200'}`}>
                  <div className={`text-[10px] font-bold uppercase mb-1 ${isFamilyViewSelected ? 'text-brand-600' : 'text-slate-400 group-hover:text-brand-500'}`}>Families</div>
                  <div className={`text-2xl font-extrabold ${isFamilyViewSelected ? 'text-brand-700' : 'text-slate-700'}`}>{stats.families}</div>
                  <div className="text-[9px] text-slate-400 mt-1 font-medium">Households</div>
               </div>
            </div>

            <div className="px-2">
              <div onClick={() => { setGroupingType('all'); setSelectedGroup('All'); setShowActiveOnly(false); setShowMobileSidebar(false); setViewMode('card'); }} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${isAllMembersSelected ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-100' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}>
                <Users className={`w-5 h-5 ${isAllMembersSelected ? 'text-brand-600' : 'text-slate-400'}`} />
                <span>All Members List</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${isAllMembersSelected ? 'bg-white text-brand-700 shadow-sm' : 'bg-slate-100 text-slate-400'}`}>{stats.total}</span>
              </div>
            </div>
            
            <div className="px-2 mb-2">
              <div onClick={() => { setGroupingType('birthday'); setSelectedGroup('Birthdays'); setViewMode('card'); setShowMobileSidebar(false); }} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${groupingType === 'birthday' ? 'bg-pink-50 text-pink-700 font-semibold ring-1 ring-pink-100' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Cake className={`w-5 h-5 ${groupingType === 'birthday' ? 'text-pink-500' : 'text-pink-400'}`} />
                <span>Birthdays (This Month)</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${groupingType === 'birthday' ? 'bg-white text-pink-700 shadow-sm' : 'bg-slate-100 text-slate-400'}`}>{stats.birthdaysThisMonth}</span>
              </div>
            </div>

            <div className="border-t border-slate-100 my-2 pt-2"></div>
            {/* Sidebar Stats ... */}
            <div className="px-4 mb-2">
                <div className="flex items-center gap-2 px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    <Calendar className="w-3.5 h-3.5" /> Recent Registrations
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {stats.yearsToCheck.map(year => {
                        const isSelected = selectedRegistrationYears.has(year);
                        return (
                            <button key={year} onClick={() => toggleRegistrationYear(year)} className={`text-center p-2 rounded-lg border transition-all w-full ${isSelected ? 'bg-brand-100 border-brand-300 ring-1 ring-brand-300' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-sm'}`}>
                                <div className={`text-[10px] font-bold ${isSelected ? 'text-brand-700' : 'text-slate-500'}`}>{year}</div>
                                <div className={`text-sm font-bold ${isSelected ? 'text-brand-700' : 'text-brand-600'}`}>{stats.regStats[year] || 0}</div>
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="border-t border-slate-100 my-2 pt-2"></div>
            {renderSidebarSection('목장', 'mokjang', <List className="w-3.5 h-3.5" />, mokjangList, (item) => getSubgroupStats(m => m.mokjang === item))}
            {renderSidebarSection('Roles', 'position', <Briefcase className="w-3.5 h-3.5" />, positionList, (item) => getSubgroupStats(m => m.position === item))}
            {renderSidebarSection('Status', 'status', <Tag className="w-3.5 h-3.5" />, statusList, (item) => getRawSubgroupStats(m => m.status === item))}
            {renderSidebarSection('Tags', 'tag', <CheckSquare className="w-3.5 h-3.5" />, tagList, (item) => getSubgroupStats(m => m.tags?.includes(item)))}
          </nav>
          
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0 space-y-2">
             <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider px-2 mb-1 mt-2"><span>Data Management</span></div>
             {serverUrl ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 mb-2">
                    {isSyncing ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Cloud className="w-3 h-3" />}
                    <div className="flex-1 truncate">{isSyncing ? 'Syncing...' : 'Cloud Connected'}{lastSyncTime && !isSyncing && <div className="text-[9px] opacity-70">Last: {lastSyncTime.toLocaleTimeString()}</div>}</div>
                </div>
             ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500 mb-2"><CloudOff className="w-3 h-3" /><span>Local Mode (No Sync)</span></div>
             )}
             {syncError && <div className="text-[10px] text-red-500 px-2 leading-tight mb-2">Error: {syncError}</div>}
             <div className="grid grid-cols-2 gap-2">
               <button onClick={handleExport} className="flex flex-col items-center justify-center gap-1 text-xs text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-2 rounded-lg transition-colors"><HardDrive className="w-4 h-4" /><span className="font-bold">Backup</span></button>
               <button onClick={() => setIsImportOpen(true)} className="flex flex-col items-center justify-center gap-1 text-xs text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-2 rounded-lg transition-colors"><Download className="w-4 h-4" /><span className="font-bold">Import</span></button>
             </div>
             <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center gap-3 text-sm text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg hover:bg-white transition-colors"><Settings className="w-4 h-4" /> System Settings</button>
             <button onClick={handleLogout} className="w-full flex items-center gap-3 text-sm text-red-400 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"><LogOut className="w-4 h-4" /> Sign Out</button>
          </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-50/50 print:bg-white print-content">
        
        {/* Mobile Header & Top Bar... (Existing) */}
        <div className="lg:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-20 print:hidden">
           <button onClick={() => setShowMobileSidebar(true)} className="p-2 -ml-2 text-slate-600"><Menu className="w-6 h-6" /></button>
           <Logo className="scale-75 origin-left" />
           <div className="w-6"></div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 sticky top-0 print:hidden">
           <div className="relative flex-1 max-w-xl group flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-brand-400 w-5 h-5 transition-colors" />
                <input type="text" placeholder="Search by name, phone, family..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm" />
                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"><X className="w-4 h-4" /></button>}
              </div>
              <div onClick={() => setShowActiveOnly(!showActiveOnly)} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all border shadow-sm select-none ${showActiveOnly ? 'bg-brand-500 border-brand-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`} title="Toggle Active Only Filter">
                  {showActiveOnly ? <Filter className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span className="text-xs font-bold whitespace-nowrap hidden xl:inline">{showActiveOnly ? 'Active Only' : 'Showing All'}</span>
                  {showActiveOnly ? <ToggleLeft className="w-5 h-5 opacity-80" /> : <ToggleRight className="w-5 h-5 opacity-50" />}
              </div>
           </div>
           
           <div className="flex items-center gap-3">
             <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-all shadow-sm group"><Printer className="w-4 h-4 group-hover:text-brand-500" /><span className="font-medium text-sm hidden sm:inline">Print</span></button>
             <button onClick={handleBulkEmail} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-all shadow-sm group"><Mail className="w-4 h-4 group-hover:text-brand-500" /><span className="font-medium text-sm hidden sm:inline">Email Group</span></button>
             <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button onClick={() => setViewMode('card')} className={`p-2 rounded-lg transition-all ${viewMode === 'card' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><LayoutGrid className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('family')} className={`p-2 rounded-lg transition-all ${viewMode === 'family' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Home className="w-4 h-4" /></button>
             </div>
             <div className="flex items-center gap-1">
                <div className="relative"><select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'name' | 'rep' | 'age')} className="appearance-none bg-white border border-slate-200 text-slate-600 py-2.5 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm font-medium shadow-sm cursor-pointer hover:bg-slate-50"><option value="name">Sort by Name</option><option value="rep">Sort by Family Head</option><option value="age">Sort by Age</option></select></div>
                <button onClick={toggleSortDirection} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-colors shadow-sm">{sortDirection === 'asc' ? <ArrowUp className="w-4 h-4"/> : <ArrowDown className="w-4 h-4"/>}</button>
             </div>
             <button onClick={() => setShowAiPanel(!showAiPanel)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all shadow-sm ${showAiPanel ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-purple-100' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Sparkles className="w-4 h-4" /><span className="font-medium text-sm hidden sm:inline">AI</span></button>
           </div>
        </div>

        {/* Member Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/30 print:p-0 print:bg-white print:overflow-visible print-scroll-reset">
          <div className="mb-6 flex items-end justify-between print:mb-4">
            {groupingType !== 'birthday' && (
                <div>
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                        {getHeaderTitle()}
                        {getHeaderStats()}
                        {selectedRegistrationYears.size > 0 && <span className="ml-2 text-lg text-brand-600 font-normal">(Reg: {Array.from(selectedRegistrationYears).sort().join(', ')})</span>}
                    </h2>
                    {groupingType === 'tag' && (selectedGroup === 'New Family' || selectedGroup === '새가족') && (
                        <button onClick={handleGraduateNewFamilies} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-brand-200 text-brand-600 hover:bg-brand-50 hover:border-brand-300 rounded-lg text-xs font-bold shadow-sm transition-all"><UserCheck className="w-4 h-4" /> Graduate All (Uncheck Tag)</button>
                    )}
                </div>
                <p className="text-sm text-slate-500 mt-1">Directory & Management {viewMode === 'family' ? ` (${familyGroups.length} families)` : ` (${filteredMembers.length} individuals)`}</p>
                </div>
            )}
          </div>

          {renderMainContent()}

        </div>
      </main>
      
      {showMobileSidebar && <div onClick={() => setShowMobileSidebar(false)} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 lg:hidden print:hidden" />}
      <MemberForm isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingMember(null); }} onSubmit={handleSaveMembers} onDelete={handleDeleteMember} initialData={editingMember} allMembers={members} mokjangList={mokjangList} positionList={positionList} statusList={statusList} tagList={tagList} />
      <MemberDetail member={viewingMember} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} onEdit={handleEditClick} allMembers={members} onMemberClick={handleCardClick} />
      <ImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onImport={handleImport} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} mokjangList={mokjangList} positionList={positionList} statusList={statusList} tagList={tagList} onUpdateMokjangs={setMokjangList} onUpdatePositions={setPositionList} onUpdateStatuses={setStatusList} onUpdateTags={setTagList} onRenameItem={handleRenameItem} onDeleteItem={handleDeleteItem} />
    </div>
  );
}

export default App;