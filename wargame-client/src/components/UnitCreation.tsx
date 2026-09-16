"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { NatoSymbol } from './NatoSymbol';
import { 
  AFFILIATIONS, 
  UNIT_TYPES, 
  ECHELONS,
  UNIT_CATEGORIES,
  AffiliationKey,
  UnitTypeKey,
  EchelonKey
} from '@/lib/milsymbol/constants';

interface UnitCreationProps {
  table?: string;
  fixedOwner?: 'Player A' | 'Player B';
  title?: string;
}

export default function UnitCreation({ 
  table = 'Battle_Units', 
  fixedOwner,
  title = "Spawn New Unit"
}: UnitCreationProps) {
  const [name, setName] = useState('');
  const [health, setHealth] = useState(100);
  
  // SIDC components
  const [affiliation, setAffiliation] = useState<AffiliationKey>('friendly');
  const [type, setType] = useState<UnitTypeKey>('infantry');
  const [echelon, setEchelon] = useState<EchelonKey>('company');
  const [owner, setOwner] = useState<'Player A' | 'Player B'>((fixedOwner as 'Player A' | 'Player B') || 'Player A');

  // If fixedOwner is provided, we might want to lock affiliation, but it's okay for them to just match it.
  
  const affiliationCode = AFFILIATIONS[affiliation];
  const typeDef = UNIT_TYPES[type];
  const echelonCode = ECHELONS[echelon];
  const sidc = `S${affiliationCode}${typeDef.dimension}P${typeDef.code}-${echelonCode}---`;

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log("UnitCreation form submitted!");
      const assignedOwner = fixedOwner || owner;

      // We store the 15-char SIDC inside the 'type' column.
      const insertPayload: Record<string, string | number | boolean | null> = {
        name: name.trim() || null,
        type: sidc,
        owner: assignedOwner,
        health,
        ammo: 100,
        x_coord: 0,
        y_coord: 0,
        in_reserve: true
      };

      if (table === 'Battle_Units' || table === 'Moderator_Units') {
        insertPayload.is_visible_to_enemy = false;
      }

      console.log(`Attempting to insert into table: ${table} with payload:`, insertPayload);

      const { data, error } = await supabase.from(table).insert(insertPayload).select();

      console.log("Supabase response:", { data, error });

      if (error) {
        console.error("Supabase insert error:", error);
        alert("Failed to spawn unit: " + error.message + "\nCheck console for details.");
      } else {
        console.log("Unit spawned successfully!");
        setName('');
        alert("Unit created successfully!");
      }
    } catch (err: any) {
      console.error("Unexpected error in handleCreateUnit:", err);
      alert("Unexpected error: " + err.message);
    }
  };

  return (
    <div className="bg-surface-card p-4 rounded-xl shadow-sm border border-border-parchment w-full flex flex-col gap-4 relative overflow-hidden">
      
      <div className="flex items-center gap-4 border-b border-border-parchment/60 pb-3">
        {/* Live Preview */}
        <div className="w-16 h-16 flex flex-col items-center justify-center bg-surface-container border border-border-parchment rounded-lg p-1 shrink-0 shadow-inner">
          <NatoSymbol sidc={sidc} size={42} />
        </div>
        <h2 className="text-[12px] font-bold text-primary font-headline-sm flex-1">{title}</h2>
      </div>

      <div className="flex-1">
        <form onSubmit={handleCreateUnit} className="flex flex-col gap-3">
          <div>
            <label className="block font-tag-overline text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 font-bold">Callsign / Name</label>
            <input 
              type="text" 
              className="border border-border-parchment rounded-lg p-2 text-on-surface bg-surface-container w-full text-sm outline-none focus:border-primary shadow-inner" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Ex. Fragata Liberal F-43" 
            />
          </div>
          
          {!fixedOwner && (
            <div>
              <label className="block font-tag-overline text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 font-bold">Owner (Force)</label>
              <select className="border border-border-parchment rounded-lg p-2 text-on-surface bg-surface-container w-full text-sm outline-none font-semibold" value={owner} onChange={(e) => setOwner(e.target.value as 'Player A' | 'Player B')}>
                <option>Player A</option>
                <option>Player B</option>
              </select>
            </div>
          )}
          
          <div>
            <label className="block font-tag-overline text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 font-bold">Prontidão (%)</label>
            <div className="flex items-center bg-surface-container p-2 rounded-lg border border-border-parchment">
              <input type="range" min="0" max="100" className="flex-1 accent-primary" value={health} onChange={(e) => setHealth(Number(e.target.value))} />
              <span className="ml-3 text-xs font-bold text-primary w-8 text-right bg-surface-card px-1.5 py-0.5 rounded border border-border-parchment shadow-sm">{health}%</span>
            </div>
          </div>
          
          <div className="border-t pt-3 border-border-parchment/60 mt-1 flex flex-col gap-3">
            <div>
              <label className="block font-tag-overline text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 font-bold">Affiliation (Fação)</label>
              <select className="border border-border-parchment rounded-lg p-2 text-on-surface bg-surface-container w-full text-sm outline-none font-semibold" value={affiliation} onChange={(e) => setAffiliation(e.target.value as AffiliationKey)}>
                {Object.keys(AFFILIATIONS).map((key) => (
                  <option key={key} value={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block font-tag-overline text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 font-bold">Unit Type (Classe)</label>
              <select className="border border-border-parchment rounded-lg p-2 text-on-surface bg-surface-container w-full text-sm outline-none font-semibold" value={type} onChange={(e) => setType(e.target.value as UnitTypeKey)}>
                {UNIT_CATEGORIES.map((category) => (
                  <optgroup key={category} label={category}>
                    {Object.entries(UNIT_TYPES)
                      .filter(([, def]) => def.category === category)
                      .map(([key, def]) => (
                        <option key={key} value={key}>{def.label}</option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block font-tag-overline text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 font-bold">Echelon (Escalão)</label>
              <select className="border border-border-parchment rounded-lg p-2 text-on-surface bg-surface-container w-full text-sm outline-none font-semibold" value={echelon} onChange={(e) => setEchelon(e.target.value as EchelonKey)}>
                {Object.keys(ECHELONS).map((key) => (
                  <option key={key} value={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</option>
                ))}
              </select>
            </div>
            
            <button type="submit" className="w-full mt-3 bg-primary hover:bg-primary-fixed-dim text-white font-bold py-1.5 px-3 rounded-lg transition-colors font-headline-sm text-[10.5px] shadow-sm flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[15px]">add_circle</span>
              Spawn Unit to Reserves
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
