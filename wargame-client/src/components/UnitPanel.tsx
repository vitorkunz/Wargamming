"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Unit } from './MapGrid';
import { supabase } from '@/lib/supabaseClient';
import { getSidcForUnit, getHumanReadableFromSidc, parseSidc } from '@/lib/milsymbol/utils';
import { UNIT_TYPES, UNIT_CATEGORIES, UnitTypeKey } from '@/lib/milsymbol/constants';
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
  onDuplicateUnit?: (unit: Unit) => void;
}

export default function UnitPanel({
  units,
  selectedUnit,
  onClose,
  onSelectUnit,
  isModerator,
  role,
  activeTab = 'battle',
  targetTable,
  onDuplicateUnit
}: UnitPanelProps) {
  const [activePanelTab, setActivePanelTab] = useState<'roster' | 'details'>(
    selectedUnit ? 'details' : 'roster'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [factionFilter, setFactionFilter] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<'faction' | 'type' | 'status' | 'sector'>('faction');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [forceTypeFilter, setForceTypeFilter] = useState<string>('all');

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
    
    if (visibilityFilter === 'visible' && !unit.is_visible_to_enemy) return false;
    if (visibilityFilter === 'hidden' && unit.is_visible_to_enemy) return false;
    
    if (conditionFilter === 'normal' && unit.health < 70) return false;
    if (conditionFilter === 'degraded' && (unit.health >= 70 || unit.health < 30)) return false;
    if (conditionFilter === 'critical' && unit.health >= 30) return false;

    if (forceTypeFilter !== 'all') {
      const dim = unit.type && unit.type.length === 15 ? unit.type[2] : 'G';
      if (forceTypeFilter === 'ground' && dim !== 'G') return false;
      if (forceTypeFilter === 'air' && dim !== 'A') return false;
      if (forceTypeFilter === 'sea' && dim !== 'S' && dim !== 'U') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const readable = getHumanReadableFromSidc(unit.type).toLowerCase();
      return (
        (unit.name || '').toLowerCase().includes(q) ||
        readable.includes(q)
      );
    }
    return true;
  }).sort((a, b) => {
    if (groupBy === 'faction') return a.owner.localeCompare(b.owner);
    if (groupBy === 'type') {
      const typeA = getHumanReadableFromSidc(a.type);
      const typeB = getHumanReadableFromSidc(b.type);
      return typeA.localeCompare(typeB);
    }
    if (groupBy === 'status') return b.health - a.health;
    return 0;
  });

  const getStatusText = (health: number) => {
    if (health >= 70) return 'PRONTIDÃO NORMAL';
    if (health >= 30) return 'CAPACIDADE DEGRADADA';
    return 'EM COMBATE / CRÍTICO';
  };

  const groupedUnits = useMemo(() => {
    const groups: Record<string, Unit[]> = {};
    filteredUnits.forEach(unit => {
      let key = 'Outros';
      if (groupBy === 'faction') {
        if (unit.owner === 'Player A') key = 'Time A';
        else if (unit.owner === 'Player B') key = 'Time B';
        else if (unit.owner === 'Unknown') key = 'Incógnito';
        else if (unit.owner === 'Neutral') key = 'Neutro';
        else key = unit.owner || 'Desconhecido';
      } else if (groupBy === 'type') {
        key = getHumanReadableFromSidc(unit.type) || 'Desconhecido';
      } else if (groupBy === 'status') {
        if (unit.health >= 70) key = 'Prontidão Normal';
        else if (unit.health >= 30) key = 'Capacidade Degradada';
        else key = 'Crítico';
      } else if (groupBy === 'sector') {
        key = 'Setor Principal'; // To be implemented or updated later if sectors exist
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(unit);
    });
    return groups;
  }, [filteredUnits, groupBy]);

  return (
    <div className="w-full h-full flex flex-col select-none">
      {/* Header de Abas: Roster (84) vs Detalhes */}
      <div className="flex items-center justify-between px-space-md pt-space-xs pb-0 bg-surface-parchment-dim/80">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => { setActivePanelTab('roster'); onSelectUnit(null); }}
            className={`px-3 py-1.5 rounded-t-DEFAULT font-headline-sm text-label-md uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
              activePanelTab === 'roster'
                ? 'bg-surface-parchment text-primary-container font-bold shadow-sm'
                : 'hover:bg-surface-parchment/60 text-outline font-semibold'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">groups</span>
            <span>Roster ({activeUnits.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePanelTab('details')}
            className={`px-3 py-1.5 rounded-t-DEFAULT font-headline-sm text-label-md uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
              activePanelTab === 'details'
                ? 'bg-surface-parchment text-primary-container font-bold shadow-sm'
                : 'hover:bg-surface-parchment/60 text-outline font-semibold'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">id_card</span>
            <span>Detalhes</span>
          </button>
        </div>
        <div className="flex items-center gap-1 pb-1">
          <button
            id="toggle-right-btn"
            title="Minimizar painel"
            type="button"
            onClick={onClose}
            className="p-1 rounded-DEFAULT hover:bg-surface-parchment text-primary-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_right</span>
          </button>
        </div>
      </div>

      {/* Filtros e Busca Rápida (Exibido na Aba Roster) */}
      {activePanelTab === 'roster' && (
        <div className="px-space-md py-space-sm space-y-space-xs bg-surface-parchment border-b border-border-parchment/60">
          {/* Campo de Busca */}
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-2 text-[16px] text-outline pointer-events-none">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por indicativo ou classe..."
              className="w-full pl-7 pr-3 py-1.5 text-body-sm font-body-sm rounded-DEFAULT bg-surface-card text-on-primary-fixed placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary-container shadow-sm border border-border-parchment/40"
            />
          </div>

          {/* Faction Selector Pills */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 custom-scrollbar">
            <button
              type="button"
              onClick={() => setFactionFilter('all')}
              className={`px-2 py-0.5 rounded-DEFAULT bg-primary-container text-surface-parchment font-label-sm text-[10px] uppercase font-bold tracking-wider shrink-0 shadow-sm transition-all ${
                factionFilter === 'all'
                  ? 'ring-2 ring-primary-container ring-offset-1 opacity-100'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Todos ({activeUnits.length})
            </button>
            <button
              type="button"
              onClick={() => setFactionFilter('Player A')}
              className={`px-2 py-0.5 rounded-DEFAULT bg-faction-allied-fill text-faction-allied-accent font-label-sm text-[10px] uppercase font-bold tracking-wider shrink-0 shadow-sm transition-all ${
                factionFilter === 'Player A'
                  ? 'ring-2 ring-faction-allied-fill ring-offset-1 opacity-100'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Time A ({activeUnits.filter((u) => u.owner === 'Player A').length})
            </button>
            <button
              type="button"
              onClick={() => setFactionFilter('Player B')}
              className={`px-2 py-0.5 rounded-DEFAULT bg-faction-opposing-fill text-faction-opposing-accent font-label-sm text-[10px] uppercase font-bold tracking-wider shrink-0 shadow-sm transition-all ${
                factionFilter === 'Player B'
                  ? 'ring-2 ring-faction-opposing-fill ring-offset-1 opacity-100'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Time B ({activeUnits.filter((u) => u.owner === 'Player B').length})
            </button>
            <button
              type="button"
              onClick={() => setFactionFilter('Unknown')}
              className={`px-2 py-0.5 rounded-DEFAULT bg-faction-recon-fill text-on-primary-fixed font-label-sm text-[10px] uppercase font-bold tracking-wider shrink-0 shadow-sm transition-all ${
                factionFilter === 'Unknown'
                  ? 'ring-2 ring-faction-recon-fill ring-offset-1 opacity-100'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Incógnito ({activeUnits.filter((u) => u.owner === 'Unknown').length})
            </button>
            <button
              type="button"
              onClick={() => setFactionFilter('Neutral')}
              className={`px-2 py-0.5 rounded-DEFAULT bg-surface-card text-primary-container font-label-sm text-[10px] uppercase font-bold tracking-wider shrink-0 shadow-sm transition-all ${
                factionFilter === 'Neutral'
                  ? 'ring-2 ring-primary-container ring-offset-1 opacity-100'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Neutro ({activeUnits.filter((u) => u.owner === 'Neutral').length})
            </button>
          </div>

          {/* Controles Secundários de Agrupamento e Tipo */}
          <div className="grid grid-cols-3 gap-1 pt-1">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="px-1.5 py-1 text-[10px] font-label-sm font-semibold rounded-DEFAULT bg-surface-card text-on-primary-fixed focus:outline-none shadow-sm cursor-pointer border border-border-parchment/40"
            >
              <option value="faction">Agrupar: Facção</option>
              <option value="type">Agrupar: Tipo</option>
              <option value="sector">Agrupar: Setor</option>
              <option value="status">Agrupar: Status</option>
            </select>
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value)}
              className="px-1.5 py-1 text-[10px] font-label-sm font-semibold rounded-DEFAULT bg-surface-card text-on-primary-fixed focus:outline-none shadow-sm cursor-pointer border border-border-parchment/40"
            >
              <option value="all">Visib.: Todas</option>
              <option value="visible">Visível</option>
              <option value="hidden">Oculto</option>
            </select>
            <select
              value={forceTypeFilter}
              onChange={(e) => setForceTypeFilter(e.target.value)}
              className="px-1.5 py-1 text-[10px] font-label-sm font-semibold rounded-DEFAULT bg-surface-card text-on-primary-fixed focus:outline-none shadow-sm cursor-pointer border border-border-parchment/40"
            >
              <option value="all">Força: Todas</option>
              <option value="ground">Força: Terrestre</option>
              <option value="air">Aérea</option>
              <option value="sea">Naval</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 text-on-surface custom-scrollbar">
        {/* ROSTER TAB CONTENT */}
        {activePanelTab === 'roster' && (
          <div className="space-y-2">
              {Object.entries(groupedUnits).map(([groupName, groupUnits]) => (
                <details key={groupName} className="group" open>
                  <summary className="flex items-center justify-between p-1 cursor-pointer bg-[#eae4d9] rounded border border-[#d9ceb9] shadow-sm select-none list-none [&::-webkit-details-marker]:hidden outline-none hover:bg-[#e4dbcd] transition-colors">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-primary transition-transform group-open:rotate-90">chevron_right</span>
                      <span className="text-[9.5px] font-bold text-[#0a352a] uppercase tracking-wider">{groupName}</span>
                    </div>
                    <span className="text-[8.5px] font-bold text-[#0a352a] bg-white/60 px-1.5 py-0.5 rounded-sm border border-[#d9ceb9]/50">{groupUnits.length}</span>
                  </summary>
                  <div className="pt-1.5 space-y-1.5 px-0.5">
                    {groupUnits.map((unit) => {
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
                      isTeamA ? 'border-l-[4px] border-l-[#2d7d74]' : isTeamB ? 'border-l-[4px] border-l-[#c03a6b]' : isUnknown ? 'border-l-[4px] border-l-[#d4a017]' : 'border-l-[4px] border-l-gray-400'
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
                        <span className={`px-1.5 py-0.5 rounded font-bold text-[9.5px] leading-tight ${isTeamA ? 'bg-[#d1fae5] text-[#047857]' : isTeamB ? 'bg-[#fce7f3] text-[#be185d]' : isUnknown ? 'bg-[#e9e9f0] text-[#5c5c7d]' : 'bg-gray-200 text-gray-700'}`}>
                          {isTeamA ? 'Time A' : isTeamB ? 'Time B' : isUnknown ? 'Incógnito' : 'Neutro'}
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
                </details>
              ))}
            </div>
        )}

        {/* DETAILS TAB CONTENT */}
        {activePanelTab === 'details' && (
          selectedUnit ? (
            <div className="p-1 space-y-2.5 text-on-surface">
              {/* CARD 1: Header Identification Card */}
            <div className="@container bg-surface-card/95 p-3 rounded-xl border border-border-parchment shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="flex flex-col @[300px]:flex-row-reverse @[300px]:items-start @[300px]:justify-between gap-2.5">
                {/* NATO Symbol: Positioned at top if card is narrow, or to the right if card has enough space */}
                <div className="flex-shrink-0 flex items-center justify-center self-center @[300px]:self-start py-0.5">
                  <NatoSymbol sidc={getSidcForUnit(selectedUnit)} size={48} className="drop-shadow-md" />
                </div>

                {/* Details / Name / Category */}
                <div className="flex flex-col min-w-0 flex-1 w-full">
                  <span 
                    className="font-tag-overline text-[8.5px] text-primary uppercase font-bold tracking-wider truncate block"
                    title={getHumanReadableFromSidc(selectedUnit.type)}
                  >
                    {getHumanReadableFromSidc(selectedUnit.type)}
                  </span>

                  {canRename ? (
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onBlur={updateName}
                      onKeyDown={(e) => e.key === 'Enter' && updateName()}
                      title={nameInput}
                      className="font-headline-md text-[11px] font-bold text-primary tracking-tight leading-tight mt-0.5 bg-surface-container rounded px-1.5 py-1 border-none focus:outline-none focus:ring-1 focus:ring-primary w-full min-w-0 truncate text-ellipsis overflow-hidden block"
                    />
                  ) : (
                    <h3 
                      title={selectedUnit.name || getHumanReadableFromSidc(selectedUnit.type)}
                      className="font-headline-md text-[11px] font-bold text-primary tracking-tight leading-tight mt-0.5 truncate block"
                    >
                      {selectedUnit.name || getHumanReadableFromSidc(selectedUnit.type)}
                    </h3>
                  )}

                  {isModerator ? (
                    <select
                      value={parseSidc(selectedUnit.type).typeKey}
                      onChange={(e) => updateType(e.target.value)}
                      className="font-tag-overline text-[8.5px] text-on-surface-variant mt-1 bg-surface-container rounded px-1.5 py-0.5 border-none focus:outline-none focus:ring-1 focus:ring-primary w-full @[300px]:w-fit max-w-full truncate uppercase font-bold"
                    >
                      {UNIT_CATEGORIES.map((cat) => (
                        <optgroup key={cat} label={cat}>
                          {Object.entries(UNIT_TYPES)
                            .filter(([, def]) => def.category === cat)
                            .map(([key, def]) => (
                              <option key={key} value={key}>{def.label}</option>
                            ))}
                        </optgroup>
                      ))}
                    </select>
                  ) : (
                    <span className="font-tag-overline text-[8.5px] text-on-surface-variant mt-0.5 truncate block">
                      Tipo: {getHumanReadableFromSidc(selectedUnit.type)}
                    </span>
                  )}
                </div>
              </div>

              {/* Status & Allegiance Badges */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-border-parchment/60">
                {isModerator ? (
                  <select 
                    value={selectedUnit.owner}
                    onChange={(e) => updateOwner(e.target.value)}
                    className={`font-label-md text-[9px] px-2 py-0.5 rounded-full font-bold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary ${
                      selectedUnit.owner === 'Player A' ? 'bg-faction-friendly/15 text-faction-friendly border-faction-friendly/20' : 
                      selectedUnit.owner === 'Player B' ? 'bg-faction-hostile/15 text-faction-hostile border-faction-hostile/20' : 
                      selectedUnit.owner === 'Unknown' ? 'bg-faction-unknown/15 text-faction-unknown border-faction-unknown/20' : 
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
                    selectedUnit.owner === 'Unknown' ? 'bg-faction-unknown/15 text-faction-unknown border-faction-unknown/20' : 
                    'bg-gray-100 text-gray-700 border-gray-300'
                  }`}>
                    <span className={`w-1 h-1 rounded-full ${selectedUnit.owner === 'Player A' ? 'bg-faction-friendly' : selectedUnit.owner === 'Player B' ? 'bg-faction-hostile' : selectedUnit.owner === 'Unknown' ? 'bg-faction-unknown' : 'bg-gray-500'}`}></span>
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

                {/* Duplicate Unit to Reserves */}
                {onDuplicateUnit && (
                  <button 
                    onClick={() => onDuplicateUnit(selectedUnit)} 
                    className="w-full bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-[9.5px] py-1.5 px-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-border-parchment font-bold" 
                    type="button"
                    title="Duplicar ficha para a reserva (Ctrl+C)"
                  >
                    <span className="material-symbols-outlined text-[13px]">content_copy</span>
                    <span>Duplicar para a Reserva (Ctrl+C)</span>
                  </button>
                )}

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
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-outline my-auto h-full">
            <span className="material-symbols-outlined text-[36px] mb-2 opacity-50">id_card</span>
            <p className="font-label-md text-[11px]">Selecione uma unidade no mapa ou no roster para ver detalhes.</p>
          </div>
        ))}
      </div>
    </div>
  );
}
