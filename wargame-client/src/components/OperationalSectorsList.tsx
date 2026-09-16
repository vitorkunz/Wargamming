"use client";
import React, { useState } from 'react';
import { BattleHazard } from './MapGrid';

interface OperationalSectorsListProps {
  hazards: BattleHazard[];
  onHazardClick: (hazard: BattleHazard) => void;
  isDrawingHazard: boolean;
  setIsDrawingHazard: (isDrawing: boolean) => void;
}

export default function OperationalSectorsList({
  hazards,
  onHazardClick,
  isDrawingHazard,
  setIsDrawingHazard
}: OperationalSectorsListProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-surface-card/90 border border-border-parchment rounded-xl shadow-sm transition-all overflow-hidden flex flex-col">
      <div 
        className="flex items-center justify-between gap-2 p-2.5 cursor-pointer hover:bg-surface-container/50 transition-colors" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[#2d7d74] text-[18px]">polyline</span>
          <div className="flex flex-col min-w-0">
            <span className="font-label-md text-[11px] truncate font-bold text-on-surface">Operational Sectors</span>
            <span className="font-tag-overline text-[9px] font-bold text-on-surface-variant">{hazards.length} Zonas Ativas</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsDrawingHazard(true); }}
            className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors border shadow-sm ${
              isDrawingHazard 
                ? 'bg-status-alert text-white border-status-alert/50' 
                : 'bg-white text-[#2d7d74] border-border-parchment hover:bg-[#E3F2EE]'
            }`}
            title="Desenhar Nova Zona (Hazard)"
          >
            <span className="material-symbols-outlined text-[16px]">{isDrawingHazard ? 'draw' : 'add'}</span>
          </button>
          <span className="material-symbols-outlined text-outline text-[16px] ml-1">{isExpanded ? 'expand_less' : 'expand_more'}</span>
        </div>
      </div>

      {isDrawingHazard && (
        <div className="bg-status-alert/10 border-t border-status-alert/20 p-2.5 flex items-start gap-2">
          <span className="material-symbols-outlined text-status-alert text-[16px]">gesture</span>
          <div className="flex flex-col flex-1">
            <span className="text-[10px] text-status-alert font-bold uppercase tracking-wider">Modo de Desenho Ativo</span>
            <span className="text-[10px] text-on-surface-variant leading-tight mt-0.5">Clique e arraste no mapa para criar o polígono da zona.</span>
          </div>
          <button onClick={() => setIsDrawingHazard(false)} className="text-status-alert hover:text-status-alert/80" title="Cancelar">
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      )}
      
      {isExpanded && (
        <div className="border-t border-border-parchment bg-surface-parchment-dim/50 p-2 max-h-60 overflow-y-auto custom-scrollbar space-y-1">
          {hazards.length === 0 ? (
            <div className="text-[10px] italic text-on-surface-variant p-2 text-center">Nenhuma zona operacional ativa.</div>
          ) : (
            hazards.map(hazard => (
              <div 
                key={hazard.id} 
                className="flex items-center justify-between text-[11px] font-body-ui p-1.5 rounded-lg cursor-pointer group hover:bg-white border border-transparent hover:border-border-parchment transition-all shadow-sm"
                onClick={() => onHazardClick(hazard)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full shadow-sm shrink-0 ${
                    hazard.hazard_type === 'minefield' ? 'bg-status-alert' :
                    hazard.hazard_type === 'naval_blockade' ? 'bg-[#a855f7]' :
                    hazard.hazard_type === 'flooded_zone' ? 'bg-blue-500' :
                    hazard.hazard_type === 'dmz' ? 'bg-gray-500' :
                    hazard.hazard_type === 'trenches' ? 'bg-amber-700' :
                    'bg-[#2d7d74]'
                  }`}></div>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate font-bold text-on-surface text-[10.5px]">
                      {hazard.label || hazard.hazard_type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-[8.5px] uppercase tracking-wider text-on-surface-variant">
                      {hazard.hazard_type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[14px] text-outline-variant opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
