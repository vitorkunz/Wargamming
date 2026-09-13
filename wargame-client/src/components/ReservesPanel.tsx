"use client";
import React from 'react';
import { Unit } from './MapGrid';

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
            className={`w-10 h-10 rounded-full border-2 shadow-md flex items-center justify-center 
              ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'opacity-50'}
              ${onUnitClick ? 'cursor-pointer' : ''}
              ${unit.owner === 'Player A' ? 'bg-red-600 border-white' : 
                unit.owner === 'Player B' ? 'bg-yellow-500 border-white' : 'bg-purple-500 border-white'}
            `}
            title={`${unit.name ? `${unit.name} (${unit.type})` : unit.type} (HP: ${unit.health})`}
          >
            <span className="text-xs font-bold text-white">{unit.type[0]}</span>
          </div>
        );
      })}
    </div>
  );
}
