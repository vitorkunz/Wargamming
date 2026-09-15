"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface HazardCreationProps {
  isDrawingHazard: boolean;
  setIsDrawingHazard: (isDrawing: boolean) => void;
  pendingHazardPoints: {x:number, y:number}[] | null;
  setPendingHazardPoints: (points: {x:number, y:number}[] | null) => void;
  table?: string;
}

export default function HazardCreation({
  isDrawingHazard,
  setIsDrawingHazard,
  pendingHazardPoints,
  setPendingHazardPoints,
  table = 'Battle_Hazards'
}: HazardCreationProps) {
  const [hazardType, setHazardType] = useState('minefield');
  const [label, setLabel] = useState('Minefield Alpha');
  const [visibleToPlayerA, setVisibleToPlayerA] = useState(false);
  const [visibleToPlayerB, setVisibleToPlayerB] = useState(false);

  const handleCreateHazard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingHazardPoints) return;
    
    const visible_to_teams = ['Moderator'];
    if (visibleToPlayerA) visible_to_teams.push('Player A');
    if (visibleToPlayerB) visible_to_teams.push('Player B');

    const { error } = await supabase.from(table).insert({
      hazard_type: hazardType,
      label,
      created_by: 'Moderator',
      coordinates: pendingHazardPoints,
      status: 'active',
      visible_to_teams
    });

    if (error) {
      alert("Failed to spawn hazard: " + error.message);
    } else {
      setPendingHazardPoints(null);
    }
  };

  const handleCancel = () => {
    setPendingHazardPoints(null);
    setIsDrawingHazard(false);
  };

  return (
    <div className="bg-surface-card p-4 rounded-xl shadow-sm border border-border-parchment w-full flex flex-col gap-4 relative overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border-parchment/60 pb-3">
        <span className="material-symbols-outlined text-status-alert text-[24px]">warning</span>
        <h2 className="text-lg font-bold text-status-alert font-headline-sm flex-1">Deploy Hazard Zone</h2>
      </div>
      
      {!isDrawingHazard && !pendingHazardPoints && (
        <button 
          onClick={() => setIsDrawingHazard(true)}
          className="w-full bg-status-alert/10 hover:bg-status-alert text-status-alert hover:text-white border border-status-alert/30 font-bold py-2.5 px-4 rounded-lg transition-colors font-headline-sm text-[13px] shadow-sm flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">draw</span>
          Draw New Hazard Zone
        </button>
      )}

      {isDrawingHazard && !pendingHazardPoints && (
        <div className="flex flex-col gap-3 bg-surface-container/50 border border-status-alert/30 p-3 rounded-lg border-dashed">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-status-alert text-[18px] mt-0.5">gesture</span>
            <span className="font-label-md text-on-surface-variant flex-1 leading-tight">
              Drawing Mode Active: Click and drag on the map to draw the hazard area.
            </span>
          </div>
          <button 
            onClick={() => setIsDrawingHazard(false)}
            className="text-status-critical hover:text-status-critical/80 font-bold text-xs uppercase tracking-wider self-end"
          >
            Cancel
          </button>
        </div>
      )}

      {pendingHazardPoints && (
        <form onSubmit={handleCreateHazard} className="flex flex-col gap-3 bg-surface-container/30 p-3 border border-status-alert/30 rounded-lg">
          <div className="w-full mb-1">
            <span className="font-label-md text-[11px] font-bold text-status-alert">Area captured ({pendingHazardPoints.length} points).</span>
          </div>
          <div>
            <label className="block font-tag-overline text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 font-bold">Hazard Type</label>
              <select className="border border-border-parchment rounded-lg p-2 text-on-surface bg-surface-container w-full text-sm outline-none font-semibold" value={hazardType} onChange={(e) => setHazardType(e.target.value)}>
                <option value="minefield">Minefield</option>
                <option value="flooded_zone">Flooded Zone</option>
                <option value="naval_blockade">Naval Blockade</option>
                <option value="dmz">DMZ</option>
                <option value="trenches">Trenches</option>
              </select>
          </div>
          <div>
            <label className="block font-tag-overline text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 font-bold">Label</label>
            <input type="text" className="border border-border-parchment rounded-lg p-2 text-on-surface bg-surface-container w-full text-sm outline-none shadow-inner" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2 mt-1">
            <label className="flex items-center gap-2 cursor-pointer group">
               <div className={`relative inline-block w-8 rounded-full h-4 transition-colors border ${visibleToPlayerA ? 'bg-primary border-transparent' : 'bg-surface-dim border-outline-variant'}`}>
                 <input type="checkbox" className="opacity-0 w-0 h-0" checked={visibleToPlayerA} onChange={(e) => setVisibleToPlayerA(e.target.checked)} />
                 <span className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform ${visibleToPlayerA ? 'right-0.5 bg-white' : 'left-0.5 bg-on-surface-variant'}`}></span>
               </div>
               <span className="font-label-md text-[13px] font-bold text-on-surface group-hover:text-primary transition-colors">Reveal to Player A</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
               <div className={`relative inline-block w-8 rounded-full h-4 transition-colors border ${visibleToPlayerB ? 'bg-primary border-transparent' : 'bg-surface-dim border-outline-variant'}`}>
                 <input type="checkbox" className="opacity-0 w-0 h-0" checked={visibleToPlayerB} onChange={(e) => setVisibleToPlayerB(e.target.checked)} />
                 <span className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform ${visibleToPlayerB ? 'right-0.5 bg-white' : 'left-0.5 bg-on-surface-variant'}`}></span>
               </div>
               <span className="font-label-md text-[13px] font-bold text-on-surface group-hover:text-primary transition-colors">Reveal to Player B</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button type="button" onClick={handleCancel} className="bg-surface-dim hover:bg-surface-container-high text-on-surface font-bold py-2 px-4 rounded-lg shadow-sm font-label-md text-[13px] transition-colors border border-border-parchment">
              Discard
            </button>
            <button type="submit" className="bg-status-alert hover:bg-status-alert/90 text-white font-bold py-2 px-4 rounded-lg shadow-sm font-label-md text-[13px] transition-colors">
              Save Hazard
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
