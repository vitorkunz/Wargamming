"use client";
import React, { useState, useEffect } from 'react';
import { Unit } from './MapGrid';
import { supabase } from '@/lib/supabaseClient';
import { getSidcForUnit, getHumanReadableFromSidc, parseSidc } from '@/lib/milsymbol/utils';
import { UNIT_TYPES, UnitTypeKey } from '@/lib/milsymbol/constants';
import { NatoSymbol } from './NatoSymbol';

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

export default function UnitPanel({
  units,
  selectedUnit,
  onClose,
  onSelectUnit,
  isModerator,
  role,
  activeTab = 'battle',
  targetTable
}: UnitPanelProps) {
  const [activePanelTab, setActivePanelTab] = useState<'roster' | 'details'>(
    selectedUnit ? 'details' : 'roster'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [factionFilter, setFactionFilter] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<'faction' | 'type' | 'status'>('faction');

  const [healthInput, setHealthInput] = useState(selectedUnit?.health?.toString() || '');
  const [nameInput, setNameInput] = useState(selectedUnit?.name || '');

  const isPlanningMode = activeTab === 'planning';
  const canEditOrDelete = isModerator || isPlanningMode;
  const tableToUpdate = targetTable || (isPlanningMode ? 'Planning_Units' : 'Battle_Units');
  const canRename = isModerator || (Boolean(role) && selectedUnit?.owner === role);

  useEffect(() => {
    if (selectedUnit) {
      setHealthInput(selectedUnit.health.toString());
      setNameInput(selectedUnit.name || '');
      setActivePanelTab('details');
    } else {
      setActivePanelTab('roster');
    }
  }, [selectedUnit]);

  const updateName = async () => {
    if (!selectedUnit || !canRename) return;
    const trimmed = nameInput.trim();
    if (trimmed === (selectedUnit.name || '')) return;
    await supabase.from(tableToUpdate).update({ name: trimmed || null }).eq('id', selectedUnit.id);
  };

  const updateType = async (newTypeKey: string) => {
    if (!selectedUnit || !canEditOrDelete) return;
    const def = UNIT_TYPES[newTypeKey as UnitTypeKey];
    if (!def) return;
    const affilCode = selectedUnit.type[1] || 'F';
    const newSidc = `S${affilCode}${def.dimension}P${def.code}-----`;
    await supabase.from(tableToUpdate).update({ type: newSidc }).eq('id', selectedUnit.id);
  };

  const updateHealth = async (newHealth: number) => {
    if (!selectedUnit || !canEditOrDelete) return;
    if (isNaN(newHealth) || newHealth === selectedUnit.health) return;
    await supabase.from(tableToUpdate).update({ health: newHealth }).eq('id', selectedUnit.id);
  };

  const updateAmmo = async (newAmmo: number) => {
    if (!selectedUnit || !canEditOrDelete) return;
    if (isNaN(newAmmo) || newAmmo === (selectedUnit.ammo ?? 100)) return;
    await supabase.from(tableToUpdate).update({ ammo: newAmmo }).eq('id', selectedUnit.id);
  };

  const updateOwner = async (newOwner: string) => {
    if (!selectedUnit || !isModerator) return;
    if (newOwner === selectedUnit.owner) return;
    await supabase.from(tableToUpdate).update({ owner: newOwner }).eq('id', selectedUnit.id);
  };

  const toggleVisibility = async (visible?: boolean) => {
    if (!selectedUnit || !isModerator) return;
    const newValue = visible !== undefined ? visible : !selectedUnit.is_visible_to_enemy;
    await supabase.from(tableToUpdate).update({ is_visible_to_enemy: newValue }).eq('id', selectedUnit.id);
  };

  const moveToReserve = async () => {
    if (!selectedUnit || !canEditOrDelete) return;
    await supabase.from(tableToUpdate).update({ in_reserve: true }).eq('id', selectedUnit.id);
    onSelectUnit(null);
  };

  const deleteUnit = async () => {
    if (!selectedUnit || !canEditOrDelete) return;
    if (!window.confirm(`Confirmar destruição ou eliminação de ${selectedUnit.name || getHumanReadableFromSidc(selectedUnit.type)}?`)) return;
    await supabase.from(tableToUpdate).delete().eq('id', selectedUnit.id);
    onSelectUnit(null);
  };

  const activeUnits = units.filter((u) => !u.in_reserve);

  const filteredUnits = activeUnits.filter((unit) => {
    if (factionFilter !== 'all' && unit.owner !== factionFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const readable = getHumanReadableFromSidc(unit.type).toLowerCase();
      return (
        (unit.name || '').toLowerCase().includes(q) ||
        readable.includes(q)
      );
    }
    return true;
  });

  const getStatusText = (health: number) => {
    if (health >= 70) return 'PRONTIDÃO NORMAL';
    if (health >= 30) return 'CAPACIDADE DEGRADADA';
    return 'EM COMBATE / CRÍTICO';
  };

  return (
    <div className="w-full h-full flex flex-col select-none">
      {/* Tab Switcher Header */}
      <div className="bg-primary-container p-1 flex items-center gap-1 shadow-sm border-b border-white/10 text-white">
        <button
          type="button"
          onClick={() => { setActivePanelTab('roster'); onSelectUnit(null); }}
          className={`flex-1 py-1 px-1.5 text-center text-[9px] rounded-md transition-all flex items-center justify-center gap-1 ${
            activePanelTab === 'roster'
              ? 'bg-white text-primary font-bold shadow-sm'
              : 'text-surface-parchment/80 hover:text-white hover:bg-chrome-hover'
          }`}
        >
          <span>Roster ({activeUnits.length})</span>
        </button>
        <button
          type="button"
          onClick={() => { if(selectedUnit) setActivePanelTab('details'); }}
          className={`flex-1 py-1 px-1.5 text-center text-[9px] rounded-md transition-all flex items-center justify-center gap-1 ${
            activePanelTab === 'details'
              ? 'bg-white text-primary font-bold shadow-sm'
              : 'text-surface-parchment/80 hover:text-white hover:bg-chrome-hover'
          }`}
        >
          <span>Detalhes</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-primary-fixed-dim hover:text-white hover:bg-white/10 transition-colors ml-0.5"
          title="Recolher Dossiê"
        >
          <span className="material-symbols-outlined text-[15px]">keyboard_double_arrow_right</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 text-on-surface custom-scrollbar">
        {/* ROSTER TAB CONTENT */}
        {activePanelTab === 'roster' && (
          <div className="space-y-1.5">
            {/* Search & Filter Header Box */}
            <div className="bg-white/95 p-1 rounded-lg border border-border-parchment shadow-sm space-y-1">
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-1.5 text-outline text-[11px]">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar por indicativo ou classe..."
                  className="w-full pl-5 pr-1.5 py-0.5 rounded text-[8px] font-body-base bg-surface-parchment-dim/80 text-on-surface border border-border-parchment focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-0.5 overflow-x-auto pb-0.5 text-[7.5px] font-bold custom-scrollbar">
                <button
                  type="button"
                  onClick={() => setFactionFilter('all')}
                  className={`px-1 py-0.5 rounded-full whitespace-nowrap transition-colors ${
                    factionFilter === 'all'
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  Todos ({activeUnits.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFactionFilter('Player A')}
                  className={`px-1 py-0.5 rounded-full whitespace-nowrap transition-colors ${
                    factionFilter === 'Player A'
                      ? 'bg-faction-friendly text-white shadow-sm'
                      : 'bg-faction-friendly/15 text-faction-friendly border border-faction-friendly/20 hover:bg-faction-friendly/25'
                  }`}
                >
                  Time A ({activeUnits.filter((u) => u.owner === 'Player A').length})
                </button>
                <button
                  type="button"
                  onClick={() => setFactionFilter('Player B')}
                  className={`px-1 py-0.5 rounded-full whitespace-nowrap transition-colors ${
                    factionFilter === 'Player B'
                      ? 'bg-faction-hostile text-white shadow-sm'
                      : 'bg-faction-hostile/15 text-faction-hostile border border-status-critical/30 hover:bg-faction-hostile/25'
                  }`}
                >
                  Time B ({activeUnits.filter((u) => u.owner === 'Player B').length})
                </button>
              </div>

              {/* Group By Selector */}
              <div className="pt-1 border-t border-border-parchment/60 flex items-center justify-between gap-1 text-[7.5px]">
                <span className="text-primary font-bold uppercase tracking-wider">Agrupar por:</span>
                <div className="flex items-center bg-surface-parchment-dim rounded p-0.5 border border-border-parchment">
                  <button onClick={() => setGroupBy('faction')} className={`px-1 py-0.5 rounded-sm font-bold ${groupBy === 'faction' ? 'bg-primary text-white' : 'text-on-surface-variant'}`}>Facção</button>
                  <button onClick={() => setGroupBy('type')} className={`px-1 py-0.5 rounded-sm font-bold ${groupBy === 'type' ? 'bg-primary text-white' : 'text-on-surface-variant'}`}>Tipo</button>
                </div>
              </div>
            </div>

            {/* Units List Cards */}
            <div className="space-y-1.5">
              {filteredUnits.map((unit) => {
                const isSelected = selectedUnit?.id === unit.id;
                const isTeamA = unit.owner === 'Player A';
                const isTeamB = unit.owner === 'Player B';
                const isUnknown = unit.owner === 'Unknown';

                return (
                  <div
                    key={unit.id}
                    onClick={() => { onSelectUnit(unit.id); setActivePanelTab('details'); }}
                    className={`bg-white rounded-lg px-2 py-1.5 shadow-sm hover:shadow transition-all cursor-pointer relative border ${
                      isSelected ? 'border-2 border-[#D4AF37]' : 'border-border-parchment'
                    } ${
                      isTeamA ? 'border-l-[4px] border-l-[#2d7d74]' : isTeamB ? 'border-l-[4px] border-l-[#c03a6b]' : isUnknown ? 'border-l-[4px] border-l-[#414575]' : 'border-l-[4px] border-l-gray-400'
                    }`}
                  >
                    {/* Top Row: Icon, Title, Buttons */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Icon */}
                        <div className="flex-shrink-0 flex items-center justify-center">
                          <NatoSymbol sidc={getSidcForUnit(unit)} size={26} className="drop-shadow-sm" />
                        </div>

                        {/* Text */}
                        <div className="min-w-0 flex flex-col justify-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12.5px] font-bold text-[#1a2f2b] truncate leading-tight tracking-tight">
                              {unit.name || getHumanReadableFromSidc(unit.type)}
                            </span>
                            {/* Status Dot */}
                            {unit.health < 70 ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#f87171] flex-shrink-0 animate-pulse" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#fca5a5] flex-shrink-0" />
                            )}
                          </div>
                          <span className="text-[9.5px] text-[#5e716d] font-semibold truncate block leading-tight">
                            {unit.id.substring(0,8).toUpperCase()} • {getHumanReadableFromSidc(unit.type)}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-1 shrink-0">
                        {canEditOrDelete && (
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (window.confirm('Excluir unidade?')) {
                                await supabase.from(tableToUpdate).delete().eq('id', unit.id);
                                if (selectedUnit?.id === unit.id) onSelectUnit(null);
                              }
                            }}
                            className="w-6 h-6 rounded bg-[#fee2e2] hover:bg-[#fecaca] text-[#ef4444] flex items-center justify-center transition-colors"
                            title="Excluir Unidade"
                          >
                            <span className="material-symbols-outlined text-[13px]">delete</span>
                          </button>
                        )}
                        <button className="w-6 h-6 rounded bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#374151] flex items-center justify-center transition-colors">
                          <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                        </button>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px w-full bg-[#e5e7eb] my-1"></div>

                    {/* Middle Row: Pills and Toggles */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1">
                        <span className={`px-1.5 py-0.5 rounded font-bold text-[9.5px] leading-tight ${isTeamA ? 'bg-[#d1fae5] text-[#047857]' : isTeamB ? 'bg-[#fce7f3] text-[#be185d]' : 'bg-gray-200 text-gray-700'}`}>
                          {isTeamA ? 'Time A' : isTeamB ? 'Time B' : 'Neutro'}
                        </span>
                        
                        {unit.health < 70 && (
                          <span className="px-1.5 py-0.5 rounded font-bold text-[9.5px] leading-tight bg-[#fee2e2] text-[#ef4444]">
                            {unit.health < 30 ? 'Estado Crítico' : 'Alerta Contato'}
                          </span>
                        )}
                      </div>

                      {isModerator && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleVisibility(); }}
                          className={`px-1.5 py-0.5 rounded text-[9.5px] leading-tight font-bold flex items-center gap-1 transition-colors border ${
                            unit.is_visible_to_enemy
                              ? 'bg-[#fee2e2] text-[#ef4444] border-[#fca5a5] hover:bg-[#fecaca]'
                              : 'bg-[#f3f4f6] text-[#4b5563] border-[#e5e7eb] hover:bg-[#e5e7eb]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[12px]">{unit.is_visible_to_enemy ? 'visibility' : 'visibility_off'}</span>
                          <span>{unit.is_visible_to_enemy ? 'Visível' : 'Oculto'}</span>
                        </button>
                      )}
                    </div>

                    {/* Bottom Row: Health Bar */}
                    <div className="mt-1">
                      <div className="flex justify-between items-center text-[9px] font-bold mb-0.5 text-[#374151] leading-tight">
                        <span>Prontidão de Combate</span>
                        <span className="text-[#047857]">{unit.health}%</span>
                      </div>
                      <div className="w-full bg-[#e5e7eb] h-1 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${unit.health >= 75 ? 'bg-[#004B41]' : unit.health >= 40 ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'}`}
                          style={{ width: `${unit.health}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DETAILS TAB CONTENT */}
        {activePanelTab === 'details' && selectedUnit && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-on-surface">
            {/* CARD 1: Header Identification Card */}
            <div className="bg-surface-card/95 p-3 rounded-xl border border-border-parchment shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <span className="font-tag-overline text-[8.5px] text-primary uppercase font-bold tracking-wider">{getHumanReadableFromSidc(selectedUnit.type)}</span>
                  {canRename ? (
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onBlur={updateName}
                      onKeyDown={(e) => e.key === 'Enter' && updateName()}
                      className="font-headline-md text-[10.5px] font-bold text-primary tracking-tight leading-tight mt-0.5 bg-surface-container rounded px-1 border-none focus:outline-none focus:ring-1 focus:ring-primary w-full"
                    />
                  ) : (
                    <h3 className="font-headline-md text-[10.5px] font-bold text-primary tracking-tight leading-tight mt-0.5">
                      {selectedUnit.name || getHumanReadableFromSidc(selectedUnit.type)}
                    </h3>
                  )}
                  {isModerator ? (
                    <select
                      value={parseSidc(selectedUnit.type).typeKey}
                      onChange={(e) => updateType(e.target.value)}
                      className="font-tag-overline text-[8.5px] text-on-surface-variant mt-0.5 bg-surface-container rounded px-1 py-0.5 border-none focus:outline-none focus:ring-1 focus:ring-primary w-fit uppercase font-bold"
                    >
                      {Object.entries(UNIT_TYPES).map(([key, def]) => (
                        <option key={key} value={key}>{def.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-tag-overline text-[8.5px] text-on-surface-variant mt-0.5">Tipo: {getHumanReadableFromSidc(selectedUnit.type)}</span>
                  )}
                </div>
                <div className="flex-shrink-0 flex items-center justify-center">
                  <NatoSymbol sidc={getSidcForUnit(selectedUnit)} size={44} className="drop-shadow-md" />
                </div>
              </div>

              {/* Status & Allegiance Badges */}
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border-parchment/60">
                {isModerator ? (
                  <select 
                    value={selectedUnit.owner}
                    onChange={(e) => updateOwner(e.target.value)}
                    className={`font-label-md text-[9px] px-2 py-0.5 rounded-full font-bold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary ${
                      selectedUnit.owner === 'Player A' ? 'bg-faction-friendly/15 text-faction-friendly border-faction-friendly/20' : 
                      selectedUnit.owner === 'Player B' ? 'bg-faction-hostile/15 text-faction-hostile border-faction-hostile/20' : 
                      'bg-gray-100 text-gray-700 border-gray-300'
                    }`}
                  >
                    <option value="Player A">Time A</option>
                    <option value="Player B">Time B</option>
                    <option value="Unknown">Incógnita</option>
                    <option value="Neutral">Neutro</option>
                  </select>
                ) : (
                  <span className={`font-label-md text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                    selectedUnit.owner === 'Player A' ? 'bg-faction-friendly/15 text-faction-friendly border-faction-friendly/20' : 
                    selectedUnit.owner === 'Player B' ? 'bg-faction-hostile/15 text-faction-hostile border-faction-hostile/20' : 
                    'bg-gray-100 text-gray-700 border-gray-300'
                  }`}>
                    <span className={`w-1 h-1 rounded-full ${selectedUnit.owner === 'Player A' ? 'bg-faction-friendly' : selectedUnit.owner === 'Player B' ? 'bg-faction-hostile' : 'bg-gray-500'}`}></span>
                    {selectedUnit.owner === 'Player A' ? 'Time A' : selectedUnit.owner === 'Player B' ? 'Time B' : selectedUnit.owner}
                  </span>
                )}

                <span className={`font-label-md text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                  selectedUnit.health < 30 ? 'bg-status-critical/15 text-status-critical border-status-critical/20' : 
                  selectedUnit.health < 70 ? 'bg-status-degraded/15 text-status-degraded border-status-degraded/20' : 
                  'bg-faction-friendly/15 text-faction-friendly border-faction-friendly/20'
                }`}>
                  <span className={`w-1 h-1 rounded-full ${selectedUnit.health < 30 ? 'bg-status-critical' : selectedUnit.health < 70 ? 'bg-status-degraded' : 'bg-faction-friendly'}`}></span>
                  Status: {getStatusText(selectedUnit.health)}
                </span>
              </div>
            </div>

            {/* CARD 2: Combat Stats & Operational Readings Card */}
            <div className="bg-surface-card/95 p-3 rounded-xl border border-border-parchment shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-tag-overline text-[8.5px] text-primary uppercase font-bold tracking-wider">Operational Readings / Status Tally</span>
                <span className="material-symbols-outlined text-primary text-[14px]">tune</span>
              </div>

              {/* Readiness / Combat Strength Slider */}
              <div className="bg-surface-parchment/50 p-2 rounded-lg border border-border-parchment/70">
                <div className="flex justify-between items-center text-[9px] font-semibold mb-1">
                  <span className="text-on-surface">Combat Strength / Prontidão</span>
                  <span className="font-bold text-primary text-[10.5px] bg-white px-1.5 py-0.5 rounded border border-border-parchment shadow-xs">{selectedUnit.health}%</span>
                </div>
                {canEditOrDelete ? (
                  <input type="range" min="0" max="100" value={selectedUnit.health} onChange={(e) => updateHealth(Number(e.target.value))} className="w-full accent-primary h-1.5 bg-surface-container rounded-lg cursor-pointer" />
                ) : (
                  <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${selectedUnit.health}%` }} />
                  </div>
                )}
              </div>

              {/* Fuel & Ammo Metrics */}
              <div className="bg-surface-parchment/50 p-2 rounded-lg border border-border-parchment/70 space-y-3">
                <div>
                  <div className="flex justify-between items-center text-[9px] font-semibold mb-1">
                    <span className="text-on-surface">Combustível & Munição</span>
                    <span className="font-bold text-[#c03a6b] text-[10.5px] bg-white px-1.5 py-0.5 rounded border border-border-parchment shadow-xs">{selectedUnit.ammo ?? 100}%</span>
                  </div>
                  {canEditOrDelete ? (
                    <input type="range" min="0" max="100" value={selectedUnit.ammo ?? 100} onChange={(e) => updateAmmo(Number(e.target.value))} className="w-full accent-[#c03a6b] h-1.5 bg-surface-container rounded-lg cursor-pointer" />
                  ) : (
                    <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#c03a6b] h-full rounded-full" style={{ width: `${selectedUnit.ammo ?? 100}%` }}></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CARD 4: SITREP / Moderator Situation Log Card */}
            {isModerator && (
              <div className="bg-surface-card/95 p-3 rounded-xl border border-border-parchment shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-tag-overline text-[8.5px] text-primary uppercase font-bold tracking-wider">Sitrep / Diretrizes do Moderador</span>
                  <span className="material-symbols-outlined text-[14px] text-primary">edit_note</span>
                </div>
                <textarea 
                  className="w-full bg-surface-parchment-dim/80 text-on-surface p-2 rounded-lg text-[10px] font-body-ui focus:outline-none focus:ring-1 focus:ring-primary border border-border-parchment resize-none leading-relaxed shadow-inner" 
                  placeholder="Instruções e ordens da rodada..." 
                  rows={2}
                ></textarea>
              </div>
            )}

            {/* CARD 5: Command Action Panel Card */}
            {isModerator && (
              <div className="bg-surface-card/95 p-3 rounded-xl border border-border-parchment shadow-sm space-y-2">
                <span className="font-tag-overline text-[8.5px] text-primary uppercase font-bold tracking-wider block">Painel de Ações do Comando</span>
                
                {/* Primary Action: Update Orders */}
                <div className="bg-surface-parchment-dim/80 rounded-lg p-1.5 border border-border-parchment space-y-1" id="enemy-visibility-control">
                  <div className="flex items-center justify-between">
                    <span className="font-tag-overline text-[8px] uppercase font-bold text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px] text-secondary">radar</span>
                      Visibilidade Inimiga
                    </span>
                    <span className={`font-tag-overline text-[8px] px-1.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                      selectedUnit.is_visible_to_enemy ? 'bg-status-alert/15 text-status-alert border-status-alert/30' : 'bg-gray-100 text-gray-500 border-gray-300'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${selectedUnit.is_visible_to_enemy ? 'bg-status-alert' : 'bg-gray-400'}`}></span>
                      {selectedUnit.is_visible_to_enemy ? 'Visível' : 'Oculto'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-surface-container rounded-lg border border-border-parchment/60">
                    <button 
                      onClick={() => toggleVisibility(true)} 
                      className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md font-label-md text-[9.5px] transition-all ${
                        selectedUnit.is_visible_to_enemy 
                          ? 'bg-surface-card text-primary shadow-sm border border-border-parchment font-bold' 
                          : 'font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-card/60'
                      }`} 
                      type="button"
                    >
                      <span className={`material-symbols-outlined text-[13px] ${selectedUnit.is_visible_to_enemy ? 'text-status-alert' : ''}`}>visibility</span>
                      <span>Visível</span>
                    </button>
                    <button 
                      onClick={() => toggleVisibility(false)} 
                      className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md font-label-md text-[9.5px] transition-all ${
                        !selectedUnit.is_visible_to_enemy 
                          ? 'bg-surface-card text-primary shadow-sm border border-border-parchment font-bold' 
                          : 'font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-card/60'
                      }`} 
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[13px]">visibility_off</span>
                      <span>Ocultar</span>
                    </button>
                  </div>
                </div>

                {/* Secondary: Move to Staging Area */}
                <button onClick={moveToReserve} className="w-full bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-[9.5px] py-1.5 px-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-border-parchment font-bold" type="button">
                  <span className="material-symbols-outlined text-[13px]">archive</span>
                  <span>Mover de Volta às Reservas</span>
                </button>

                {/* Status Selector Buttons */}
                <div className="grid grid-cols-3 gap-1 pt-0.5">
                  <button onClick={() => updateHealth(100)} className="bg-faction-friendly/15 hover:bg-faction-friendly/25 text-faction-friendly font-tag-overline text-[7px] py-1 rounded-md transition-colors uppercase font-bold text-center border border-faction-friendly/30" type="button">
                    Pronto
                  </button>
                  <button onClick={() => updateHealth(60)} className="bg-status-degraded/15 hover:bg-status-degraded/25 text-status-degraded font-tag-overline text-[7px] py-1 rounded-md transition-colors uppercase font-bold text-center border border-status-degraded/30" type="button">
                    Degradado
                  </button>
                  <button onClick={() => updateHealth(10)} className="bg-status-critical/15 hover:bg-status-critical/25 text-status-critical font-tag-overline text-[7px] py-1 rounded-md transition-colors uppercase font-bold text-center border border-status-critical/30" type="button">
                    Crítico
                  </button>
                </div>

                {/* Danger Action: Kill/Eliminate Unit */}
                <button onClick={deleteUnit} className="w-full bg-status-critical/10 hover:bg-status-critical hover:text-white text-status-critical font-label-md text-[9.5px] py-1.5 px-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 mt-0.5 border border-status-critical/30 font-semibold" type="button">
                  <span className="material-symbols-outlined text-[13px]">dangerous</span>
                  <span>Destruir / Eliminar Unidade</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
