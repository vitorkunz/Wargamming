"use client";
import React, { useState } from 'react';
import { BattleHazard } from './MapGrid';
import { supabase } from '@/lib/supabaseClient';

interface HazardPanelProps {
  selectedHazard: BattleHazard | null;
  onClose: () => void;
  onSelectHazard: (hazard: BattleHazard | null) => void;
  isModerator: boolean;
  targetTable?: string;
}

export default function HazardPanel({ selectedHazard, onClose, onSelectHazard, isModerator, targetTable = 'Battle_Hazards' }: HazardPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [currentHazard, setCurrentHazard] = useState<BattleHazard | null>(selectedHazard);

  React.useEffect(() => {
    setCurrentHazard(selectedHazard);
  }, [selectedHazard]);

  const handleUpdate = async (field: keyof BattleHazard, value: any) => {
    if (!currentHazard || !isModerator) return;
    setCurrentHazard(prev => prev ? { ...prev, [field]: value } : null);
    const { error } = await supabase.from(targetTable).update({ [field]: value }).eq('id', currentHazard.id);
    if (error) {
      alert("Falha ao atualizar zona operacional: " + error.message);
    }
  };

  const isVisibleToPlayers = Boolean(
    currentHazard?.visible_to_teams?.some(team => team === 'Player A' || team === 'Player B')
  );

  const handleSetVisibility = async (visible: boolean) => {
    if (!currentHazard || !isModerator) return;
    const updatedTeams = visible 
      ? ['Moderator', 'Player A', 'Player B'] 
      : ['Moderator'];
    await handleUpdate('visible_to_teams', updatedTeams);
  };

  const handleDelete = async () => {
    if (!currentHazard || !isModerator) return;
    if (window.confirm("Excluir esta Zona Operacional?")) {
      const { error } = await supabase.from(targetTable).delete().eq('id', currentHazard.id);
      if (!error) {
        onSelectHazard(null);
      } else {
        alert("Falha ao excluir zona operacional: " + error.message);
      }
    }
  };

  const hazardTypes = [
    { value: 'minefield', label: 'Campo Minado' },
    { value: 'flooded_zone', label: 'Zona Inundada' },
    { value: 'naval_blockade', label: 'Bloqueio Naval' },
    { value: 'chemical_zone', label: 'Gás / Área Química' },
    { value: 'artillery_barrage', label: 'Barragem de Artilharia' },
    { value: 'smoke_screen', label: 'Cortina de Fumaça' },
    { value: 'dmz', label: 'Zona Desmilitarizada (DMZ)' },
    { value: 'trenches', label: 'Trincheiras' },
    { value: 'influence_zone', label: 'Zona de Influência' },
  ];

  return (
    <div className="w-full h-full bg-surface-parchment/95 text-on-surface flex flex-col shadow-xl transition-all duration-300 z-50 shrink-0 border-l border-border-parchment">
      {/* Header de Abas: Roster vs Detalhes */}
      <div className="flex items-center justify-between px-space-md pt-space-xs pb-0 bg-surface-parchment-dim/80">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSelectHazard(null)}
            className={`px-3 py-1.5 rounded-t-DEFAULT font-headline-sm text-label-md uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
              !currentHazard
                ? 'bg-surface-parchment text-primary-container font-bold shadow-sm'
                : 'hover:bg-surface-parchment/60 text-outline font-semibold'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">groups</span>
            <span>Roster</span>
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-t-DEFAULT font-headline-sm text-label-md uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
              currentHazard
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
            onClick={() => { setIsOpen(false); onClose(); }}
            className="p-1 rounded-DEFAULT hover:bg-surface-parchment text-primary-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_right</span>
          </button>
        </div>
      </div>

      <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
        {!currentHazard ? (
          <div className="text-center text-on-surface-variant mt-10 p-4 border border-border-parchment border-dashed rounded-xl bg-surface-container/50">
            <span className="material-symbols-outlined text-[20px] opacity-50 mb-2">touch_app</span>
            <p className="font-label-md text-[10px]">Selecione uma Zona Operacional no mapa ou na barra lateral para ver detalhes.</p>
          </div>
        ) : (
          <>
            {/* Identification Card */}
            <div className="bg-surface-card/95 p-3 rounded-xl border border-border-parchment shadow-sm hover:shadow-md transition-shadow">
              <span className="font-tag-overline text-[8.5px] text-faction-hostile uppercase font-bold tracking-wider mb-0.5 block">Rótulo / Nome</span>
              {isModerator ? (
                <input
                  type="text"
                  key={currentHazard.id + (currentHazard.label || '')}
                  defaultValue={currentHazard.label || ''}
                  placeholder="Ex: Campo Minado Alpha"
                  onBlur={(e) => handleUpdate('label', e.target.value)}
                  className="font-headline-md text-[12px] font-bold text-faction-hostile tracking-tight leading-tight w-full bg-surface-container rounded px-1 -mx-1 border border-transparent hover:border-outline-variant focus:border-faction-hostile focus:outline-none"
                />
              ) : (
                <h3 className="font-headline-md text-[12px] font-bold text-faction-hostile tracking-tight leading-tight">{currentHazard.label || hazardTypes.find(ht => ht.value === currentHazard.hazard_type)?.label || currentHazard.hazard_type.replace('_', ' ')}</h3>
              )}
              <span className="font-tag-overline text-[8.5px] text-on-surface-variant mt-1 block">ID: {currentHazard.id.substring(0, 8).toUpperCase()}</span>
            </div>

            {/* Properties Card */}
            <div className="bg-surface-card/95 p-3 rounded-xl border border-border-parchment shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-tag-overline text-[9px] text-primary uppercase font-bold tracking-wider">Propriedades</span>
                <span className="material-symbols-outlined text-primary text-[14px]">tune</span>
              </div>
              
              <div className="space-y-2">
                <div className="bg-surface-parchment-dim p-2 rounded-lg border border-border-parchment">
                  <label className="text-[9px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5 block">Tipo</label>
                  {isModerator ? (
                    <select 
                      className="w-full bg-surface-card text-on-surface border border-border-parchment rounded p-1 text-[11px] font-semibold outline-none"
                      value={currentHazard.hazard_type}
                      onChange={(e) => handleUpdate('hazard_type', e.target.value)}
                    >
                      {hazardTypes.map(ht => (
                        <option key={ht.value} value={ht.value}>{ht.label}</option>
                      ))}
                      {!hazardTypes.some(ht => ht.value === currentHazard.hazard_type) && (
                        <option value={currentHazard.hazard_type}>{currentHazard.hazard_type}</option>
                      )}
                    </select>
                  ) : (
                    <p className="text-[11px] font-semibold capitalize text-on-surface">
                      {hazardTypes.find(ht => ht.value === currentHazard.hazard_type)?.label || currentHazard.hazard_type.replace('_', ' ')}
                    </p>
                  )}
                </div>

                <div className="bg-surface-parchment-dim p-2 rounded-lg border border-border-parchment">
                  <label className="text-[9px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5 block">Status</label>
                  <select 
                    disabled={!isModerator}
                    className="w-full bg-surface-card text-on-surface border border-border-parchment rounded p-1 text-[11px] font-semibold outline-none disabled:opacity-50"
                    value={currentHazard.status}
                    onChange={(e) => handleUpdate('status', e.target.value)}
                  >
                    <option value="active">Ativo</option>
                    <option value="cleared">Limpo / Inativo</option>
                    <option value="breached">Violado / Parcial</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Config & Notes */}
            {isModerator && (
              <div className="bg-surface-card/95 p-3 rounded-xl border border-border-parchment shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-tag-overline text-[9px] text-primary uppercase font-bold tracking-wider">Configurações do Moderador</span>
                  <span className="material-symbols-outlined text-primary text-[14px]">admin_panel_settings</span>
                </div>
                
                <div className="bg-surface-parchment-dim/80 rounded-lg p-1.5 border border-border-parchment space-y-1" id="enemy-visibility-control">
                  <div className="flex items-center justify-between">
                    <span className="font-tag-overline text-[8px] uppercase font-bold text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px] text-secondary">radar</span>
                      Visibilidade Inimiga
                    </span>
                    <span className={`font-tag-overline text-[8px] px-1.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                      isVisibleToPlayers ? 'bg-status-alert/15 text-status-alert border-status-alert/30' : 'bg-gray-100 text-gray-500 border-gray-300'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${isVisibleToPlayers ? 'bg-status-alert' : 'bg-gray-400'}`}></span>
                      {isVisibleToPlayers ? 'Visível' : 'Oculto'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-surface-container rounded-lg border border-border-parchment/60">
                    <button 
                      onClick={() => handleSetVisibility(true)} 
                      className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md font-label-md text-[9.5px] transition-all ${
                        isVisibleToPlayers 
                          ? 'bg-surface-card text-primary shadow-sm border border-border-parchment font-bold' 
                          : 'font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-card/60'
                      }`} 
                      type="button"
                    >
                      <span className={`material-symbols-outlined text-[13px] ${isVisibleToPlayers ? 'text-status-alert' : ''}`}>visibility</span>
                      <span>Visível</span>
                    </button>
                    <button 
                      onClick={() => handleSetVisibility(false)} 
                      className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md font-label-md text-[9.5px] transition-all ${
                        !isVisibleToPlayers 
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
                
                <div className="pt-1">
                   <label className="text-[9px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5 block">Anotações (Privadas)</label>
                   <textarea 
                     className="w-full bg-surface-container text-on-surface border border-border-parchment rounded p-1.5 text-[11px] h-20 outline-none focus:border-primary shadow-inner custom-scrollbar"
                     key={currentHazard.id + (currentHazard.notes || '')}
                     defaultValue={currentHazard.notes || ''}
                     placeholder="Adicionar anotações privadas do moderador sobre esta zona..."
                     onBlur={(e) => handleUpdate('notes', e.target.value)}
                   />
                </div>

                <div className="pt-1">
                  <button 
                    onClick={handleDelete}
                    className="w-full bg-status-critical/10 hover:bg-status-critical hover:text-white text-status-critical font-label-md text-[9.5px] py-1.5 px-2 rounded-lg transition-colors flex items-center justify-center gap-1 border border-status-critical/30 font-semibold"
                  >
                    <span className="material-symbols-outlined text-[13px]">delete_forever</span>
                    <span>Excluir Zona Operacional</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
