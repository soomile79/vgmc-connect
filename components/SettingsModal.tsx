import React, { useState, useRef } from 'react';
import { X, Plus, Trash2, Settings, List, Tag, CheckSquare, GripVertical, Check, Cloud, Key, Globe, Loader2, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mokjangList: string[];
  positionList: string[];
  statusList: string[];
  tagList: string[];
  onUpdateMokjangs: (list: string[]) => void;
  onUpdatePositions: (list: string[]) => void;
  onUpdateStatuses: (list: string[]) => void;
  onUpdateTags: (list: string[]) => void;
  onRenameItem: (type: string, oldVal: string, newVal: string) => void;
  onDeleteItem: (type: string, item: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, 
  mokjangList, positionList, statusList, tagList,
  onUpdateMokjangs, onUpdatePositions, onUpdateStatuses, onUpdateTags,
  onRenameItem, onDeleteItem
}) => {
  const [activeTab, setActiveTab] = useState<'mokjang' | 'position' | 'status' | 'tags' | 'cloud'>('mokjang');
  const [newItem, setNewItem] = useState('');
  
  // Cloud Settings
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('church-server-url') || '');
  const [apiSecret, setApiSecret] = useState(() => localStorage.getItem('church-api-secret') || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);
  
  // Editing State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Drag refs
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Close on ESC
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  const getList = () => {
    switch(activeTab) {
      case 'mokjang': return mokjangList;
      case 'position': return positionList;
      case 'status': return statusList;
      case 'tags': return tagList;
      default: return [];
    }
  };

  const getUpdater = () => {
    switch(activeTab) {
      case 'mokjang': return onUpdateMokjangs;
      case 'position': return onUpdatePositions;
      case 'status': return onUpdateStatuses;
      case 'tags': return onUpdateTags;
      default: return () => {};
    }
  };

  const handleAdd = () => {
    if (!newItem.trim()) return;
    const list = getList();
    const updater = getUpdater();
    updater([...list, newItem.trim()]);
    setNewItem('');
  };

  const handleDelete = (itemToDelete: string) => {
    const list = getList();
    const updater = getUpdater();
    updater(list.filter(item => item !== itemToDelete));
    
    // Call cascade delete handler
    onDeleteItem(activeTab, itemToDelete);
  };

  const startEditing = (index: number, currentValue: string) => {
    setEditingIndex(index);
    setEditingValue(currentValue);
  };

  const saveEditing = () => {
    if (editingIndex !== null && editingValue.trim()) {
      const list = [...getList()];
      const oldVal = list[editingIndex];
      const newVal = editingValue.trim();
      
      if (oldVal !== newVal) {
        list[editingIndex] = newVal;
        const updater = getUpdater();
        updater(list);
        
        // Trigger rename in main app
        onRenameItem(activeTab, oldVal, newVal);
      }
    }
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverItem.current = position;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      const list = [...getList()];
      const draggedItemContent = list[dragItem.current];
      list.splice(dragItem.current, 1);
      list.splice(dragOverItem.current, 0, draggedItemContent);
      
      const updater = getUpdater();
      updater(list);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const saveCloudSettings = async () => {
    if (!serverUrl || !apiSecret) {
        setTestResult({ success: false, message: "Please enter both URL and Secret Key." });
        return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
        // Attempt to fetch data to verify connection
        const response = await fetch(serverUrl, {
            method: 'GET',
            headers: {
                'X-Api-Secret': apiSecret,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            // Success!
            localStorage.setItem('church-server-url', serverUrl);
            localStorage.setItem('church-api-secret', apiSecret);
            setTestResult({ success: true, message: "Connection Successful! Settings Saved." });
            
            // Auto close after success
            setTimeout(() => {
                // Trigger a reload to force app sync
                window.location.reload();
            }, 1500);
        } else {
            let errorMsg = `Server Error (${response.status})`;
            if (response.status === 401) errorMsg = "Incorrect Secret Key.";
            if (response.status === 404) errorMsg = "api.php not found. Check URL.";
            throw new Error(errorMsg);
        }
    } catch (e: any) {
        let msg = e.message;
        if (e.message.includes('Failed to fetch')) {
             msg = "Connection blocked. Please check CORS settings in api.php.";
        }
        setTestResult({ success: false, message: msg });
    } finally {
        setIsTesting(false);
    }
  };

  const tabs = [
    { id: 'mokjang', label: 'Cells', icon: List },
    { id: 'position', label: 'Roles', icon: Settings },
    { id: 'status', label: 'Status', icon: Tag },
    { id: 'tags', label: 'Tags', icon: CheckSquare },
    { id: 'cloud', label: 'Cloud', icon: Cloud },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-brand-50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-brand-600" />
            System Settings
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex border-b border-gray-100 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setTestResult(null); }}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto bg-white">
          {activeTab === 'cloud' ? (
            <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                    <h3 className="font-bold flex items-center gap-2 mb-2">
                        <Cloud className="w-4 h-4" /> SiteGround / Hosting Sync
                    </h3>
                    <p className="opacity-80 leading-relaxed mb-2">
                        To sync data, upload <code>api.php</code> to your server.
                        <br/>
                        <span className="font-bold text-red-600">Important:</span> You must add CORS headers to <code>api.php</code> or the connection will fail.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <Globe className="w-4 h-4" /> Server URL
                        </label>
                        <input 
                            type="url"
                            value={serverUrl}
                            onChange={(e) => setServerUrl(e.target.value)}
                            placeholder="https://yourchurch.com/api.php"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-800 font-medium"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <Key className="w-4 h-4" /> Secret Key (Password)
                        </label>
                        <input 
                            type="password"
                            value={apiSecret}
                            onChange={(e) => setApiSecret(e.target.value)}
                            placeholder="Must match $secret_key in api.php"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-800 font-medium"
                        />
                    </div>
                </div>

                {testResult && (
                    <div className={`p-3 rounded-xl text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2 ${testResult.success ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        {testResult.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {testResult.message}
                    </div>
                )}

                <button 
                    onClick={saveCloudSettings}
                    disabled={isTesting}
                    className={`w-full py-3 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${isTesting ? 'bg-slate-400 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700 shadow-brand-200'}`}
                >
                    {isTesting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Testing Connection...
                        </>
                    ) : (
                        <>
                            <Check className="w-4 h-4" />
                            Test & Save Connection
                        </>
                    )}
                </button>
            </div>
          ) : (
            <>
                <div className="flex gap-2 mb-6">
                    <input 
                    type="text" 
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder={`Add new ${tabs.find(t => t.id === activeTab)?.label.toLowerCase()}...`}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 bg-white"
                    />
                    <button 
                    onClick={handleAdd}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
                    >
                    <Plus className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-2">
                    {getList().map((item, index) => (
                    <div 
                        key={item} 
                        className={`flex items-center justify-between p-3 rounded-lg group border transition-all cursor-move ${editingIndex === index ? 'bg-brand-50 border-brand-200' : 'bg-slate-50 border-transparent hover:bg-white hover:border-gray-100 hover:shadow-sm'}`}
                        draggable={editingIndex === null}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        onDoubleClick={() => startEditing(index, item)}
                    >
                        <div className="flex items-center gap-3 flex-1">
                            <GripVertical className="w-4 h-4 text-gray-300 group-hover:text-brand-400 cursor-grab active:cursor-grabbing" />
                            
                            {editingIndex === index ? (
                            <input 
                                type="text"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={saveEditing}
                                onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                                autoFocus
                                className="flex-1 bg-white px-2 py-1 rounded border border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 text-slate-800"
                            />
                            ) : (
                            <span className="font-medium text-slate-700 select-none" title="Double click to edit">{item}</span>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                        {editingIndex === index && (
                            <button onMouseDown={saveEditing} className="p-1 text-green-600 hover:bg-green-100 rounded">
                                <Check className="w-4 h-4"/>
                            </button>
                        )}
                        <div className={`opacity-0 group-hover:opacity-100 transition-all ${editingIndex !== null ? 'invisible' : ''}`}>
                            <button 
                                onClick={() => handleDelete(item)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        </div>
                    </div>
                    ))}
                    {getList().length === 0 && (
                        <div className="text-center text-slate-400 text-sm py-4 italic">No items yet.</div>
                    )}
                </div>
            </>
          )}
        </div>

        {activeTab !== 'cloud' && (
            <div className="p-4 bg-gray-50 text-center text-xs text-gray-400 border-t border-gray-100">
            Double-click to edit. Drag to reorder.
            </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;
