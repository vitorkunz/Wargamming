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
    <aside className="absolute right-0 top-0 w-80 bg-slate-800 text-white flex flex-col shadow-xl transition-all duration-300 z-50 h-full shrink-0">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h2 className="font-bold text-lg text-orange-400">Hazard Details</h2>
        <button onClick={() => { setIsOpen(false); onClose(); }} className="text-slate-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        {!currentHazard ? (
          <div className="text-center text-slate-400 mt-10">
            <p>Select a Hazard on the map or sidebar to view details.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Label / Name</label>
              {isModerator ? (
                <input
                  type="text"
                  key={currentHazard.id + (currentHazard.label || '')}
                  defaultValue={currentHazard.label || ''}
                  placeholder="e.g. Minefield Alpha"
                  onBlur={(e) => handleUpdate('label', e.target.value)}
                  className="w-full bg-slate-900 text-orange-400 font-bold border border-slate-600 rounded p-1.5 text-base"
                />
              ) : (
                <h3 className="text-xl font-bold text-orange-400">{currentHazard.label || currentHazard.hazard_type}</h3>
              )}
            </div>
            
            <div className="bg-slate-700 p-3 rounded-lg border border-slate-600">
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Type</label>
              {isModerator ? (
                <select 
                  className="w-full bg-slate-800 text-white border border-slate-600 rounded p-1.5"
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
                <p className="text-sm font-semibold capitalize text-slate-200">{currentHazard.hazard_type.replace('_', ' ')}</p>
              )}
            </div>

            <div className="bg-slate-700 p-3 rounded-lg border border-slate-600">
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Status</label>
              <select 
                disabled={!isModerator}
                className="w-full bg-slate-800 text-white border border-slate-600 rounded p-1.5 disabled:opacity-50"
                value={currentHazard.status}
                onChange={(e) => handleUpdate('status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="cleared">Cleared / Inactive</option>
                <option value="breached">Breached / Partial</option>
              </select>
            </div>

            {isModerator && (
              <>
                <div className="bg-slate-700 p-3 rounded-lg border border-slate-600 space-y-2">
                  <label className="text-xs text-slate-400 uppercase tracking-wider block">Team Visibility</label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={(currentHazard.visible_to_teams || []).includes('Player A')} 
                      onChange={() => handleToggleTeamVisibility('Player A')}
                      className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-red-500"
                    />
                    <span className="font-medium text-sm text-slate-200">Visible to Player A</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={(currentHazard.visible_to_teams || []).includes('Player B')} 
                      onChange={() => handleToggleTeamVisibility('Player B')}
                      className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-yellow-500"
                    />
                    <span className="font-medium text-sm text-slate-200">Visible to Player B</span>
                  </label>
                </div>
                
                <div className="pt-2 border-t border-slate-700 space-y-2">
                   <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Notes (Moderator Only)</label>
                   <textarea 
                     className="w-full bg-slate-800 text-white border border-slate-600 rounded p-2 text-sm h-24"
                     key={currentHazard.id + (currentHazard.notes || '')}
                     defaultValue={currentHazard.notes || ''}
                     placeholder="Add private moderator notes about this hazard..."
                     onBlur={(e) => handleUpdate('notes', e.target.value)}
                   />
                </div>

                <div className="pt-4 flex justify-between">
                  <button 
                    onClick={handleDelete}
                    className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1 font-semibold"
                  >
                    Delete Hazard
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
