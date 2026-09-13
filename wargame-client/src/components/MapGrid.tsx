"use client";
import React, { useState, useEffect } from 'react';
import mapConfig from '../data/mapConfig.json';
import { LayerVisibility } from './Sidebar';
import { supabase } from '@/lib/supabaseClient';
import { MapLayer } from './LayerManager';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

export interface Unit {
  id: string;
  type: string;
  owner: string;
  x_coord: number;
  y_coord: number;
  health: number;
  is_visible_to_enemy?: boolean;
  in_reserve?: boolean;
}

interface MapGridProps {
  layers: LayerVisibility;
  hiddenDynamicLayers?: string[];
  units: Unit[];
  onGridClick?: (x: number, y: number) => void;
  onUnitClick?: (unit: Unit) => void;
  isDraggable?: (unit: Unit) => boolean;
  onUnitDrop?: (unitId: string, x: number, y: number) => void;
}

const CELL_SIZE = 40;

export default function MapGrid({ 
  layers,
  hiddenDynamicLayers = [],
  units, 
  onGridClick, 
  onUnitClick,
  isDraggable,
  onUnitDrop
}: MapGridProps) {
  const [dynamicLayers, setDynamicLayers] = useState<MapLayer[]>([]);
  
  const { width, height } = mapConfig.gridSize;
  const boardWidth = width * CELL_SIZE;
  const boardHeight = height * CELL_SIZE;

  useEffect(() => {
    const fetchLayers = async () => {
      const { data } = await supabase.from('Map_Layers').select('*');
      if (data) setDynamicLayers(data as MapLayer[]);
    };

    fetchLayers();

    const channel = supabase.channel('mapgrid-layers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Map_Layers' }, () => {
        fetchLayers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDragStart = (e: React.DragEvent, unit: Unit) => {
    e.dataTransfer.setData('text/plain', unit.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {};

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const unitId = e.dataTransfer.getData('text/plain');
    
    if (!unitId || !onUnitDrop) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = boardWidth / rect.width;
    const scaleY = boardHeight / rect.height;

    const xPixel = Math.round((e.clientX - rect.left) * scaleX - (CELL_SIZE / 2));
    const yPixel = Math.round((e.clientY - rect.top) * scaleY - (CELL_SIZE / 2));

    if (xPixel >= -CELL_SIZE && xPixel <= boardWidth && yPixel >= -CELL_SIZE && yPixel <= boardHeight) {
      onUnitDrop(unitId, xPixel, yPixel);
    }
  };

  const handleGridClick = (e: React.MouseEvent) => {
    if (!onGridClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = boardWidth / rect.width;
    const scaleY = boardHeight / rect.height;

    const xPixel = Math.round((e.clientX - rect.left) * scaleX - (CELL_SIZE / 2));
    const yPixel = Math.round((e.clientY - rect.top) * scaleY - (CELL_SIZE / 2));
    
    if (xPixel >= -CELL_SIZE && xPixel <= boardWidth && yPixel >= -CELL_SIZE && yPixel <= boardHeight) {
      onGridClick(xPixel, yPixel);
    }
  };

  const visibleDynamicLayers = dynamicLayers
    .filter(l => l.is_global_visible && !hiddenDynamicLayers.includes(l.id))
    .sort((a, b) => a.z_index - b.z_index);

  return (
    <div className="bg-white p-2 shadow-2xl border-4 border-slate-300 rounded-lg shrink-0 mb-12 flex justify-center w-full max-w-5xl">
      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={3}
        centerOnInit={true}
        panning={{ excluded: ['draggable-unit'] }}
      >
        <TransformComponent wrapperStyle={{ width: '100%', height: '75vh', borderRadius: '4px' }}>
          <div 
            className={`relative bg-slate-300 border border-slate-400 ${onGridClick ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
            style={{ width: boardWidth, height: boardHeight }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleGridClick}
          >
            
            {/* Dynamic Map Layers */}
            {visibleDynamicLayers.map(layer => (
              <div 
                key={layer.id}
                className="absolute inset-0 pointer-events-none bg-contain bg-no-repeat bg-center"
                style={{ backgroundImage: `url(${layer.image_url})`, zIndex: layer.z_index }}
              />
            ))}

            {/* Grid Background */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{ 
                zIndex: 9000,
                backgroundImage: `
                  linear-gradient(to right, rgba(51, 65, 85, 0.3) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(51, 65, 85, 0.3) 1px, transparent 1px)
                `,
                backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`
              }}
            />

            {/* Units */}
            {layers.units && (
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 9003 }}>
                {units.map((unit) => {
                  const canDrag = isDraggable ? isDraggable(unit) : false;
                  
                  return (
                    <div 
                      key={unit.id}
                      draggable={canDrag}
                      onDragStart={(e) => handleDragStart(e, unit)}
                      onDragEnd={handleDragEnd}
                      className={`draggable-unit absolute flex items-center justify-center pointer-events-auto opacity-100
                        ${canDrag ? 'cursor-grab active:cursor-grabbing' : (onUnitClick ? 'cursor-pointer' : 'cursor-default')}
                      `}
                      style={{ 
                        left: unit.x_coord, 
                        top: unit.y_coord, 
                        width: CELL_SIZE, 
                        height: CELL_SIZE
                      }}
                      title={`${unit.type} (HP: ${unit.health}) ${unit.is_visible_to_enemy ? '- Visible to Enemy' : ''}`}
                      onClick={(e) => {
                         // Prevent triggering grid click when clicking a unit
                         e.stopPropagation();
                         if (onUnitClick) onUnitClick(unit);
                      }}
                    >
                      <div className={`w-7 h-7 rounded-full border-2 shadow-lg flex items-center justify-center ${
                        unit.owner === 'Player A' ? 'bg-red-600 border-white' : 
                        unit.owner === 'Player B' ? 'bg-yellow-500 border-white' : 'bg-purple-500 border-white'
                      } ${unit.is_visible_to_enemy ? 'ring-2 ring-red-500 ring-offset-1' : ''}`}>
                        <span className="text-[10px] font-bold text-white">{unit.type[0]}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
