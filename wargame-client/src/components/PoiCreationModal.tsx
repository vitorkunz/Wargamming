"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';
import { PoiBadge } from './PoiBadge';

interface PoiCreationModalProps {
  table?: string;
  fixedOwner?: 'Player A' | 'Player B';
  onClose: () => void;
  isModerator?: boolean;
  initialCoordinates?: { x: number, y: number } | null;
}

export default function PoiCreationModal({ 
  table = 'Map_POIs', 
  fixedOwner,
  onClose,
  isModerator = true,
  initialCoordinates
}: PoiCreationModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('military_base');
  const [owner, setOwner] = useState<'Player A' | 'Player B' | 'Neutral'>((fixedOwner as 'Player A' | 'Player B') || 'Neutral');
  
  const [visibility, setVisibility] = useState<'visible' | 'hidden'>('visible');
  const [notes, setNotes] = useState('');

  const handleCreatePoi = async () => {
    try {
      if (!name.trim()) {
        alert("Por favor, digite um nome para o objetivo estratégico");
        return;
      }
      
      const assignedOwner = fixedOwner || owner;
      const isVisible = visibility === 'visible';

      const insertPayload: Record<string, string | number | boolean | null> = {
        name: name.trim(),
        type,
        owner: assignedOwner,
        x_coord: initialCoordinates ? initialCoordinates.x : 0, 
        y_coord: initialCoordinates ? initialCoordinates.y : 0,
        status: 'operational',
        is_visible_to_enemy: isVisible,
        notes: notes.trim() || null
      };

      console.log(`Attempting to insert into table: ${table} with payload:`, insertPayload);

      const { data, error } = await supabase.from(table).insert(insertPayload).select();

      console.log("Supabase response:", { data, error });

      if (error) {
        console.error("Supabase insert error:", error);
        alert("Falha ao criar objetivo estratégico: " + error.message);
      } else {
        console.log("POI spawned successfully!");
        onClose();
      }
    } catch (err: any) {
      console.error("Unexpected error in handleCreatePoi:", err);
      alert("Erro inesperado: " + err.message);
    }
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-parchment w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-border-parchment" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-[#004B41] text-white px-5 py-4 flex items-center justify-between shadow-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">flag</span>
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight font-headline-sm">Criar Objetivo Estratégico</h2>
              <p className="text-[11px] text-white/80 font-body-base">Defina as características e localização do objetivo estratégico</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#F9F7F1] custom-scrollbar">
          
          {/* Section 1: Facção */}
          <div className="space-y-2">
            <h3 className="font-tag-overline text-[11px] uppercase tracking-wider font-bold text-primary">1. Facção / Controle</h3>
            <div className="grid grid-cols-3 gap-3">
              <label className={`cursor-pointer rounded-lg p-3 border-2 transition-all flex flex-col bg-white ${owner === 'Player A' ? 'border-[#2d7d74] shadow-sm' : 'border-border-parchment hover:border-gray-300'}`}>
                <input type="radio" name="faction" className="hidden" checked={owner === 'Player A'} onChange={() => setOwner('Player A')} disabled={!!fixedOwner} />
                <div className="flex items-center justify-between mb-1">
                  <span className={`w-3 h-3 rounded-full ${owner === 'Player A' ? 'bg-[#2d7d74]' : 'bg-gray-200'}`}></span>
                  <span className="text-[9px] font-bold text-[#2d7d74] uppercase">Aliado</span>
                </div>
                <span className="font-headline-sm font-bold text-[14px] text-on-surface">Time A</span>
              </label>

              <label className={`cursor-pointer rounded-lg p-3 border-2 transition-all flex flex-col bg-white ${owner === 'Player B' ? 'border-[#c03a6b] shadow-sm' : 'border-border-parchment hover:border-gray-300'}`}>
                <input type="radio" name="faction" className="hidden" checked={owner === 'Player B'} onChange={() => setOwner('Player B')} disabled={!!fixedOwner} />
                <div className="flex items-center justify-between mb-1">
                  <span className={`w-3 h-3 rounded-full ${owner === 'Player B' ? 'bg-[#c03a6b]' : 'bg-gray-200'}`}></span>
                  <span className="text-[9px] font-bold text-[#c03a6b] uppercase">Hostil</span>
                </div>
                <span className="font-headline-sm font-bold text-[14px] text-on-surface">Time B</span>
              </label>

              <label className={`cursor-pointer rounded-lg p-3 border-2 transition-all flex flex-col bg-white ${owner === 'Neutral' ? 'border-[#26265b] shadow-sm' : 'border-border-parchment hover:border-gray-300'}`}>
                <input type="radio" name="faction" className="hidden" checked={owner === 'Neutral'} onChange={() => setOwner('Neutral')} disabled={!!fixedOwner} />
                <div className="flex items-center justify-between mb-1">
                  <span className={`w-3 h-3 rounded-full ${owner === 'Neutral' ? 'bg-[#26265b]' : 'bg-gray-200'}`}></span>
                  <span className="text-[9px] font-bold text-[#26265b] uppercase">Neutro</span>
                </div>
                <span className="font-headline-sm font-bold text-[14px] text-on-surface">Neutro</span>
              </label>
            </div>
          </div>

          {/* Section 2: Identity */}
          <div className="space-y-2">
            <h3 className="font-tag-overline text-[11px] uppercase tracking-wider font-bold text-primary">2. Identidade & Tipo</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-[11px] font-bold text-on-surface">Nome / Designação do Objetivo *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Base Alfa" className="w-full bg-[#F4F1E1] border border-border-parchment rounded-lg p-2.5 text-[13px] font-headline-sm font-bold text-on-surface focus:outline-none focus:border-primary shadow-inner" />
              </div>
              <div className="col-span-1 space-y-1.5">
                <label className="text-[11px] font-bold text-on-surface">Tipo *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <PoiBadge type={type} owner={owner} size={24} />
                  </div>
                  <select value={type} onChange={(e) => setType(e.target.value)} className="w-full pl-10 pr-3 py-2.5 bg-white border border-border-parchment rounded-lg text-[13px] font-headline-sm font-bold text-on-surface appearance-none focus:outline-none focus:border-primary">
                    <option value="military_base">Base Militar</option>
                    <option value="headquarters">Quartel General (HQ)</option>
                    <option value="factory">Fábrica</option>
                    <option value="bridge">Ponte</option>
                    <option value="airfield">Aeródromo / Base Aérea</option>
                    <option value="bunker">Bunker</option>
                    <option value="checkpoint">Ponto de Controle (Checkpoint)</option>
                    <option value="depot">Depósito de Suprimentos</option>
                    <option value="port">Porto / Base Naval</option>
                    <option value="radar">Estação de Radar</option>
                    <option value="outpost">Posto Avançado</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-on-surface-variant text-[20px]">expand_more</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Visibility */}
          <div className="space-y-2">
            <h3 className="font-tag-overline text-[11px] uppercase tracking-wider font-bold text-primary">3. Visibilidade</h3>
            <div className="grid grid-cols-2 gap-2">
              <label className={`cursor-pointer rounded-lg p-3 border-2 transition-all flex items-center gap-3 bg-white ${visibility === 'visible' ? 'border-[#2d7d74] shadow-sm' : 'border-border-parchment hover:border-gray-300'}`}>
                <input type="radio" name="visibility" className="hidden" checked={visibility === 'visible'} onChange={() => setVisibility('visible')} />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${visibility === 'visible' ? 'border-[#2d7d74]' : 'border-gray-300'}`}>
                  {visibility === 'visible' && <span className="w-2 h-2 rounded-full bg-[#2d7d74]"></span>}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-[12px] text-on-surface">Visível Imediatamente</span>
                  <span className="text-[10px] text-on-surface-variant">Todos visualizam o POI</span>
                </div>
              </label>
              <label className={`cursor-pointer rounded-lg p-3 border-2 transition-all flex items-center gap-3 bg-white ${visibility === 'hidden' ? 'border-[#2d7d74] shadow-sm' : 'border-border-parchment hover:border-gray-300'}`}>
                <input type="radio" name="visibility" className="hidden" checked={visibility === 'hidden'} onChange={() => setVisibility('hidden')} />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${visibility === 'hidden' ? 'border-[#2d7d74]' : 'border-gray-300'}`}>
                  {visibility === 'hidden' && <span className="w-2 h-2 rounded-full bg-[#2d7d74]"></span>}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-[12px] text-on-surface">Oculto</span>
                  <span className="text-[10px] text-on-surface-variant">Visível somente para o Moderador e facção</span>
                </div>
              </label>
            </div>
          </div>

          {/* Section 6: Notes */}
          <div className="space-y-2">
             <h3 className="font-tag-overline text-[11px] uppercase tracking-wider font-bold text-primary">4. Notas / Observações</h3>
             <textarea 
               value={notes} 
               onChange={(e) => setNotes(e.target.value)} 
               placeholder="Objetivo estratégico principal..." 
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
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleCreatePoi} className="bg-[#004B41] hover:bg-[#003831] text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-[13px]">
              <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
              Criar no Mapa
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
