"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { PoiBadge } from './PoiBadge';

interface PoiCreationProps {
  table?: string;
}

export default function PoiCreation({ table = 'Map_POIs' }: PoiCreationProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('military_base');
  const [owner, setOwner] = useState('Neutral');
  const [x, setX] = useState(10);
  const [y, setY] = useState(10);

  const handleCreatePoi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please enter a name for the POI");
      return;
    }
    
    const { error } = await supabase.from(table).insert({
      name,
      type,
      owner,
      x_coord: x * 40, // Assuming CELL_SIZE = 40
      y_coord: y * 40,
      status: 'operational',
      is_visible_to_enemy: true
    });

    if (error) {
      alert("Failed to spawn POI: " + error.message);
    } else {
      setName('');
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-slate-200 mb-6 w-full max-w-4xl">
      <h2 className="text-xl font-bold mb-4 text-yellow-600">Construct POI</h2>
      <form onSubmit={handleCreatePoi} className="flex flex-wrap gap-4 items-end">
        
        {/* Preview Badge */}
        <div className="flex flex-col items-center justify-center mr-4">
          <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Preview</label>
          <div className="h-10 flex items-center justify-center">
            <PoiBadge type={type} owner={owner} size={32} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Name</label>
          <input type="text" className="border border-slate-300 rounded p-2 text-slate-700 w-40" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Checkpoint" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Type</label>
          <select className="border border-slate-300 rounded p-2 text-slate-700 w-36" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="military_base">Military Base</option>
            <option value="headquarters">Headquarters (HQ)</option>
            <option value="factory">Factory</option>
            <option value="bridge">Bridge</option>
            <option value="airfield">Airfield</option>
            <option value="bunker">Bunker</option>
            <option value="checkpoint">Checkpoint</option>
            <option value="depot">Supply Depot</option>
            <option value="port">Harbor / Port</option>
            <option value="radar">Radar Station</option>
            <option value="outpost">Outpost</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Owner</label>
          <select className="border border-slate-300 rounded p-2 text-slate-700 w-28" value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="Neutral">Neutral</option>
            <option value="Player A">Player A</option>
            <option value="Player B">Player B</option>
          </select>
        </div>
        <div className="flex gap-2">
           <div>
             <label className="block text-sm font-medium text-slate-600 mb-1">X Cell</label>
             <input type="number" className="border border-slate-300 rounded p-2 text-slate-700 w-16" value={x} onChange={(e) => setX(parseInt(e.target.value) || 0)} />
           </div>
           <div>
             <label className="block text-sm font-medium text-slate-600 mb-1">Y Cell</label>
             <input type="number" className="border border-slate-300 rounded p-2 text-slate-700 w-16" value={y} onChange={(e) => setY(parseInt(e.target.value) || 0)} />
           </div>
        </div>
        <button type="submit" className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-6 rounded-lg transition-colors ml-auto">
          Deploy to Map
        </button>
      </form>
    </div>
  );
}
