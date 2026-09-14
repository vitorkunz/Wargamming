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
    
    const assignedOwner = fixedOwner || owner;

    // We store the 15-char SIDC inside the 'type' column.
    const insertPayload: Record<string, string | number | boolean | null> = {
      name: name.trim() || null,
      type: sidc,
      owner: assignedOwner,
      health,
      x_coord: 0,
      y_coord: 0,
      in_reserve: true
    };

    if (table === 'Battle_Units') {
      insertPayload.is_visible_to_enemy = false;
    }

    const { error } = await supabase.from(table).insert(insertPayload);

    if (error) {
      alert("Failed to spawn unit: " + error.message);
    } else {
      setName('');
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-slate-200 mb-6 w-full max-w-4xl flex gap-6">
      
      {/* Live Preview */}
      <div className="w-32 h-32 flex flex-col items-center justify-center bg-slate-50 border rounded p-2 shrink-0">
        <NatoSymbol sidc={sidc} size={64} />
      </div>

      <div className="flex-1">
        <h2 className="text-xl font-bold mb-4 text-slate-700">{title}</h2>
        <form onSubmit={handleCreateUnit} className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Callsign / Name</label>
              <input 
                type="text" 
                className="border border-slate-300 rounded p-2 text-slate-700 bg-white w-48" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g. 1st Regiment" 
              />
            </div>
            {!fixedOwner && (
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Owner</label>
                <select className="border border-slate-300 rounded p-2 text-slate-700 bg-white" value={owner} onChange={(e) => setOwner(e.target.value as 'Player A' | 'Player B')}>
                  <option>Player A</option>
                  <option>Player B</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Health</label>
              <input type="number" className="border border-slate-300 rounded p-2 w-24 text-slate-700 bg-white" value={health} onChange={(e) => setHealth(Number(e.target.value))} />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 items-end border-t pt-4 border-slate-100 mt-2">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Affiliation</label>
              <select className="border border-slate-300 rounded p-2 text-slate-700 bg-white" value={affiliation} onChange={(e) => setAffiliation(e.target.value as AffiliationKey)}>
                {Object.keys(AFFILIATIONS).map((key) => (
                  <option key={key} value={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Unit Type</label>
              <select className="border border-slate-300 rounded p-2 text-slate-700 bg-white" value={type} onChange={(e) => setType(e.target.value as UnitTypeKey)}>
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
              <label className="block text-sm font-medium text-slate-600 mb-1">Echelon</label>
              <select className="border border-slate-300 rounded p-2 text-slate-700 bg-white" value={echelon} onChange={(e) => setEchelon(e.target.value as EchelonKey)}>
                {Object.keys(ECHELONS).map((key) => (
                  <option key={key} value={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</option>
                ))}
              </select>
            </div>
            
            <button type="submit" className="ml-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
              Spawn Unit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
