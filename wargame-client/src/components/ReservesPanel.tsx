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
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-[13px]">inventory_2</span>
          <span className="font-headline-sm text-[8.5px] font-bold text-primary uppercase tracking-wider">Reserve Tray / Staging Area</span>
          <span className="bg-primary/90 text-text-on-dark text-[8px] font-tag-overline px-1.5 py-0.5 rounded-full font-bold shadow-sm">{units.length} Unidades Disponíveis</span>
        </div>
        <span className="font-tag-overline text-[8px] text-on-surface-variant italic hidden sm:inline">Arrastar fichas diretamente para o mapa ou clicar em 'Deploy'</span>
      </div>
      
      <div className="flex-1 flex gap-2 overflow-x-auto custom-scrollbar items-center pb-1">
        {units.length === 0 && (
          <div className="text-on-surface-variant font-body-ui text-[9px] italic w-full text-center">Nenhuma unidade na reserva</div>
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
              className={`bg-white/95 border border-[#e3dfd1] rounded-lg p-1.5 shadow-xs hover:shadow-md transition-all flex items-center justify-between min-w-[150px] flex-shrink-0 cursor-grab active:cursor-grabbing border-l-4 ${
                isFriendly ? 'border-l-[#2d7d74]' : isHostile ? 'border-l-[#4e1a3d]' : isUnknown ? 'border-l-[#414575]' : 'border-l-[#26265b]'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="flex items-center justify-center flex-shrink-0">
                  <NatoSymbol sidc={getSidcForUnit(unit)} size={26} className="drop-shadow-md" />
                </div>
                <div className="truncate flex-col justify-center">
                  <div className="font-heading text-[8.5px] font-bold text-[#1c1b1b] truncate leading-tight">
                    {unit.name || getHumanReadableFromSidc(unit.type)}
                  </div>
                  <div className={`font-heading text-[7.5px] font-bold ${isFriendly ? 'text-[#2d7d74]' : isHostile ? 'text-[#c03a6b]' : 'text-gray-600'} uppercase`}>
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
