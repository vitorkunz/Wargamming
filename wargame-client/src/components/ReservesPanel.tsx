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
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[14px]">inventory_2</span>
          <span className="font-headline-sm text-[10px] font-bold text-primary uppercase tracking-wider">Reserve Tray / Staging Area</span>
          <span className="bg-primary/90 text-text-on-dark text-[9px] font-tag-overline px-1.5 py-0.5 rounded-full font-bold shadow-sm">{units.length} Unidades Disponíveis</span>
        </div>
        <span className="font-tag-overline text-[9px] text-on-surface-variant italic hidden sm:inline">Arrastar fichas diretamente para o mapa ou clicar em 'Deploy'</span>
      </div>
      
      <div className="flex-1 flex gap-2 overflow-x-auto custom-scrollbar items-center pb-1">
        {units.length === 0 && (
          <div className="text-on-surface-variant font-body-ui text-[10px] italic w-full text-center">Nenhuma unidade na reserva</div>
        )}

        {units.map((unit) => {
          const canDrag = isDraggable(unit);
          const isFriendly = unit.owner === 'Player A';
          const isHostile = unit.owner === 'Player B';
          const isUnknown = unit.owner === 'Unknown';
          const isNeutral = unit.owner === 'Neutral';

          return (
            <div
              key={unit.id}
              draggable={canDrag}
              onDragStart={(e) => handleDragStart(e, unit)}
              onClick={() => onUnitClick && onUnitClick(unit)}
              className={`bg-white/95 border border-[#e3dfd1] rounded-lg p-1.5 shadow-xs hover:shadow-md transition-all flex items-center justify-between min-w-[160px] flex-shrink-0 cursor-grab active:cursor-grabbing border-l-4 ${
                isFriendly ? 'border-l-[#2d7d74]' : isHostile ? 'border-l-[#4e1a3d]' : isUnknown ? 'border-l-[#414575]' : 'border-l-[#26265b]'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 shadow-xs text-white ${
                    isFriendly
                      ? 'bg-[#2d7d74]'
                      : isHostile
                      ? 'bg-[#4e1a3d]'
                      : isUnknown
                      ? 'bg-[#414575]'
                      : 'bg-[#26265b]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {isUnknown ? 'question_mark' : (() => {
                      const readable = getHumanReadableFromSidc(unit.type).toLowerCase();
                      if (readable.includes('naval') || readable.includes('ship')) return 'directions_boat';
                      if (readable.includes('air') || readable.includes('aviation')) return 'flight';
                      if (readable.includes('artillery')) return 'adjust';
                      if (readable.includes('armor') || readable.includes('tank')) return 'view_in_ar';
                      if (readable.includes('infantry')) return 'shield';
                      if (readable.includes('logistics') || readable.includes('supply')) return 'local_shipping';
                      if (readable.includes('air defense') || readable.includes('sam')) return 'security';
                      return 'radar';
                    })()}
                  </span>
                </div>
                <div className="truncate flex-col justify-center">
                  <div className="font-heading text-[10px] font-bold text-[#1c1b1b] truncate leading-tight">
                    {unit.name || getHumanReadableFromSidc(unit.type)}
                  </div>
                  <div className={`font-heading text-[8px] font-bold ${isFriendly ? 'text-[#2d7d74]' : isHostile ? 'text-[#c03a6b]' : 'text-gray-600'} uppercase`}>
                    {unit.owner} • {getHumanReadableFromSidc(unit.type)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
