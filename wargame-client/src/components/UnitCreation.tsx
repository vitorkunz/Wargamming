"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function UnitCreation() {
  const [type, setType] = useState('Infantry');
  const [owner, setOwner] = useState('Player A');
  const [health, setHealth] = useState(100);

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Spawn in reserve.
    const { error } = await supabase.from('Battle_Units').insert({
      type,
      owner,
      health,
      x_coord: 0,
      y_coord: 0,
      is_visible_to_enemy: false,
      in_reserve: true
    });

    if (error) {
      alert("Failed to spawn unit: " + error.message);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-slate-200 mb-6 w-full max-w-4xl">
      <h2 className="text-xl font-bold mb-4 text-slate-700">Spawn New Unit</h2>
      <form onSubmit={handleCreateUnit} className="flex space-x-4 items-end">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Type</label>
          <select className="border border-slate-300 rounded p-2 text-slate-700" value={type} onChange={(e) => setType(e.target.value)}>
            <option>Infantry</option>
            <option>Tank</option>
            <option>Artillery</option>
            <option>HQ</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Owner</label>
          <select className="border border-slate-300 rounded p-2 text-slate-700" value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option>Player A</option>
            <option>Player B</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Health</label>
          <input type="number" className="border border-slate-300 rounded p-2 w-24 text-slate-700" value={health} onChange={(e) => setHealth(Number(e.target.value))} />
        </div>
        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
          Spawn to Reserve
        </button>
      </form>
    </div>
  );
}
