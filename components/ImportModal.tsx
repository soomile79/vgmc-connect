import React, { useState } from 'react';
import { X, Upload, FileText, FileSpreadsheet, FileInput, Download } from 'lucide-react';
import { Member, MemberStatus, Position } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (members: Member[]) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'json' | 'csv'>('csv');

  if (!isOpen) return null;

  const downloadTemplate = () => {
    const headers = "Name,English Name,Gender,Phone,Email,Birthday,Mokjang,Position,Address,Memo";
    const example = "홍길동,Gil Dong Hong,Male,213-555-1234,user@example.com,1980-01-01,Joy Mokjang,Member,123 Main St,Note here";
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + "\n" + example);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "vgmc_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (csvText: string): Member[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row.");
    
    // Simple CSV parser
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]+/g, ''));
    
    const members: Member[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      // Handle commas inside quotes logic roughly or just simple split
      const values = lines[i].split(',').map(v => v.trim().replace(/['"]+/g, ''));
      if (values.length < 2) continue; // skip empty lines
      
      const getValue = (keyPart: string) => {
        const index = headers.findIndex(h => h.includes(keyPart));
        return index > -1 ? values[index] : '';
      };

      const koreanName = getValue('name') || getValue('korean') || 'Unknown';
      
      // Auto-determine gender if missing
      let genderVal = getValue('gender').toLowerCase();
      if (!genderVal) {
          // Simple heuristic or default
          genderVal = 'male'; 
      }
      
      members.push({
        id: crypto.randomUUID(),
        koreanName,
        englishName: getValue('english') || '',
        gender: genderVal.startsWith('f') ? 'Female' : 'Male',
        birthday: getValue('birthday') || getValue('birth') || '',
        phone: getValue('phone') || getValue('mobile') || '',
        email: getValue('email') || '',
        address: getValue('address') || '',
        mokjang: getValue('mokjang') || getValue('cell') || 'Unassigned',
        representative: getValue('representative') || koreanName, // Default to self-rep if missing
        relationship: getValue('relationship') || 'Self',
        isBaptized: (getValue('baptized') || '').toLowerCase().includes('y'),
        baptismDate: getValue('baptism date') || '',
        isRegularMember: (getValue('regular') || '').toLowerCase().includes('y'),
        position: getValue('position') || Position.MEMBER,
        registrationDate: getValue('reg') || new Date().toISOString().split('T')[0],
        status: (getValue('status') || '').toLowerCase().includes('inactive') ? MemberStatus.INACTIVE : MemberStatus.ACTIVE,
        memo: getValue('memo') || '',
        forSlip: getValue('slip') || '',
        offeringNumber: getValue('offering') || ''
      });
    }
    return members;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content);
      setError('');
      
      // Auto-detect mode based on file content or extension
      if (file.name.toLowerCase().endsWith('.json') || content.trim().startsWith('[')) {
        setMode('json');
      } else {
        setMode('csv');
      }
    };
    reader.onerror = () => {
        setError("Failed to read file.");
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    try {
      if (!inputText.trim()) {
        throw new Error("No data to import.");
      }

      let newMembers: Member[] = [];
      
      if (mode === 'json') {
        const parsed = JSON.parse(inputText);
        if (!Array.isArray(parsed)) throw new Error("JSON must be an array.");
        newMembers = parsed.map((item: any) => ({
             ...item,
             id: item.id || crypto.randomUUID(),
             status: item.status || MemberStatus.ACTIVE,
             position: item.position || Position.MEMBER,
             gender: item.gender || 'Male',
             registrationDate: item.registrationDate || new Date().toISOString().split('T')[0]
        }));
      } else {
        newMembers = parseCSV(inputText);
      }

      if (newMembers.length === 0) {
        throw new Error("No valid members found in data.");
      }

      onImport(newMembers);
      setInputText('');
      setError('');
      onClose();
    } catch (e: any) {
      setError(e.message || "Invalid format. Please check your data.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Upload className="w-5 h-5 text-brand-600" />
            Import Members
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="flex border-b border-gray-100">
           <button 
            onClick={() => setMode('csv')} 
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${mode === 'csv' ? 'text-brand-600 bg-brand-50 border-b-2 border-brand-600' : 'text-gray-500 hover:bg-gray-50'}`}
           >
             <FileSpreadsheet className="w-4 h-4"/> CSV / Excel
           </button>
           <button 
            onClick={() => setMode('json')} 
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${mode === 'json' ? 'text-brand-600 bg-brand-50 border-b-2 border-brand-600' : 'text-gray-500 hover:bg-gray-50'}`}
           >
             <FileText className="w-4 h-4"/> Backup File (JSON)
           </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* File Upload Area */}
          <div className="mb-4">
             <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors group relative">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-brand-500 mb-2 transition-colors" />
                    <p className="text-sm text-slate-500 font-medium">Click to upload <span className="uppercase">{mode}</span> file</p>
                </div>
                <input type="file" className="hidden" accept={mode === 'csv' ? ".csv" : ".json"} onChange={handleFileUpload} />
             </label>
             
             {mode === 'csv' && (
                 <div className="flex justify-center mt-2">
                    <button onClick={downloadTemplate} className="text-xs flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium hover:underline">
                        <Download className="w-3 h-3" /> Download CSV Template
                    </button>
                 </div>
             )}
          </div>

          <p className="text-sm text-gray-600 mb-2 font-bold flex items-center gap-2">
             Or paste data manually:
          </p>
          
          <textarea
            className="w-full h-48 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-slate-900 bg-white"
            placeholder={mode === 'csv' ? "Name, Gender, Phone, Mokjang\nJohn Doe, Male, 123-456-7890, Joy" : '[{"koreanName": "홍길동", "gender": "Male", ...}]'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          {error && (
            <div className="mt-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={handleImport}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors font-medium shadow-sm"
          >
            Import Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;