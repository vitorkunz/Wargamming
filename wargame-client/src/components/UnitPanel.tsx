"use client";
import React, { useState, useEffect } from 'react';
import { Unit } from './MapGrid';
import { supabase } from '@/lib/supabaseClient';
import { getSidcForUnit, getHumanReadableFromSidc } from '@/lib/milsymbol/utils';

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

  const updateHealth = async (newHealth: number) => {
    if (!selectedUnit || !canEditOrDelete) return;
    if (isNaN(newHealth) || newHealth === selectedUnit.health) return;
    await supabase.from(tableToUpdate).update({ health: newHealth }).eq('id', selectedUnit.id);
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

  const renderIcon = (type: string) => {
    const readable = getHumanReadableFromSidc(type).toLowerCase();
    if (readable.includes('naval') || readable.includes('ship')) return 'directions_boat';
    if (readable.includes('air') || readable.includes('aviation')) return 'flight';
    if (readable.includes('artillery')) return 'adjust';
    if (readable.includes('armor') || readable.includes('tank')) return 'view_in_ar';
    if (readable.includes('infantry')) return 'shield';
    if (readable.includes('logistics') || readable.includes('supply')) return 'local_shipping';
    if (readable.includes('air defense') || readable.includes('sam')) return 'security';
    return 'radar';
  };

  const getStatusText = (health: number) => {
    if (health >= 70) return 'PRONTIDÃO NORMAL';
    if (health >= 30) return 'CAPACIDADE DEGRADADA';
    return 'EM COMBATE / CRÍTICO';
  };

  return (
    <div className="w-full h-full flex flex-col select-none">
      {/* Tab Switcher Header */}
      <div className="bg-primary-container p-1.5 flex items-center gap-1 shadow-sm border-b border-white/10 text-white">
        <button
          type="button"
          onClick={() => { setActivePanelTab('roster'); onSelectUnit(null); }}
          className={`flex-1 py-1 px-1.5 text-center font-headline-sm text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 ${
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
          className={`flex-1 py-1 px-1.5 text-center font-headline-sm text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 ${
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
          <span className="material-symbols-outlined text-[16px]">keyboard_double_arrow_right</span>
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
                <span className="material-symbols-outlined absolute left-1.5 text-outline text-[12px]">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar por indicativo ou classe..."
                  className="w-full pl-6 pr-1.5 py-0.5 rounded text-[9px] font-body-base bg-surface-parchment-dim/80 text-on-surface border border-border-parchment focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-0.5 overflow-x-auto pb-0.5 text-[8px] font-headline-sm font-bold custom-scrollbar">
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
              <div className="pt-1 border-t border-border-parchment/60 flex items-center justify-between gap-1 text-[8px]">
                <span className="font-headline-sm text-primary font-bold uppercase tracking-wider">Agrupar por:</span>
                <div className="flex items-center bg-surface-parchment-dim rounded p-0.5 border border-border-parchment">
                  <button onClick={() => setGroupBy('faction')} className={`px-1 py-0.5 rounded-sm font-headline-sm font-bold ${groupBy === 'faction' ? 'bg-primary text-white' : 'text-on-surface-variant'}`}>Facção</button>
                  <button onClick={() => setGroupBy('type')} className={`px-1 py-0.5 rounded-sm font-headline-sm font-bold ${groupBy === 'type' ? 'bg-primary text-white' : 'text-on-surface-variant'}`}>Tipo</button>
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
                    className={`bg-white/95 rounded-xl p-2 border shadow-sm hover:shadow transition-all cursor-pointer relative ${
                      isSelected ? 'border-2 border-status-objective' : 'border-border-parchment'
                    } ${
                      isTeamA ? 'border-l-4 border-l-faction-friendly' : isTeamB ? 'border-l-4 border-l-faction-hostile' : isUnknown ? 'border-l-4 border-l-faction-unknown' : 'border-l-4 border-l-faction-neutral'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white ${
                            isTeamA ? 'bg-faction-friendly' : isTeamB ? 'bg-faction-hostile' : isUnknown ? 'bg-faction-unknown' : 'bg-faction-neutral'
                        }`}>
                          <span className="material-symbols-outlined text-[16px]">{renderIcon(unit.type)}</span>
                        </div>

                        <div className="min-w-0 flex flex-col justify-center">
                          <div className="flex items-center gap-1.5">
                            <span className="font-headline-sm text-[11px] font-bold text-on-surface truncate leading-tight">
                              {unit.name || getHumanReadableFromSidc(unit.type)}
                            </span>
                            {unit.health < 70 && unit.health >= 30 && <span className="w-1.5 h-1.5 rounded-full bg-status-alert animate-ping flex-shrink-0" />}
                            {unit.health < 30 && <span className="w-1.5 h-1.5 rounded-full bg-status-critical animate-ping flex-shrink-0" />}
                          </div>
                          <span className="font-headline-sm text-[9px] text-on-surface-variant truncate block uppercase mt-0.5">{getHumanReadableFromSidc(unit.type)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end flex-shrink-0">
                        <div className="bg-surface-container-high px-1.5 py-0.5 rounded text-[9px] font-bold text-on-surface flex items-center gap-1 mb-1">
                          <span className="material-symbols-outlined text-[10px]">health_and_safety</span>
                          {unit.health}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-border-parchment/60 text-[9px]">
                      <div className="flex items-center gap-1">
                        <span className={`font-headline-sm px-1 py-0.5 rounded font-bold ${isTeamA ? 'bg-faction-friendly/15 text-faction-friendly' : isTeamB ? 'bg-faction-hostile/15 text-faction-hostile' : 'bg-gray-100 text-gray-700'}`}>
                          {isTeamA ? 'Time A' : isTeamB ? 'Time B' : 'Neutro'}
                        </span>
                      </div>

                      {isModerator && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleVisibility(); }}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-headline-sm font-bold flex items-center gap-0.5 transition-colors border ${
                            unit.is_visible_to_enemy
                              ? 'bg-status-alert/15 hover:bg-status-alert/25 text-status-alert border-status-alert/30'
                              : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-border-parchment'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[10px]">{unit.is_visible_to_enemy ? 'visibility' : 'visibility_off'}</span>
                          <span>{unit.is_visible_to_enemy ? 'Visível ao Oponente' : 'Oculto / Névoa'}</span>
                        </button>
                      )}
                    </div>

                    <div className="mt-1.5">
                      <div className="flex justify-between items-center text-[8px] font-headline-sm font-semibold mb-0.5 text-on-surface-variant">
                        <span>Prontidão de Combate</span>
                        <span className="font-bold text-primary">{unit.health}%</span>
                      </div>
                      <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${unit.health >= 75 ? 'bg-primary-container' : unit.health >= 40 ? 'bg-status-degraded' : 'bg-status-critical'}`}
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
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-on-surface">
            {/* CARD 1: Header Identification Card */}
            <div className="bg-surface-card/95 p-4 rounded-xl border border-border-parchment shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <span className="font-tag-overline text-[10px] text-primary uppercase font-bold tracking-wider">{getHumanReadableFromSidc(selectedUnit.type)}</span>
                  {canRename ? (
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onBlur={updateName}
                      onKeyDown={(e) => e.key === 'Enter' && updateName()}
                      className="font-headline-md text-[18px] font-bold text-primary tracking-tight leading-tight mt-0.5 bg-surface-container rounded px-1 border-none focus:outline-none focus:ring-1 focus:ring-primary w-full"
                    />
                  ) : (
                    <h3 className="font-headline-md text-[18px] font-bold text-primary tracking-tight leading-tight mt-0.5">
                      {selectedUnit.name || getHumanReadableFromSidc(selectedUnit.type)}
                    </h3>
                  )}
                  <span className="font-tag-overline text-[10px] text-on-surface-variant mt-1">Proprietário: {selectedUnit.owner}</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-faction-friendly text-text-on-dark flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="material-symbols-outlined text-[24px]">{renderIcon(selectedUnit.type)}</span>
                </div>
              </div>

              {/* Status & Allegiance Badges */}
              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border-parchment/60">
                <span className={`font-label-md text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 border ${
                  selectedUnit.owner === 'Player A' ? 'bg-faction-friendly/15 text-faction-friendly border-faction-friendly/20' : 
                  selectedUnit.owner === 'Player B' ? 'bg-faction-hostile/15 text-faction-hostile border-faction-hostile/20' : 
                  'bg-gray-100 text-gray-700 border-gray-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${selectedUnit.owner === 'Player A' ? 'bg-faction-friendly' : selectedUnit.owner === 'Player B' ? 'bg-faction-hostile' : 'bg-gray-500'}`}></span>
                  {selectedUnit.owner === 'Player A' ? 'Time A' : selectedUnit.owner === 'Player B' ? 'Time B' : selectedUnit.owner}
                </span>

                <span className={`font-label-md text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 border ${
                  selectedUnit.health < 30 ? 'bg-status-critical/15 text-status-critical border-status-critical/20' : 
                  selectedUnit.health < 70 ? 'bg-status-degraded/15 text-status-degraded border-status-degraded/20' : 
                  'bg-faction-friendly/15 text-faction-friendly border-faction-friendly/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${selectedUnit.health < 30 ? 'bg-status-critical' : selectedUnit.health < 70 ? 'bg-status-degraded' : 'bg-faction-friendly'}`}></span>
                  Status: {getStatusText(selectedUnit.health)}
                </span>
              </div>
            </div>

            {/* CARD 2: Combat Stats & Operational Readings Card */}
            <div className="bg-surface-card/95 p-4 rounded-xl border border-border-parchment shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-tag-overline text-[10px] text-primary uppercase font-bold tracking-wider">Operational Readings / Status Tally</span>
                <span className="material-symbols-outlined text-primary text-[16px]">tune</span>
              </div>

              {/* Readiness / Combat Strength Slider */}
              <div className="bg-surface-parchment/50 p-2.5 rounded-lg border border-border-parchment/70">
                <div className="flex justify-between items-center text-label-sm font-semibold mb-1.5">
                  <span className="text-on-surface">Combat Strength / Prontidão</span>
                  <span className="font-bold text-primary text-[13px] bg-white px-2 py-0.5 rounded border border-border-parchment shadow-xs">{selectedUnit.health}%</span>
                </div>
                {canEditOrDelete ? (
                  <input type="range" min="0" max="100" value={selectedUnit.health} onChange={(e) => updateHealth(Number(e.target.value))} className="w-full accent-primary h-2 bg-surface-container rounded-lg cursor-pointer" />
                ) : (
                  <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${selectedUnit.health}%` }} />
                  </div>
                )}
              </div>

              {/* Fuel / Supply Metric (Visual Placeholder) */}
              <div className="bg-surface-parchment/50 p-2.5 rounded-lg border border-border-parchment/70">
                <div className="flex justify-between items-center text-label-sm font-semibold mb-1.5">
                  <span className="text-on-surface">Fuel & Ammunition Stores</span>
                  <span className="font-bold text-secondary text-[13px] bg-white px-2 py-0.5 rounded border border-border-parchment shadow-xs">72%</span>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full rounded-full" style={{ width: '72%' }}></div>
                </div>
              </div>
            </div>

            {/* CARD 4: SITREP / Moderator Situation Log Card */}
            {isModerator && (
              <div className="bg-surface-card/95 p-4 rounded-xl border border-border-parchment shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-tag-overline text-[10px] text-primary uppercase font-bold tracking-wider">Sitrep / Diretrizes do Moderador</span>
                  <span className="material-symbols-outlined text-[16px] text-primary">edit_note</span>
                </div>
                <textarea 
                  className="w-full bg-surface-parchment-dim/80 text-on-surface p-2.5 rounded-lg text-[12px] font-body-ui focus:outline-none focus:ring-1 focus:ring-primary border border-border-parchment resize-none leading-relaxed shadow-inner" 
                  placeholder="Instruções e ordens da rodada..." 
                  rows={3}
                ></textarea>
              </div>
            )}

            {/* CARD 5: Command Action Panel Card */}
            {isModerator && (
              <div className="bg-surface-card/95 p-4 rounded-xl border border-border-parchment shadow-sm space-y-2.5">
                <span className="font-tag-overline text-[10px] text-primary uppercase font-bold tracking-wider block">Painel de Ações do Comando</span>
                
                {/* Primary Action: Update Orders */}
                <div className="bg-surface-parchment-dim/80 rounded-lg p-2 border border-border-parchment space-y-1.5" id="enemy-visibility-control">
                  <div className="flex items-center justify-between">
                    <span className="font-tag-overline text-[9px] uppercase font-bold text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-secondary">radar</span>
                      Visibilidade Inimiga
                    </span>
                    <span className={`font-tag-overline text-[9px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                      selectedUnit.is_visible_to_enemy ? 'bg-status-alert/15 text-status-alert border-status-alert/30' : 'bg-gray-100 text-gray-500 border-gray-300'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedUnit.is_visible_to_enemy ? 'bg-status-alert' : 'bg-gray-400'}`}></span>
                      {selectedUnit.is_visible_to_enemy ? 'Visível' : 'Oculto'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-surface-container rounded-lg border border-border-parchment/60">
                    <button 
                      onClick={() => toggleVisibility(true)} 
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-label-md text-[11px] transition-all ${
                        selectedUnit.is_visible_to_enemy 
                          ? 'bg-surface-card text-primary shadow-sm border border-border-parchment font-bold' 
                          : 'font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-card/60'
                      }`} 
                      type="button"
                    >
                      <span className={`material-symbols-outlined text-[15px] ${selectedUnit.is_visible_to_enemy ? 'text-status-alert' : ''}`}>visibility</span>
                      <span>Visível</span>
                    </button>
                    <button 
                      onClick={() => toggleVisibility(false)} 
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-label-md text-[11px] transition-all ${
                        !selectedUnit.is_visible_to_enemy 
                          ? 'bg-surface-card text-primary shadow-sm border border-border-parchment font-bold' 
                          : 'font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-card/60'
                      }`} 
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[15px]">visibility_off</span>
                      <span>Ocultar</span>
                    </button>
                  </div>
                </div>

                {/* Secondary: Move to Staging Area */}
                <button onClick={moveToReserve} className="w-full bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-[12px] py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-border-parchment" type="button">
                  <span className="material-symbols-outlined text-[16px]">archive</span>
                  <span>Mover de Volta às Reservas</span>
                </button>

                {/* Status Selector Buttons */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button onClick={() => updateHealth(100)} className="bg-faction-friendly/15 hover:bg-faction-friendly/25 text-faction-friendly font-tag-overline text-[10px] py-1.5 rounded-lg transition-colors uppercase font-bold text-center border border-faction-friendly/30" type="button">
                    Pronto
                  </button>
                  <button onClick={() => updateHealth(60)} className="bg-status-degraded/15 hover:bg-status-degraded/25 text-status-degraded font-tag-overline text-[10px] py-1.5 rounded-lg transition-colors uppercase font-bold text-center border border-status-degraded/30" type="button">
                    Degradado
                  </button>
                  <button onClick={() => updateHealth(10)} className="bg-status-critical/15 hover:bg-status-critical/25 text-status-critical font-tag-overline text-[10px] py-1.5 rounded-lg transition-colors uppercase font-bold text-center border border-status-critical/30" type="button">
                    Crítico
                  </button>
                </div>

                {/* Danger Action: Kill/Eliminate Unit */}
                <button onClick={deleteUnit} className="w-full bg-status-critical/10 hover:bg-status-critical hover:text-white text-status-critical font-label-md text-[12px] py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 mt-1 border border-status-critical/30 font-semibold" type="button">
                  <span className="material-symbols-outlined text-[16px]">dangerous</span>
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
