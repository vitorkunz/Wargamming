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
  is_health_visible_to_enemy?: boolean;
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
  hiddenPois?: string[];
  hiddenHazards?: string[];
  units: Unit[];
  selectedUnitId?: string | null;
  poisTable?: string;
  hazardsTable?: string;
  onGridClick?: (x: number, y: number) => void;
  onUnitClick?: (unit: Unit) => void;
  onPOIClick?: (poi: MapPOI) => void;
  onHazardClick?: (hazard: BattleHazard) => void;
  isDraggable?: (unit: Unit) => boolean;
  onUnitDrop?: (unitId: string, x: number, y: number) => void;
  isPoiDraggable?: (poi: MapPOI) => boolean;
  onPoiDrop?: (poiId: string, x: number, y: number) => void;
  onSpawnUnitAt?: (templateType: string, x: number, y: number) => void;
  isDrawingMode?: boolean;
  onDrawComplete?: (points: {x: number, y: number}[]) => void;
  hudRightActions?: React.ReactNode;
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
  onToggleFullscreen,
  selectedTool,
  setSelectedTool,
  hudRightActions
}: { 
  isFullscreen: boolean; 
  onToggleFullscreen: () => void;
  selectedTool: string;
  setSelectedTool: (t: string) => void;
  hudRightActions?: React.ReactNode;
}) {
  const { zoomIn, zoomOut, resetTransform } = useControls();

  return (
    <div 
      className="absolute top-3 left-1/2 z-20 pointer-events-auto flex items-center gap-3 bg-[#18221d]/90 backdrop-blur-md border border-[#2d7d74]/40 rounded-xl px-3 py-1.5 shadow-2xl origin-top"
      style={{ transform: 'translateX(-50%) scale(0.8)', transformOrigin: 'top center' }}
    >
      {/* 1. Map Toolset */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setSelectedTool('select')}
          className={`p-2 rounded-lg transition-colors ${
            selectedTool === 'select'
              ? 'bg-faction-friendly text-text-on-dark shadow-sm'
              : 'hover:bg-white/10 text-text-on-dark'
          }`}
          title="Select / Move"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">near_me</span>
        </button>
        <button
          onClick={() => setSelectedTool('drag')}
          className={`p-2 rounded-lg transition-colors ${
            selectedTool === 'drag'
              ? 'bg-faction-friendly text-text-on-dark shadow-sm'
              : 'hover:bg-white/10 text-text-on-dark'
          }`}
          title="Drag Map (Arrastar Mapa)"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">pan_tool</span>
        </button>
        <button
          onClick={() => setSelectedTool('place')}
          className={`p-2 rounded-lg transition-colors ${
            selectedTool === 'place'
              ? 'bg-faction-friendly text-text-on-dark shadow-sm'
              : 'hover:bg-white/10 text-text-on-dark'
          }`}
          title="Place Unit Marker"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
        </button>
        <button
          onClick={() => setSelectedTool('polygon')}
          className={`p-2 rounded-lg transition-colors ${
            selectedTool === 'polygon'
              ? 'bg-faction-friendly text-text-on-dark shadow-sm'
              : 'hover:bg-white/10 text-text-on-dark'
          }`}
          title="Draw Operational Zone"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">polyline</span>
        </button>
        <button
          onClick={() => setSelectedTool('arrow')}
          className={`p-2 rounded-lg transition-colors ${
            selectedTool === 'arrow'
              ? 'bg-faction-friendly text-text-on-dark shadow-sm'
              : 'hover:bg-white/10 text-text-on-dark'
          }`}
          title="Tactical Arrow / Advance Line"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">north_east</span>
        </button>
        <button
          onClick={() => setSelectedTool('target')}
          className={`p-2 rounded-lg transition-colors ${
            selectedTool === 'target'
              ? 'bg-faction-friendly text-text-on-dark shadow-sm'
              : 'hover:bg-white/10 text-text-on-dark'
          }`}
          title="Strategic Target Point"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">flag</span>
        </button>
      </div>

      {/* Sleek Vertical Divider */}
      <div className="h-6 w-[1px] bg-white/15"></div>

      {/* 2. Viewport Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => zoomIn(0.2)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-text-on-dark"
          title="Zoom In"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
        </button>
        <button
          onClick={() => zoomOut(0.2)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-text-on-dark"
          title="Zoom Out"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">remove</span>
        </button>
        <button
          onClick={() => resetTransform()}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-text-on-dark"
          title="Center on Selected / Ajustar à Tela"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">center_focus_strong</span>
        </button>
        <button
          onClick={onToggleFullscreen}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-text-on-dark"
          title={isFullscreen ? "Exit Fullscreen" : "Tela Cheia / Fullscreen"}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">
            {isFullscreen ? "fullscreen_exit" : "fullscreen"}
          </span>
        </button>
      </div>

      {/* Sleek Vertical Divider & 3. Sincronização e Publicação */}
      {hudRightActions && (
        <>
          <div className="h-6 w-[1px] bg-white/15"></div>
          {hudRightActions}
        </>
      )}
    </div>
  );
}

export default function MapGrid({ 
  layers,
  hiddenDynamicLayers = [],
  hiddenPois = [],
  hiddenHazards = [],
  units,
  selectedUnitId,
  poisTable = 'Map_POIs',
  hazardsTable = 'Battle_Hazards',
  onGridClick, 
  onUnitClick,
  onPOIClick,
  onHazardClick,
  isDraggable,
  onUnitDrop,
  isPoiDraggable,
  onPoiDrop,
  onSpawnUnitAt,
  isDrawingMode,
  onDrawComplete,
  hudRightActions
}: MapGridProps) {
  const [dynamicLayers, setDynamicLayers] = useState<MapLayer[]>([]);
  const [pois, setPois] = useState<MapPOI[]>([]);
  const [hazards, setHazards] = useState<BattleHazard[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{x: number, y: number}[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [gridSnapping, setGridSnapping] = useState<boolean>(true);
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
      const { data } = await supabase.from(poisTable).select('*');
      if (data) setPois(data as MapPOI[]);
    };
    const fetchHazards = async () => {
      const { data } = await supabase.from(hazardsTable).select('*');
      if (data) setHazards(data as BattleHazard[]);
    };

    fetchLayers();
    fetchPOIs();
    fetchHazards();

    const layerChannel = supabase.channel('mapgrid-layers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Map_Layers' }, () => {
        fetchLayers();
      }).subscribe();
      
    const poiChannel = supabase.channel(`mapgrid-pois-${poisTable}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: poisTable }, () => {
        fetchPOIs();
      }).subscribe();

    const hazardChannel = supabase.channel(`mapgrid-hazards-${hazardsTable}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: hazardsTable }, () => {
        fetchHazards();
      }).subscribe();

    return () => {
      supabase.removeChannel(layerChannel);
      supabase.removeChannel(poiChannel);
      supabase.removeChannel(hazardChannel);
    };
  }, [poisTable, hazardsTable]);

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
      } else if (data.startsWith('nato-template:')) {
        const templateType = data.replace('nato-template:', '');
        if (onSpawnUnitAt) onSpawnUnitAt(templateType, xPixel, yPixel);
      } else {
        const unitId = data.startsWith('unit:') ? data.replace('unit:', '') : data;
        if (onUnitDrop) onUnitDrop(unitId, xPixel, yPixel);
      }
    }
  };

  const handleGridClick = (e: React.MouseEvent) => {
    if (!onGridClick || isDrawingMode || selectedTool === 'drag') return;
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
      className={`relative transition-all duration-300 w-full h-full ${
        isFullscreen 
          ? 'fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center' 
          : 'bg-surface-canvas-void flex items-center justify-center overflow-hidden isolate'
      }`}
    >
      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={3}
        centerOnInit={true}
        panning={{ disabled: isDrawingMode || selectedTool !== 'drag', excluded: ['draggable-unit'] }}
      >
        <ScaleUpdater />
        <MapControls 
          isFullscreen={isFullscreen} 
          onToggleFullscreen={toggleFullscreen} 
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          hudRightActions={hudRightActions}
        />
        <TransformComponent 
          wrapperStyle={{ 
            width: '100%', 
            height: '100%', 
            backgroundColor: isFullscreen ? '#0f172a' : undefined
          }}
        >
          <div 
            id="map-grid-root"
            className={`relative bg-surface-canvas-void border-2 border-primary ${
              isDrawingMode || selectedTool === 'polygon' || selectedTool === 'place' ? 'cursor-crosshair' : selectedTool === 'drag' ? 'cursor-grab active:cursor-grabbing' : onGridClick ? 'cursor-crosshair' : 'cursor-default'
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
            {layers.baseMap && visibleDynamicLayers.map(layer => (
              <div 
                key={layer.id}
                className="absolute inset-0 pointer-events-none bg-contain bg-no-repeat bg-center"
                style={{ backgroundImage: `url(${layer.image_url})`, zIndex: layer.z_index }}
              />
            ))}

            {/* Bathymetric SVG & Coastline Contours */}
            <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 9000, width: boardWidth, height: boardHeight }}>
              <defs>
                <pattern id="tacticalGridPattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#2d7d74" strokeDasharray="3 3" strokeWidth="0.35" />
                  <circle cx="0" cy="0" r="1.5" fill="#2d7d74" opacity="0.6" />
                </pattern>
                
                {/* Hazard Patterns */}
                <pattern id="pattern-minefield" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 0,10 L 10,0 M -1,1 L 1,-1 M 9,11 L 11,9" stroke="#ef4444" strokeWidth="2" opacity="0.6"/>
                </pattern>
                <pattern id="pattern-blockade" width="12" height="12" patternUnits="userSpaceOnUse">
                  <path d="M 0,0 L 0,12" stroke="#a855f7" strokeWidth="4" opacity="0.5"/>
                </pattern>
              </defs>

              {/* Grid pattern layer */}
              {layers.tacticalGrid && <rect width="100%" height="100%" fill="url(#tacticalGridPattern)" opacity="0.45" />}

              {layers.hazards && hazards.filter(h => !hiddenHazards.includes(h.id)).map(hazard => {
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
                  {pois.filter(poi => !hiddenPois.includes(poi.id)).map(poi => {
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
                {units.filter(unit => {
                   if (unit.owner === 'Player A' && !layers.teamA) return false;
                   if (unit.owner === 'Player B' && !layers.teamB) return false;
                   if (unit.owner === 'Unknown' && !layers.unconfirmed) return false;
                   return true;
                }).map((unit) => {
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
                      {isSelected && (
                        <span className="absolute -inset-2 rounded-xl bg-[#d4a017]/40 animate-pulse pointer-events-none" />
                      )}
                      
                      {unit.health < 30 && (
                        <span className="absolute -inset-1 rounded-lg bg-[#c03a6b] animate-ping opacity-75 pointer-events-none" />
                      )}

                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-2xl relative z-10 text-[#f7f4eb] ${
                          unit.owner === 'Player A'
                            ? 'bg-[#2d7d74] border-2 border-[#a4f1e5]'
                            : unit.owner === 'Player B'
                            ? 'bg-[#4e1a3d] border-2 border-[#c03a6b]'
                            : unit.owner === 'Unknown'
                            ? 'bg-[#414575] border-2 border-dashed border-[#a4f1e5]'
                            : 'bg-[#26265b] border-2 border-[#a4f1e5]'
                        } ${isSelected ? 'ring-2 ring-[#d4a017] ring-offset-2 ring-offset-[#1f2420]' : ''}`}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {unit.owner === 'Unknown' ? 'question_mark' : (() => {
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

                      {unit.health >= 30 && unit.health <= 70 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#f26a4b] text-white rounded-full flex items-center justify-center text-[10px] font-bold z-20 shadow border border-white/60">
                          !
                        </span>
                      )}
                      {unit.health < 30 && (
                        <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-[#c03a6b] rounded-full border border-white z-20" />
                      )}

                      <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-md shadow-xl whitespace-nowrap text-center backdrop-blur-md border ${
                        isSelected ? 'bg-[#313030]/95 border-[#d4a017]/70 z-50' : 'bg-[#313030]/90 border-white/15 opacity-0 group-hover:opacity-100 z-50'
                      }`}>
                        <div className={`font-mono text-[10px] font-bold leading-tight ${
                          isSelected ? 'text-[#d4a017]' : unit.owner === 'Player A' ? 'text-[#a4f1e5]' : unit.owner === 'Player B' ? 'text-[#f26a4b]' : 'text-white'
                        }`}>
                          {unit.name || getHumanReadableFromSidc(unit.type)}
                        </div>
                        <div className="font-mono text-[8px] text-[#f7f4eb]/80 uppercase tracking-tight">
                          {unit.health >= 70 ? 'NORMAL' : unit.health >= 30 ? 'DEGRADED' : 'CRITICAL'}
                        </div>
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
