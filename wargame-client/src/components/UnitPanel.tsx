"use client";
import React, { useState } from 'react';
import { Unit } from './MapGrid';
import { supabase } from '@/lib/supabaseClient';
import { NatoSymbol } from './NatoSymbol';
import { getSidcForUnit, getHumanReadableFromSidc, parseSidc } from '@/lib/milsymbol/utils';
import { AFFILIATIONS, UNIT_TYPES, ECHELONS, AffiliationKey, UnitTypeKey, EchelonKey } from '@/lib/milsymbol/constants';
interface UnitPanelProps {
  units: Unit[];
  selectedUnit: Unit | null;
  onClose: () => void;
  onSelectUnit: (unitId: string | null) => void;
  isModerator: boolean;
  role?: string;
  activeTab?: 'planning' | 'battle';
}

export default function UnitPanel({ units, selectedUnit, onClose, onSelectUnit, isModerator, role, activeTab = 'battle' }: UnitPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [healthInput, setHealthInput] = React.useState(selectedUnit?.health.toString() || '');
  const [nameInput, setNameInput] = React.useState(selectedUnit?.name || '');

  const isPlanningMode = activeTab === 'planning';
  const canEditOrDelete = isModerator || isPlanningMode;
  const targetTable = isPlanningMode ? 'Planning_Units' : 'Battle_Units';
  const canRename = isModerator || (Boolean(role) && selectedUnit?.owner === role);

  React.useEffect(() => {
    if (selectedUnit) {
      setHealthInput(selectedUnit.health.toString());
      setNameInput(selectedUnit.name || '');
    }
  }, [selectedUnit?.health, selectedUnit?.name, selectedUnit?.id]);

  const updateName = async () => {
    if (!selectedUnit || !canRename) return;
    const trimmed = nameInput.trim();
    if (trimmed === (selectedUnit.name || '')) return;

    const { error } = await supabase
      .from(targetTable)
      .update({ name: trimmed || null })
      .eq('id', selectedUnit.id);

    if (error) {
      alert("Failed to update unit name: " + error.message);
      setNameInput(selectedUnit.name || '');
    }
  };

  const updateHealth = async () => {
    if (!selectedUnit || !canEditOrDelete) return;
    const newHealth = parseInt(healthInput);
    if (isNaN(newHealth) || newHealth === selectedUnit.health) return;
    
    const { error } = await supabase
      .from(targetTable)
      .update({ health: newHealth })
      .eq('id', selectedUnit.id);

    if (error) {
      alert("Failed to update health: " + error.message);
      setHealthInput(selectedUnit.health.toString());
    }
  };

  const updateSidcPart = async (part: 'affiliation' | 'type' | 'echelon', value: string) => {
    if (!selectedUnit || !isModerator) return;
    
    // Parse current SIDC or generate one
    const currentSidc = getSidcForUnit(selectedUnit);
    const parsed = parseSidc(currentSidc);
    
    let { affiliationKey, typeKey, echelonKey } = parsed;
    if (part === 'affiliation') affiliationKey = value as AffiliationKey;
    if (part === 'type') typeKey = value as UnitTypeKey;
    if (part === 'echelon') echelonKey = value as EchelonKey;

    const newSidc = `S${AFFILIATIONS[affiliationKey]}GP${UNIT_TYPES[typeKey]}-${ECHELONS[echelonKey]}---`;

    const { error } = await supabase
      .from(targetTable)
      .update({ type: newSidc })
      .eq('id', selectedUnit.id);

    if (error) alert("Failed to update unit type: " + error.message);
  };

  const updateOwner = async (newOwner: string) => {
    if (!selectedUnit || !isModerator) return;
    const { error } = await supabase
      .from(targetTable)
      .update({ owner: newOwner })
      .eq('id', selectedUnit.id);

    if (error) alert("Failed to update unit owner: " + error.message);
  };



  const toggleVisibility = async () => {
    if (!selectedUnit || !isModerator) return;
    const { error } = await supabase
      .from('Battle_Units')
      .update({ is_visible_to_enemy: !selectedUnit.is_visible_to_enemy })
      .eq('id', selectedUnit.id);

    if (error) alert("Failed to update visibility: " + error.message);
  };

  const deleteUnit = async () => {
    if (!selectedUnit || !canEditOrDelete) return;
    
    const confirmDelete = window.confirm(`Are you sure you want to delete this ${selectedUnit.type}?`);
    if (!confirmDelete) return;

    const { error } = await supabase
      .from(targetTable)
      .delete()
      .eq('id', selectedUnit.id);

    if (error) {
      alert("Failed to delete unit: " + error.message);
    } else {
      onSelectUnit(null); 
    }
  };

  if (!isOpen) {
    return (
      <aside className="absolute right-0 top-0 w-12 bg-slate-800 text-white flex flex-col items-center py-4 shadow-xl transition-all duration-300 z-50 h-full shrink-0">
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          title="Open Unit Roster Panel"
        >
          {/* Chevron pointing left to expand the panel out towards the left */}
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </aside>
    );
  }

  const activeUnits = units.filter(u => !u.in_reserve);
  const reserveUnits = units.filter(u => u.in_reserve);

  return (
    <aside className="absolute right-0 top-0 w-80 bg-white border-l border-slate-300 shadow-2xl flex flex-col h-full z-50 transition-all duration-300 shrink-0">
      
      <div className="p-4 bg-slate-800 text-white flex justify-between items-center shrink-0">
        <h2 className="text-lg font-bold tracking-wider uppercase">Unit Roster</h2>
        <button 
          onClick={() => setIsOpen(false)} 
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          title="Close Unit Roster Panel"
        >
          {/* Chevron pointing right to collapse the panel back towards the right */}
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* TOP SECTION: Selected Unit Details */}
        {selectedUnit ? (
          <div className="p-5 border-b border-slate-300 bg-slate-50 shrink-0 shadow-sm z-10 relative">
            <div className="flex justify-between items-start mb-3">
               <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Unit Details</h3>
               <button onClick={() => onSelectUnit(null)} className="text-xs font-semibold text-slate-400 hover:text-slate-600 bg-slate-200 px-2 py-0.5 rounded">Clear</button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                  Unit Name / Callsign {canRename && <span className="text-[10px] text-blue-500 font-normal lowercase">(press enter or click away to save)</span>}
                </label>
                {canRename ? (
                  <input
                    type="text"
                    value={nameInput}
                    placeholder="e.g. 1st Regiment, Strike Battalion..."
                    onChange={(e) => setNameInput(e.target.value)}
                    onBlur={updateName}
                    onKeyDown={(e) => e.key === 'Enter' && updateName()}
                    className="w-full p-1.5 text-sm font-bold border border-slate-300 rounded focus:ring-blue-500 outline-none bg-white text-slate-800"
                  />
                ) : (
                  <p className="font-bold text-slate-700 text-sm">{selectedUnit.name || '(Unnamed Unit)'}</p>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-slate-200 mt-2">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">NATO Settings & Owner</span>
                
                {isModerator ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-600">Type</span>
                      <select 
                        value={parseSidc(getSidcForUnit(selectedUnit)).typeKey}
                        onChange={(e) => updateSidcPart('type', e.target.value)}
                        className="p-1 text-xs font-bold border border-slate-300 rounded bg-white max-w-[120px]"
                      >
                        {Object.keys(UNIT_TYPES).map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-600">Echelon</span>
                      <select 
                        value={parseSidc(getSidcForUnit(selectedUnit)).echelonKey}
                        onChange={(e) => updateSidcPart('echelon', e.target.value)}
                        className="p-1 text-xs font-bold border border-slate-300 rounded bg-white max-w-[120px]"
                      >
                        {Object.keys(ECHELONS).map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-600">Affiliation</span>
                      <select 
                        value={parseSidc(getSidcForUnit(selectedUnit)).affiliationKey}
                        onChange={(e) => updateSidcPart('affiliation', e.target.value)}
                        className="p-1 text-xs font-bold border border-slate-300 rounded bg-white max-w-[120px]"
                      >
                        {Object.keys(AFFILIATIONS).map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-600">Owner</span>
                      <select 
                        value={selectedUnit.owner}
                        onChange={(e) => updateOwner(e.target.value)}
                        className="p-1 text-xs font-bold border border-slate-300 rounded bg-white max-w-[120px]"
                      >
                        <option value="Player A">Player A</option>
                        <option value="Player B">Player B</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-600">Type</span>
                      <span className="font-bold text-slate-700 text-sm">{getHumanReadableFromSidc(selectedUnit.type)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-600">Owner</span>
                      <span className="font-medium text-slate-600 flex items-center gap-2 text-sm">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          selectedUnit.owner === 'Player A' ? 'bg-red-600' : 
                          selectedUnit.owner === 'Player B' ? 'bg-yellow-500' : 'bg-purple-500'
                        }`} />
                        {selectedUnit.owner}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Health</span>
                {canEditOrDelete ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={healthInput}
                      onChange={(e) => setHealthInput(e.target.value)}
                      onBlur={updateHealth}
                      onKeyDown={(e) => e.key === 'Enter' && updateHealth()}
                      className="w-16 p-1 text-sm font-medium border border-slate-300 rounded focus:ring-blue-500 outline-none text-right bg-white text-slate-800"
                      min={0}
                      max={100}
                    />
                  </div>
                ) : (
                  <span className={`font-medium text-sm ${selectedUnit.health > 50 ? 'text-green-600' : selectedUnit.health > 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {selectedUnit.health} / 100
                  </span>
                )}
              </div>

              {(isModerator || canEditOrDelete) && (
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  {isModerator && (
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedUnit.is_visible_to_enemy || false} 
                        onChange={toggleVisibility}
                        className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                      <span className="font-medium text-sm text-slate-700">Visible to Enemy</span>
                    </label>
                  )}
                  
                  {canEditOrDelete && (
                    <button
                      onClick={deleteUnit}
                      className="w-full py-1.5 px-3 bg-red-50 text-red-600 text-sm font-semibold rounded border border-red-200 hover:bg-red-100 transition-colors"
                    >
                      Delete Unit
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0 text-center text-slate-400 italic text-sm">
            Select a unit to view details
          </div>
        )}

        {/* BOTTOM SECTION: Unit Roster */}
        <div className="flex-1 overflow-auto p-4 space-y-6 bg-white">
           
           {/* Active Units */}
           <div>
             <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 flex justify-between tracking-wider">
               <span>On Map</span>
               <span className="bg-slate-100 text-slate-500 px-1.5 rounded text-[10px] py-0.5">{activeUnits.length}</span>
             </h3>
             <div className="space-y-1.5">
               {activeUnits.map(u => (
                 <UnitListItem key={u.id} unit={u} selected={u.id === selectedUnit?.id} onClick={() => onSelectUnit(u.id)} />
               ))}
               {activeUnits.length === 0 && <p className="text-xs text-slate-400 italic">No units deployed.</p>}
             </div>
           </div>

           {/* Reserve Units */}
           <div>
             <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 flex justify-between tracking-wider mt-4">
               <span>Reserves</span>
               <span className="bg-slate-100 text-slate-500 px-1.5 rounded text-[10px] py-0.5">{reserveUnits.length}</span>
             </h3>
             <div className="space-y-1.5">
               {reserveUnits.map(u => (
                 <UnitListItem key={u.id} unit={u} selected={u.id === selectedUnit?.id} onClick={() => onSelectUnit(u.id)} />
               ))}
               {reserveUnits.length === 0 && <p className="text-xs text-slate-400 italic">No units in reserve.</p>}
             </div>
           </div>

        </div>
      </div>
    </aside>
  );
}

function UnitListItem({ unit, selected, onClick }: { unit: Unit, selected: boolean, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`p-2 rounded border cursor-pointer flex items-center justify-between transition-colors ${
        selected ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <NatoSymbol sidc={getSidcForUnit(unit)} size={28} />
        <div>
          <div className="font-bold text-xs text-slate-700">
            {unit.name ? unit.name : getHumanReadableFromSidc(unit.type)}
          </div>
          <div className="text-[9px] text-slate-500 uppercase font-semibold">
            {unit.name ? `${getHumanReadableFromSidc(unit.type)} • ` : ''}{unit.owner} {unit.is_visible_to_enemy ? '(Visible)' : ''}
          </div>
        </div>
      </div>
      <div className={`font-mono text-xs font-bold ${unit.health > 50 ? 'text-green-600' : unit.health > 20 ? 'text-yellow-600' : 'text-red-600'}`}>
        {unit.health}
      </div>
    </div>
  )
}
