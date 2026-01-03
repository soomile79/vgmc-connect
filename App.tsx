import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Cloud,
  CloudOff,
  RefreshCw,
  Filter,
  User,
  Phone,
  Smartphone,
  Gift,
  PartyPopper,
  CalendarDays,
  AlertTriangle,
  Loader2,
  UsersRound,
  MoreHorizontal,
  Home,
  Tag,
  CheckSquare,
  Cake,
  Mail,
  Printer,
  LogOut,
  Upload,
  LayoutGrid,
  Crown,
  ChevronDown,
  UserCheck,
  X,
  MapPin,
  Square,
  ArrowDownAZ,
  ArrowUpAZ,
  ListFilter
} from 'lucide-react';

import { Member, GroupingType, Position } from './types';
import { INITIAL_MEMBERS, MOKJANG_LIST, SIDEBAR_LABELS, getRoleStyle, getRoleBaseColor } from './constants';
import MemberForm from './components/MemberForm';
import MemberDetail from './components/MemberDetail';
import ImportModal from './components/ImportModal';
import SettingsModal from './components/SettingsModal';
import Login from './components/Login';
import Logo from './components/Logo';
import { askGeminiAboutMembers } from './services/geminiService';

const ITEMS_PER_PAGE = 24;
const DEFAULT_SERVER_URL = 'https://vgmc.ca/api.php';
const DEFAULT_API_SECRET = 'vgmc.org';

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
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('church-server-url') || DEFAULT_SERVER_URL);
  const [apiSecret, setApiSecret] = useState(() => localStorage.getItem('church-api-secret') || DEFAULT_API_SECRET);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // Data Persistence Warning State
  const [showPersistenceWarning, setShowPersistenceWarning] = useState(false);

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
    return saved ? JSON.parse(saved) : ['새가족','세례' ];
  });

  // UI State
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isPrintView, setIsPrintView] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  
  // Refs
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // --- Click Outside Handler for Actions Menu ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --- Auto-configure Cloud Settings on Mount ---
  useEffect(() => {
      const storedUrl = localStorage.getItem('church-server-url');
      const storedSecret = localStorage.getItem('church-api-secret');

      if (!storedUrl || !storedSecret) {
          localStorage.setItem('church-server-url', DEFAULT_SERVER_URL);
          localStorage.setItem('church-api-secret', DEFAULT_API_SECRET);
          setServerUrl(DEFAULT_SERVER_URL);
          setApiSecret(DEFAULT_API_SECRET);
      }
  }, []);

  // --- Check for Data Risk ---
  useEffect(() => {
    if (!serverUrl && members.length > 0 && !localStorage.getItem('dismiss-sync-warn')) {
        setShowPersistenceWarning(true);
    } else {
        setShowPersistenceWarning(false);
    }
  }, [serverUrl, members.length]);

  // --- Auto-migration for Data Consistency ---
  useEffect(() => {
    setTagList(prev => {
        const next = prev.map(t => {
            if (t === 'New Family') return '새가족';
            if (t === 'Baptized') return '세례';
            return t;
        }).filter(t => t !== 'Regular Member' && t !== '정회원');
        return Array.from(new Set(next));
    });

    setMembers(prev => {
        let hasChanges = false;
        const updated = prev.map(m => {
            let copy = { ...m };
            let modified = false;
            const posMap: Record<string, string> = {
                'Pastor': '교역자', 'Elder': '장로', 'Kwonsa': '권사',
                'Deacon': '서리집사', 'Ordained Deacon': '안수집사',
                'Member': '일반성도', 'New Family': '새가족', 'Teacher': '일반성도'
            };
            if (posMap[m.position]) {
                copy.position = posMap[m.position];
                modified = true;
            }
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

    setPositionList(prev => {
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
    'status': true,
    'tag': true
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

  // Handle Print Mode
  useEffect(() => {
    if (isPrintView) {
      const timer = setTimeout(() => {
        window.print();
        setIsPrintView(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isPrintView]);

  // Cloud Sync Functions
  const fetchFromCloud = async () => {
    if (!serverUrl) return;
    setIsSyncing(true);
    setSyncError('');
    try {
        const noCacheUrl = `${serverUrl}${serverUrl.includes('?') ? '&' : '?'}t=${new Date().getTime()}`;
        // GET requests should not have Content-Type: application/json as it can trigger 403 on strict servers
        const response = await fetch(noCacheUrl, {
            method: 'GET',
            headers: {
                'X-Api-Secret': apiSecret,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}`);
        }
        
        const data = await response.json();
        if (Array.isArray(data)) {
             const sanitizedData = data.map((m: any) => ({
                 ...m,
                 id: m.id || crypto.randomUUID(),
                 tags: Array.isArray(m.tags) ? m.tags : []
             }));
             setMembers(sanitizedData);
             setLastSyncTime(new Date());
             localStorage.setItem('church-members', JSON.stringify(sanitizedData));
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
        const noCacheUrl = `${serverUrl}${serverUrl.includes('?') ? '&' : '?'}t=${new Date().getTime()}`;
        const response = await fetch(noCacheUrl, {
            method: 'POST',
            headers: {
                'X-Api-Secret': apiSecret,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newMembers)
        });
        
        if (!response.ok) throw new Error(`Error ${response.status}`);
        const resJson = await response.json();
        if (resJson.success) {
            setLastSyncTime(new Date());
        }
    } catch (e: any) {
        console.error("Save Error:", e);
        setSyncError('Failed to save: ' + e.message);
    } finally {
        setIsSyncing(false);
    }
  };

  const handleForceSync = async (direction: 'upload' | 'download') => {
      if (direction === 'upload') {
          await saveToCloud(members);
      } else {
          await fetchFromCloud();
      }
  };

  // Initial Sync on Login or Load
  useEffect(() => {
    if (isLoggedIn && serverUrl && apiSecret) {
        fetchFromCloud();
    }
  }, [isLoggedIn, serverUrl, apiSecret]);

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

  // Reset Year filter when changing main grouping
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
      const parts = m.birthday.split('-');
      if (parts.length !== 3) return false;
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
        (m.koreanName || '').toLowerCase().includes(lower) || 
        (m.englishName || '').toLowerCase().includes(lower) || 
        (m.phone || '').includes(lower) || 
        (m.mokjang || '').toLowerCase().includes(lower) ||
        (m.representative || '').toLowerCase().includes(lower)
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
         const parts = m.birthday.split('-');
         if (parts.length !== 3) return false;
         return (parseInt(parts[1], 10) - 1) === currentMonth;
      });
      
      return result.sort((a, b) => {
         const getDay = (dateStr: string) => parseInt(dateStr.split('-')[2], 10);
         const dayA = getDay(a.birthday);
         const dayB = getDay(b.birthday);
         if (dayA !== dayB) return dayA - dayB;
         const nameCompare = (a.koreanName || '').localeCompare(b.koreanName || '', 'ko');
         if (nameCompare !== 0) return nameCompare;
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
        const repA = a.representative || '';
        const repB = b.representative || '';
        const repCompare = repA.localeCompare(repB, 'ko');
        
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
        comparison = (a.koreanName || '').localeCompare(b.koreanName || '', 'ko');
      } else if (sortBy === 'age') {
        comparison = calculateAge(a.birthday) - calculateAge(b.birthday);
      }

      if (comparison === 0) {
        return (a.id || '').localeCompare(b.id || '');
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [members, searchTerm, groupingType, selectedGroup, sortBy, sortDirection, selectedRegistrationYears, showActiveOnly]);

  const familyGroups = useMemo(() => {
    if (viewMode !== 'family') return [];

    const groups: Record<string, Member[]> = {};
    filteredMembers.forEach(m => {
        const key = m.representative || m.koreanName || 'Unknown';
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

        const headMember = groupMembers[0];

        return {
            id: headMember.id,
            repName: headMember.representative || headMember.koreanName,
            members: groupMembers,
            head: headMember
        };
    });

    families.sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'name' || sortBy === 'rep') {
            comparison = (a.repName || '').localeCompare(b.repName || '', 'ko');
        } else if (sortBy === 'age') {
            comparison = calculateAge(a.head.birthday) - calculateAge(b.head.birthday);
        }
        return sortDirection === 'asc' ? comparison : -comparison;
    });

    return families;
  }, [filteredMembers, viewMode, sortBy, sortDirection]);

  const paginatedItems = useMemo(() => {
    if (isPrintView) {
        return viewMode === 'family' ? familyGroups : filteredMembers;
    }

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    if (viewMode === 'family') {
        return familyGroups.slice(start, start + ITEMS_PER_PAGE);
    }
    return filteredMembers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMembers, familyGroups, currentPage, viewMode, isPrintView]);

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
        setShowActionsMenu(false);
    } else {
        alert("No members with '새가족' tags were found in the current filtered list.");
    }
  };

  const handleEditClick = (member: Member) => {
    setEditingMember(member);
    setIsDetailOpen(false);
    setIsFormOpen(true);
  };

  const handleCreateClick = () => {
    setEditingMember(null);
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
    setShowActionsMenu(false);
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
    setShowActionsMenu(false);
  };

  const handlePrint = () => {
    setShowActionsMenu(false);
    // Trigger Print View Mode
    setIsPrintView(true);
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

  // Toggle Logic for "Total Active" Sidebar Button
  const handleTotalActiveClick = () => {
    // This button now acts as a "Reset to Home" button.
    // It forces the view to 'all' and 'Active Only'.
    setGroupingType('all');
    setSelectedGroup('All');
    setViewMode('card');
    setShowActiveOnly(true);
    setShowMobileSidebar(false);
  };


  const renderSidebarSection = (title: string, type: GroupingType, icon: React.ReactNode, items: string[], statsFn: (item: string) => { count: number, families: number }) => {
    const isExpanded = expandedSections[type];
    return (
        <div className="py-2 border-b-2 border-slate-100/80 mb-2 last:border-0">
            <div 
                onClick={() => toggleSection(type)}
                className="flex items-center justify-between px-4 py-2 cursor-pointer group hover:bg-slate-50 transition-colors rounded-lg mx-2"
            >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-brand-500">
                    {icon}
                    {SIDEBAR_LABELS[type] || title}
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
                                        // Specific logic for Status items:
                                        // If clicking 'Inactive' or 'Away', turn OFF "Active Only".
                                        // If clicking 'Active', turn ON "Active Only".
                                        if (item === 'Active') setShowActiveOnly(true);
                                        else setShowActiveOnly(false);
                                    }
                                }}
                                className={`flex items-center gap-3 pl-12 pr-4 py-2 cursor-pointer transition-all duration-200 border-l-2 ${isActive ? 'border-brand-400 bg-brand-50/50 text-brand-700 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                            >
                                <span className="truncate text-sm flex-1">{item}</span>
                                {type === 'mokjang' ? (
                                    <span className={`text-xs font-medium ${isActive ? 'text-brand-600' : 'text-slate-500'}`}>
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

  const getHeaderTitle = () => {
    if (groupingType === 'birthday') return '';
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
           return `${families} Families, ${count} Members`;
      }
      const { count, families } = getSubgroupStats(filterFn);
      return `${families} Families, ${count} Members ${showActiveOnly ? '(Active)' : '(Total)'}`;
  };
  
  const renderMainContent = () => {
    if (groupingType === 'birthday') {
        return (
              <div className="flex-1 flex flex-col">
                  {/* Padded Header to match other views */}
                  <div className="px-4 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 print:hidden border-b border-slate-100">
                      <div>
                          <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-tight flex items-center gap-2">
                              Birthdays in {new Date().toLocaleString('default', { month: 'long' })}
                          </h1>
                          <p className="text-slate-500 font-medium mt-1 text-lg">
                              {paginatedItems.length} people celebrating this month
                          </p>
                      </div>

                      {/* Right Side Controls (Active Only & Sort) */}
                      <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                          {/* Active Toggle */}
                          <button 
                              onClick={() => setShowActiveOnly(!showActiveOnly)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${showActiveOnly ? 'bg-white text-emerald-600 border-emerald-100 shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-700 border-transparent'}`}
                          >
                              {showActiveOnly ? <CheckSquare className="w-4 h-4"/> : <Square className="w-4 h-4"/>}
                              {showActiveOnly ? 'Active Only' : 'Show All'}
                          </button>

                          <div className="w-px h-6 bg-slate-200 mx-1"></div>

                          {/* Sort Controls */}
                          <div className="flex items-center gap-1">
                              <select 
                                  value={sortBy} 
                                  onChange={(e) => setSortBy(e.target.value as any)}
                                  className="bg-transparent text-xs font-bold text-slate-600 py-2 pl-2 pr-1 focus:outline-none cursor-pointer hover:text-brand-600"
                              >
                                  <option value="name">Name</option>
                                  <option value="rep">Family Head</option>
                                  <option value="age">Age</option>
                              </select>
                              <button 
                                  onClick={toggleSortDirection}
                                  className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-brand-600 transition-colors"
                                  title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                              >
                                  {sortDirection === 'asc' ? <ArrowDownAZ className="w-4 h-4"/> : <ArrowUpAZ className="w-4 h-4"/>}
                              </button>
                          </div>
                      </div>
                  </div>

                  {/* Body Content */}
                  <div className="px-4 sm:px-8 py-6">
                      <div className="bg-gradient-to-r from-pink-500 via-rose-400 to-orange-400 text-white px-6 py-4 rounded-2xl shadow-lg mb-8 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div className="relative z-10 flex items-center gap-4">
                              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                    <Cake className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                    <h1 className="text-lg sm:text-xl font-extrabold leading-tight">Celebration Time!</h1>
                                    <p className="text-xs sm:text-sm opacity-90 font-medium">Let's celebrate the gift of life together!</p>
                              </div>
                          </div>
                          <div className="absolute top-0 right-0 w-64 h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                          <PartyPopper className="w-24 h-24 text-white opacity-10 absolute -right-4 -bottom-8 rotate-12" />
                      </div>
                      
                      {paginatedItems.length === 0 ? (
                          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                              <div className="bg-slate-50 p-6 rounded-full mb-4"><CalendarDays className="w-12 h-12 text-slate-300" /></div>
                              <h3 className="text-lg font-bold text-slate-600">No birthdays found</h3>
                              <p className="text-slate-400 font-medium">Try changing filters or check back next month!</p>
                          </div>
                      ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                              {(paginatedItems as Member[]).map(member => {
                                  const baseColor = getRoleBaseColor(member.position as string);
                                  const day = parseInt(member.birthday.split('-')[2], 10);
                                  const birthYear = parseInt(member.birthday.split('-')[0], 10);
                                  const currentYear = new Date().getFullYear();
                                  const turningAge = currentYear - birthYear;
                                  return (
                                      <div key={member.id} onClick={() => handleCardClick(member)} className={`group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden relative hover:-translate-y-1`}>
                                          <div className={`absolute inset-0 bg-gradient-to-br from-white via-white to-${baseColor}-50/30 opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                                          <div className="p-4 flex flex-col gap-4 relative z-10">
                                              <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-${baseColor}-50 text-${baseColor}-600 shrink-0 border border-${baseColor}-100 group-hover:scale-105 transition-transform`}>
                                                            <span className="text-[10px] font-extrabold uppercase tracking-wide opacity-70 leading-none mb-0.5">{new Date().toLocaleString('default', { month: 'short' })}</span>
                                                            <span className="text-2xl font-black leading-none">{day}</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="font-bold text-slate-800 text-lg truncate group-hover:text-brand-600 transition-colors">{member.koreanName}</h3>
                                                            <div className="flex flex-col">
                                                                <span className={`text-xs font-medium text-${baseColor}-600`}>{member.position}</span>
                                                                {member.mokjang !== 'Unassigned' && (<span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">{member.mokjang}</span>)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] text-pink-400 font-bold uppercase tracking-wide mb-0.5">Turning</span>
                                                        <span className="text-xl font-black text-slate-800 leading-none">{turningAge}</span>
                                                    </div>
                                              </div>
                                              <div className="h-px bg-slate-50 w-full" />
                                              <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate bg-white"><Smartphone className="w-3 h-3 text-slate-300 group-hover:text-${baseColor}-400" />{member.phone || '-'}</div>
                                                  {member.tags && member.tags.length > 0 && (
                                                      <div className="flex flex-wrap items-center gap-1 justify-end">
                                                          {member.tags.filter(t => t !== 'New Family' && t !== '새가족').slice(0, 1).map(tag => (<span key={tag} className="text-[9px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 group-hover:bg-white whitespace-nowrap">#{tag}</span>))}
                                                          {(member.tags?.includes('New Family') || member.tags?.includes('새가족')) && <span className="bg-amber-50 text-amber-700 text-[9px] px-1.5 py-0.5 rounded border border-amber-100 font-bold group-hover:bg-white whitespace-nowrap">새가족</span>}
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
              </div>
        );
    }
    
    // Fallback if empty
    if ((viewMode === 'card' ? filteredMembers.length : familyGroups.length) === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 print:hidden">
                <div className="bg-white p-6 rounded-full shadow-sm mb-4"><Users className="w-10 h-10 text-slate-300" /></div>
                <p className="text-lg font-medium text-slate-500">{showActiveOnly ? 'No Active members found in this group.' : 'No members found.'}</p>
                {showActiveOnly && <button onClick={() => setShowActiveOnly(false)} className="mt-2 text-brand-600 hover:underline text-sm font-bold">Try turning off "Active Only" filter</button>}
            </div>
        );
    }

    return (
        <>
            {showPersistenceWarning && (
                <div className="bg-amber-50 border-b border-amber-100 px-4 py-3 flex items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 relative z-40 print:hidden">
                    <div className="flex items-start gap-3">
                        <div className="bg-amber-100 p-1.5 rounded-full text-amber-600 shrink-0 mt-0.5 sm:mt-0">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="text-sm text-amber-900">
                            <strong className="font-bold">Data Not Synced!</strong> New data is currently saved only in this browser and may be lost on updates. 
                            <span className="block sm:inline sm:ml-1 opacity-80">Please go to Settings &gt; Cloud to connect your server.</span>
                        </div>
                    </div>
                    <button onClick={() => { setShowPersistenceWarning(false); localStorage.setItem('dismiss-sync-warn', 'true'); }} className="p-1 hover:bg-amber-100 rounded-lg text-amber-500 transition-colors"><X className="w-5 h-5" /></button>
                </div>
            )}
            
            {/* Dedicated Header for Title & Stats (Restored) */}
            <div className="px-4 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 print:hidden border-b border-slate-100">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">{getHeaderTitle()}</h1>
                    <p className="text-slate-500 font-medium mt-1 text-lg flex items-center gap-2">
                        {getHeaderStats()}
                    </p>
                </div>
                
                {/* Right Side Controls */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                    
                    {/* Active Toggle (Local Page) */}
                    <button 
                        onClick={() => setShowActiveOnly(!showActiveOnly)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${showActiveOnly ? 'bg-white text-emerald-600 border-emerald-100 shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-700 border-transparent'}`}
                    >
                        {showActiveOnly ? <CheckSquare className="w-4 h-4"/> : <Square className="w-4 h-4"/>}
                        {showActiveOnly ? 'Active Only' : 'Show All'}
                    </button>

                    <div className="w-px h-6 bg-slate-200 mx-1"></div>

                    {/* Sort Controls */}
                    <div className="flex items-center gap-1">
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-transparent text-xs font-bold text-slate-600 py-2 pl-2 pr-1 focus:outline-none cursor-pointer hover:text-brand-600"
                        >
                            <option value="name">Name</option>
                            <option value="rep">Family Head</option>
                            <option value="age">Age</option>
                        </select>
                        <button 
                            onClick={toggleSortDirection}
                            className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-brand-600 transition-colors"
                            title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                        >
                            {sortDirection === 'asc' ? <ArrowDownAZ className="w-4 h-4"/> : <ArrowUpAZ className="w-4 h-4"/>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block pb-6 border-b border-black mb-6">
                <h1 className="text-2xl font-black">{getHeaderTitle()}</h1>
                <p className="text-sm text-gray-500 mt-1">{getHeaderStats()}</p>
            </div>

            {viewMode === 'card' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 px-4 sm:px-8 pb-8 pt-4 print:grid-cols-3 print:gap-4 print:pb-0">
                    {(paginatedItems as Member[]).map(member => {
                    const avatar = getDisplayAvatar(member);
                    const baseColor = getRoleBaseColor(member.position as string);
                    return (
                        <div key={member.id} onClick={() => handleCardClick(member)} className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group flex flex-col relative overflow-hidden hover:-translate-y-1 print:break-inside-avoid print:shadow-none print:border-slate-300 print:hover:translate-y-0`}>
                            {/* Color Bar fixed inside the card so it moves with it */}
                            <div className={`h-1.5 w-full bg-${baseColor}-400 shrink-0`}></div>
                            
                            <div className="p-4 flex gap-4">
                                <div className="relative shrink-0">
                                    {avatar ? (<img src={avatar} alt={member.englishName} className="w-14 h-14 rounded-lg object-cover bg-slate-50 border border-slate-100 group-hover:scale-105 transition-transform duration-300"/>) : (<div className={`w-14 h-14 rounded-lg bg-${baseColor}-50 flex items-center justify-center text-${baseColor}-400 border border-${baseColor}-100 group-hover:bg-${baseColor}-100 transition-colors`}><User className="w-7 h-7" /></div>)}
                                    {member.relationship === 'Self' && (<div className="absolute -top-1.5 -left-1.5 bg-white p-0.5 rounded-full border border-slate-100 shadow-sm z-10" title="Head of Household"><Crown className="w-2.5 h-2.5 text-amber-500" fill="currentColor"/></div>)}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        {/* Status Dot */}
                                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${member.status === 'Active' ? 'bg-emerald-400' : member.status === 'Deceased' ? 'bg-slate-600' : 'bg-slate-300'}`} title={member.status} />
                                        <h3 className="font-bold text-slate-800 text-xl truncate">{member.koreanName}</h3>
                                        <span className="text-xs text-slate-400 font-bold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 whitespace-nowrap group-hover:bg-white group-hover:border-${baseColor}-100 transition-colors">{calculateAge(member.birthday)} · {member.gender === 'Male' ? 'M' : 'F'}</span>
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium truncate mb-2">{member.englishName}</p>
                                    <div className="flex flex-wrap items-center gap-1.5 mb-2 leading-none">
                                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold border ${getRoleStyle(member.position as string)}`}>{member.position}</span>
                                        {member.mokjang !== 'Unassigned' && (<><span className="text-xs text-slate-300">|</span><span className="text-xs font-bold text-slate-600 truncate max-w-[80px]">{member.mokjang}</span></>)}
                                        {member.tags && member.tags.length > 0 && (<><span className="text-xs text-slate-300">|</span><div className="flex gap-1">{member.tags.filter(t => t !== 'New Family' && t !== '새가족').slice(0, 2).map(tag => (<span key={tag} className="text-xs font-bold text-slate-500 bg-slate-50 px-1 rounded border border-slate-100 group-hover:bg-white whitespace-nowrap">#{tag}</span>))}</div></>)}
                                        {(member.tags?.includes('New Family') || member.tags?.includes('새가족')) && <span className="bg-amber-50 text-amber-700 text-xs px-1.5 py-0.5 rounded border border-amber-100 font-bold ml-auto group-hover:bg-white whitespace-nowrap">새가족</span>}
                                    </div>
                                    <div className="mt-auto pt-3">
                                        <a href={`tel:${member.phone}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors"><Smartphone className="w-4 h-4" />{member.phone || '-'}</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                    })}
                </div>
            )}
            {viewMode === 'family' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 px-4 sm:px-8 pb-8 pt-4 print:grid-cols-2 print:gap-4 print:pb-0">
                    {(paginatedItems as any[]).map(group => (
                        <div key={group.id} className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-200 overflow-hidden hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] hover:border-brand-300 transition-all duration-300 group flex flex-col print-break-inside-avoid print:shadow-none print:border-slate-300">
                            <div className="h-1.5 w-full bg-gradient-to-r from-brand-400 to-blue-500 opacity-80 group-hover:opacity-100 transition-opacity print:bg-slate-400 print:opacity-100"></div>
                            <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-100 flex items-center justify-between backdrop-blur-sm print:bg-slate-100">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2">
                                        <div className="p-1.5 bg-white rounded-lg shadow-sm text-brand-600 print:hidden"><UsersRound className="w-5 h-5" /></div>
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
            {totalPages > 1 && !isPrintView && (
                <div className="flex justify-center items-center gap-4 pb-20 print:hidden">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft className="w-5 h-5" /></button>
                <span className="text-sm font-bold text-slate-600">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight className="w-5 h-5" /></button>
                </div>
            )}
        </>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-white font-sans text-slate-600 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl lg:shadow-none
        ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between">
          <Logo />
          <button onClick={() => setShowMobileSidebar(false)} className="lg:hidden p-2 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 mb-4">
          <div className="relative group">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
             <input 
               type="text" 
               placeholder="Search members..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 transition-all"
             />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-6 scrollbar-hide pb-20">
             {/* Main Navigation - "All Members" / Home */}
             <div className="px-2">
                <button 
                  onClick={handleTotalActiveClick}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${groupingType === 'all' ? 'bg-brand-50 text-brand-700 font-bold shadow-sm ring-1 ring-brand-200' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}
                >
                   <div className={`p-1.5 rounded-lg ${groupingType === 'all' ? 'bg-white text-brand-600 shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                      <Users className="w-4 h-4" />
                   </div>
                   <span>All Members</span>
                   <span className="ml-auto bg-white px-2 py-0.5 rounded-md text-xs font-bold shadow-sm border border-slate-100">
                      {stats.total}
                   </span>
                </button>
             </div>

             <div className="px-2">
                <button 
                  onClick={() => { setGroupingType('birthday'); setShowMobileSidebar(false); setViewMode('card'); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${groupingType === 'birthday' ? 'bg-gradient-to-r from-orange-50 to-rose-50 text-rose-700 font-bold shadow-sm ring-1 ring-rose-200' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}
                >
                   <div className={`p-1.5 rounded-lg ${groupingType === 'birthday' ? 'bg-white text-rose-500 shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                      <Cake className="w-4 h-4" />
                   </div>
                   <span>Birthdays</span>
                   {stats.birthdaysThisMonth > 0 && (
                       <span className="ml-auto bg-rose-500 text-white px-2 py-0.5 rounded-md text-xs font-bold shadow-sm animate-pulse">
                          {stats.birthdaysThisMonth}
                       </span>
                   )}
                </button>
             </div>

             <div className="space-y-1">
                 {renderSidebarSection('Cells', 'mokjang', <Home className="w-3 h-3" />, mokjangList, (item) => getRawSubgroupStats(m => m.mokjang === item))}
                 {renderSidebarSection('Roles', 'position', <Briefcase className="w-3 h-3" />, positionList, (item) => getSubgroupStats(m => m.position === item))}
                 {renderSidebarSection('Status', 'status', <UserCheck className="w-3 h-3" />, statusList, (item) => getRawSubgroupStats(m => m.status === item))}
                 {renderSidebarSection('Tags', 'tag', <Tag className="w-3 h-3" />, tagList, (item) => getSubgroupStats(m => m.tags?.includes(item)))}
             </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white">
            <div className="grid grid-cols-2 gap-2">
               <button 
                 onClick={() => setIsSettingsOpen(true)}
                 className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors"
               >
                 <Settings className="w-4 h-4" /> Settings
               </button>
               <button 
                 onClick={handleLogout}
                 className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
               >
                 <LogOut className="w-4 h-4" /> Sign Out
               </button>
            </div>
            <div className="text-[10px] text-center text-slate-300 mt-3 font-medium">
               VGMC v2.5
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
          
          {/* Top Bar for Mobile */}
          <header className="lg:hidden h-16 border-b border-slate-100 flex items-center justify-between px-4 bg-white sticky top-0 z-30">
              <button onClick={() => setShowMobileSidebar(true)} className="p-2 -ml-2 text-slate-600">
                  <Menu className="w-6 h-6" />
              </button>
              <Logo showText={false} className="scale-75" />
              <div className="w-8"></div>
          </header>

          {/* AI Panel Overlay */}
          {showAiPanel && (
             <div className="absolute top-4 right-4 z-40 w-80 bg-white rounded-2xl shadow-2xl border border-brand-100 overflow-hidden flex flex-col animate-in slide-in-from-right-10 fade-in duration-300 ring-4 ring-brand-50/50">
                 <div className="p-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2 font-bold text-sm">
                        <Sparkles className="w-4 h-4" /> AI Assistant
                    </div>
                    <button onClick={() => setShowAiPanel(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X className="w-4 h-4"/></button>
                 </div>
                 <div className="p-4 bg-slate-50 h-64 overflow-y-auto text-sm text-slate-700 leading-relaxed scrollbar-thin scrollbar-thumb-slate-200">
                     {aiResponse ? (
                         <div className="prose prose-sm max-w-none">
                            {aiResponse.split('\n').map((line, i) => <p key={i} className="mb-2">{line}</p>)}
                         </div>
                     ) : isAiLoading ? (
                         <div className="flex flex-col items-center justify-center h-full gap-3 text-brand-600">
                             <Loader2 className="w-8 h-8 animate-spin" />
                             <span className="text-xs font-bold animate-pulse">Thinking...</span>
                         </div>
                     ) : (
                         <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                             <Sparkles className="w-8 h-8 opacity-50" />
                             <span className="text-center">Ask me anything about the members!</span>
                         </div>
                     )}
                 </div>
                 <div className="p-3 bg-white border-t border-slate-100">
                     <div className="relative">
                         <input 
                            value={aiQuery}
                            onChange={(e) => setAiQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAiAsk()}
                            placeholder="e.g. How many students?"
                            className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-300"
                         />
                         <button 
                            onClick={handleAiAsk}
                            disabled={!aiQuery.trim() || isAiLoading}
                            className="absolute right-1.5 top-1.5 p-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                         >
                             <ArrowUp className="w-3 h-3" />
                         </button>
                     </div>
                 </div>
             </div>
          )}

          {/* Floating Action Buttons */}
          <div className="absolute bottom-8 right-8 flex flex-col gap-3 z-30 print:hidden">
              <button 
                onClick={() => setShowAiPanel(!showAiPanel)}
                className="w-14 h-14 bg-white text-brand-600 rounded-full shadow-lg border border-brand-100 flex items-center justify-center hover:scale-110 transition-transform hover:shadow-xl hover:border-brand-200"
                title="AI Assistant"
              >
                  <Sparkles className="w-6 h-6" />
              </button>

              <div className="relative" ref={actionMenuRef}>
                  {showActionsMenu && (
                      <div className="absolute bottom-full right-0 mb-3 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200 flex flex-col py-1">
                          <button onClick={handleExport} className="px-4 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600 flex items-center gap-2 font-medium">
                              <Download className="w-4 h-4" /> Export JSON
                          </button>
                          <button onClick={() => { setIsImportOpen(true); setShowActionsMenu(false); }} className="px-4 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600 flex items-center gap-2 font-medium">
                              <Upload className="w-4 h-4" /> Import Data
                          </button>
                          <button onClick={handlePrint} className="px-4 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600 flex items-center gap-2 font-medium">
                              <Printer className="w-4 h-4" /> Print View
                          </button>
                          <button onClick={handleBulkEmail} className="px-4 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600 flex items-center gap-2 font-medium">
                              <Mail className="w-4 h-4" /> Email Group
                          </button>
                          {groupingType !== 'all' && (
                             <div className="border-t border-slate-100 my-1"></div>
                          )}
                          {(groupingType === 'tag' && (selectedGroup === 'New Family' || selectedGroup === '새가족')) && (
                              <button onClick={handleGraduateNewFamilies} className="px-4 py-2.5 text-left text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2 font-bold">
                                  <PartyPopper className="w-4 h-4" /> Graduate All
                              </button>
                          )}
                      </div>
                  )}
                  <button 
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="w-14 h-14 bg-white text-slate-600 rounded-full shadow-lg border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors"
                  >
                      <MoreHorizontal className="w-6 h-6" />
                  </button>
              </div>

              <button 
                onClick={handleCreateClick}
                className="w-14 h-14 bg-brand-600 text-white rounded-full shadow-lg shadow-brand-200 flex items-center justify-center hover:bg-brand-700 hover:scale-110 transition-transform"
              >
                  <Plus className="w-7 h-7" />
              </button>
          </div>

          {/* Render Main Content */}
          <div className="flex-1 overflow-y-auto bg-white/50 relative scrollbar-thin scrollbar-thumb-slate-200">
             {renderMainContent()}
          </div>
      </main>

      {/* Modals */}
      <MemberForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSubmit={handleSaveMembers}
        initialData={editingMember}
        onDelete={handleDeleteMember}
        allMembers={members}
        mokjangList={mokjangList}
        positionList={positionList}
        statusList={statusList}
        tagList={tagList}
      />
      
      <MemberDetail 
        member={viewingMember}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={handleEditClick}
        allMembers={members}
        onMemberClick={(m) => setViewingMember(m)}
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
        onUpdateMokjangs={(list) => setMokjangList(list)}
        onUpdatePositions={(list) => setPositionList(list)}
        onUpdateStatuses={(list) => setStatusList(list)}
        onUpdateTags={(list) => setTagList(list)}
        onRenameItem={handleRenameItem}
        onDeleteItem={handleDeleteItem}
        onForceSync={handleForceSync}
      />
      
      {/* Cloud Sync Indicator */}
      {isSyncing && (
          <div className="fixed bottom-4 left-4 z-50 bg-white/90 backdrop-blur border border-brand-100 shadow-xl px-4 py-2 rounded-full flex items-center gap-3 text-xs font-bold text-brand-700 animate-in slide-in-from-bottom-5">
              <Loader2 className="w-4 h-4 animate-spin" />
              Syncing...
          </div>
      )}
      {syncError && !isSyncing && (
          <div className="fixed bottom-4 left-4 z-50 bg-red-50 border border-red-100 shadow-xl px-4 py-2 rounded-full flex items-center gap-3 text-xs font-bold text-red-600 animate-in slide-in-from-bottom-5">
              <CloudOff className="w-4 h-4" />
              Sync Failed
          </div>
      )}
    </div>
  );
}
