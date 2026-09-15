"use client";
import React, { useState } from 'react';
import { BattleHazard } from './MapGrid';
import { supabase } from '@/lib/supabaseClient';

interface HazardPanelProps {
  selectedHazard: BattleHazard | null;
  onClose: () => void;
  onSelectHazard: (hazard: BattleHazard | null) => void;
  isModerator: boolean;
  targetTable?: string;
}

export default function HazardPanel({ selectedHazard, onClose, onSelectHazard, isModerator, targetTable = 'Battle_Hazards' }: HazardPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [currentHazard, setCurrentHazard] = useState<BattleHazard | null>(selectedHazard);

  React.useEffect(() => {
    setCurrentHazard(selectedHazard);
  }, [selectedHazard]);

  if (!isOpen) {
    return (
      <aside className="absolute right-0 top-0 w-12 bg-slate-800 text-white flex flex-col items-center py-4 shadow-xl transition-all duration-300 z-50 h-full shrink-0">
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          title="Open Hazard Panel"
        >
          <svg className="w-6 h-6 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </aside>
    );
  }

  const handleUpdate = async (field: keyof BattleHazard, value: any) => {
    if (!currentHazard || !isModerator) return;
    setCurrentHazard(prev => prev ? { ...prev, [field]: value } : null);
    const { error } = await supabase.from(targetTable).update({ [field]: value }).eq('id', currentHazard.id);
    if (error) {
      alert("Failed to update hazard: " + error.message);
    }
  };

  const handleToggleTeamVisibility = async (team: 'Player A' | 'Player B') => {
    if (!currentHazard || !isModerator) return;
    const currentTeams = currentHazard.visible_to_teams || ['Moderator'];
    let updatedTeams: string[];
    if (currentTeams.includes(team)) {
      updatedTeams = currentTeams.filter(t => t !== team);
    } else {
      updatedTeams = [...currentTeams, team];
    }
    // Always preserve Moderator
    if (!updatedTeams.includes('Moderator')) {
      updatedTeams.push('Moderator');
    }
    await handleUpdate('visible_to_teams', updatedTeams);
  };

  const handleDelete = async () => {
    if (!currentHazard || !isModerator) return;
    if (window.confirm("Delete this Hazard?")) {
      const { error } = await supabase.from(targetTable).delete().eq('id', currentHazard.id);
      if (!error) {
        onSelectHazard(null);
      } else {
        alert("Failed to delete hazard: " + error.message);
      }
    }
  };

  const hazardTypes = [
    { value: 'minefield', label: 'Minefield' },
    { value: 'flooded_zone', label: 'Flooded Zone' },
    { value: 'naval_blockade', label: 'Naval Blockade' },
    { value: 'chemical_zone', label: 'Chemical / Gas Zone' },
    { value: 'artillery_barrage', label: 'Artillery Barrage Zone' },
    { value: 'smoke_screen', label: 'Smoke Screen' },
    { value: 'dmz', label: 'DMZ' },
    { value: 'trenches', label: 'Trenches' },
  ];

  return (
    <aside className="absolute right-0 top-0 w-80 bg-surface-parchment/95 text-on-surface flex flex-col shadow-xl transition-all duration-300 z-50 h-full shrink-0 border-l border-border-parchment">
      {/* Header */}
      <div className="bg-primary-container p-3 flex items-center justify-between shadow-sm border-b border-white/10 shrink-0">
        <h2 className="font-headline-sm text-text-on-dark uppercase tracking-wider font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">warning</span>
          Hazard Details
        </h2>
        <button onClick={() => { setIsOpen(false); onClose(); }} className="p-1 rounded text-primary-fixed-dim hover:text-white hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
        {!currentHazard ? (
          <div className="text-center text-on-surface-variant mt-10 p-4 border border-border-parchment border-dashed rounded-xl bg-surface-container/50">
            <span className="material-symbols-outlined text-[32px] opacity-50 mb-2">touch_app</span>
            <p className="font-label-md">Select a Hazard on the map or sidebar to view details.</p>
          </div>
        ) : (
          <>
            {/* Identification Card */}
            <div className="bg-surface-card/95 p-4 rounded-xl border border-border-parchment shadow-sm hover:shadow-md transition-shadow">
              <span className="font-tag-overline text-[10px] text-faction-hostile uppercase font-bold tracking-wider mb-1 block">Label / Name</span>
              {isModerator ? (
                <input
                  type="text"
                  key={currentHazard.id + (currentHazard.label || '')}
                  defaultValue={currentHazard.label || ''}
                  placeholder="e.g. Minefield Alpha"
                  onBlur={(e) => handleUpdate('label', e.target.value)}
                  className="font-headline-md text-[18px] font-bold text-faction-hostile tracking-tight leading-tight w-full bg-surface-container rounded px-1 -mx-1 border border-transparent hover:border-outline-variant focus:border-faction-hostile focus:outline-none"
                />
              ) : (
                <h3 className="font-headline-md text-[18px] font-bold text-faction-hostile tracking-tight leading-tight mt-0.5">{currentHazard.label || currentHazard.hazard_type.replace('_', ' ')}</h3>
              )}
              <span className="font-tag-overline text-[10px] text-on-surface-variant mt-2 block">ID: {currentHazard.id.substring(0, 8).toUpperCase()}</span>
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
                      value={currentHazard.hazard_type}
                      onChange={(e) => handleUpdate('hazard_type', e.target.value)}
                    >
                      {hazardTypes.map(ht => (
                        <option key={ht.value} value={ht.value}>{ht.label}</option>
                      ))}
                      {!hazardTypes.some(ht => ht.value === currentHazard.hazard_type) && (
                        <option value={currentHazard.hazard_type}>{currentHazard.hazard_type}</option>
                      )}
                    </select>
                  ) : (
                    <p className="text-sm font-semibold capitalize text-on-surface">{currentHazard.hazard_type.replace('_', ' ')}</p>
                  )}
                </div>

                <div className="bg-surface-parchment-dim p-2.5 rounded-lg border border-border-parchment">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-1 block">Status</label>
                  <select 
                    disabled={!isModerator}
                    className="w-full bg-surface-card text-on-surface border border-border-parchment rounded p-1.5 text-sm font-semibold outline-none disabled:opacity-50"
                    value={currentHazard.status}
                    onChange={(e) => handleUpdate('status', e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="cleared">Cleared / Inactive</option>
                    <option value="breached">Breached / Partial</option>
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
                
                <div className="bg-surface-parchment-dim p-2.5 rounded-lg border border-border-parchment space-y-2">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Team Visibility</label>
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={(currentHazard.visible_to_teams || []).includes('Player A')} 
                      onChange={() => handleToggleTeamVisibility('Player A')}
                      className="w-4 h-4 rounded bg-surface-container border-border-parchment text-faction-friendly focus:ring-faction-friendly"
                    />
                    <span className="font-label-md text-[13px] font-bold text-on-surface group-hover:text-primary transition-colors">Visible to Player A</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={(currentHazard.visible_to_teams || []).includes('Player B')} 
                      onChange={() => handleToggleTeamVisibility('Player B')}
                      className="w-4 h-4 rounded bg-surface-container border-border-parchment text-faction-hostile focus:ring-faction-hostile"
                    />
                    <span className="font-label-md text-[13px] font-bold text-on-surface group-hover:text-primary transition-colors">Visible to Player B</span>
                  </label>
                </div>
                
                <div className="pt-2">
                   <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-1 block">Notes (Private)</label>
                   <textarea 
                     className="w-full bg-surface-container text-on-surface border border-border-parchment rounded p-2 text-sm h-24 outline-none focus:border-primary shadow-inner custom-scrollbar"
                     key={currentHazard.id + (currentHazard.notes || '')}
                     defaultValue={currentHazard.notes || ''}
                     placeholder="Add private moderator notes about this hazard..."
                     onBlur={(e) => handleUpdate('notes', e.target.value)}
                   />
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleDelete}
                    className="w-full bg-status-critical/10 hover:bg-status-critical hover:text-white text-status-critical font-label-md text-[12px] py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-status-critical/30 font-semibold"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                    <span>Delete Hazard</span>
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
