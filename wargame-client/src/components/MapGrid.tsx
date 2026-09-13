"use client";
import React, { useState, useEffect } from 'react';
import mapConfig from '../data/mapConfig.json';
import { LayerVisibility } from './Sidebar';
import { supabase } from '@/lib/supabaseClient';
import { MapLayer } from './LayerManager';
import { TransformWrapper, TransformComponent, useTransformEffect, useControls } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { NatoSymbol } from './NatoSymbol';
import { PoiBadge } from './PoiBadge';
import { getSidcForUnit, getHumanReadableFromSidc } from '@/lib/milsymbol/utils';
export interface Unit {
  id: string;
  name?: string;
  type: string;
  owner: string;
  x_coord: number;
  y_coord: number;
  health: number;
  is_visible_to_enemy?: boolean;
  in_reserve?: boolean;
}

export interface MapPOI {
  id: string;
  name: string;
  type: string;
  owner: string;
  x_coord: number;
  y_coord: number;
  status: string;
  is_visible_to_enemy: boolean;
  notes?: string;
}

export interface BattleHazard {
  id: string;
  hazard_type: string;
  label?: string;
  created_by: string;
  coordinates: any;
  status: string;
  visible_to_teams: string[];
  notes?: string;
}

interface MapGridProps {
  layers: LayerVisibility;
  hiddenDynamicLayers?: string[];
  units: Unit[];
  selectedUnitId?: string | null;
  onGridClick?: (x: number, y: number) => void;
  onUnitClick?: (unit: Unit) => void;
  onPOIClick?: (poi: MapPOI) => void;
  onHazardClick?: (hazard: BattleHazard) => void;
  isDraggable?: (unit: Unit) => boolean;
  onUnitDrop?: (unitId: string, x: number, y: number) => void;
  isPoiDraggable?: (poi: MapPOI) => boolean;
  onPoiDrop?: (poiId: string, x: number, y: number) => void;
  isDrawingMode?: boolean;
  onDrawComplete?: (points: {x: number, y: number}[]) => void;
}

const CELL_SIZE = 40;

const ScaleUpdater = () => {
  useTransformEffect(({ state }) => {
    const root = document.getElementById('map-grid-root');
    if (root) {
      const scale = state.scale > 1 ? 1 / state.scale : 1;
      root.style.setProperty('--unit-inverse-scale', scale.toString());
    }
  });
  return null;
};

function MapControls({ 
  isFullscreen, 
  onToggleFullscreen 
}: { 
  isFullscreen: boolean; 
  onToggleFullscreen: () => void;
}) {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const [zoomPercent, setZoomPercent] = useState(100);

  useTransformEffect(({ state }) => {
    setZoomPercent(Math.round(state.scale * 100));
  });

  return (
    <div className="absolute top-3 left-3 z-30 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1.5 rounded-lg shadow-2xl text-white select-none pointer-events-auto">
      <button
        type="button"
        onClick={() => zoomOut(0.25)}
        className="p-1.5 hover:bg-slate-700/80 rounded text-slate-200 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
        title="Zoom Out (-)"
        aria-label="Zoom Out"
      >
        <ZoomOut size={16} />
      </button>

      <button
        type="button"
        onClick={() => resetTransform()}
        className="px-2 py-0.5 text-xs font-mono font-bold text-slate-300 hover:text-white hover:bg-slate-700/60 rounded transition-colors cursor-pointer"
        title="Reset Zoom (100%)"
      >
        {zoomPercent}%
      </button>

      <button
        type="button"
        onClick={() => zoomIn(0.25)}
        className="p-1.5 hover:bg-slate-700/80 rounded text-slate-200 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
        title="Zoom In (+)"
        aria-label="Zoom In"
      >
        <ZoomIn size={16} />
      </button>

      <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

      <button
        type="button"
        onClick={() => resetTransform()}
        className="p-1.5 hover:bg-slate-700/80 rounded text-slate-200 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
        title="Center / Reset View"
        aria-label="Reset View"
      >
        <RotateCcw size={15} />
      </button>

      <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

      <button
        type="button"
        onClick={onToggleFullscreen}
        className={`p-1.5 rounded transition-colors flex items-center justify-center cursor-pointer ${
          isFullscreen 
            ? 'bg-blue-600 hover:bg-blue-500 text-white' 
            : 'hover:bg-slate-700/80 text-slate-200 hover:text-white'
        }`}
        title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen"}
        aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
    </div>
  );
}

export default function MapGrid({ 
  layers,
  hiddenDynamicLayers = [],
  units,
  selectedUnitId,
  onGridClick, 
  onUnitClick,
  onPOIClick,
  onHazardClick,
  isDraggable,
  onUnitDrop,
  isPoiDraggable,
  onPoiDrop,
  isDrawingMode,
  onDrawComplete
}: MapGridProps) {
  const [dynamicLayers, setDynamicLayers] = useState<MapLayer[]>([]);
  const [pois, setPois] = useState<MapPOI[]>([]);
  const [hazards, setHazards] = useState<BattleHazard[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{x: number, y: number}[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);
  
  const { width, height } = mapConfig.gridSize;
  const boardWidth = width * CELL_SIZE;
  const boardHeight = height * CELL_SIZE;

  useEffect(() => {
    const fetchLayers = async () => {
      const { data } = await supabase.from('Map_Layers').select('*');
      if (data) setDynamicLayers(data as MapLayer[]);
    };
    const fetchPOIs = async () => {
      const { data } = await supabase.from('Map_POIs').select('*');
      if (data) setPois(data as MapPOI[]);
    };
    const fetchHazards = async () => {
      const { data } = await supabase.from('Battle_Hazards').select('*');
      if (data) setHazards(data as BattleHazard[]);
    };

    fetchLayers();
    fetchPOIs();
    fetchHazards();

    const layerChannel = supabase.channel('mapgrid-layers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Map_Layers' }, () => {
        fetchLayers();
      }).subscribe();
      
    const poiChannel = supabase.channel('mapgrid-pois')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Map_POIs' }, () => {
        fetchPOIs();
      }).subscribe();

    const hazardChannel = supabase.channel('mapgrid-hazards')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Battle_Hazards' }, () => {
        fetchHazards();
      }).subscribe();

    return () => {
      supabase.removeChannel(layerChannel);
      supabase.removeChannel(poiChannel);
      supabase.removeChannel(hazardChannel);
    };
  }, []);

  useEffect(() => {
    if (!isDrawingMode) {
      setCurrentPath([]);
      setIsCapturing(false);
    }
  }, [isDrawingMode]);

  const handleDragStart = (e: React.DragEvent, unit: Unit) => {
    e.dataTransfer.setData('text/plain', `unit:${unit.id}`);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePoiDragStart = (e: React.DragEvent, poi: MapPOI) => {
    e.dataTransfer.setData('text/plain', `poi:${poi.id}`);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {};

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = boardWidth / rect.width;
    const scaleY = boardHeight / rect.height;

    const xPixel = Math.round((e.clientX - rect.left) * scaleX - (CELL_SIZE / 2));
    const yPixel = Math.round((e.clientY - rect.top) * scaleY - (CELL_SIZE / 2));

    if (xPixel >= -CELL_SIZE && xPixel <= boardWidth && yPixel >= -CELL_SIZE && yPixel <= boardHeight) {
      if (data.startsWith('poi:')) {
        const poiId = data.replace('poi:', '');
        if (onPoiDrop) onPoiDrop(poiId, xPixel, yPixel);
      } else {
        const unitId = data.startsWith('unit:') ? data.replace('unit:', '') : data;
        if (onUnitDrop) onUnitDrop(unitId, xPixel, yPixel);
      }
    }
  };

  const handleGridClick = (e: React.MouseEvent) => {
    if (!onGridClick || isDrawingMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = boardWidth / rect.width;
    const scaleY = boardHeight / rect.height;

    const xPixel = Math.round((e.clientX - rect.left) * scaleX - (CELL_SIZE / 2));
    const yPixel = Math.round((e.clientY - rect.top) * scaleY - (CELL_SIZE / 2));
    
    if (xPixel >= -CELL_SIZE && xPixel <= boardWidth && yPixel >= -CELL_SIZE && yPixel <= boardHeight) {
      onGridClick(xPixel, yPixel);
    }
  };

  const getEventCoordinates = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = boardWidth / rect.width;
    const scaleY = boardHeight / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY)
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDrawingMode) return;
    setIsCapturing(true);
    setCurrentPath([getEventCoordinates(e)]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawingMode || !isCapturing) return;
    const coords = getEventCoordinates(e);
    setCurrentPath(prev => [...prev, coords]);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawingMode || !isCapturing) return;
    setIsCapturing(false);
    if (onDrawComplete && currentPath.length > 2) {
      onDrawComplete(currentPath);
    }
  };

  const visibleDynamicLayers = dynamicLayers
    .filter(l => l.is_global_visible && !hiddenDynamicLayers.includes(l.id))
    .sort((a, b) => a.z_index - b.z_index);

  return (
    <div 
      ref={containerRef}
      className={`relative transition-all duration-300 ${
        isFullscreen 
          ? 'fixed inset-0 z-[100] w-screen h-screen bg-slate-900 flex items-center justify-center p-0 m-0 max-w-none border-none rounded-none' 
          : 'bg-white p-2 shadow-2xl border-4 border-slate-300 rounded-lg shrink-0 mb-12 flex justify-center w-full max-w-5xl z-10 isolate'
      }`}
    >
      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={3}
        centerOnInit={true}
        panning={{ disabled: isDrawingMode, excluded: ['draggable-unit'] }}
      >
        <ScaleUpdater />
        <MapControls isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen} />
        <TransformComponent 
          wrapperStyle={{ 
            width: '100%', 
            height: isFullscreen ? '100vh' : '75vh', 
            borderRadius: isFullscreen ? '0px' : '4px',
            backgroundColor: isFullscreen ? '#0f172a' : undefined
          }}
        >
          <div 
            id="map-grid-root"
            className={`relative bg-slate-300 border border-slate-400 ${
              isDrawingMode ? 'cursor-crosshair' : onGridClick ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
            }`}
            style={{ width: boardWidth, height: boardHeight }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleGridClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
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

            {/* Hazards SVG Canvas */}
            {layers.hazards && (
              <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 9001, width: boardWidth, height: boardHeight }}>
                <defs>
                  <pattern id="pattern-minefield" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 0,10 L 10,0 M -1,1 L 1,-1 M 9,11 L 11,9" stroke="#ef4444" strokeWidth="2" opacity="0.6"/>
                  </pattern>
                  <pattern id="pattern-blockade" width="12" height="12" patternUnits="userSpaceOnUse">
                    <path d="M 0,0 L 0,12" stroke="#a855f7" strokeWidth="4" opacity="0.5"/>
                  </pattern>
                </defs>

                {hazards.map(hazard => {
                  const points = Array.isArray(hazard.coordinates) ? hazard.coordinates : [];
                  if (points.length < 3) return null;
                  
                  // Handle legacy grid coords vs new pixel coords.
                  const isLegacy = points.every(p => p.x <= mapConfig.gridSize.width && p.y <= mapConfig.gridSize.height);
                  const scaledPoints = points.map(p => isLegacy ? { x: p.x * CELL_SIZE, y: p.y * CELL_SIZE } : p);
                  
                  const pointsString = scaledPoints.map(p => `${p.x},${p.y}`).join(' ');
                  
                  let fill = "rgba(0,0,0,0.2)";
                  let stroke = "rgba(0,0,0,0.5)";
                  
                  if (hazard.hazard_type === 'minefield') {
                    fill = "url(#pattern-minefield)";
                    stroke = "#ef4444";
                  } else if (hazard.hazard_type === 'flooded_zone') {
                    fill = "rgba(59, 130, 246, 0.4)";
                    stroke = "#3b82f6";
                  } else if (hazard.hazard_type === 'naval_blockade') {
                    fill = "url(#pattern-blockade)";
                    stroke = "#a855f7";
                  }

                  return (
                    <polygon 
                      key={hazard.id}
                      points={pointsString}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth="3"
                      strokeLinejoin="round"
                      className="pointer-events-auto cursor-pointer transition-opacity hover:opacity-80"
                      onClick={(e) => {
                        if (isDrawingMode) return;
                        e.stopPropagation();
                        if (onHazardClick) onHazardClick(hazard);
                      }}
                    >
                      <title>{`${hazard.label || hazard.hazard_type} (${hazard.status}) - Click to inspect/edit`}</title>
                    </polygon>
                  );
                })}
              </svg>
            )}

            {/* Live Drawing Path (Always visible when drawing) */}
            {isDrawingMode && currentPath.length > 0 && (
              <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 9005, width: boardWidth, height: boardHeight }}>
                <polyline 
                  points={currentPath.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="rgba(234, 88, 12, 0.3)"
                  stroke="#ea580c"
                  strokeWidth="3"
                  strokeDasharray="5,5"
                />
              </svg>
            )}

            {/* POIs */}
            {layers.pois && (
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 9002 }}>
                {pois.map(poi => {
                  const canDrag = isPoiDraggable ? isPoiDraggable(poi) : false;
                  return (
                  <div
                    key={poi.id}
                    draggable={canDrag}
                    onDragStart={(e) => handlePoiDragStart(e, poi)}
                    onDragEnd={handleDragEnd}
                    className={`absolute flex flex-col items-center justify-center pointer-events-auto group ${canDrag ? 'cursor-grab active:cursor-grabbing draggable-unit' : 'cursor-pointer'}`}
                    style={{
                      left: poi.x_coord,
                      top: poi.y_coord,
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      transform: 'scale(var(--unit-inverse-scale, 1))'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onPOIClick) onPOIClick(poi);
                    }}
                    title={`${poi.name} (${poi.status})`}
                  >
                    <PoiBadge 
                      type={poi.type} 
                      owner={poi.owner} 
                      status={poi.status} 
                      size={22} 
                      className="group-hover:scale-110 transition-transform" 
                    />
                    <span className="absolute -bottom-4 text-[9px] font-bold text-white bg-black bg-opacity-70 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                      {poi.name}
                    </span>
                  </div>
                  )
                })}
              </div>
            )}

            {/* Units */}
            {layers.units && (
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 9003 }}>
                {units.map((unit) => {
                  const canDrag = isDraggable ? isDraggable(unit) : false;
                  const isSelected = selectedUnitId === unit.id;
                  
                  return (
                    <div 
                      key={unit.id}
                      draggable={canDrag}
                      onDragStart={(e) => handleDragStart(e, unit)}
                      onDragEnd={handleDragEnd}
                      className={`draggable-unit absolute flex flex-col items-center justify-center pointer-events-auto opacity-100 group
                        ${canDrag ? 'cursor-grab active:cursor-grabbing' : (onUnitClick ? 'cursor-pointer' : 'cursor-default')}
                      `}
                      style={{ 
                        left: unit.x_coord, 
                        top: unit.y_coord, 
                        width: CELL_SIZE, 
                        height: CELL_SIZE,
                        transform: 'scale(var(--unit-inverse-scale, 1))',
                        zIndex: isSelected ? 9999 : undefined
                      }}
                      title={`${unit.name ? `${unit.name} (${unit.type})` : unit.type} (HP: ${unit.health}) ${unit.is_visible_to_enemy ? '- Visible to Enemy' : ''}`}
                      onClick={(e) => {
                         // Prevent triggering grid click when clicking a unit
                         e.stopPropagation();
                         if (onUnitClick) onUnitClick(unit);
                      }}
                    >
                      <div className={`flex items-center justify-center rounded ${
                        isSelected
                          ? 'ring-4 ring-cyan-400 ring-offset-1 animate-pulse bg-cyan-100 bg-opacity-30'
                          : unit.is_visible_to_enemy 
                            ? 'ring-2 ring-red-500 ring-offset-1' 
                            : ''
                      }`}>
                        <NatoSymbol sidc={getSidcForUnit(unit)} size={40} />
                      </div>
                      <span className="absolute -bottom-4 text-[9px] font-bold text-white bg-black bg-opacity-75 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                        {unit.name || getHumanReadableFromSidc(unit.type)}
                      </span>
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
