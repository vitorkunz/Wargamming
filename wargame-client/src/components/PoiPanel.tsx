"use client";
import React, { useState } from 'react';
import { MapPOI } from './MapGrid';
import { supabase } from '@/lib/supabaseClient';
import { PoiBadge } from './PoiBadge';

interface PoiPanelProps {
  pois: MapPOI[];
  selectedPoi: MapPOI | null;
  onClose: () => void;
  onSelectPoi: (poiId: string | null) => void;
  isModerator: boolean;
  targetTable?: string;
  role?: string;
}

export default function PoiPanel({ pois, selectedPoi, onClose, onSelectPoi, isModerator, targetTable = 'Map_POIs', role }: PoiPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [currentPoi, setCurrentPoi] = useState<MapPOI | null>(selectedPoi);

  React.useEffect(() => {
    setCurrentPoi(selectedPoi);
  }, [selectedPoi]);

  const canEdit = isModerator || (role && currentPoi && currentPoi.owner === role);

  const handleUpdate = async (field: keyof MapPOI, value: any) => {
    // If it's visible_to_enemy toggle, we allow it if canEdit is true
    if (!currentPoi || !canEdit) return;
    
    // For other fields, maybe we still restrict to moderator?
    // User requested "players and moderator should be able to hide and unhide specific POIs"
    // Let's allow players to edit their own POIs completely, or at least the visibility.
    if (!isModerator && field !== 'is_visible_to_enemy') return;

    setCurrentPoi(prev => prev ? { ...prev, [field]: value } : null);
    const { error } = await supabase.from(targetTable).update({ [field]: value }).eq('id', currentPoi.id);
    if (error) {
      alert("Falha ao atualizar POI: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!currentPoi || !isModerator) return;
    if (window.confirm("Excluir este POI?")) {
      const { error } = await supabase.from(targetTable).delete().eq('id', currentPoi.id);
      if (!error) onSelectPoi(null);
    }
  };

  const poiTypes = [
    { value: 'military_base', label: 'Base Militar' },
    { value: 'headquarters', label: 'Quartel General (HQ)' },
    { value: 'factory', label: 'Fábrica' },
    { value: 'bridge', label: 'Ponte' },
    { value: 'airfield', label: 'Aeródromo / Base Aérea' },
    { value: 'bunker', label: 'Bunker' },
    { value: 'checkpoint', label: 'Ponto de Controle (Checkpoint)' },
    { value: 'depot', label: 'Depósito de Suprimentos' },
    { value: 'port', label: 'Porto / Base Naval' },
    { value: 'radar', label: 'Estação de Radar' },
    { value: 'outpost', label: 'Posto Avançado' },
  ];

  const statusOptions = [
    { value: 'operational', label: 'Operacional' },
    { value: 'damaged', label: 'Danificado' },
    { value: 'destroyed', label: 'Destruído' },
    { value: 'under_construction', label: 'Em Construção' },
  ];

  const ownerOptions = [
    { value: 'Neutral', label: 'Neutro' },
    { value: 'Player A', label: 'Time A' },
    { value: 'Player B', label: 'Time B' },
    { value: 'Unknown', label: 'Não Confirmado' },
  ];

  return (
    <div className="w-full h-full bg-surface-parchment/95 text-on-surface flex flex-col shadow-xl transition-all duration-300 z-50 shrink-0 border-l border-border-parchment">
      {/* Header */}
      <div className="bg-primary-container p-2 flex items-center justify-between shadow-sm border-b border-white/10 shrink-0">
        <h2 className="font-headline-sm text-[9.5px] text-text-on-dark uppercase tracking-wider font-bold flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px]">location_on</span>
          Detalhes do POI
        </h2>
        <button onClick={() => { setIsOpen(false); onClose(); }} className="p-1 rounded text-primary-fixed-dim hover:text-white hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-[14px]">keyboard_double_arrow_right</span>
        </button>
      </div>

      <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
        {!currentPoi ? (
          <div className="text-center text-on-surface-variant mt-10 p-4 border border-border-parchment border-dashed rounded-xl bg-surface-container/50">
            <span className="material-symbols-outlined text-[20px] opacity-50 mb-2">touch_app</span>
            <p className="font-label-md text-[10px]">Selecione um POI no mapa ou na barra lateral para ver detalhes.</p>
          </div>
        ) : (
          <>
            {/* Identification Card */}
            <div className="bg-surface-card/95 p-3 rounded-xl border border-border-parchment shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2 pb-2 border-b border-border-parchment/60">
                 <PoiBadge type={currentPoi.type} owner={currentPoi.owner} status={currentPoi.status} size={32} />
                 <div className="flex-1">
                   <label className="font-tag-overline text-[8.5px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5 block">Status</label>
                   <span className={`font-label-md text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                     currentPoi.status === 'damaged' ? 'bg-status-alert/20 text-status-alert border-status-alert/30' :
                     currentPoi.status === 'destroyed' ? 'bg-status-critical/20 text-status-critical border-status-critical/30' :
                     currentPoi.status === 'under_construction' ? 'bg-secondary/20 text-secondary border-secondary/30' :
                     'bg-status-success/20 text-status-success border-status-success/30'
                   }`}>
                     {statusOptions.find(s => s.value === currentPoi.status)?.label || currentPoi.status.replace('_', ' ')}
                   </span>
                 </div>
              </div>

              <div>
                <span className="font-tag-overline text-[8.5px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5 block">Nome</span>
                {isModerator ? (
                  <input
                    type="text"
                    key={currentPoi.id + currentPoi.name}
                    defaultValue={currentPoi.name}
                    onBlur={(e) => handleUpdate('name', e.target.value)}
                    className="font-headline-md text-[12px] font-bold text-on-surface tracking-tight leading-tight w-full bg-surface-container rounded px-1 -mx-1 border border-transparent hover:border-outline-variant focus:border-primary focus:outline-none"
                  />
                ) : (
                  <h3 className="font-headline-md text-[12px] font-bold text-on-surface tracking-tight leading-tight">{currentPoi.name}</h3>
                )}
                <span className="font-tag-overline text-[8.5px] text-on-surface-variant mt-1 block">ID: {currentPoi.id.substring(0, 8).toUpperCase()}</span>
              </div>
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
                      value={currentPoi.type}
                      onChange={(e) => handleUpdate('type', e.target.value)}
                    >
                      {poiTypes.map(pt => (
                        <option key={pt.value} value={pt.value}>{pt.label}</option>
                      ))}
                      {!poiTypes.some(pt => pt.value === currentPoi.type) && (
                        <option value={currentPoi.type}>{currentPoi.type}</option>
                      )}
                    </select>
                  ) : (
                    <p className="text-[11px] font-semibold capitalize text-on-surface">
                      {poiTypes.find(pt => pt.value === currentPoi.type)?.label || currentPoi.type.replace('_', ' ')}
                    </p>
                  )}
                </div>

                <div className="bg-surface-parchment-dim p-2 rounded-lg border border-border-parchment">
                  <label className="text-[9px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5 block">Status</label>
                  <select 
                    disabled={!isModerator}
                    className="w-full bg-surface-card text-on-surface border border-border-parchment rounded p-1 text-[11px] font-semibold outline-none disabled:opacity-50"
                    value={currentPoi.status}
                    onChange={(e) => handleUpdate('status', e.target.value)}
                  >
                    {statusOptions.map(st => (
                      <option key={st.value} value={st.value}>{st.label}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-surface-parchment-dim p-2 rounded-lg border border-border-parchment">
                  <label className="text-[9px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5 block">Proprietário</label>
                  <select 
                    disabled={!isModerator}
                    className="w-full bg-surface-card text-on-surface border border-border-parchment rounded p-1 text-[11px] font-semibold outline-none disabled:opacity-50"
                    value={currentPoi.owner}
                    onChange={(e) => handleUpdate('owner', e.target.value)}
                  >
                    {ownerOptions.map(ow => (
                      <option key={ow.value} value={ow.value}>{ow.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Config & Actions */}
            {(isModerator || canEdit) && (
              <div className="bg-surface-card/95 p-3 rounded-xl border border-border-parchment shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-tag-overline text-[9px] text-primary uppercase font-bold tracking-wider">
                    {isModerator ? 'Painel de Ações do Comando' : 'Ações do POI'}
                  </span>
                  <span className="material-symbols-outlined text-primary text-[14px]">
                    {isModerator ? 'admin_panel_settings' : 'tune'}
                  </span>
                </div>
                
                <div className="bg-surface-parchment-dim/80 rounded-lg p-1.5 border border-border-parchment space-y-1" id="enemy-visibility-control">
                  <div className="flex items-center justify-between">
                    <span className="font-tag-overline text-[8px] uppercase font-bold text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px] text-secondary">radar</span>
                      Visibilidade Inimiga
                    </span>
                    <span className={`font-tag-overline text-[8px] px-1.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                      currentPoi.is_visible_to_enemy ? 'bg-status-alert/15 text-status-alert border-status-alert/30' : 'bg-gray-100 text-gray-500 border-gray-300'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${currentPoi.is_visible_to_enemy ? 'bg-status-alert' : 'bg-gray-400'}`}></span>
                      {currentPoi.is_visible_to_enemy ? 'Visível' : 'Oculto'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-surface-container rounded-lg border border-border-parchment/60">
                    <button 
                      onClick={() => handleUpdate('is_visible_to_enemy', true)} 
                      className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md font-label-md text-[9.5px] transition-all ${
                        currentPoi.is_visible_to_enemy 
                          ? 'bg-surface-card text-primary shadow-sm border border-border-parchment font-bold' 
                          : 'font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-card/60'
                      }`} 
                      type="button"
                    >
                      <span className={`material-symbols-outlined text-[13px] ${currentPoi.is_visible_to_enemy ? 'text-status-alert' : ''}`}>visibility</span>
                      <span>Visível</span>
                    </button>
                    <button 
                      onClick={() => handleUpdate('is_visible_to_enemy', false)} 
                      className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md font-label-md text-[9.5px] transition-all ${
                        !currentPoi.is_visible_to_enemy 
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
                
                {isModerator && (
                  <>
                    <div className="pt-1">
                       <label className="text-[9px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5 block">Anotações (Privadas)</label>
                       <textarea 
                         className="w-full bg-surface-container text-on-surface border border-border-parchment rounded p-1.5 text-[11px] h-20 outline-none focus:border-primary shadow-inner custom-scrollbar"
                         key={currentPoi.id + (currentPoi.notes || '')}
                         defaultValue={currentPoi.notes || ''}
                         placeholder="Adicionar anotações privadas do moderador..."
                         onBlur={(e) => handleUpdate('notes', e.target.value)}
                       />
                    </div>

                    <div className="pt-1">
                      <button 
                        onClick={handleDelete}
                        className="w-full bg-status-critical/10 hover:bg-status-critical hover:text-white text-status-critical font-label-md text-[9.5px] py-1.5 px-2 rounded-lg transition-colors flex items-center justify-center gap-1 border border-status-critical/30 font-semibold"
                      >
                        <span className="material-symbols-outlined text-[13px]">delete_forever</span>
                        <span>Excluir POI</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
