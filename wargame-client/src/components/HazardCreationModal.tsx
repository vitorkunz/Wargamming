"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';

interface HazardCreationModalProps {
  pendingHazardPoints: { x: number, y: number }[];
  onClose: () => void;
  table?: string;
  isModerator?: boolean;
}

export default function HazardCreationModal({ 
  pendingHazardPoints,
  onClose,
  table = 'Battle_Hazards',
  isModerator = true
}: HazardCreationModalProps) {
  const [hazardType, setHazardType] = useState('minefield');
  const [label, setLabel] = useState('Nova Zona Operacional');
  const [visibleToPlayerA, setVisibleToPlayerA] = useState(false);
  const [visibleToPlayerB, setVisibleToPlayerB] = useState(false);
  const [notes, setNotes] = useState('');

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleCreateHazard = async () => {
    try {
      const visible_to_teams = ['Moderator'];
      if (visibleToPlayerA) visible_to_teams.push('Player A');
      if (visibleToPlayerB) visible_to_teams.push('Player B');

      const insertPayload = {
        hazard_type: hazardType,
        label: label.trim() || null,
        created_by: 'Moderator',
        coordinates: pendingHazardPoints,
        status: 'active',
        visible_to_teams,
        notes: notes.trim() || null
      };

      const { error } = await supabase.from(table).insert(insertPayload);

      if (error) {
        alert("Falha ao criar zona operacional: " + error.message);
      } else {
        onClose();
      }
    } catch (err: any) {
      alert("Erro inesperado: " + err.message);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-parchment w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-border-parchment" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-[#004B41] text-white px-5 py-4 flex items-center justify-between shadow-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">polyline</span>
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight font-headline-sm">Criar Zona Operacional</h2>
              <p className="text-[11px] text-white/80 font-body-base">Configure tipo, identificação e visibilidade da área delimitada</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#F9F7F1] custom-scrollbar">
          
          <div className="bg-[#F4F1E1] border border-[#2d7d74]/30 rounded-lg p-3 flex items-start gap-2 shadow-inner">
            <span className="material-symbols-outlined text-[#2d7d74] text-[18px]">info</span>
            <div>
              <p className="text-[12px] text-on-surface font-bold">Área Capturada</p>
              <p className="text-[11px] text-on-surface-variant">Polígono definido com {pendingHazardPoints.length} vértices.</p>
            </div>
          </div>

          {/* Section 1: Type */}
          <div className="space-y-2">
            <h3 className="font-tag-overline text-[11px] uppercase tracking-wider font-bold text-primary">1. Tipo de Zona Operacional (Hazard)</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'minefield', name: 'Campo Minado', desc: 'Restrição Severa', color: 'border-status-alert', icon: 'warning' },
                { id: 'naval_blockade', name: 'Bloqueio Naval', desc: 'Interdição Marítima', color: 'border-[#a855f7]', icon: 'anchor' },
                { id: 'flooded_zone', name: 'Zona Inundada', desc: 'Terreno Intransitável', color: 'border-blue-500', icon: 'water_damage' },
                { id: 'dmz', name: 'Zona Desmilitarizada', desc: 'Área Neutra / DMZ', color: 'border-gray-500', icon: 'not_listed_location' },
                { id: 'trenches', name: 'Trincheiras', desc: 'Defesa Estática', color: 'border-amber-700', icon: 'horizontal_rule' },
                { id: 'artillery_barrage', name: 'Barragem de Artilharia', desc: 'Fogo Indireto', color: 'border-red-600', icon: 'explosion' },
                { id: 'chemical_zone', name: 'Gás / Área Química', desc: 'Contaminação NRBQ', color: 'border-green-600', icon: 'science' },
                { id: 'smoke_screen', name: 'Cortina de Fumaça', desc: 'Bloqueio Visual', color: 'border-gray-400', icon: 'cloud' },
                { id: 'influence_zone', name: 'Zona de Influência', desc: 'Controle Estratégico', color: 'border-blue-400', icon: 'radar' }
              ].map(type => (
                <label key={type.id} className={`cursor-pointer rounded-lg p-3 border-2 transition-all flex flex-col bg-white ${hazardType === type.id ? `border-[#2d7d74] shadow-sm` : 'border-border-parchment hover:border-gray-300'}`}>
                  <input type="radio" name="hazardType" className="hidden" checked={hazardType === type.id} onChange={() => setHazardType(type.id)} />
                  <div className="flex items-center justify-between mb-1">
                    <span className="material-symbols-outlined text-[16px] text-[#2d7d74]">{type.icon}</span>
                    <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${hazardType === type.id ? 'border-[#2d7d74]' : 'border-gray-300'}`}>
                      {hazardType === type.id && <span className="w-1.5 h-1.5 rounded-full bg-[#2d7d74]"></span>}
                    </div>
                  </div>
                  <span className="font-headline-sm font-bold text-[12px] text-on-surface leading-tight mt-1">{type.name}</span>
                  <span className="text-[9px] text-on-surface-variant uppercase mt-0.5">{type.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 2: Identification */}
          <div className="space-y-2">
            <h3 className="font-tag-overline text-[11px] uppercase tracking-wider font-bold text-primary">2. Identificação</h3>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-on-surface">Rótulo / Nome da Zona *</label>
              <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. Campo Minado Alfa" className="w-full bg-[#F4F1E1] border border-border-parchment rounded-lg p-2.5 text-[13px] font-headline-sm font-bold text-on-surface focus:outline-none focus:border-primary shadow-inner" />
            </div>
          </div>

          {/* Section 3: Visibility */}
          <div className="space-y-2">
            <h3 className="font-tag-overline text-[11px] uppercase tracking-wider font-bold text-primary">3. Visibilidade / Névoa de Guerra</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className={`cursor-pointer rounded-lg p-3 border-2 transition-all flex items-center gap-3 bg-white ${visibleToPlayerA ? 'border-[#2d7d74] shadow-sm' : 'border-border-parchment hover:border-gray-300'}`}>
                <input type="checkbox" className="hidden" checked={visibleToPlayerA} onChange={(e) => setVisibleToPlayerA(e.target.checked)} />
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${visibleToPlayerA ? 'border-[#2d7d74] bg-[#2d7d74]' : 'border-gray-300'}`}>
                  {visibleToPlayerA && <span className="material-symbols-outlined text-[12px] text-white font-bold">check</span>}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-[12px] text-on-surface">Revelar para Time A</span>
                  <span className="text-[10px] text-on-surface-variant">Visível para Força Aliada</span>
                </div>
              </label>

              <label className={`cursor-pointer rounded-lg p-3 border-2 transition-all flex items-center gap-3 bg-white ${visibleToPlayerB ? 'border-[#c03a6b] shadow-sm' : 'border-border-parchment hover:border-gray-300'}`}>
                <input type="checkbox" className="hidden" checked={visibleToPlayerB} onChange={(e) => setVisibleToPlayerB(e.target.checked)} />
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${visibleToPlayerB ? 'border-[#c03a6b] bg-[#c03a6b]' : 'border-gray-300'}`}>
                  {visibleToPlayerB && <span className="material-symbols-outlined text-[12px] text-white font-bold">check</span>}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-[12px] text-on-surface">Revelar para Time B</span>
                  <span className="text-[10px] text-on-surface-variant">Visível para Força Opositora</span>
                </div>
              </label>
            </div>
          </div>

          {/* Section 4: Notes */}
          <div className="space-y-2">
             <h3 className="font-tag-overline text-[11px] uppercase tracking-wider font-bold text-primary">4. Diretrizes Táticas / Observações do Moderador</h3>
             <textarea 
               value={notes} 
               onChange={(e) => setNotes(e.target.value)} 
               placeholder="Notas exclusivas do moderador..." 
               rows={2} 
               className="w-full bg-[#F4F1E1] border border-border-parchment rounded-lg p-3 text-[12px] text-on-surface focus:outline-none focus:border-primary shadow-inner resize-none"
             />
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#F4F1E1] border-t border-border-parchment p-4 flex justify-between items-center z-10">
          <button type="button" onClick={onClose} className="text-[13px] font-bold text-on-surface-variant hover:text-on-surface">
            Cancelar
          </button>
          <button type="button" onClick={handleCreateHazard} className="bg-[#004B41] hover:bg-[#003831] text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-colors text-[13px]">
            <span className="material-symbols-outlined text-[18px]">save</span>
            Criar Zona Operacional
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
