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
    <div className="bg-slate-200 p-4 rounded-lg shadow-inner min-h-[100px] flex gap-2 flex-wrap border-2 border-dashed border-slate-400 mb-6 w-full max-w-4xl">
      <div className="w-full text-slate-500 text-sm font-semibold mb-2 uppercase tracking-wide">Reserve Units</div>
      
      {units.length === 0 && (
        <div className="text-slate-400 text-sm italic w-full text-center py-4">No units in reserve</div>
      )}

      {units.map((unit) => {
        const canDrag = isDraggable(unit);
        return (
          <div 
            key={unit.id}
            draggable={canDrag}
            onDragStart={(e) => handleDragStart(e, unit)}
            onClick={() => onUnitClick && onUnitClick(unit)}
            className={`w-12 h-12 flex items-center justify-center 
              ${canDrag ? 'cursor-grab active:cursor-grabbing hover:bg-slate-300 rounded p-1' : 'opacity-50'}
              ${onUnitClick ? 'cursor-pointer' : ''}
            `}
            title={`${unit.name ? `${unit.name} (${getHumanReadableFromSidc(unit.type)})` : getHumanReadableFromSidc(unit.type)} (HP: ${unit.health})`}
          >
            <NatoSymbol sidc={getSidcForUnit(unit)} size={40} />
          </div>
        );
      })}
    </div>
  );
}
