import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, 
  Trash2, 
  Settings, 
  LayoutGrid,
  Info,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Check,
  X,
  Users,
  Shield,
  Mail,
  User,
  Clock
} from 'lucide-react';

type ParentList = {
  id: string;
  type: string;
  name: string;
  order: number;
};

type ChildList = {
  id: string;
  parent_id: string;
  name: string;
  order: number;
  bg_color?: string;
  text_color?: string;
};

type Profile = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
  created_at: string;
};

type SettingsPageProps = {
  parentLists: ParentList[];
  childLists: ChildList[];
  onUpdate: () => void;
};

export default function SettingsPage({
  parentLists,
  childLists,
  onUpdate,
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<'system' | 'users'>('system');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'viewer'>('user');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileEmail, setEditProfileEmail] = useState('');

  useEffect(() => {
    if (activeTab === 'users') {
      fetchProfiles();
    }
  }, [activeTab]);

  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setProfiles(data);
      }
    } catch (err) {
      console.error("Error fetching profiles:", err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleUpdateRole = async (profileId: string, newRole: 'admin' | 'user' | 'viewer') => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', profileId);
    if (error) {
      alert(error.message);
    } else {
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRole } : p));
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('정말 이 사용자를 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', profileId);
    if (error) {
      alert(error.message);
    } else {
      setProfiles(prev => prev.filter(p => p.id !== profileId));
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail.trim() || !newUserName.trim()) {
      alert('이메일과 이름을 모두 입력해주세요.');
      return;
    }
    
    const newId = crypto.randomUUID();
    const newProfile: Profile = {
      id: newId,
      email: newUserEmail.trim(),
      name: newUserName.trim(),
      role: newUserRole as any,
      created_at: new Date().toISOString()
    };

    // 1. Update local state first (Optimistic UI)
    setProfiles(prev => [newProfile, ...prev]);
    setIsAddingUser(false);
    setNewUserEmail('');
    setNewUserName('');

    // 2. Insert into DB
    const { error } = await supabase.from('profiles').insert(newProfile);

    if (error) {
      alert("Error adding user to database: " + error.message);
      // Rollback if failed
      setProfiles(prev => prev.filter(p => p.id !== newId));
    } else {
      // 3. Re-fetch to ensure we have the latest data from server
      await fetchProfiles();
    }
  };

  const handleUpdateProfile = async (profileId: string) => {
    if (!editProfileName.trim() || !editProfileEmail.trim()) return;
    
    const { error } = await supabase.from('profiles').update({
      name: editProfileName.trim(),
      email: editProfileEmail.trim()
    }).eq('id', profileId);

    if (error) {
      alert(error.message);
    } else {
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, name: editProfileName.trim(), email: editProfileEmail.trim() } : p));
      setEditingProfileId(null);
    }
  };
  const [isAddingParent, setIsAddingParent] = useState(false);
  const [newParentName, setNewParentName] = useState('');
  const [newParentType, setNewParentType] = useState('');
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});
  
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [editParentName, setEditParentName] = useState('');
  const [editParentType, setEditParentType] = useState('');
  
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editChildName, setEditChildName] = useState('');

  const [draggedItem, setDraggedItem] = useState<{ id: string; type: 'parent' | 'child'; parentId?: string } | null>(null);

  const primaryColor = '#3c8fb5';

  const toggleParent = (parentId: string) => {
    setExpandedParents(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  // Parent 추가
  const handleAddParent = async () => {
    if (!newParentName.trim() || !newParentType.trim()) {
      alert('이름과 타입을 모두 입력해주세요.');
      return;
    }
    const maxOrder = Math.max(...parentLists.map((p) => p.order), 0);
    const { error } = await supabase.from('parent_lists').insert({
      type: newParentType.trim().toLowerCase(),
      name: newParentName.trim(),
      order: maxOrder + 1,
    });
    if (error) { alert(error.message); return; }
    setNewParentName('');
    setNewParentType('');
    setIsAddingParent(false);
    onUpdate();
  };

  // Parent 수정
  const handleUpdateParent = async (id: string) => {
    if (!editParentName.trim() || !editParentType.trim()) return;
    const { error } = await supabase.from('parent_lists').update({ 
      name: editParentName.trim(),
      type: editParentType.trim().toLowerCase()
    }).eq('id', id);
    if (error) alert(error.message);
    setEditingParentId(null);
    onUpdate();
  };

  // Child 수정
  const handleUpdateChild = async (id: string) => {
    if (!editChildName.trim()) return;
    const { error } = await supabase.from('child_lists').update({ name: editChildName.trim() }).eq('id', id);
    if (error) alert(error.message);
    setEditingChildId(null);
    onUpdate();
  };

  // Drag & Drop 순서 변경
  const handleDragStart = (id: string, type: 'parent' | 'child', parentId?: string) => {
    setDraggedItem({ id, type, parentId });
  };

  const handleDrop = async (targetId: string, type: 'parent' | 'child') => {
    if (!draggedItem || draggedItem.type !== type) return;
    if (draggedItem.id === targetId) return;

    if (type === 'parent') {
      const draggedIdx = parentLists.findIndex(p => p.id === draggedItem.id);
      const targetIdx = parentLists.findIndex(p => p.id === targetId);
      await supabase.from('parent_lists').update({ order: parentLists[targetIdx].order }).eq('id', draggedItem.id);
      await supabase.from('parent_lists').update({ order: parentLists[draggedIdx].order }).eq('id', targetId);
    } else {
      if (draggedItem.parentId !== childLists.find(c => c.id === targetId)?.parent_id) return;
      const draggedIdx = childLists.findIndex(c => c.id === draggedItem.id);
      const targetIdx = childLists.findIndex(c => c.id === targetId);
      await supabase.from('child_lists').update({ order: childLists[targetIdx].order }).eq('id', draggedItem.id);
      await supabase.from('child_lists').update({ order: childLists[draggedIdx].order }).eq('id', targetId);
    }
    setDraggedItem(null);
    onUpdate();
  };

  const handleDeleteChild = async (childId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      // 1. Find the child list item to get its name and parent type
      const childToDelete = childLists.find(c => c.id === childId);
      if (!childToDelete) return;

      const parent = parentLists.find(p => p.id === childToDelete.parent_id);
      const isTag = parent?.type === 'tags' || parent?.name.toLowerCase().includes('태그');
      
      if (isTag) {
        // 2. If it's a tag, we need to remove it from all members' tags array
        // Use a more robust approach to fetch and update
        const { data: allMembers, error: fetchError } = await supabase
          .from('members')
          .select('id, tags');
          
        if (fetchError) throw fetchError;

        if (allMembers) {
          const updatePromises = allMembers
            .filter(m => Array.isArray(m.tags) && m.tags.includes(childToDelete.name))
            .map(m => {
              const updatedTags = m.tags.filter((t: string) => t !== childToDelete.name);
              return supabase.from('members').update({ tags: updatedTags }).eq('id', m.id);
            });
          
          if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
          }
        }
      }

      // 3. Delete from child_lists
      const { error: deleteError } = await supabase.from('child_lists').delete().eq('id', childId);
      if (deleteError) throw deleteError;
      if (isTag) { window.dispatchEvent( new CustomEvent('tagDeleted', { detail: { name: childToDelete.name } }) ); }

      onUpdate();
    } catch (err: any) {
      console.error("Error during deletion:", err);
      alert('삭제 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const handleDeleteParent = async (parentId: string) => {
    if (!confirm('정말 삭제하시겠습니까? 하위 항목도 모두 삭제됩니다.')) return;
    await supabase.from('child_lists').delete().eq('parent_id', parentId);
    const { error } = await supabase.from('parent_lists').delete().eq('id', parentId);
    if (error) { alert(error.message); return; }
    onUpdate();
  };

  if (parentLists.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto mb-3"></div>
          <p className="text-sm font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-modal-in space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div style={{ backgroundColor: primaryColor }} className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Settings</h1>
            <p className="text-sm text-slate-500 font-medium">Manage system categories and user permissions</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1.5 bg-slate-100 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'system' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <LayoutGrid className="w-4 h-4" /> System Lists
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Users className="w-4 h-4" /> User Group
          </button>
        </div>
      </div>

      {activeTab === 'system' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Info className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-black text-slate-800">Category Management</h3>
                <p className="text-xs text-slate-500 font-medium">Double-click items to edit names or internal types</p>
              </div>
            </div>
            <button 
              onClick={() => setIsAddingParent(true)} 
              style={{ backgroundColor: primaryColor }}
              className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl hover:opacity-90 transition-all shadow-md font-bold text-sm"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>

      {/* Add Parent Form */}
      {isAddingParent && (
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-slate-700 font-black text-sm">
            <Info className="w-4 h-4" /> New Category
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Internal Type</label>
              <input type="text" value={newParentType} onChange={(e) => setNewParentType(e.target.value)} placeholder="e.g., cell" className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-400 text-sm bg-white" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Display Name</label>
              <input type="text" value={newParentName} onChange={(e) => setNewParentName(e.target.value)} placeholder="e.g., 목장" className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-400 text-sm bg-white" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAddParent} style={{ backgroundColor: primaryColor }} className="flex-1 py-2 text-white rounded-lg text-sm font-black shadow-sm">Save</button>
            <button onClick={() => setIsAddingParent(false)} className="flex-1 py-2 bg-white text-slate-500 rounded-lg text-sm font-black border border-slate-200 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

          {/* Dynamic List Management */}
          <div className="space-y-3">
            {parentLists.map((parent) => {
              const isExpanded = expandedParents[parent.id];
              const children = childLists.filter(c => c.parent_id === parent.id).sort((a, b) => (a.order || 0) - (b.order || 0));
              
              return (
                <div 
                  key={parent.id} 
                  draggable 
                  onDragStart={() => handleDragStart(parent.id, 'parent')}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(parent.id, 'parent')}
                  className={`bg-white rounded-3xl border transition-all overflow-hidden ${isExpanded ? 'border-blue-200 shadow-lg shadow-blue-50' : 'border-slate-100 hover:border-slate-200 shadow-sm'}`}
                >
                  {/* Parent Header */}
                  <div className={`px-6 py-4 flex items-center justify-between group cursor-pointer ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-slate-50/30'}`} onClick={() => toggleParent(parent.id)}>
                    <div className="flex items-center gap-4 flex-1">
                      <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400 cursor-grab active:cursor-grabbing" />
                      <div className="flex-1">
                        {editingParentId === parent.id ? (
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <input autoFocus value={editParentName} onChange={e => setEditParentName(e.target.value)} placeholder="Name" className="px-3 py-1.5 rounded-xl border border-blue-400 focus:outline-none font-bold text-sm w-40" />
                            <input value={editParentType} onChange={e => setEditParentType(e.target.value)} placeholder="Type" className="px-3 py-1.5 rounded-xl border border-blue-400 focus:outline-none text-xs w-32" />
                            <button onClick={() => handleUpdateParent(parent.id)} style={{ backgroundColor: primaryColor }} className="p-2 text-white rounded-xl shadow-sm"><Check size={16} /></button>
                            <button onClick={() => setEditingParentId(null)} className="p-2 bg-slate-200 text-slate-600 rounded-xl"><X size={16} /></button>
                          </div>
                        ) : (
                          <div onDoubleClick={(e) => { e.stopPropagation(); setEditingParentId(parent.id); setEditParentName(parent.name); setEditParentType(parent.type); }} className="flex items-center gap-3">
                            <span className={`text-lg font-black tracking-tight ${isExpanded ? 'text-blue-800' : 'text-slate-700'}`}>{parent.name}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-lg font-black uppercase tracking-widest">{parent.type}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full">{children.length} items</span>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteParent(parent.id); }} className="p-2 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4 text-red-400" /></button>
                      {isExpanded ? <ChevronDown className="w-6 h-6 text-blue-500" /> : <ChevronRight className="w-6 h-6 text-slate-300" />}
                    </div>
                  </div>

                  {/* Children List */}
                  {isExpanded && (
                    <div className="px-8 py-6 bg-white border-t border-slate-50 space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {children.map((child) => (
                          <div 
                            key={child.id} 
                            draggable 
                            onDragStart={(e) => { e.stopPropagation(); handleDragStart(child.id, 'child', parent.id); }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.stopPropagation(); handleDrop(child.id, 'child'); }}
                            onDoubleClick={() => { setEditingChildId(child.id); setEditChildName(child.name); }}
                            className={`px-4 py-3 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all group flex items-center justify-between cursor-pointer ${child.bg_color || 'bg-slate-50/40'}`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" />
                              {editingChildId === child.id ? (
                                <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
                                  <input autoFocus value={editChildName} onChange={e => setEditChildName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUpdateChild(child.id)} className="w-full px-2 py-1 rounded-lg border border-blue-400 focus:outline-none text-xs font-bold" />
                                </div>
                              ) : (
                                <span className={`text-sm font-bold ${child.text_color || 'text-slate-700'}`}>{child.name}</span>
                              )}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteChild(child.id); }} className="p-1.5 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4 text-red-400" /></button>
                          </div>
                        ))}
                        
                        {/* Quick Add Child */}
                        <button 
                          onClick={async () => {
                            const name = prompt('New item name:');
                            if (!name) return;
                            const maxOrder = Math.max(...children.map(c => c.order), 0);
                            await supabase.from('child_lists').insert({ parent_id: parent.id, name, order: maxOrder + 1 });
                            onUpdate();
                          }}
                          className="px-4 py-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 font-bold text-sm"
                        >
                          <Plus size={16} /> Add Item
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">User Group Management</h3>
                  <p className="text-sm text-slate-500 font-medium">Control who can access the system and their permission levels</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Users</span>
                  <div className="text-xl font-black text-slate-800">{profiles.length}</div>
                </div>
                <button 
                  onClick={() => setIsAddingUser(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-md shadow-emerald-100 font-bold text-sm"
                >
                  <Plus className="w-4 h-4" /> Add User
                </button>
              </div>
            </div>

            {/* Add User Form */}
            {isAddingUser && (
              <div className="p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-2 text-emerald-700 font-black text-sm">
                  <User className="w-4 h-4" /> New User Profile
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Full Name</label>
                    <input type="text" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="e.g., John Doe" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-400 text-sm bg-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Email Address</label>
                    <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="e.g., john@example.com" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-400 text-sm bg-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Initial Role</label>
                    <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as any)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-400 text-sm bg-white font-bold">
                      <option value="user">User</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleAddUser} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all">Create Profile</button>
                  <button onClick={() => setIsAddingUser(false)} className="flex-1 py-3 bg-white text-slate-500 rounded-xl text-sm font-black border border-slate-200 hover:bg-slate-50 transition-all">Cancel</button>
                </div>
              </div>
            )}

            {loadingProfiles ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4"></div>
                <p className="font-bold">Fetching user profiles...</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">User Info</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role / Permissions</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Joined Date</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {profiles.map((profile) => (
                      <tr key={profile.id} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                              <User className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              {editingProfileId === profile.id ? (
                                <div className="space-y-2">
                                  <input autoFocus value={editProfileName} onChange={e => setEditProfileName(e.target.value)} className="w-full px-2 py-1 rounded border border-blue-400 text-sm font-bold" placeholder="Name" />
                                  <input value={editProfileEmail} onChange={e => setEditProfileEmail(e.target.value)} className="w-full px-2 py-1 rounded border border-blue-400 text-xs" placeholder="Email" />
                                  <div className="flex gap-2">
                                    <button onClick={() => handleUpdateProfile(profile.id)} className="px-2 py-1 bg-blue-500 text-white rounded text-[10px] font-bold">Save</button>
                                    <button onClick={() => setEditingProfileId(null)} className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-[10px] font-bold">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <div onDoubleClick={() => { setEditingProfileId(profile.id); setEditProfileName(profile.name || ''); setEditProfileEmail(profile.email || ''); }}>
                                  <div className="font-bold text-slate-800">{profile.name || 'No Name'}</div>
                                  <div className="text-xs text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" />{profile.email}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <select 
                            value={profile.role} 
                            onChange={(e) => handleUpdateRole(profile.id, e.target.value as any)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border-none focus:ring-2 focus:ring-blue-100 cursor-pointer transition-all ${
                              profile.role === 'admin' ? 'bg-blue-100 text-blue-700' : 
                              profile.role === 'user' ? 'bg-emerald-100 text-emerald-700' : 
                              'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <option value="admin">Admin</option>
                            <option value="user">User</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(profile.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => { setEditingProfileId(profile.id); setEditProfileName(profile.name || ''); setEditProfileEmail(profile.email || ''); }}
                              className="p-2 hover:bg-blue-50 text-blue-400 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteProfile(profile.id)}
                              className="p-2 hover:bg-red-50 text-red-400 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {profiles.length === 0 && (
                  <div className="py-20 text-center text-slate-400 font-bold">
                    No users found in the system.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}