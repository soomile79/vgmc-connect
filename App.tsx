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
  ChevronDown,
  UserCheck,
  X,
  MapPin,
  Square,
  ArrowDownAZ,
  ArrowUpAZ,
  ListFilter,
  Crown,
  ArrowRight,
  UserPlus
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

// --- HARDCODED DEFAULTS AS REQUESTED ---
const AUTO_SERVER_URL = 'https://vgmc.ca/api.php';
const AUTO_API_SECRET = 'vgmc.org';

// Helper for generating IDs safely
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Safe JSON parser hook
const useSafeLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch (e) {
      console.warn(`Failed to parse localStorage key "${key}". Falling back to default.`);
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
};

export function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('church-auth') === 'true';
  });

  const [members, setMembers] = useSafeLocalStorage<Member[]>('church-members', INITIAL_MEMBERS);

  // Global Filter State
  const [showActiveOnly, setShowActiveOnly] = useState<boolean>(true);

  // Cloud Sync State
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('church-server-url') || AUTO_SERVER_URL);
  const [apiSecret, setApiSecret] = useState(() => localStorage.getItem('church-api-secret') || AUTO_API_SECRET);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  
  // Persist last sync time so it survives refresh
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
      const saved = localStorage.getItem('church-last-sync');
      return saved ? new Date(saved) : null;
  });

  // Save last sync time whenever it updates
  useEffect(() => {
      if (lastSyncTime) {
          localStorage.setItem('church-last-sync', lastSyncTime.toISOString());
      }
  }, [lastSyncTime]);
  
  // Data Persistence Warning State
  const [showPersistenceWarning, setShowPersistenceWarning] = useState(false);

  const [mokjangList, setMokjangList] = useSafeLocalStorage<string[]>('church-mokjangs', MOKJANG_LIST);
  const [positionList, setPositionList] = useSafeLocalStorage<string[]>('church-positions', Object.values(Position));
  const [statusList, setStatusList] = useSafeLocalStorage<string[]>('church-statuses', ['Active', 'Inactive', 'Away', 'Deceased']);
  const [tagList, setTagList] = useSafeLocalStorage<string[]>('church-tags', ['새가족', '세례']);

  // UI State
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false); // New state for header menu
  const [isPrintView, setIsPrintView] = useState(false);
  
  // Refs
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null); // New ref for header menu

  // --- Click Outside Handler for Actions Menu ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setShowHeaderMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --- FORCE AUTO CONFIGURATION ON LOAD/LOGIN ---
  useEffect(() => {
      if (isLoggedIn) {
          localStorage.setItem('church-server-url', AUTO_SERVER_URL);
          localStorage.setItem('church-api-secret', AUTO_API_SECRET);
          setServerUrl(AUTO_SERVER_URL);
          setApiSecret(AUTO_API_SECRET);
      }
  }, [isLoggedIn]);

  // --- Check for Data Risk ---
  useEffect(() => {
    if (!serverUrl && members.length > 0 && !localStorage.getItem('dismiss-sync-warn')) {
        setShowPersistenceWarning(true);
    } else {
        setShowPersistenceWarning(false);
    }
  }, [serverUrl, members.length]);

  const [searchTerm, setSearchTerm] = useState('');
  
  // Default State
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [groupingType, setGroupingType] = useState<GroupingType | 'registration'>('all');
  
  // Sidebar State - All collapsed by default
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'mokjang': false,
    'position': false,
    'status': false,
    'tag': false,
    'registration': false
  });

  // View Mode State
  const [viewMode, setViewMode] = useState<'card' | 'family'>('card');

  // Sorting State
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

  // Handle ESC key for AI Panel
  useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => {
          if (e.key === 'Escape' && showAiPanel) {
              setShowAiPanel(false);
          }
      };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
  }, [showAiPanel]);

  // Cloud Sync Functions
  const fetchFromCloud = async () => {
    if (!serverUrl) return;
    setIsSyncing(true);
    setSyncError('');
    try {
        const separator = serverUrl.includes('?') ? '&' : '?';
        const url = `${serverUrl}${separator}t=${new Date().getTime()}`;

        const response = await fetch(url, {
            method: 'GET',
            referrerPolicy: 'no-referrer',
            cache: 'no-store',
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
                 id: m.id || generateId(),
                 tags: Array.isArray(m.tags) ? m.tags : []
             }));
             setMembers(sanitizedData);
             setLastSyncTime(new Date());
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
        const separator = serverUrl.includes('?') ? '&' : '?';
        const url = `${serverUrl}${separator}t=${new Date().getTime()}`;

        const response = await fetch(url, {
            method: 'POST',
            referrerPolicy: 'no-referrer',
            cache: 'no-store',
            headers: {
                'Content-Type': 'text/plain', // Prevents preflight in some cases
                'X-Api-Secret': apiSecret
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
  }, [searchTerm, groupingType, selectedGroup, sortBy, sortDirection, viewMode, showActiveOnly]);

  const stats = useMemo(() => {
    const uniqueFamilies = new Set(members.map(m => m.representative)).size;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // For Sidebar List
    const recentYears = [currentYear, currentYear - 1, currentYear - 2];

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
      recentYears,
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
    if (!dob) return '';
    const birthDate = new Date(dob);
    const ageDifMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDifMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    return age;
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
    } else if (groupingType === 'registration') {
      // Filter by Registration Year
      const targetYear = parseInt(selectedGroup, 10);
      result = result.filter(m => {
          if (!m.registrationDate) return false;
          return new Date(m.registrationDate).getFullYear() === targetYear;
      });
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
             const ageA = calculateAge(a.birthday) || 0;
             const ageB = calculateAge(b.birthday) || 0;
             comparison = (ageB as number) - (ageA as number);
          }
        }
      } else if (sortBy === 'name') {
        comparison = (a.koreanName || '').localeCompare(b.koreanName || '', 'ko');
      } else if (sortBy === 'age') {
        const ageA = calculateAge(a.birthday) || 0;
        const ageB = calculateAge(b.birthday) || 0;
        comparison = (ageA as number) - (ageB as number);
      }

      if (comparison === 0) {
        return (a.id || '').localeCompare(b.id || '');
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [members, searchTerm, groupingType, selectedGroup, sortBy, sortDirection, showActiveOnly]);

  const familyGroups = useMemo(() => {
    if (viewMode !== 'family') return [];

    const groups: Record<string, Member[]> = {};
    filteredMembers.forEach(m => {
        const rep = m.representative?.trim();
        const name = m.koreanName?.trim();
        const key = (rep && rep.length > 0) ? rep : (name && name.length > 0) ? name : 'Unknown';
        
        if (!groups[key]) groups[key] = [];
        groups[key].push(m);
    });

    const families = Object.values(groups).map(groupMembers => {
        if (!groupMembers || groupMembers.length === 0) return null;

        groupMembers.sort((a, b) => {
            const getRank = (m: Member) => {
                if (m.relationship === 'Self') return 0;
                if (m.relationship === 'Spouse') return 1;
                return 2;
            };
            const rankA = getRank(a);
            const rankB = getRank(b);
            if (rankA !== rankB) return rankA - rankB;
            const ageA = calculateAge(a.birthday) || 0;
            const ageB = calculateAge(b.birthday) || 0;
            return (ageB as number) - (ageA as number);
        });

        const headMember = groupMembers[0];

        return {
            id: headMember.id,
            repName: headMember.representative || headMember.koreanName,
            members: groupMembers,
            head: headMember
        };
    }).filter(f => f !== null) as { id: string; repName: string; members: Member[]; head: Member }[];

    families.sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'name' || sortBy === 'rep') {
            comparison = (a.repName || '').localeCompare(b.repName || '', 'ko');
        } else if (sortBy === 'age') {
            const ageA = calculateAge(a.head.birthday) || 0;
            const ageB = calculateAge(b.head.birthday) || 0;
            comparison = (ageA as number) - (ageB as number);
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
    
    // --- Update Global Tag List with New Tags ---
    const incomingTags = new Set<string>();
    membersToSave.forEach(m => {
        m.tags?.forEach(t => incomingTags.add(t));
    });

    const updatedTagList = [...tagList];
    let hasNewTags = false;
    incomingTags.forEach(tag => {
        if (!updatedTagList.includes(tag)) {
            updatedTagList.push(tag);
            hasNewTags = true;
        }
    });

    if (hasNewTags) {
        setTagList(updatedTagList);
    }
    // --------------------------------------------

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
    // 1. Filter logic from filteredMembers is available in scope.
    // We want to operate on filteredMembers logic but update the main `members` state.
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
        setMembers(updatedMembers); 
        if (serverUrl) saveToCloud(updatedMembers);
        setTimeout(() => {
            alert(`Success! Removed '새가족' tag from ${modifiedCount} members.`);
        }, 50);
        setShowActionsMenu(false);
        setShowHeaderMenu(false);
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
    // --- Update Global Tag List with Imported Tags ---
    const incomingTags = new Set<string>();
    newMembers.forEach(m => m.tags?.forEach(t => incomingTags.add(t)));

    const updatedTagList = [...tagList];
    let hasNewTags = false;
    incomingTags.forEach(tag => {
        if (!updatedTagList.includes(tag)) {
            updatedTagList.push(tag);
            hasNewTags = true;
        }
    });

    if (hasNewTags) {
        setTagList(updatedTagList);
    }
    // --------------------------------------------

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
    setShowHeaderMenu(false);
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
    setShowHeaderMenu(false);
  };

  const handlePrint = () => {
    setShowActionsMenu(false);
    setShowHeaderMenu(false);
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


  const renderSidebarSection = (title: string, type: GroupingType | 'registration', icon: React.ReactNode, items: string[], statsFn: (item: string) => { count: number, families: number }) => {
    const isExpanded = expandedSections[type];
    const displayTitle = type === 'registration' ? '최신 등록교인' : (SIDEBAR_LABELS[type as GroupingType] || title);
    
    return (
        <div className="py-2 border-b-2 border-slate-100/80 mb-2 last:border-0">
            <div 
                onClick={() => toggleSection(type)}
                className="flex items-center justify-between px-4 py-2 cursor-pointer group hover:bg-slate-50 transition-colors rounded-lg mx-2"
            >
                {/* CHANGED FROM text-xs to text-sm */}
                <div className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-wider group-hover:text-brand-500">
                    {icon}
                    {displayTitle}
                </div>
                {isExpanded ? <ChevronDown className="w-3 h-3 text-slate-400"/> : <ChevronRight className="w-3 h-3 text-slate-400"/>}
            </div>
            
            {isExpanded && (
                <div className="space-y-1 mt-1 animate-in slide-in-from-top-2 duration-200">
                    {items.map(item => {
                        const { count, families } = statsFn(item);
                        const isActive = groupingType === type && selectedGroup === String(item);
                        return (
                            <div 
                                key={item}
                                onClick={() => { 
                                    setGroupingType(type as any); 
                                    setSelectedGroup(String(item)); 
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
                                    if (type === 'registration') {
                                        // When viewing old registration years, likely want to see everyone including inactive
                                        setShowActiveOnly(false); 
                                    }
                                }}
                                className={`flex items-center gap-3 pl-12 pr-4 py-2 cursor-pointer transition-all duration-200 border-l-2 ${isActive ? 'border-brand-400 bg-brand-50/50 text-brand-700 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                            >
                                <span className="truncate text-sm flex-1">{item}</span>
                                {type === 'mokjang' || type === 'registration' ? (
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
    if (groupingType === 'registration') return `${selectedGroup} New Members`;
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
      else if (groupingType === 'registration') {
          const targetYear = parseInt(selectedGroup, 10);
          filterFn = m => !!m.registrationDate && new Date(m.registrationDate).getFullYear() === targetYear;
      }

      if (groupingType === 'status' || groupingType === 'registration') {
          const { count, families } = getRawSubgroupStats(filterFn);
           return `${families} Families, ${count} Members`;
      }
      const { count, families } = getSubgroupStats(filterFn);
      return `${families} Families, ${count} Members ${showActiveOnly ? '(Active)' : '(Total)'}`;
  };

  const renderMainContent = () => {
    // 1. Birthday View (Special Layout)
    if (groupingType === 'birthday') {
        return (
              <div className="flex-1 flex flex-col pb-32">
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
    
    // 2. Standard Views (Grid/Family)
    return (
        <div className="pb-32">
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
            
            {/* Standard Header for Title & Controls */}
            <div className="px-4 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 print:hidden border-b border-slate-100">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">{getHeaderTitle()}</h1>
                    <p className="text-slate-500 font-medium mt-1 text-lg flex items-center gap-2">
                        {getHeaderStats()}
                    </p>
                </div>
                
                {/* Right Side Controls */}
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

                    {/* View Mode Toggle */}
                    <div className="flex bg-slate-200/50 p-1 rounded-xl">
                        <button 
                            onClick={() => setViewMode('card')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'card' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Card View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setViewMode('family')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'family' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Family View"
                        >
                            <UsersRound className="w-4 h-4" />
                        </button>
                    </div>

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

                    <div className="w-px h-6 bg-slate-200 mx-1"></div>

                    {/* More Actions Dropdown (Desktop & Mobile accessible) */}
                    <div className="relative" ref={headerMenuRef}>
                        <button
                            onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                            className={`p-2 rounded-xl transition-colors ${showHeaderMenu ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-white'}`}
                            title="More Actions"
                        >
                            <MoreHorizontal className="w-5 h-5" />
                        </button>

                        {showHeaderMenu && (
                            <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                                <button onClick={handlePrint} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 text-left">
                                    <Printer className="w-4 h-4" /> Print View
                                </button>
                                <button onClick={handleBulkEmail} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 text-left">
                                    <Mail className="w-4 h-4" /> Email Group
                                </button>
                                <button onClick={handleGraduateNewFamilies} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-amber-700 hover:bg-amber-50 text-left border-t border-slate-100">
                                    <UserCheck className="w-4 h-4" /> Graduate 'New Family'
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block pb-6 border-b border-black mb-6">
                <h1 className="text-2xl font-black">{getHeaderTitle()}</h1>
                <p className="text-sm text-gray-500 mt-1">{getHeaderStats()}</p>
            </div>

            {/* Empty State or Grid */}
            {/* If Print View is Active, Show Simplified Layout */}
            {isPrintView ? (
                <div className="hidden print:grid grid-cols-4 gap-4">
                    {paginatedItems.map((item) => {
                         // Type guard for Member vs FamilyGroup
                         const m = 'members' in item ? (item as any).head : (item as Member);
                         return (
                            <div key={m.id} className="border border-gray-300 p-2 text-sm break-inside-avoid rounded">
                                <div className="font-bold text-base">{m.koreanName} <span className="text-xs font-normal text-gray-500">{m.englishName}</span></div>
                                <div className="text-xs text-gray-600">{m.position} &middot; {m.gender === 'Male' ? 'M' : 'F'}/{calculateAge(m.birthday)}</div>
                                <div className="text-xs mt-1">{m.phone}</div>
                            </div>
                         );
                    })}
                </div>
            ) : (
                /* Normal Card View */
                (viewMode === 'card' ? filteredMembers.length : familyGroups.length) === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 print:hidden">
                        <div className="bg-white p-6 rounded-full shadow-sm mb-4"><Users className="w-10 h-10 text-slate-300" /></div>
                        <p className="text-lg font-medium text-slate-500">{showActiveOnly ? 'No Active members found in this group.' : 'No members found.'}</p>
                        {showActiveOnly && <button onClick={() => setShowActiveOnly(false)} className="mt-2 text-brand-600 hover:underline text-sm font-bold">Try turning off "Active Only" filter</button>}
                    </div>
                ) : (
                    <>
                    {viewMode === 'card' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 px-4 sm:px-8 pb-8 pt-4 print:hidden">
                            {(paginatedItems as Member[]).map(member => {
                            const avatar = getDisplayAvatar(member);
                            const baseColor = getRoleBaseColor(member.position as string);
                            const age = calculateAge(member.birthday);
                            return (
                                <div key={member.id} onClick={() => handleCardClick(member)} className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group flex flex-col relative overflow-hidden hover:-translate-y-1`}>
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
                                                <span className="text-xs text-slate-400 font-bold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 whitespace-nowrap group-hover:bg-white group-hover:border-${baseColor}-100 transition-colors">
                                                    {age ? `${age} · ` : ''}{member.gender === 'Male' ? 'M' : 'F'}
                                                </span>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 px-4 sm:px-8 pb-8 pt-4 print:hidden">
                            {(paginatedItems as any[]).map(group => (
                                <div key={group.id} className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-200 overflow-hidden hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] hover:border-brand-300 transition-all duration-300 group flex flex-col">
                                    <div className="h-1.5 w-full bg-gradient-to-r from-brand-400 to-blue-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-100 flex items-center justify-between backdrop-blur-sm">
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2">
                                                <div className="p-1.5 bg-white rounded-lg shadow-sm text-brand-600"><UsersRound className="w-5 h-5" /></div>
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
                                            const age = calculateAge(m.birthday);
                                            return (
                                            <div key={m.id} onClick={() => handleCardClick(m)} className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-slate-100 hover:bg-slate-50 cursor-pointer transition-all group/item">
                                                <div className="relative">
                                                    {avatar ? <img src={avatar} alt={m.englishName} className="w-12 h-12 rounded-full object-cover border border-slate-100 bg-slate-100"/> : <div className={`w-12 h-12 rounded-full bg-${baseColor}-50 flex items-center justify-center text-${baseColor}-300`}><User className="w-6 h-6" /></div>}
                                                    {m.relationship === 'Self' && <div className="absolute -top-1 -right-1 bg-white text-amber-500 rounded-full p-0.5 border border-slate-100 shadow-sm z-10" title="Head of Household"><Crown className="w-3 h-3" fill="currentColor" /></div>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-bold text-base truncate ${m.relationship === 'Self' ? 'text-slate-800' : 'text-slate-600'}`}>{m.koreanName}</span>
                                                            {(m.tags?.includes('New Family') || m.tags?.includes('새가족')) && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-bold">새가족</span>}
                                                        </div>
                                                        {m.status === 'Active' ? <div className="w-2 h-2 rounded-full bg-emerald-400"></div> : <div className="w-2 h-2 rounded-full bg-slate-300"></div>}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className={`font-medium ${m.relationship === 'Self' ? 'text-brand-600' : 'text-slate-400'}`}>{m.relationship === 'Self' ? 'Head' : m.relationship}</span>
                                                        <span className="text-slate-300">|</span>
                                                        <span className="text-slate-400">{age ? `${age} yrs` : ''}</span>
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
                    </>
                )
            )}
            
            {totalPages > 1 && !isPrintView && (viewMode === 'card' ? filteredMembers.length : familyGroups.length) > 0 && (
                <div className="flex justify-center items-center gap-4 pb-12 print:hidden">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft className="w-5 h-5" /></button>
                <span className="text-sm font-bold text-slate-600">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight className="w-5 h-5" /></button>
                </div>
            )}
        </div>
    );
  };
  
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  const activeStats = getRawSubgroupStats(m => m.status === 'Active');

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden selection:bg-brand-100 selection:text-brand-900">
      
      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:transform-none flex flex-col ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'} print:hidden`}>
        {/* Logo Area */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div onClick={handleTotalActiveClick} className="cursor-pointer">
            <Logo />
          </div>
          <button onClick={() => setShowMobileSidebar(false)} className="lg:hidden p-2 text-slate-400 hover:bg-slate-50 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
           
           {/* Primary Actions */}
           <div className="grid grid-cols-1 gap-2 px-2">
              <button 
                onClick={handleCreateClick}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white p-3 rounded-xl font-bold shadow-lg shadow-brand-200 transition-all hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" /> New Member
              </button>
           </div>

           {/* Navigation Links */}
           <div className="space-y-1">
                {/* Enhanced Active Members Button */}
                <div onClick={handleTotalActiveClick} className={`mx-2 mb-2 flex flex-col gap-1 px-4 py-3 rounded-xl cursor-pointer transition-all border ${groupingType === 'all' && showActiveOnly ? 'bg-brand-50 border-brand-200 shadow-sm' : 'bg-white border-slate-200 hover:border-brand-300 hover:shadow-md'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${groupingType === 'all' && showActiveOnly ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500'}`}>
                            <Users className="w-5 h-5" />
                        </div>
                        <span className={`text-sm font-bold ${groupingType === 'all' && showActiveOnly ? 'text-brand-700' : 'text-slate-700'}`}>Active Members</span>
                    </div>
                    <div className="pl-11 text-xs text-slate-500 font-medium flex gap-2">
                         <span>{activeStats.families} Families</span>
                         <span className="text-slate-300">|</span>
                         <span>{activeStats.count} People</span>
                    </div>
                </div>
                
                <div 
                    onClick={() => { setGroupingType('birthday'); setShowMobileSidebar(false); setShowActiveOnly(true); }} 
                    className={`mx-2 flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-colors ${groupingType === 'birthday' ? 'bg-orange-50 text-orange-700 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                    <Cake className="w-4 h-4" />
                    <span className="text-sm">Birthdays <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full ml-auto">{stats.birthdaysThisMonth}</span></span>
                </div>

                <div className="pt-2">
                    {/* Updated Order: Mokjang, Position, Tag, Status, Latest Registration */}
                    {renderSidebarSection('Mokjang', 'mokjang', <Home className="w-3 h-3" />, mokjangList, (item) => getSubgroupStats(m => m.mokjang === item))}
                    {renderSidebarSection('Positions', 'position', <Briefcase className="w-3 h-3" />, positionList, (item) => getSubgroupStats(m => m.position === item))}
                    {renderSidebarSection('Tags', 'tag', <Tag className="w-3 h-3" />, tagList, (item) => getSubgroupStats(m => m.tags?.includes(item) || false))}
                    {renderSidebarSection('Status', 'status', <UserCheck className="w-3 h-3" />, statusList, (item) => getRawSubgroupStats(m => m.status === item))}
                    {/* New Group: Registration Years */}
                    {renderSidebarSection('Latest Registered', 'registration', <UserPlus className="w-3 h-3" />, stats.recentYears.map(String), (year) => getRawSubgroupStats(m => !!m.registrationDate && new Date(m.registrationDate).getFullYear() === parseInt(year, 10)))}
                </div>
           </div>
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
             
             {/* Last Sync Indicator */}
             {lastSyncTime && (
                 <div className="mb-3 flex items-center justify-between px-1 animate-in slide-in-from-bottom-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
                        {isSyncing ? 'Syncing...' : 'Last Sync'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm font-mono">
                        {lastSyncTime.toLocaleString([], {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                    </span>
                 </div>
             )}

             <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => { setIsSettingsOpen(true); setShowActionsMenu(false); }} className="col-span-2 p-2 flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-lg text-slate-600 text-xs font-bold hover:bg-slate-100 hover:text-slate-800 transition-colors">
                     <Settings className="w-3.5 h-3.5" /> Settings
                 </button>
                 <button onClick={handleLogout} className="col-span-2 p-2 flex items-center justify-center gap-2 bg-slate-200 border border-transparent rounded-lg text-slate-600 text-xs font-bold hover:bg-slate-300 hover:text-slate-800 transition-colors">
                     <LogOut className="w-3.5 h-3.5" /> Sign Out
                 </button>
             </div>
             
             <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                 <span>v2.4.1</span>
                 {serverUrl && (
                     <span className={`flex items-center gap-1 ${isSyncing ? 'text-blue-500 animate-pulse' : syncError ? 'text-red-500' : 'text-emerald-500'}`}>
                         <Cloud className="w-3 h-3" />
                         {isSyncing ? 'Syncing...' : syncError ? 'Sync Error' : 'Synced'}
                     </span>
                 )}
             </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative print:overflow-visible print:h-auto">
          
          {/* TOP STICKY HEADER (Mobile & Desktop) */}
          <header className="bg-white border-b border-slate-200 p-4 z-20 shrink-0 sticky top-0 flex flex-col gap-3 print:hidden">
               
               {/* Header Row: Mobile Menu + Search (Combined to remove duplicate title) */}
               <div className="flex items-center gap-3">
                   <button onClick={() => setShowMobileSidebar(true)} className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-lg shrink-0">
                       <Menu className="w-6 h-6" />
                   </button>
                   <div className="lg:hidden shrink-0">
                       <Logo showText={false} className="scale-75 origin-left" />
                   </div>
                   
                   {/* Persistent Search Bar (Reduced Width: max-w-md) */}
                   <div className="flex-1 relative group max-w-sm">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search members..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                   </div>

                   {/* AI Assistant Button Only */}
                   <button 
                        onClick={() => setShowAiPanel(true)}
                        className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-200 shadow-sm shrink-0 flex items-center justify-center w-10 h-10"
                        title="AI Assistant"
                    >
                        <Sparkles className="w-5 h-5" />
                    </button>
               </div>
          </header>

          {/* AI Panel Modal */}
          {showAiPanel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-slate-900/5">
                        <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2 font-bold">
                                <Sparkles className="w-5 h-5 text-yellow-300" />
                                AI Assistant
                            </div>
                            <button onClick={() => setShowAiPanel(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 bg-slate-50 min-h-[200px] max-h-[60vh] overflow-y-auto">
                            {aiResponse ? (
                                <div className="prose prose-sm text-slate-700">
                                    <p className="whitespace-pre-wrap">{aiResponse}</p>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 py-8">
                                    <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>Ask me anything about the church members!</p>
                                    <p className="text-xs mt-2">"How many active members?"<br/>"List all elders."</p>
                                </div>
                            )}
                            {isAiLoading && (
                                <div className="flex items-center justify-center py-8 text-indigo-600">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
                            <input 
                                value={aiQuery}
                                onChange={e => setAiQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAiAsk()}
                                placeholder="Ask a question..."
                                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                autoFocus
                            />
                            <button 
                                onClick={handleAiAsk}
                                disabled={!aiQuery.trim() || isAiLoading}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:opacity-50 transition-colors"
                            >
                                Ask
                            </button>
                        </div>
                    </div>
                </div>
            )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto scroll-smooth print:overflow-visible print:h-auto">
             {renderMainContent()}
          </div>
          
      </main>

      {/* Modals */}
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
        member={viewingMember}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
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
        onForceSync={serverUrl ? handleForceSync : undefined}
        lastSyncTime={lastSyncTime}
        onImportClick={() => setIsImportOpen(true)}
        onExportClick={handleExport}
      />

    </div>
  );
}
