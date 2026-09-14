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
    <div className="bg-white p-4 rounded-lg shadow-md border border-slate-200 mb-6 w-full max-w-4xl">
      <h2 className="text-xl font-bold mb-4 text-orange-600">Deploy Hazard Zone</h2>
      
      {!isDrawingHazard && !pendingHazardPoints && (
        <button 
          onClick={() => setIsDrawingHazard(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded shadow-sm"
        >
          ✏️ Draw New Hazard Zone
        </button>
      )}

      {isDrawingHazard && !pendingHazardPoints && (
        <div className="flex items-center space-x-4 bg-orange-50 border border-orange-200 p-3 rounded">
          <span className="text-orange-800 font-medium flex-1">
            Drawing Mode Active: Click and drag on the map to draw the hazard area.
          </span>
          <button 
            onClick={() => setIsDrawingHazard(false)}
            className="text-slate-500 hover:text-slate-800 underline"
          >
            Cancel
          </button>
        </div>
      )}

      {pendingHazardPoints && (
        <form onSubmit={handleCreateHazard} className="flex flex-wrap gap-4 items-end bg-orange-50 p-4 border border-orange-300 rounded">
          <div className="w-full mb-2">
            <span className="text-sm font-bold text-orange-800">Area captured ({pendingHazardPoints.length} points). Configure and save:</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Hazard Type</label>
              <select className="border border-slate-300 rounded p-2 text-slate-700 w-40" value={hazardType} onChange={(e) => setHazardType(e.target.value)}>
                <option value="minefield">Minefield</option>
                <option value="flooded_zone">Flooded Zone</option>
                <option value="naval_blockade">Naval Blockade</option>
                <option value="dmz">DMZ</option>
                <option value="trenches">Trenches</option>
              </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Label</label>
            <input type="text" className="border border-slate-300 rounded p-2 w-48 text-slate-700" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="flex flex-col space-y-2 mb-2">
            <label className="flex items-center space-x-2">
               <input type="checkbox" checked={visibleToPlayerA} onChange={(e) => setVisibleToPlayerA(e.target.checked)} className="rounded" />
               <span className="text-sm text-slate-600">Reveal to Player A</span>
            </label>
            <label className="flex items-center space-x-2">
               <input type="checkbox" checked={visibleToPlayerB} onChange={(e) => setVisibleToPlayerB(e.target.checked)} className="rounded" />
               <span className="text-sm text-slate-600">Reveal to Player B</span>
            </label>
          </div>
          <div className="flex space-x-3 ml-auto">
            <button type="button" onClick={handleCancel} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-6 rounded shadow-sm">
              Discard
            </button>
            <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 rounded shadow-sm">
              Save Hazard
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
