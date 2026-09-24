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
    <div className="bg-surface-card p-4 rounded-xl shadow-sm border border-border-parchment w-full flex flex-col gap-4 relative overflow-hidden">
      
      <div className="flex items-center gap-4 border-b border-border-parchment/60 pb-3">
        {/* Live Preview */}
        <div className="w-16 h-16 flex flex-col items-center justify-center bg-surface-container border border-border-parchment rounded-lg p-1 shrink-0 shadow-inner">
          <PoiBadge type={type} owner={owner} size={42} />
        </div>
        <h2 className="text-[12px] font-bold text-primary font-headline-sm flex-1">Construir POI</h2>
      </div>

      <div className="flex-1">
        <form onSubmit={handleCreatePoi} className="flex flex-col gap-3">
          <div>
            <label className="block font-tag-overline text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 font-bold">Nome</label>
            <input 
              type="text" 
              className="border border-border-parchment rounded-lg p-2 text-on-surface bg-surface-container w-full text-sm outline-none focus:border-primary shadow-inner" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Ex: Ponto de Controle Alpha" 
            />
          </div>
          
          <div>
            <label className="block font-tag-overline text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 font-bold">Tipo</label>
            <select className="border border-border-parchment rounded-lg p-2 text-on-surface bg-surface-container w-full text-sm outline-none font-semibold" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="military_base">Base Militar</option>
              <option value="headquarters">Quartel General (HQ)</option>
              <option value="factory">Fábrica</option>
              <option value="bridge">Ponte</option>
              <option value="airfield">Aeródromo / Base Aérea</option>
              <option value="bunker">Bunker</option>
              <option value="checkpoint">Ponto de Controle (Checkpoint)</option>
              <option value="depot">Depósito de Suprimentos</option>
              <option value="port">Porto / Base Naval</option>
              <option value="radar">Estação de Radar</option>
              <option value="outpost">Posto Avançado</option>
            </select>
          </div>
          
          <div>
            <label className="block font-tag-overline text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 font-bold">Proprietário</label>
            <select className="border border-border-parchment rounded-lg p-2 text-on-surface bg-surface-container w-full text-sm outline-none font-semibold" value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="Neutral">Neutro</option>
              <option value="Player A">Time A</option>
              <option value="Player B">Time B</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1">
             <div>
               <label className="block font-tag-overline text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 font-bold">Célula X</label>
               <input type="number" className="border border-border-parchment rounded-lg p-2 text-on-surface bg-surface-container w-full text-sm outline-none shadow-inner" value={x} onChange={(e) => setX(parseInt(e.target.value) || 0)} />
             </div>
             <div>
               <label className="block font-tag-overline text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 font-bold">Célula Y</label>
               <input type="number" className="border border-border-parchment rounded-lg p-2 text-on-surface bg-surface-container w-full text-sm outline-none shadow-inner" value={y} onChange={(e) => setY(parseInt(e.target.value) || 0)} />
             </div>
          </div>
          
          <button type="submit" className="w-full mt-3 bg-primary hover:bg-primary-fixed-dim text-white font-bold py-1.5 px-3 rounded-lg transition-colors font-headline-sm text-[10.5px] shadow-sm flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-[15px]">add_location</span>
            Implantar no Mapa
          </button>
        </form>
      </div>
    </div>
  );
}
