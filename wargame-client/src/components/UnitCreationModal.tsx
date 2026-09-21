"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

interface UnitCreationModalProps {
  table?: string;
  fixedOwner?: 'Player A' | 'Player B';
  onClose: () => void;
  isModerator?: boolean;
  initialCoordinates?: { x: number, y: number } | null;
  initialType?: string;
}

export default function UnitCreationModal({ 
  table = 'Battle_Units', 
  fixedOwner,
  onClose,
  isModerator = true,
  initialCoordinates,
  initialType
}: UnitCreationModalProps) {
  const [name, setName] = useState('');
  const [health, setHealth] = useState(100);
  const [ammo, setAmmo] = useState(100);
  const [owner, setOwner] = useState<'Player A' | 'Player B' | 'Unknown' | 'Neutral'>((fixedOwner as 'Player A' | 'Player B') || 'Player A');
  const [type, setType] = useState<UnitTypeKey>((initialType as UnitTypeKey) || 'infantry');
  
  const [visibility, setVisibility] = useState<'visible' | 'hidden'>('hidden');
  const [allocation, setAllocation] = useState<'reserve' | 'map'>(initialCoordinates ? 'map' : 'reserve');
  const [notes, setNotes] = useState('');

  // Default derivation based on owner
  const affiliation: AffiliationKey = 
    owner === 'Player A' ? 'friendly' : 
    owner === 'Player B' ? 'hostile' : 
    owner === 'Unknown' ? 'unknown' : 'neutral';

  const affiliationCode = AFFILIATIONS[affiliation];
  const typeDef = UNIT_TYPES[type] || UNIT_TYPES['infantry'];
  const echelonCode = ECHELONS['none'];
  const sidc = `S${affiliationCode}${typeDef.dimension}P${typeDef.code}-${echelonCode}---`;

  // Removed renderIcon

  const handleCreateUnit = async (spawnOnMap: boolean) => {
    try {
      console.log("Button clicked! spawnOnMap:", spawnOnMap);
      const assignedOwner = fixedOwner || owner;
      const isVisible = visibility === 'visible';

      const insertPayload: Record<string, string | number | boolean | null> = {
        name: name.trim() || null,
        type: sidc,
        owner: assignedOwner,
        health,
        ammo,
        x_coord: spawnOnMap && initialCoordinates ? initialCoordinates.x : 0, 
        y_coord: spawnOnMap && initialCoordinates ? initialCoordinates.y : 0,
        in_reserve: !spawnOnMap
      };

      if (table === 'Battle_Units' || table === 'Moderator_Units') {
        insertPayload.is_visible_to_enemy = isVisible;
      }
      
      console.log(`Attempting to insert into table: ${table} with payload:`, insertPayload);

      const { data, error } = await supabase.from(table).insert(insertPayload).select();

      console.log("Supabase response:", { data, error });

      if (error) {
        console.error("Supabase insert error:", error);
        alert("Failed to spawn unit: " + error.message + "\nCheck console for details.");
      } else {
        console.log("Unit spawned successfully!");
        onClose();
      }
    } catch (err: any) {
      console.error("Unexpected error in handleCreateUnit:", err);
      alert("Unexpected error: " + err.message);
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
              <span className="material-symbols-outlined text-[24px]">add_box</span>
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight font-headline-sm">Criar Nova Unidade</h2>
              <p className="text-[11px] text-white/80 font-body-base">Defina as características operacionais, facção, prontidão e alocação inicial</p>
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
            <h3 className="font-tag-overline text-[11px] uppercase tracking-wider font-bold text-primary">1. Facção / Afiliação Operacional</h3>
            <div className="grid grid-cols-4 gap-3">
              <label className={`cursor-pointer rounded-lg p-3 border-2 transition-all flex flex-col bg-white ${owner === 'Player A' ? 'border-[#2d7d74] shadow-sm' : 'border-border-parchment hover:border-gray-300'}`}>
                <input type="radio" name="faction" className="hidden" checked={owner === 'Player A'} onChange={() => setOwner('Player A')} disabled={!!fixedOwner} />
                <div className="flex items-center justify-between mb-1">
                  <span className={`w-3 h-3 rounded-full ${owner === 'Player A' ? 'bg-[#2d7d74]' : 'bg-gray-200'}`}></span>
                  <span className="text-[9px] font-bold text-[#2d7d74] uppercase">Aliado</span>
                </div>
                <span className="font-headline-sm font-bold text-[14px] text-on-surface">Time A</span>
                <span className="text-[10px] text-on-surface-variant">Força Amiga</span>
              </label>

              <label className={`cursor-pointer rounded-lg p-3 border-2 transition-all flex flex-col bg-white ${owner === 'Player B' ? 'border-[#c03a6b] shadow-sm' : 'border-border-parchment hover:border-gray-300'}`}>
                <input type="radio" name="faction" className="hidden" checked={owner === 'Player B'} onChange={() => setOwner('Player B')} disabled={!!fixedOwner} />
                <div className="flex items-center justify-between mb-1">
                  <span className={`w-3 h-3 rounded-full ${owner === 'Player B' ? 'bg-[#c03a6b]' : 'bg-gray-200'}`}></span>
                  <span className="text-[9px] font-bold text-[#c03a6b] uppercase">Hostil</span>
                </div>
                <span className="font-headline-sm font-bold text-[14px] text-on-surface">Time B</span>
                <span className="text-[10px] text-on-surface-variant">Força Opositora</span>
              </label>

              <label className={`cursor-pointer rounded-lg p-3 border-2 transition-all flex flex-col bg-white ${owner === 'Unknown' ? 'border-[#414575] shadow-sm' : 'border-border-parchment hover:border-gray-300'}`}>
                <input type="radio" name="faction" className="hidden" checked={owner === 'Unknown'} onChange={() => setOwner('Unknown')} disabled={!!fixedOwner} />
                <div className="flex items-center justify-between mb-1">
                  <span className={`w-3 h-3 rounded-full ${owner === 'Unknown' ? 'bg-[#414575]' : 'bg-gray-200'}`}></span>
                  <span className="text-[9px] font-bold text-[#414575] uppercase">Incógnita</span>
                </div>
                <span className="font-headline-sm font-bold text-[14px] text-on-surface">Não Confirmado</span>
                <span className="text-[10px] text-on-surface-variant">Ping / Névoa</span>
              </label>

              <label className={`cursor-pointer rounded-lg p-3 border-2 transition-all flex flex-col bg-white ${owner === 'Neutral' ? 'border-[#26265b] shadow-sm' : 'border-border-parchment hover:border-gray-300'}`}>
                <input type="radio" name="faction" className="hidden" checked={owner === 'Neutral'} onChange={() => setOwner('Neutral')} disabled={!!fixedOwner} />
                <div className="flex items-center justify-between mb-1">
                  <span className={`w-3 h-3 rounded-full ${owner === 'Neutral' ? 'bg-[#26265b]' : 'bg-gray-200'}`}></span>
                  <span className="text-[9px] font-bold text-[#26265b] uppercase">Terceiros</span>
                </div>
                <span className="font-headline-sm font-bold text-[14px] text-on-surface">Neutro</span>
                <span className="text-[10px] text-on-surface-variant">Civil / Logístico</span>
              </label>
            </div>
          </div>

          {/* Section 2: Identity */}
          <div className="space-y-2">
            <h3 className="font-tag-overline text-[11px] uppercase tracking-wider font-bold text-primary">2. Identidade & Especificação da Ficha</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-[11px] font-bold text-on-surface">Nome / Designação da Unidade *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Fragata Liberal F-43" className="w-full bg-[#F4F1E1] border border-border-parchment rounded-lg p-2.5 text-[13px] font-headline-sm font-bold text-on-surface focus:outline-none focus:border-primary shadow-inner" />
              </div>
              <div className="col-span-1 space-y-1.5">
                <label className="text-[11px] font-bold text-on-surface">Tipo de Força / Símbolo NATO *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <NatoSymbol sidc={sidc} size={30} className="drop-shadow-sm" />
                  </div>
                  <select value={type} onChange={(e) => setType(e.target.value as UnitTypeKey)} className="w-full pl-12 pr-3 py-2.5 bg-white border border-border-parchment rounded-lg text-[13px] font-headline-sm font-bold text-on-surface appearance-none focus:outline-none focus:border-primary">
                    {Object.entries(UNIT_TYPES).map(([key, def]) => (
                      <option key={key} value={key}>{def.label}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-on-surface-variant text-[20px]">expand_more</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Readiness */}
          <div className="space-y-2">
            <h3 className="font-tag-overline text-[11px] uppercase tracking-wider font-bold text-primary">3. Prontidão de Combate & Status Operacional</h3>
            <div className="bg-white rounded-xl border border-border-parchment p-4 space-y-4 shadow-sm">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 bg-[#F4F1E1] p-3 rounded-lg border border-border-parchment/60">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span>Força de Combate</span>
                    <span className="text-[#2d7d74]">{health}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={health} onChange={(e) => setHealth(Number(e.target.value))} className="w-full accent-[#2d7d74] cursor-pointer" />
                </div>
                <div className="space-y-2 bg-[#F4F1E1] p-3 rounded-lg border border-border-parchment/60">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span>Combustível & Munição</span>
                    <span className="text-[#2d7d74]">{ammo}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={ammo} onChange={(e) => setAmmo(Number(e.target.value))} className="w-full accent-[#2d7d74] cursor-pointer" />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-on-surface">Condição Inicial</span>
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => setHealth(100)} className={`py-2 rounded-lg text-[11px] font-bold uppercase transition-colors ${health >= 90 ? 'bg-[#E3F2EE] text-[#004B41] border-2 border-[#004B41]' : 'bg-[#F4F1E1] text-on-surface-variant border border-border-parchment hover:bg-gray-200'}`}>Pronto</button>
                  <button onClick={() => setHealth(75)} className={`py-2 rounded-lg text-[11px] font-bold uppercase transition-colors ${health >= 60 && health < 90 ? 'bg-status-alert/15 text-status-alert border-2 border-status-alert' : 'bg-[#F4F1E1] text-on-surface-variant border border-border-parchment hover:bg-gray-200'}`}>Alerta</button>
                  <button onClick={() => setHealth(40)} className={`py-2 rounded-lg text-[11px] font-bold uppercase transition-colors ${health >= 20 && health < 60 ? 'bg-status-degraded/15 text-status-degraded border-2 border-status-degraded' : 'bg-[#F4F1E1] text-on-surface-variant border border-border-parchment hover:bg-gray-200'}`}>Degradado</button>
                  <button onClick={() => setHealth(10)} className={`py-2 rounded-lg text-[11px] font-bold uppercase transition-colors ${health < 20 ? 'bg-status-critical/15 text-status-critical border-2 border-status-critical' : 'bg-[#F4F1E1] text-on-surface-variant border border-border-parchment hover:bg-gray-200'}`}>Crítico</button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Section 4: Visibility */}
            <div className="space-y-2">
              <h3 className="font-tag-overline text-[11px] uppercase tracking-wider font-bold text-primary">4. Névoa de Guerra & Visibilidade</h3>
              <div className="grid grid-rows-2 gap-2">
                <label className={`cursor-pointer rounded-lg p-3 border-2 transition-all flex items-center gap-3 bg-white ${visibility === 'visible' ? 'border-[#2d7d74] shadow-sm' : 'border-border-parchment hover:border-gray-300'}`}>
                  <input type="radio" name="visibility" className="hidden" checked={visibility === 'visible'} onChange={() => setVisibility('visible')} />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${visibility === 'visible' ? 'border-[#2d7d74]' : 'border-gray-300'}`}>
                    {visibility === 'visible' && <span className="w-2 h-2 rounded-full bg-[#2d7d74]"></span>}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[12px] text-on-surface">Visível Imediatamente</span>
                    <span className="text-[10px] text-on-surface-variant">Todas as delegações visualizam a ficha</span>
                  </div>
                </label>
                <label className={`cursor-pointer rounded-lg p-3 border-2 transition-all flex items-center gap-3 bg-white ${visibility === 'hidden' ? 'border-[#2d7d74] shadow-sm' : 'border-border-parchment hover:border-gray-300'}`}>
                  <input type="radio" name="visibility" className="hidden" checked={visibility === 'hidden'} onChange={() => setVisibility('hidden')} />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${visibility === 'hidden' ? 'border-[#2d7d74]' : 'border-gray-300'}`}>
                    {visibility === 'hidden' && <span className="w-2 h-2 rounded-full bg-[#2d7d74]"></span>}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[12px] text-on-surface">Oculto / Névoa de Guerra</span>
                    <span className="text-[10px] text-on-surface-variant">Visível somente para o Moderador e facção</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Section 5: Allocation */}
            <div className="space-y-2">
              <h3 className="font-tag-overline text-[11px] uppercase tracking-wider font-bold text-primary">5. Alocação Inicial</h3>
              <div className="grid grid-rows-2 gap-2">
                <label className={`cursor-pointer rounded-lg p-3 border-2 transition-all flex items-center gap-3 bg-white ${allocation === 'reserve' ? 'border-[#2d7d74] shadow-sm' : 'border-border-parchment hover:border-gray-300'}`}>
                  <input type="radio" name="allocation" className="hidden" checked={allocation === 'reserve'} onChange={() => setAllocation('reserve')} />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${allocation === 'reserve' ? 'border-[#2d7d74]' : 'border-gray-300'}`}>
                    {allocation === 'reserve' && <span className="w-2 h-2 rounded-full bg-[#2d7d74]"></span>}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[12px] text-on-surface">Bandeja de Reservas</span>
                    <span className="text-[10px] text-on-surface-variant">Staging dock para desdobramento posterior</span>
                  </div>
                </label>
                <label className={`cursor-pointer rounded-lg p-3 border-2 transition-all flex items-center gap-3 bg-white ${allocation === 'map' ? 'border-[#2d7d74] shadow-sm' : 'border-border-parchment hover:border-gray-300'}`}>
                  <input type="radio" name="allocation" className="hidden" checked={allocation === 'map'} onChange={() => setAllocation('map')} />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${allocation === 'map' ? 'border-[#2d7d74]' : 'border-gray-300'}`}>
                    {allocation === 'map' && <span className="w-2 h-2 rounded-full bg-[#2d7d74]"></span>}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[12px] text-on-surface">
                      {initialCoordinates ? `Direto no Ponto Clicado (X: ${initialCoordinates.x}, Y: ${initialCoordinates.y})` : 'Direto no Mapa Tático'}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">
                      {initialCoordinates ? 'Posicionar exatamente no local clicado do mapa' : 'Posicionar no centro das coordenadas'}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Section 6: Notes */}
          <div className="space-y-2">
             <h3 className="font-tag-overline text-[11px] uppercase tracking-wider font-bold text-primary">6. Diretrizes Táticas / Observações do Moderador</h3>
             <textarea 
               value={notes} 
               onChange={(e) => setNotes(e.target.value)} 
               placeholder="Missão de patrulha e interdição..." 
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
            <button type="button" onClick={() => handleCreateUnit(false)} className="bg-white border border-[#2d7d74] text-[#2d7d74] hover:bg-[#E3F2EE] font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-[13px]">
              <span className="material-symbols-outlined text-[18px]">archive</span>
              Criar na Reserva
            </button>
            <button type="button" onClick={() => handleCreateUnit(true)} className="bg-[#004B41] hover:bg-[#003831] text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-[13px]">
              <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
              Criar & Posicionar no Mapa
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
