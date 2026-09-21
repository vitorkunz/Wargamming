"use client";
import React, { useState } from 'react';
import { Unit } from './MapGrid';
import { supabase } from '@/lib/supabaseClient';
import { NatoSymbol } from './NatoSymbol';
import { getSidcForUnit, getHumanReadableFromSidc, parseSidc } from '@/lib/milsymbol/utils';
import { AFFILIATIONS, UNIT_TYPES, ECHELONS, UNIT_CATEGORIES, AffiliationKey, UnitTypeKey, EchelonKey } from '@/lib/milsymbol/constants';
interface UnitPanelProps {
  units: Unit[];
  selectedUnit: Unit | null;
  onClose: () => void;
  onSelectUnit: (unitId: string | null) => void;
  isModerator: boolean;
  role?: string;
  activeTab?: 'planning' | 'battle';
  targetTable?: string;
}

export default function UnitPanel({ units, selectedUnit, onClose, onSelectUnit, isModerator, role, activeTab = 'battle', targetTable }: UnitPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [healthInput, setHealthInput] = React.useState(selectedUnit?.health?.toString() || '');
  const [nameInput, setNameInput] = React.useState(selectedUnit?.name || '');
  
  const [sortBy, setSortBy] = useState<'name' | 'health' | 'type'>('name');
  const [groupBy, setGroupBy] = useState<'status' | 'owner' | 'type' | 'none'>('status');
  const [activePanelTab, setActivePanelTab] = useState<'roster' | 'details'>('roster');

  const isPlanningMode = activeTab === 'planning';
  const canEditOrDelete = isModerator || isPlanningMode;
  const tableToUpdate = targetTable || (isPlanningMode ? 'Planning_Units' : 'Battle_Units');
  const canRename = isModerator || (Boolean(role) && selectedUnit?.owner === role);

  React.useEffect(() => {
    if (selectedUnit) {
      setHealthInput(selectedUnit.health.toString());
      setNameInput(selectedUnit.name || '');
      setActivePanelTab('details');
    } else {
      setActivePanelTab('roster');
    }
  }, [selectedUnit?.health, selectedUnit?.name, selectedUnit?.id]);

  const updateName = async () => {
    if (!selectedUnit || !canRename) return;
    const trimmed = nameInput.trim();
    if (trimmed === (selectedUnit.name || '')) return;

    const { error } = await supabase
      .from(tableToUpdate)
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
      .from(tableToUpdate)
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

    const typeDef = UNIT_TYPES[typeKey];
    const newSidc = `S${AFFILIATIONS[affiliationKey]}${typeDef.dimension}P${typeDef.code}-${ECHELONS[echelonKey]}---`;

    const { error } = await supabase
      .from(tableToUpdate)
      .update({ type: newSidc })
      .eq('id', selectedUnit.id);

    if (error) alert("Failed to update unit type: " + error.message);
  };

  const updateOwner = async (newOwner: string) => {
    if (!selectedUnit || !isModerator) return;
    const { error } = await supabase
      .from(tableToUpdate)
      .update({ owner: newOwner })
      .eq('id', selectedUnit.id);

    if (error) alert("Failed to update unit owner: " + error.message);
  };



  const toggleVisibility = async (visible?: boolean) => {
    if (!selectedUnit || !isModerator) return;
    const newValue = visible !== undefined ? visible : !selectedUnit.is_visible_to_enemy;
    const { error } = await supabase
      .from(tableToUpdate)
      .update({ is_visible_to_enemy: newValue })
      .eq('id', selectedUnit.id);

    if (error) alert("Failed to update visibility: " + error.message);
  };

  const toggleHealthVisibility = async () => {
    if (!selectedUnit || !isModerator) return;
    const { error } = await supabase
      .from(tableToUpdate)
      .update({ is_health_visible_to_enemy: !selectedUnit.is_health_visible_to_enemy })
      .eq('id', selectedUnit.id);

    if (error) alert("Failed to update health visibility: " + error.message);
  };

  const deleteUnit = async () => {
    if (!selectedUnit || !canEditOrDelete) return;
    
    const confirmDelete = window.confirm(`Are you sure you want to delete this ${selectedUnit.type}?`);
    if (!confirmDelete) return;

    const { error } = await supabase
      .from(tableToUpdate)
      .delete()
      .eq('id', selectedUnit.id);

    if (error) {
      alert("Failed to delete unit: " + error.message);
    } else {
      onSelectUnit(null); 
    }
  };

  const activeUnits = units.filter(u => !u.in_reserve);
  const reserveUnits = units.filter(u => u.in_reserve);


  const canSeeHealth = selectedUnit && (isModerator || selectedUnit.owner === role || selectedUnit.is_health_visible_to_enemy !== false);
  const factionColor = selectedUnit?.owner === 'Player A' ? 'text-faction-friendly bg-faction-friendly/15 border-faction-friendly/20' : 
                       selectedUnit?.owner === 'Player B' ? 'text-faction-hostile bg-faction-hostile/15 border-faction-hostile/20' : 
                       selectedUnit?.owner === 'Unknown' ? 'text-faction-unknown bg-faction-unknown/15 border-faction-unknown/20' :
                       'text-faction-neutral bg-faction-neutral/15 border-faction-neutral/20';
  const factionDotColor = selectedUnit?.owner === 'Player A' ? 'bg-faction-friendly' : selectedUnit?.owner === 'Player B' ? 'bg-faction-hostile' : selectedUnit?.owner === 'Unknown' ? 'bg-faction-unknown' : 'bg-faction-neutral';

  return (
    <div className="flex flex-col h-full bg-surface-parchment/95 text-on-surface">
      {/* Segmented Tab Header */}
      <div className="bg-primary-container p-2 flex items-center gap-1.5 shadow-sm border-b border-white/10 shrink-0">
        <button 
          onClick={() => setActivePanelTab('roster')}
          className={`flex-1 py-1.5 px-2 text-center font-label-md text-[12px] rounded-lg transition-colors ${activePanelTab === 'roster' ? 'bg-surface-card text-primary font-bold shadow-sm' : 'text-text-on-dark/80 hover:text-text-on-dark hover:bg-chrome-hover'}`}
        >
          Roster ({units.length})
        </button>
        <button 
          onClick={() => setActivePanelTab('details')}
          disabled={!selectedUnit}
          className={`flex-1 py-1.5 px-2 text-center font-label-md text-[12px] rounded-lg transition-colors flex items-center justify-center gap-1.5 ${activePanelTab === 'details' ? 'bg-surface-card text-primary font-bold shadow-sm' : 'text-text-on-dark/80 hover:text-text-on-dark hover:bg-chrome-hover disabled:opacity-50'}`}
        >
          {selectedUnit && <span className="w-2 h-2 rounded-full bg-status-alert animate-ping"></span>}
          Detalhes
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
        {activePanelTab === 'details' && selectedUnit ? (
          <>
            {/* CARD 1: Header Identification Card */}
            <div className="bg-surface-card/95 p-4 rounded-xl border border-border-parchment shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col flex-1">
                  <span className="font-tag-overline text-[10px] text-primary uppercase font-bold tracking-wider">
                    {getHumanReadableFromSidc(selectedUnit.type)}
                  </span>
                  {canRename ? (
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onBlur={updateName}
                      onKeyDown={(e) => e.key === 'Enter' && updateName()}
                      className="font-headline-md text-[18px] font-bold text-primary tracking-tight leading-tight mt-0.5 bg-surface-container rounded px-1 -mx-1 border border-transparent hover:border-outline-variant focus:border-primary focus:outline-none"
                    />
                  ) : (
                    <h3 className="font-headline-md text-[18px] font-bold text-primary tracking-tight leading-tight mt-0.5">
                      {selectedUnit.name || 'Unnamed Unit'}
                    </h3>
                  )}
                  <span className="font-tag-overline text-[10px] text-on-surface-variant mt-1">ID: {selectedUnit.id.substring(0, 8).toUpperCase()}</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-surface-container text-on-surface flex items-center justify-center shadow-md flex-shrink-0">
                  <NatoSymbol sidc={getSidcForUnit(selectedUnit)} size={36} />
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border-parchment/60">
                <span className={`font-label-md text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 border ${factionColor}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${factionDotColor}`}></span>
                  {selectedUnit.owner}
                </span>
                {isModerator && selectedUnit.is_visible_to_enemy && (
                  <span className="bg-status-alert/15 text-status-alert font-label-md text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 border border-status-alert/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-alert"></span>
                    Contact Detected (Visible)
                  </span>
                )}
              </div>
            </div>

            {/* CARD 2: Combat Stats / Readiness */}
            <div className="bg-surface-card/95 p-4 rounded-xl border border-border-parchment shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-tag-overline text-[10px] text-primary uppercase font-bold tracking-wider">Operational Readings / Status</span>
                <span className="material-symbols-outlined text-primary text-[16px]">tune</span>
              </div>
              
              <div className="bg-surface-parchment/50 p-2.5 rounded-lg border border-border-parchment/70">
                <div className="flex justify-between items-center text-label-sm font-semibold mb-1.5">
                  <span className="text-on-surface">Combat Strength / ProntidÃ£o</span>
                  <span className="font-bold text-primary text-[13px] bg-white px-2 py-0.5 rounded border border-border-parchment shadow-xs">
                    {canSeeHealth ? `${healthInput}%` : '?'}
                  </span>
                </div>
                {canEditOrDelete ? (
                  <input 
                    className="w-full accent-primary h-2 bg-surface-container rounded-lg cursor-pointer" 
                    max="100" min="0" type="range" 
                    value={healthInput}
                    onChange={(e) => setHealthInput(e.target.value)}
                    onMouseUp={updateHealth}
                    onTouchEnd={updateHealth}
                  />
                ) : (
                  <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                    {canSeeHealth && <div className="bg-primary h-full rounded-full" style={{ width: `${selectedUnit.health}%` }}></div>}
                  </div>
                )}
              </div>
            </div>

            {/* CARD: Configuration / Details */}
            {isModerator && (
              <div className="bg-surface-card/95 p-4 rounded-xl border border-border-parchment shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-tag-overline text-[10px] text-primary uppercase font-bold tracking-wider">ConfiguraÃ§Ã£o TÃ¡tica</span>
                  <span className="material-symbols-outlined text-primary text-[16px]">settings</span>
                </div>
                
                <div className="space-y-2 text-label-sm mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-on-surface">Type</span>
                    <select 
                      value={parseSidc(getSidcForUnit(selectedUnit)).typeKey}
                      onChange={(e) => updateSidcPart('type', e.target.value)}
                      className="p-1 text-xs border border-border-parchment rounded bg-surface-card text-on-surface max-w-[150px]"
                    >
                      {UNIT_CATEGORIES.map((category) => (
                        <optgroup key={category} label={category}>
                          {Object.entries(UNIT_TYPES).filter(([, def]) => def.category === category).map(([key, def]) => (
                            <option key={key} value={key}>{def.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-on-surface">Owner</span>
                    <select 
                      value={selectedUnit.owner}
                      onChange={(e) => updateOwner(e.target.value)}
                      className="p-1 text-xs border border-border-parchment rounded bg-surface-card text-on-surface max-w-[120px]"
                    >
                      <option value="Player A">Player A</option>
                      <option value="Player B">Player B</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* CARD 5: Command Action Panel */}
            {(isModerator || canEditOrDelete) && (
              <div className="bg-surface-card/95 p-4 rounded-xl border border-border-parchment shadow-sm space-y-2.5">
                <span className="font-tag-overline text-[10px] text-primary uppercase font-bold tracking-wider block">Painel de AÃ§Ãµes do Comando</span>
                
                {isModerator && (
                  <div className="bg-surface-parchment-dim/80 rounded-lg p-2 border border-border-parchment space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-tag-overline text-[9px] uppercase font-bold text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-secondary">radar</span>
                        Visibilidade Inimiga
                      </span>
                      {selectedUnit.is_visible_to_enemy && (
                        <span className="bg-status-alert/15 text-status-alert font-tag-overline text-[9px] px-2 py-0.5 rounded-full font-bold border border-status-alert/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-status-alert"></span>VisÃ­vel
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-surface-container rounded-lg border border-border-parchment/60">
                      <button 
                        type="button" 
                        onClick={() => toggleVisibility(true)} 
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-label-md text-[11px] transition-all ${selectedUnit.is_visible_to_enemy ? 'font-bold bg-surface-card text-primary shadow-sm border border-border-parchment' : 'font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-card/60'}`}
                      >
                        <span className={`material-symbols-outlined text-[15px] ${selectedUnit.is_visible_to_enemy ? 'text-status-alert' : ''}`}>visibility</span>
                        <span>VisÃ­vel</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => toggleVisibility(false)} 
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-label-md text-[11px] transition-all ${!selectedUnit.is_visible_to_enemy ? 'font-bold bg-surface-card text-primary shadow-sm border border-border-parchment' : 'font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-card/60'}`}
                      >
                        <span className="material-symbols-outlined text-[15px]">visibility_off</span>
                        <span>Oculto</span>
                      </button>
                    </div>
                  </div>
                )}
                
                {canEditOrDelete && (
                  <button
                    onClick={deleteUnit}
                    type="button"
                    className="w-full bg-status-critical/10 hover:bg-status-critical hover:text-white text-status-critical font-label-md text-[12px] py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 mt-1 border border-status-critical/30 font-semibold"
                  >
                    <span className="material-symbols-outlined text-[16px]">dangerous</span>
                    <span>Destruir / Eliminar Unidade</span>
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex gap-2 mb-4 shrink-0">
              <div className="flex-1">
                <label className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1 tracking-wider">Group By</label>
                <select 
                  value={groupBy} 
                  onChange={(e) => setGroupBy(e.target.value as any)}
                  className="w-full text-xs p-1.5 border border-border-parchment rounded bg-surface-card text-on-surface outline-none shadow-sm"
                >
                  <option value="status">Status (Map/Reserve)</option>
                  <option value="owner">Team</option>
                  <option value="type">Unit Type</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1 tracking-wider">Sort By</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full text-xs p-1.5 border border-border-parchment rounded bg-surface-card text-on-surface outline-none shadow-sm"
                >
                  <option value="name">Name</option>
                  <option value="health">ProntidÃ£o</option>
                  <option value="type">Unit Type</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              {(() => {
                const sortUnits = (list: Unit[]) => {
                  return [...list].sort((a, b) => {
                    if (sortBy === 'name') return (a.name || getHumanReadableFromSidc(a.type)).localeCompare(b.name || getHumanReadableFromSidc(b.type));
                    if (sortBy === 'health') return b.health - a.health;
                    if (sortBy === 'type') return getHumanReadableFromSidc(a.type).localeCompare(getHumanReadableFromSidc(b.type));
                    return 0;
                  });
                };

                const renderUnitGroup = (title: string, list: Unit[]) => {
                  if (list.length === 0) return null;
                  const sorted = sortUnits(list);
                  return (
                    <div key={title} className="mb-4">
                      <h3 className="text-xs font-bold text-primary uppercase mb-2 flex justify-between tracking-wider">
                        <span>{title}</span>
                        <span className="bg-surface-dim text-on-surface px-1.5 rounded text-[10px] py-0.5">{sorted.length}</span>
                      </h3>
                      <div className="space-y-1.5">
                        {sorted.map(u => (
                          <UnitListItem 
                            key={u.id} 
                            unit={u} 
                            selected={u.id === selectedUnit?.id} 
                            onClick={() => onSelectUnit(u.id)} 
                            canSeeHealth={isModerator || u.owner === role || u.is_health_visible_to_enemy !== false}
                          />
                        ))}
                      </div>
                    </div>
                  );
                };

                if (groupBy === 'status') {
                  return (
                    <>
                      {renderUnitGroup('On Map', units.filter(u => !u.in_reserve))}
                      {renderUnitGroup('Reserves', units.filter(u => u.in_reserve))}
                    </>
                  );
                } else if (groupBy === 'owner') {
                  const owners = Array.from(new Set(units.map(u => u.owner)));
                  return owners.map(owner => renderUnitGroup(owner, units.filter(u => u.owner === owner)));
                } else if (groupBy === 'type') {
                  const types = Array.from(new Set(units.map(u => getHumanReadableFromSidc(u.type))));
                  return types.map(t => renderUnitGroup(t, units.filter(u => getHumanReadableFromSidc(u.type) === t)));
                } else {
                  return renderUnitGroup('All Units', units);
                }
              })()}
              {units.length === 0 && <p className="text-xs text-on-surface-variant italic mt-4 text-center">Nenhuma unidade encontrada.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function UnitListItem({ unit, selected, onClick, canSeeHealth }: { unit: Unit, selected: boolean, onClick: () => void, canSeeHealth: boolean }) {
  const factionBorderClass = unit.owner === 'Player A' ? 'border-l-faction-friendly' : unit.owner === 'Player B' ? 'border-l-faction-hostile' : unit.owner === 'Unknown' ? 'border-l-faction-unknown' : 'border-l-faction-neutral';
  
  return (
    <div 
      onClick={onClick}
      className={`p-2.5 rounded-lg border-l-4 cursor-pointer flex items-center justify-between transition-all border-y border-r border-y-border-parchment border-r-border-parchment ${factionBorderClass} ${
        selected ? 'bg-secondary-fixed/20 shadow-sm ring-1 ring-secondary-fixed/50' : 'bg-surface-card hover:bg-surface-parchment-dim hover:shadow-sm'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center flex-shrink-0">
          <NatoSymbol sidc={getSidcForUnit(unit)} size={28} />
        </div>
        <div className="truncate">
          <div className="font-label-md text-[12px] font-bold text-on-surface truncate">
            {unit.name ? unit.name : getHumanReadableFromSidc(unit.type)}
          </div>
          <div className="font-tag-overline text-[9px] text-on-surface-variant font-bold truncate">
            {unit.name ? `${getHumanReadableFromSidc(unit.type)} â€¢ ` : ''}{unit.owner} {unit.is_visible_to_enemy ? '(VisÃ­vel)' : ''}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end flex-shrink-0 pl-2">
         <div className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${canSeeHealth ? (unit.health > 50 ? 'bg-emerald-100 text-emerald-800' : unit.health > 20 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800') : 'bg-surface-container text-on-surface-variant'}`}>
           {canSeeHealth ? `${unit.health}%` : '?'}
         </div>
      </div>
    </div>
  )
}
