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
  targetTable?: string;
  role?: string;
}

export default function PoiPanel({ pois, selectedPoi, onClose, onSelectPoi, isModerator, targetTable = 'Map_POIs', role }: PoiPanelProps) {
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

  const canEdit = isModerator || (role && currentPoi && currentPoi.owner === role);

  const handleUpdate = async (field: keyof MapPOI, value: any) => {
    // If it's visible_to_enemy toggle, we allow it if canEdit is true
    if (!currentPoi || !canEdit) return;
    
    // For other fields, maybe we still restrict to moderator?
    // User requested "players and moderator should be able to hide and unhide specific POIs"
    // Let's allow players to edit their own POIs completely, or at least the visibility.
    if (!isModerator && field !== 'is_visible_to_enemy') return;

    setCurrentPoi(prev => prev ? { ...prev, [field]: value } : null);
    const { error } = await supabase.from(targetTable).update({ [field]: value }).eq('id', currentPoi.id);
    if (error) {
      alert("Failed to update POI: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!currentPoi || !isModerator) return;
    if (window.confirm("Delete this POI?")) {
      const { error } = await supabase.from(targetTable).delete().eq('id', currentPoi.id);
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
    <aside className="absolute right-0 top-0 w-80 bg-surface-parchment/95 text-on-surface flex flex-col shadow-xl transition-all duration-300 z-50 h-full shrink-0 border-l border-border-parchment">
      {/* Header */}
      <div className="bg-primary-container p-3 flex items-center justify-between shadow-sm border-b border-white/10 shrink-0">
        <h2 className="font-headline-sm text-text-on-dark uppercase tracking-wider font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">location_on</span>
          POI Details
        </h2>
        <button onClick={() => { setIsOpen(false); onClose(); }} className="p-1 rounded text-primary-fixed-dim hover:text-white hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
        {!currentPoi ? (
          <div className="text-center text-on-surface-variant mt-10 p-4 border border-border-parchment border-dashed rounded-xl bg-surface-container/50">
            <span className="material-symbols-outlined text-[32px] opacity-50 mb-2">touch_app</span>
            <p className="font-label-md">Select a POI on the map or sidebar to view details.</p>
          </div>
        ) : (
          <>
            {/* Identification Card */}
            <div className="bg-surface-card/95 p-4 rounded-xl border border-border-parchment shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-3 pb-3 border-b border-border-parchment/60">
                 <PoiBadge type={currentPoi.type} owner={currentPoi.owner} status={currentPoi.status} size={42} />
                 <div className="flex-1">
                   <label className="font-tag-overline text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5 block">Status</label>
                   <span className={`font-label-md text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                     currentPoi.status === 'damaged' ? 'bg-status-alert/20 text-status-alert border-status-alert/30' :
                     currentPoi.status === 'destroyed' ? 'bg-status-critical/20 text-status-critical border-status-critical/30' :
                     currentPoi.status === 'under_construction' ? 'bg-secondary/20 text-secondary border-secondary/30' :
                     'bg-status-success/20 text-status-success border-status-success/30'
                   }`}>
                     {currentPoi.status.replace('_', ' ')}
                   </span>
                 </div>
              </div>

              <div>
                <span className="font-tag-overline text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-1 block">Name</span>
                {isModerator ? (
                  <input
                    type="text"
                    key={currentPoi.id + currentPoi.name}
                    defaultValue={currentPoi.name}
                    onBlur={(e) => handleUpdate('name', e.target.value)}
                    className="font-headline-md text-[18px] font-bold text-on-surface tracking-tight leading-tight w-full bg-surface-container rounded px-1 -mx-1 border border-transparent hover:border-outline-variant focus:border-primary focus:outline-none"
                  />
                ) : (
                  <h3 className="font-headline-md text-[18px] font-bold text-on-surface tracking-tight leading-tight">{currentPoi.name}</h3>
                )}
                <span className="font-tag-overline text-[10px] text-on-surface-variant mt-2 block">ID: {currentPoi.id.substring(0, 8).toUpperCase()}</span>
              </div>
            </div>
            
            {/* Properties Card */}
            <div className="bg-surface-card/95 p-4 rounded-xl border border-border-parchment shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-tag-overline text-[10px] text-primary uppercase font-bold tracking-wider">Properties</span>
                <span className="material-symbols-outlined text-primary text-[16px]">tune</span>
              </div>
              
              <div className="space-y-2.5">
                <div className="bg-surface-parchment-dim p-2.5 rounded-lg border border-border-parchment">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-1 block">Type</label>
                  {isModerator ? (
                    <select 
                      className="w-full bg-surface-card text-on-surface border border-border-parchment rounded p-1.5 text-sm font-semibold outline-none"
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
                    <p className="text-sm font-semibold capitalize text-on-surface">{currentPoi.type.replace('_', ' ')}</p>
                  )}
                </div>

                <div className="bg-surface-parchment-dim p-2.5 rounded-lg border border-border-parchment">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-1 block">Status</label>
                  <select 
                    disabled={!isModerator}
                    className="w-full bg-surface-card text-on-surface border border-border-parchment rounded p-1.5 text-sm font-semibold outline-none disabled:opacity-50"
                    value={currentPoi.status}
                    onChange={(e) => handleUpdate('status', e.target.value)}
                  >
                    <option value="operational">Operational</option>
                    <option value="damaged">Damaged</option>
                    <option value="destroyed">Destroyed</option>
                    <option value="under_construction">Under Construction</option>
                  </select>
                </div>

                <div className="bg-surface-parchment-dim p-2.5 rounded-lg border border-border-parchment">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-1 block">Owner</label>
                  <select 
                    disabled={!isModerator}
                    className="w-full bg-surface-card text-on-surface border border-border-parchment rounded p-1.5 text-sm font-semibold outline-none disabled:opacity-50"
                    value={currentPoi.owner}
                    onChange={(e) => handleUpdate('owner', e.target.value)}
                  >
                    <option value="Neutral">Neutral</option>
                    <option value="Player A">Player A</option>
                    <option value="Player B">Player B</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Config & Notes */}
            {isModerator && (
              <div className="bg-surface-card/95 p-4 rounded-xl border border-border-parchment shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-tag-overline text-[10px] text-primary uppercase font-bold tracking-wider">Moderator Settings</span>
                  <span className="material-symbols-outlined text-primary text-[16px]">admin_panel_settings</span>
                </div>
                
                <div className="bg-surface-parchment-dim p-2.5 rounded-lg border border-border-parchment">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="font-label-md text-[13px] font-bold text-on-surface group-hover:text-primary transition-colors">Visible to Enemy</span>
                    <div className={`relative inline-block w-8 rounded-full h-4 transition-colors border ${currentPoi.is_visible_to_enemy ? 'bg-primary border-transparent' : 'bg-surface-dim border-outline-variant'}`}>
                      <input 
                        type="checkbox" 
                        className="opacity-0 w-0 h-0" 
                        checked={currentPoi.is_visible_to_enemy} 
                        onChange={() => handleUpdate('is_visible_to_enemy', !currentPoi.is_visible_to_enemy)} 
                      />
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform ${currentPoi.is_visible_to_enemy ? 'right-0.5 bg-white' : 'left-0.5 bg-on-surface-variant'}`}></span>
                    </div>
                  </label>
                </div>
                
                <div className="pt-2">
                   <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-1 block">Notes (Private)</label>
                   <textarea 
                     className="w-full bg-surface-container text-on-surface border border-border-parchment rounded p-2 text-sm h-24 outline-none focus:border-primary shadow-inner custom-scrollbar"
                     key={currentPoi.id + (currentPoi.notes || '')}
                     defaultValue={currentPoi.notes || ''}
                     placeholder="Add private moderator notes..."
                     onBlur={(e) => handleUpdate('notes', e.target.value)}
                   />
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleDelete}
                    className="w-full bg-status-critical/10 hover:bg-status-critical hover:text-white text-status-critical font-label-md text-[12px] py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-status-critical/30 font-semibold"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                    <span>Delete POI</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
