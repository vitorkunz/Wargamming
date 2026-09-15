"use client";
import React from 'react';
import { Unit } from './MapGrid';
import { NatoSymbol } from './NatoSymbol';
import { getSidcForUnit, getHumanReadableFromSidc } from '@/lib/milsymbol/utils';
interface ReservesPanelProps {
  units: Unit[];
  isDraggable: (unit: Unit) => boolean;
  onUnitClick?: (unit: Unit) => void;
}

export default function ReservesPanel({ units, isDraggable, onUnitClick }: ReservesPanelProps) {
  
  const handleDragStart = (e: React.DragEvent, unit: Unit) => {
    e.dataTransfer.setData('text/plain', unit.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-primary text-[18px]">inventory_2</span>
          <span className="font-headline-sm text-[12px] font-bold text-primary uppercase tracking-wider">Reserve Tray / Staging Area</span>
          <span className="bg-primary/90 text-text-on-dark text-[10px] font-tag-overline px-2 py-0.5 rounded-full font-bold shadow-sm">{units.length} Unidades Disponíveis</span>
        </div>
        <span className="font-tag-overline text-[10px] text-on-surface-variant italic hidden sm:inline">Arrastar fichas diretamente para o mapa ou clicar em 'Deploy'</span>
      </div>
      
      <div className="flex-1 flex gap-3 overflow-x-auto custom-scrollbar items-center pb-2">
        {units.length === 0 && (
          <div className="text-on-surface-variant font-body-ui text-sm italic w-full text-center">Nenhuma unidade na reserva</div>
        )}

        {units.map((unit) => {
          const canDrag = isDraggable(unit);
          const factionColor = unit.owner === 'Player A' ? 'border-l-faction-friendly' : unit.owner === 'Player B' ? 'border-l-faction-hostile' : 'border-l-faction-neutral';
          return (
            <div 
              key={unit.id}
              draggable={canDrag}
              onDragStart={(e) => handleDragStart(e, unit)}
              onClick={() => onUnitClick && onUnitClick(unit)}
              className={`bg-surface-card/95 border border-border-parchment border-l-4 ${factionColor} rounded-lg p-2.5 shadow-sm hover:shadow-md transition-all flex items-center justify-between min-w-[200px] flex-shrink-0
                ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'opacity-50'}
              `}
              title={`Prontidão: ${unit.health}%`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                  <NatoSymbol sidc={getSidcForUnit(unit)} size={32} />
                </div>
                <div className="truncate">
                  <div className="font-label-md text-[11px] font-bold text-on-surface truncate">{unit.name || getHumanReadableFromSidc(unit.type)}</div>
                  <div className="font-tag-overline text-[9px] font-bold mt-0.5" style={{ color: `var(--color-team-${unit.owner === 'Player A' ? 'a' : 'b'})` }}>{unit.owner}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
