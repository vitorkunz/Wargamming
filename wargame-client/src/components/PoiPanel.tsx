"use client";
import React, { useState } from 'react';
import { MapPOI } from './MapGrid';
import { supabase } from '@/lib/supabaseClient';
import { PoiBadge } from './PoiBadge';

interface PoiPanelProps {
  pois: MapPOI[];
  selectedPoi: MapPOI | null;
  onClose: () => void;
  onSelectPoi: (poiId: string | null) => void;
  isModerator: boolean;
}

export default function PoiPanel({ pois, selectedPoi, onClose, onSelectPoi, isModerator }: PoiPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [currentPoi, setCurrentPoi] = useState<MapPOI | null>(selectedPoi);

  React.useEffect(() => {
    setCurrentPoi(selectedPoi);
  }, [selectedPoi]);
  
  if (!isOpen) {
    return (
      <aside className="absolute right-0 top-0 w-12 bg-slate-800 text-white flex flex-col items-center py-4 shadow-xl transition-all duration-300 z-50 h-full shrink-0">
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          title="Open POI Panel"
        >
          <svg className="w-6 h-6 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </aside>
    );
  }

  const handleUpdate = async (field: keyof MapPOI, value: any) => {
    if (!currentPoi || !isModerator) return;
    setCurrentPoi(prev => prev ? { ...prev, [field]: value } : null);
    const { error } = await supabase.from('Map_POIs').update({ [field]: value }).eq('id', currentPoi.id);
    if (error) {
      alert("Failed to update POI: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!currentPoi || !isModerator) return;
    if (window.confirm("Delete this POI?")) {
      const { error } = await supabase.from('Map_POIs').delete().eq('id', currentPoi.id);
      if (!error) onSelectPoi(null);
    }
  };

  const poiTypes = [
    { value: 'military_base', label: 'Military Base' },
    { value: 'headquarters', label: 'Headquarters (HQ)' },
    { value: 'factory', label: 'Factory' },
    { value: 'bridge', label: 'Bridge' },
    { value: 'airfield', label: 'Airfield' },
    { value: 'bunker', label: 'Bunker' },
    { value: 'checkpoint', label: 'Checkpoint' },
    { value: 'depot', label: 'Supply Depot' },
    { value: 'port', label: 'Harbor / Port' },
    { value: 'radar', label: 'Radar Station' },
    { value: 'outpost', label: 'Outpost' },
  ];

  return (
    <aside className="absolute right-0 top-0 w-80 bg-slate-800 text-white flex flex-col shadow-xl transition-all duration-300 z-50 h-full shrink-0">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h2 className="font-bold text-lg flex items-center gap-2">
          POI Details
        </h2>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        {!currentPoi ? (
          <div className="text-center text-slate-400 mt-10">
            <p>Select a POI on the map to view details.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-2 pb-4 border-b border-slate-700">
               <PoiBadge type={currentPoi.type} owner={currentPoi.owner} status={currentPoi.status} size={36} />
               <div className="flex-1">
                 <label className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5 block">Status</label>
                 <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                   currentPoi.status === 'damaged' ? 'bg-orange-900 text-orange-200' :
                   currentPoi.status === 'destroyed' ? 'bg-red-900 text-red-200' :
                   currentPoi.status === 'under_construction' ? 'bg-blue-900 text-blue-200' :
                   'bg-green-900 text-green-200'
                 }`}>
                   {currentPoi.status.replace('_', ' ')}
                 </span>
               </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Name</label>
              {isModerator ? (
                <input
                  type="text"
                  key={currentPoi.id + currentPoi.name}
                  defaultValue={currentPoi.name}
                  onBlur={(e) => handleUpdate('name', e.target.value)}
                  className="w-full bg-slate-900 text-yellow-500 font-bold border border-slate-600 rounded p-1.5 text-base"
                />
              ) : (
                <h3 className="text-xl font-bold text-yellow-500">{currentPoi.name}</h3>
              )}
            </div>
            
            <div className="bg-slate-700 p-3 rounded-lg border border-slate-600">
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Type</label>
              {isModerator ? (
                <select 
                  className="w-full bg-slate-800 text-white border border-slate-600 rounded p-1.5"
                  value={currentPoi.type}
                  onChange={(e) => handleUpdate('type', e.target.value)}
                >
                  {poiTypes.map(pt => (
                    <option key={pt.value} value={pt.value}>{pt.label}</option>
                  ))}
                  {!poiTypes.some(pt => pt.value === currentPoi.type) && (
                    <option value={currentPoi.type}>{currentPoi.type}</option>
                  )}
                </select>
              ) : (
                <p className="text-sm font-semibold capitalize text-slate-200">{currentPoi.type.replace('_', ' ')}</p>
              )}
            </div>

            <div className="bg-slate-700 p-3 rounded-lg border border-slate-600">
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Status</label>
              <select 
                disabled={!isModerator}
                className="w-full bg-slate-800 text-white border border-slate-600 rounded p-1.5 disabled:opacity-50"
                value={currentPoi.status}
                onChange={(e) => handleUpdate('status', e.target.value)}
              >
                <option value="operational">Operational</option>
                <option value="damaged">Damaged</option>
                <option value="destroyed">Destroyed</option>
                <option value="under_construction">Under Construction</option>
              </select>
            </div>

            <div className="bg-slate-700 p-3 rounded-lg border border-slate-600">
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Owner</label>
              <select 
                disabled={!isModerator}
                className="w-full bg-slate-800 text-white border border-slate-600 rounded p-1.5 disabled:opacity-50"
                value={currentPoi.owner}
                onChange={(e) => handleUpdate('owner', e.target.value)}
              >
                <option value="Neutral">Neutral</option>
                <option value="Player A">Player A</option>
                <option value="Player B">Player B</option>
              </select>
            </div>

            {isModerator && (
              <>
                <label className="flex items-center space-x-3 cursor-pointer mt-4">
                  <input 
                    type="checkbox" 
                    checked={currentPoi.is_visible_to_enemy} 
                    onChange={() => handleUpdate('is_visible_to_enemy', !currentPoi.is_visible_to_enemy)}
                    className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-red-500"
                  />
                  <span className="font-medium text-sm">Visible to Enemy</span>
                </label>
                
                <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
                   <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Notes (Moderator Only)</label>
                   <textarea 
                     className="w-full bg-slate-800 text-white border border-slate-600 rounded p-2 text-sm h-24"
                     key={currentPoi.id + (currentPoi.notes || '')}
                     defaultValue={currentPoi.notes || ''}
                     onBlur={(e) => handleUpdate('notes', e.target.value)}
                   />
                </div>

                <div className="pt-4 flex justify-between">
                  <button 
                    onClick={handleDelete}
                    className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1"
                  >
                    Delete POI
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
