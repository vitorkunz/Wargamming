"use client";
import React, { useState, useEffect } from 'react';
import mapConfig from '../data/mapConfig.json';
import { LayerVisibility } from './Sidebar';
import { supabase } from '@/lib/supabaseClient';
import { MapLayer } from './LayerManager';
import { TransformWrapper, TransformComponent, useTransformEffect, useControls, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw, Eye } from 'lucide-react';
import { NatoSymbol } from './NatoSymbol';
import { PoiBadge } from './PoiBadge';
import { getSidcForUnit, getHumanReadableFromSidc } from '@/lib/milsymbol/utils';
import UnitCreationModal from './UnitCreationModal';
import PoiCreationModal from './PoiCreationModal';
export interface Unit {
  id: string;
  name?: string;
  type: string;
  owner: string;
  x_coord: number;
  y_coord: number;
  health: number;
  ammo: number;
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
  hideEditingTools?: boolean;
  unitsTable?: string;
  isModerator?: boolean;
  fixedOwner?: 'Player A' | 'Player B';
  role?: string;
  layerOpacities?: Record<string, number>;
  onOpacityChange?: (layerId: string, opacity: number) => void;
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
  hudRightActions,
  hideEditingTools,
  isDragMode,
  visibleLayers,
  layerOpacities,
  onOpacityChange
}: { 
  isFullscreen: boolean; 
  onToggleFullscreen: () => void;
  selectedTool: string;
  setSelectedTool: (t: string) => void;
  hudRightActions?: React.ReactNode;
  hideEditingTools?: boolean;
  isDragMode?: boolean;
  visibleLayers?: MapLayer[];
  layerOpacities?: Record<string, number>;
  onOpacityChange?: (layerId: string, opacity: number) => void;
}) {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const [showOpacityMenu, setShowOpacityMenu] = useState(false);

  const isDragActive = isDragMode !== undefined ? isDragMode : selectedTool === 'drag';

  const renderTools = () => (
    <>
      <button
        onClick={() => setSelectedTool('select')}
        className={`p-2 rounded-lg transition-colors ${
          selectedTool === 'select' && !isDragActive
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
          isDragActive
            ? 'bg-faction-friendly text-text-on-dark shadow-sm'
            : 'hover:bg-white/10 text-text-on-dark'
        }`}
        title="Drag Map (Arrastar Mapa) - Espaço ou clique"
        type="button"
      >
        <span className="material-symbols-outlined text-[18px]">pan_tool</span>
      </button>

      {!hideEditingTools && (
        <>
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
        </>
      )}
    </>
  );

  const renderViewportControls = () => (
    <>
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

      {onOpacityChange && (
        <div className="relative">
          <button
            onClick={() => setShowOpacityMenu(!showOpacityMenu)}
            className={`p-2 rounded-lg transition-colors text-text-on-dark ${
              showOpacityMenu ? 'bg-faction-friendly text-white shadow-sm' : 'hover:bg-white/10'
            }`}
            title="Transparência das Camadas / Layer Opacity"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">opacity</span>
          </button>

          {showOpacityMenu && (
            <div 
              className="absolute top-full lg:left-1/2 lg:-translate-x-1/2 left-0 mt-2 w-64 bg-[#18221d]/95 backdrop-blur-md border border-[#2d7d74]/50 rounded-xl p-3 shadow-2xl z-50 flex flex-col gap-2.5 text-text-on-dark cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-white/15">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-primary-fixed-dim">opacity</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-primary-fixed-dim">
                    Layer Opacity
                  </span>
                </div>
                <button 
                  onClick={() => setShowOpacityMenu(false)}
                  className="text-white/60 hover:text-white text-[12px] p-0.5"
                  type="button"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span>Base Map</span>
                  <span className="font-mono text-primary-fixed-dim">
                    {Math.round((layerOpacities?.['baseMap'] ?? 1) * 100)}%
                  </span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round((layerOpacities?.['baseMap'] ?? 1) * 100)}
                  onChange={(e) => onOpacityChange('baseMap', Number(e.target.value) / 100)}
                  className="w-full h-1.5 bg-black/40 rounded appearance-none cursor-pointer accent-[#2d7d74]"
                />
              </div>

              {visibleLayers && visibleLayers.length > 0 && (
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                  {visibleLayers.map(layer => (
                    <div key={layer.id} className="flex flex-col gap-1">
                      <div className="flex justify-between text-[10px] truncate">
                        <span className="truncate pr-2">{layer.name}</span>
                        <span className="font-mono text-primary-fixed-dim shrink-0">
                          {Math.round((layerOpacities?.[layer.id] ?? 1) * 100)}%
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round((layerOpacities?.[layer.id] ?? 1) * 100)}
                        onChange={(e) => onOpacityChange(layer.id, Number(e.target.value) / 100)}
                        className="w-full h-1.5 bg-black/40 rounded appearance-none cursor-pointer accent-[#2d7d74]"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-1 pt-1 border-t border-white/10">
                <div className="flex justify-between text-[10px] text-white/80">
                  <span>Tactical Grid</span>
                  <span className="font-mono text-primary-fixed-dim">
                    {Math.round((layerOpacities?.['tacticalGrid'] ?? 0.45) * 100)}%
                  </span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round((layerOpacities?.['tacticalGrid'] ?? 0.45) * 100)}
                  onChange={(e) => onOpacityChange('tacticalGrid', Number(e.target.value) / 100)}
                  className="w-full h-1.5 bg-black/40 rounded appearance-none cursor-pointer accent-[#2d7d74]"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop Toolbar */}
      <div 
        className="hidden lg:flex absolute top-3 left-1/2 z-20 pointer-events-auto items-center gap-3 bg-[#18221d]/90 backdrop-blur-md border border-[#2d7d74]/40 rounded-xl px-3 py-1.5 shadow-2xl origin-top"
        style={{ transform: 'translateX(-50%) scale(0.8)', transformOrigin: 'top center' }}
      >
        <div className="flex items-center gap-1">
          {renderTools()}
        </div>
        <div className="h-6 w-[1px] bg-white/15"></div>
        <div className="flex items-center gap-1">
          {renderViewportControls()}
        </div>
        {hudRightActions && (
          <>
            <div className="h-6 w-[1px] bg-white/15"></div>
            {hudRightActions}
          </>
        )}
      </div>

      {/* Mobile Toolbar (Left Vertical) */}
      <div className="flex lg:hidden absolute top-4 left-2 z-20 pointer-events-auto flex-col items-center gap-2 bg-[#18221d]/90 backdrop-blur-md border border-[#2d7d74]/40 rounded-xl p-1.5 shadow-2xl origin-top-left scale-90">
        <div className="flex flex-col gap-1">
          {renderTools()}
        </div>
        <div className="w-6 h-[1px] bg-white/15"></div>
        <div className="flex flex-col gap-1">
          {renderViewportControls()}
        </div>
      </div>

      {/* Mobile HUD Right Actions (Top Center) */}
      {hudRightActions && (
        <div 
          className="flex lg:hidden absolute top-4 left-1/2 z-20 pointer-events-auto items-center gap-2 bg-[#18221d]/90 backdrop-blur-md border border-[#2d7d74]/40 rounded-xl px-2 py-1 shadow-2xl origin-top"
          style={{ transform: 'translateX(-50%) scale(0.9)', transformOrigin: 'top center' }}
        >
          {hudRightActions}
        </div>
      )}
    </>
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
  hudRightActions,
  hideEditingTools,
  unitsTable = 'Battle_Units',
  isModerator = true,
  fixedOwner,
  role,
  layerOpacities,
  onOpacityChange
}: MapGridProps) {
  const [dynamicLayers, setDynamicLayers] = useState<MapLayer[]>([]);
  const [pois, setPois] = useState<MapPOI[]>([]);
  const [hazards, setHazards] = useState<BattleHazard[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{x: number, y: number}[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [creationCoords, setCreationCoords] = useState<{ x: number, y: number } | null>(null);
  const [creationPoiCoords, setCreationPoiCoords] = useState<{ x: number, y: number } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [isMiddleMouseDown, setIsMiddleMouseDown] = useState<boolean>(false);
  const [gridSnapping, setGridSnapping] = useState<boolean>(true);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const transformComponentRef = React.useRef<ReactZoomPanPinchRef | null>(null);

  const isDragMode = selectedTool === 'drag' || isSpacePressed || isMiddleMouseDown;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target && 
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    const handleMouseDownCapture = (e: MouseEvent) => {
      if (e.button === 1) {
        // Prevent browser autoscroll icon when pressing the mouse wheel
        e.preventDefault();
        setIsMiddleMouseDown(true);

        // If starting over a draggable unit/poi, temporarily remove attributes
        // so react-zoom-pan-pinch allows panning from anywhere on the map
        const target = e.target as HTMLElement | null;
        const draggableEl = target?.closest?.('[draggable="true"]');
        const unitEl = target?.closest?.('.draggable-unit');

        if (draggableEl) {
          draggableEl.removeAttribute('draggable');
          requestAnimationFrame(() => {
            draggableEl.setAttribute('draggable', 'true');
          });
        }

        if (unitEl) {
          unitEl.classList.remove('draggable-unit');
          requestAnimationFrame(() => {
            unitEl.classList.add('draggable-unit');
          });
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1 || (e.buttons !== undefined && (e.buttons & 4) === 0)) {
        setIsMiddleMouseDown(false);
      }
    };

    const handleBlur = () => {
      setIsSpacePressed(false);
      setIsMiddleMouseDown(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDownCapture, true);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDownCapture, true);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Allow native trackpad pinch gestures (which send ctrlKey === true and small continuous deltas)
      const isTrackpadPinch = e.ctrlKey && Math.abs(e.deltaY) < 50 && e.deltaMode === 0;
      if (isTrackpadPinch) {
        return;
      }

      // Handle physical mouse wheel zooming with smooth, incremental steps
      const ref = transformComponentRef.current;
      if (!ref) return;

      e.preventDefault();
      e.stopPropagation();

      let delta = e.deltaY;
      if (e.deltaMode === 1) {
        // Line delta mode (e.g. Firefox)
        delta *= 35;
      } else if (e.deltaMode === 2) {
        // Page delta mode
        delta *= 500;
      }

      const { scale } = ref.state;
      const minScale = 0.1;
      const maxScale = 3.0;

      // Smooth incremental zoom factor (~8-10% per standard 100-120px notch)
      // Exponential scaling guarantees identical relative feel across all zoom levels
      const zoomFactor = Math.pow(0.999, delta);
      const newScale = Math.max(minScale, Math.min(maxScale, scale * zoomFactor));

      if (Math.abs(newScale - scale) < 0.0001) return;

      ref.zoomToPoint(newScale, e.clientX, e.clientY, 0);
    };

    container.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    return () => {
      container.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (hideEditingTools && !['select', 'drag'].includes(selectedTool)) {
      setSelectedTool('select');
    }
  }, [hideEditingTools, selectedTool]);

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
      if (e.key === 'Escape') {
        if (creationCoords || creationPoiCoords) {
          setCreationCoords(null);
          setCreationPoiCoords(null);
          return;
        }
        if (currentPath.length > 0 || isCapturing) {
          setCurrentPath([]);
          setIsCapturing(false);
          return;
        }
        if (selectedTool !== 'select') {
          setSelectedTool('select');
          return;
        }
        if (isFullscreen) {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          setIsFullscreen(false);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, creationCoords, creationPoiCoords, selectedTool, currentPath.length, isCapturing]);
  
  const { width, height } = mapConfig.gridSize;
  const boardWidth = width * CELL_SIZE;
  const boardHeight = height * CELL_SIZE;

  useEffect(() => {
    const fetchLayers = async () => {
      const { data } = await supabase.from('Map_Layers').select('*');
      if (data) setDynamicLayers(data as MapLayer[]);
    };
    const fetchPOIs = async () => {
      let query = supabase.from(poisTable).select('*');
      if (!isModerator && role !== 'Moderator') {
        if (role) {
          query = query.or(`owner.eq.${role},is_visible_to_enemy.eq.true`);
        } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000'); // Return none
        }
      }
      const { data } = await query;
      if (data) setPois(data as MapPOI[]);
    };
    const fetchHazards = async () => {
      let query = supabase.from(hazardsTable).select('*');
      if (!isModerator && role !== 'Moderator') {
        if (role) {
          query = query.contains('visible_to_teams', [role]);
        } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000'); // Return none
        }
      }
      const { data } = await query;
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
    if (!isDrawingMode && selectedTool !== 'polygon') {
      setCurrentPath([]);
      setIsCapturing(false);
    }
  }, [isDrawingMode, selectedTool]);

  const handleDragStart = (e: React.DragEvent, unit: Unit) => {
    if (isDragMode) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', `unit:${unit.id}`);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePoiDragStart = (e: React.DragEvent, poi: MapPOI) => {
    if (isDragMode) {
      e.preventDefault();
      return;
    }
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
    if (isDrawingMode || isDragMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = boardWidth / rect.width;
    const scaleY = boardHeight / rect.height;

    const xPixel = Math.round((e.clientX - rect.left) * scaleX - (CELL_SIZE / 2));
    const yPixel = Math.round((e.clientY - rect.top) * scaleY - (CELL_SIZE / 2));
    
    if (xPixel >= -CELL_SIZE && xPixel <= boardWidth && yPixel >= -CELL_SIZE && yPixel <= boardHeight) {
      if (selectedTool === 'place') {
        setCreationCoords({ x: xPixel, y: yPixel });
        return;
      }
      if (selectedTool === 'target') {
        setCreationPoiCoords({ x: xPixel, y: yPixel });
        return;
      }
      if (onGridClick) {
        onGridClick(xPixel, yPixel);
      }
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

  const activeDrawingMode = isDrawingMode || selectedTool === 'polygon';

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!activeDrawingMode || e.button !== 0) return;
    setIsCapturing(true);
    setCurrentPath([getEventCoordinates(e)]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!activeDrawingMode || !isCapturing) return;
    const coords = getEventCoordinates(e);
    setCurrentPath(prev => [...prev, coords]);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!activeDrawingMode || !isCapturing) return;
    setIsCapturing(false);
    if (onDrawComplete && currentPath.length > 2) {
      onDrawComplete(currentPath);
      if (selectedTool === 'polygon') {
        setSelectedTool('select');
      }
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
        ref={transformComponentRef}
        initialScale={1}
        minScale={0.1}
        maxScale={3}
        centerOnInit={true}
        wheel={{
          wheelDisabled: true, // Handled incrementally above for mouse wheel; trackpad pinch remains enabled
          touchPadDisabled: false,
        }}
        panning={{
          disabled: isDrawingMode,
          allowLeftClickPan: isDragMode,
          allowMiddleClickPan: true,
          excluded: isDragMode ? [] : ['draggable-unit'],
        }}
      >
        <ScaleUpdater />
        <MapControls 
          isFullscreen={isFullscreen} 
          onToggleFullscreen={toggleFullscreen} 
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          hudRightActions={hudRightActions}
          hideEditingTools={hideEditingTools}
          isDragMode={isDragMode}
          visibleLayers={visibleDynamicLayers}
          layerOpacities={layerOpacities}
          onOpacityChange={onOpacityChange}
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
              isDrawingMode || selectedTool === 'polygon' || selectedTool === 'place' || selectedTool === 'target'
                ? 'cursor-crosshair' 
                : isMiddleMouseDown
                ? 'cursor-grabbing'
                : isDragMode 
                ? 'cursor-grab active:cursor-grabbing' 
                : onGridClick 
                ? 'cursor-crosshair' 
                : 'cursor-default'
            }`}
            style={{ width: boardWidth, height: boardHeight }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleGridClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault();
              }
            }}
          >
            
            {/* Dynamic Map Layers */}
            {layers.baseMap && visibleDynamicLayers.map(layer => {
              const baseOpacity = layerOpacities?.['baseMap'] !== undefined ? layerOpacities['baseMap'] : 1;
              const layerOpacity = (layerOpacities?.[layer.id] !== undefined ? layerOpacities[layer.id] : 1) * baseOpacity;

              return (
                <div 
                  key={layer.id}
                  className="absolute inset-0 pointer-events-none bg-contain bg-no-repeat bg-center transition-opacity duration-75"
                  style={{ 
                    backgroundImage: `url(${layer.image_url})`, 
                    zIndex: layer.z_index,
                    opacity: layerOpacity
                  }}
                />
              );
            })}

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
              {layers.tacticalGrid && <rect width="100%" height="100%" fill="url(#tacticalGridPattern)" opacity={layerOpacities?.tacticalGrid ?? 0.45} />}

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
                        if (isDrawingMode || isDragMode) return;
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
            {activeDrawingMode && currentPath.length > 0 && (
              <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 9005, width: boardWidth, height: boardHeight }}>
                <polygon 
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
                    const canDrag = !isDragMode && isPoiDraggable ? isPoiDraggable(poi) : false;
                  return (
                  <div
                    key={poi.id}
                    draggable={canDrag}
                    onDragStart={(e) => handlePoiDragStart(e, poi)}
                    onDragEnd={handleDragEnd}
                    className={`absolute flex flex-col items-center justify-center group ${
                      isDragMode ? 'pointer-events-none select-none' : 'pointer-events-auto'
                    } ${canDrag ? 'cursor-grab active:cursor-grabbing draggable-unit' : 'cursor-pointer'}`}
                    style={{
                      left: poi.x_coord,
                      top: poi.y_coord,
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      transform: 'scale(var(--unit-inverse-scale, 1))'
                    }}
                    onClick={(e) => {
                      if (isDragMode) return;
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
                    <span className={`absolute -bottom-4 text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 bg-[#313030]/90 border border-white/15 ${
                      poi.owner === 'Player A' ? 'text-[#a4f1e5]' : poi.owner === 'Player B' ? 'text-[#f26a4b]' : poi.owner === 'Unknown' ? 'text-[#d4a017]' : 'text-white'
                    }`}>
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
                  const canDrag = !isDragMode && isDraggable ? isDraggable(unit) : false;
                  const isSelected = selectedUnitId === unit.id;
                  
                  return (
                    <div 
                      key={unit.id}
                      draggable={canDrag}
                      onDragStart={(e) => handleDragStart(e, unit)}
                      onDragEnd={handleDragEnd}
                      className={`absolute flex flex-col items-center justify-center opacity-100 group ${
                        isDragMode ? 'pointer-events-none select-none' : 'draggable-unit pointer-events-auto'
                      } ${canDrag ? 'cursor-grab active:cursor-grabbing' : (onUnitClick ? 'cursor-pointer' : 'cursor-default')}`}
                      style={{ 
                        left: unit.x_coord, 
                        top: unit.y_coord, 
                        width: CELL_SIZE, 
                        height: CELL_SIZE,
                        transform: 'scale(var(--unit-inverse-scale, 1))',
                        zIndex: isSelected ? 9999 : undefined
                      }}
                      title={`${unit.name ? `${unit.name} (${unit.type})` : unit.type} (HP: ${unit.health}) ${unit.is_visible_to_enemy && isModerator ? '- Visible to Enemy' : ''}`}
                      onClick={(e) => {
                         if (isDragMode) return;
                         // Prevent triggering grid click when clicking a unit
                         e.stopPropagation();
                         if (onUnitClick) onUnitClick(unit);
                      }}
                    >
                      {isSelected && (
                        <span className="absolute -inset-2 rounded-xl bg-[#d4a017]/40 animate-pulse pointer-events-none" />
                      )}

                      <div
                        className={`relative z-10 flex items-center justify-center ${isSelected ? 'ring-2 ring-[#d4a017] ring-offset-2 ring-offset-[#1f2420] rounded-lg bg-surface-canvas-void/30' : ''}`}
                      >
                        <NatoSymbol sidc={getSidcForUnit(unit)} size={30.6} className="drop-shadow-xl" />
                      </div>

                      {/* Left indicator: Eye icon when visible to enemy */}
                      {unit.is_visible_to_enemy && isModerator && (
                        <span 
                          className="absolute top-0 -left-0.5 w-4 h-4 bg-gray-600 text-white rounded-full flex items-center justify-center z-20 shadow border border-white/70"
                          title="Visível ao adversário"
                        >
                          <Eye size={9} className="text-white" strokeWidth={2.5} />
                        </span>
                      )}

                      {/* Right indicator: Readiness */}
                      {unit.health < 30 && (
                        <span 
                          className="absolute top-0 -right-0.5 w-4 h-4 bg-[#c03a6b] text-white rounded-full flex items-center justify-center text-[10px] font-bold z-20 shadow border border-white/60"
                          title="Prontidão crítica"
                        >
                          !
                        </span>
                      )}
                      {unit.health >= 30 && unit.health <= 70 && (
                        <span 
                          className="absolute top-0 -right-0.5 w-4 h-4 bg-[#f26a4b] text-white rounded-full flex items-center justify-center text-[10px] font-bold z-20 shadow border border-white/60"
                          title="Prontidão degradada"
                        >
                          !
                        </span>
                      )}

                      <div className={`pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-md shadow-xl whitespace-nowrap text-center backdrop-blur-md border ${
                        isSelected ? 'bg-[#313030]/95 border-[#d4a017]/70 z-50' : 'bg-[#313030]/90 border-white/15 opacity-0 group-hover:opacity-100 z-50'
                      }`}>
                        <div className={`font-mono text-[10px] font-bold leading-tight ${
                          isSelected ? 'text-[#d4a017]' : unit.owner === 'Player A' ? 'text-[#a4f1e5]' : unit.owner === 'Player B' ? 'text-[#f26a4b]' : unit.owner === 'Unknown' ? 'text-[#d4a017]' : 'text-white'
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

      {creationCoords && (
        <UnitCreationModal 
          table={unitsTable}
          isModerator={isModerator}
          fixedOwner={fixedOwner}
          initialCoordinates={creationCoords}
          onClose={() => {
            setCreationCoords(null);
            setSelectedTool('select');
          }}
        />
      )}

      {creationPoiCoords && (
        <PoiCreationModal 
          table={poisTable}
          isModerator={isModerator}
          fixedOwner={fixedOwner}
          initialCoordinates={creationPoiCoords}
          onClose={() => {
            setCreationPoiCoords(null);
            setSelectedTool('select');
          }}
        />
      )}
    </div>
  );
}
