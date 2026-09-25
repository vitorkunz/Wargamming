"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { MapLayer } from './LayerManager'; 
import LayerManager from './LayerManager';
import { MapPOI, BattleHazard } from './MapGrid';
import UnitCreationModal from './UnitCreationModal';
import { NatoSymbol } from './NatoSymbol';
import { useResizablePanel } from '@/hooks/useResizablePanel';

export interface LayerVisibility {
  baseMap: boolean;
  pois: boolean;
  units: boolean;
  teamA: boolean;
  teamB: boolean;
  unconfirmed: boolean;
  hazards: boolean;
  tacticalGrid: boolean;
  [key: string]: boolean; // For dynamic layers if we want them here, but we manage them via hiddenDynamicLayers
}

export const DEFAULT_LAYER_ORDER = [
  'teamA',
  'teamB',
  'unconfirmed',
  'pois',
  'tacticalGrid',
  'hazards',
  'baseMap'
];

const hazardTypeLabels: Record<string, string> = {
  minefield: 'Campo Minado',
  flooded_zone: 'Zona Inundada',
  naval_blockade: 'Bloqueio Naval',
  chemical_zone: 'Gás / Área Química',
  artillery_barrage: 'Barragem de Artilharia',
  smoke_screen: 'Cortina de Fumaça',
  dmz: 'Zona Desmilitarizada (DMZ)',
  trenches: 'Trincheiras',
  influence_zone: 'Zona de Influência',
};

const poiTypeLabels: Record<string, string> = {
  military_base: 'Base Militar',
  headquarters: 'Quartel General (HQ)',
  factory: 'Fábrica',
  bridge: 'Ponte',
  airfield: 'Aeródromo / Base Aérea',
  bunker: 'Bunker',
  checkpoint: 'Ponto de Controle',
  depot: 'Depósito de Suprimentos',
  port: 'Porto / Base Naval',
  radar: 'Estação de Radar',
  outpost: 'Posto Avançado',
};

const getHazardDotColor = (type: string) => {
  switch (type) {
    case 'minefield': return 'bg-status-alert';
    case 'naval_blockade': return 'bg-[#a855f7]';
    case 'flooded_zone': return 'bg-blue-500';
    case 'chemical_zone': return 'bg-emerald-600';
    case 'dmz': return 'bg-gray-500';
    case 'trenches': return 'bg-amber-700';
    case 'artillery_barrage': return 'bg-orange-600';
    case 'smoke_screen': return 'bg-slate-400';
    default: return 'bg-[#2d7d74]';
  }
};

interface SidebarProps {
  layers: LayerVisibility;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  hiddenDynamicLayers: string[];
  setHiddenDynamicLayers: (ids: string[]) => void;
  hiddenPois: string[];
  setHiddenPois: (ids: string[]) => void;
  hiddenHazards: string[];
  setHiddenHazards: (ids: string[]) => void;
  isModerator?: boolean;
  onEditPoi?: (poi: MapPOI) => void;
  onEditHazard?: (hazard: BattleHazard) => void;
  selectedPoiId?: string | null;
  selectedHazardId?: string | null;
  role?: string;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  teamACount?: number;
  teamBCount?: number;
  unconfirmedCount?: number;
  poisTable?: string;
  hazardsTable?: string;
  unitsTable?: string;
  layerOpacities?: Record<string, number>;
  onOpacityChange?: (layerId: string, opacity: number) => void;
  activeTab?: 'planning' | 'battle';
  isMobileOpen?: boolean;
  layerOrder?: string[];
  onReorderLayers?: (newOrder: string[]) => void;
}

export default function Sidebar({ 
  layers, toggleLayer, 
  hiddenDynamicLayers, setHiddenDynamicLayers, 
  hiddenPois, setHiddenPois,
  hiddenHazards, setHiddenHazards,
  isModerator, onEditPoi, onEditHazard, role,
  selectedPoiId, selectedHazardId,
  isOpen: externalIsOpen,
  onToggleOpen,
  isMobileOpen,
  teamACount = 0,
  teamBCount = 0,
  unconfirmedCount = 0,
  poisTable = 'Map_POIs',
  hazardsTable = 'Battle_Hazards',
  unitsTable,
  layerOpacities,
  onOpacityChange,
  activeTab,
  layerOrder,
  onReorderLayers
}: SidebarProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const toggleIsOpen = onToggleOpen || (() => setInternalIsOpen(!internalIsOpen));

  const {
    width: sidebarWidth,
    isDragging: isResizingSidebar,
    handlePointerDown: handleResizeStart,
  } = useResizablePanel({
    initialWidth: 300,
    minWidth: 240,
    maxWidth: 550,
    side: 'left',
    storageKey: 'wargame_left_sidebar_width',
  });

  const [dynamicLayers, setDynamicLayers] = useState<MapLayer[]>([]);

  const [pois, setPois] = useState<MapPOI[]>([]);
  const [hazards, setHazards] = useState<BattleHazard[]>([]);
  
  const [isPoiExpanded, setIsPoiExpanded] = useState(false);
  const [isHazardsExpanded, setIsHazardsExpanded] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNovaUnidadeModal, setShowNovaUnidadeModal] = useState(false);

  const [internalLayerOrder, setInternalLayerOrder] = useState<string[]>(DEFAULT_LAYER_ORDER);
  const currentOrder = layerOrder && layerOrder.length > 0 ? layerOrder : internalLayerOrder;
  const handleReorder = onReorderLayers || setInternalLayerOrder;

  const [draggedLayerKey, setDraggedLayerKey] = useState<string | null>(null);
  const [dragOverLayerKey, setDragOverLayerKey] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);
  const [draggableLayerKey, setDraggableLayerKey] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalMouseUp = () => setDraggableLayerKey(null);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const getDragHandleProps = (key: string) => ({
    onMouseDown: (e: React.MouseEvent) => {
      e.stopPropagation();
      setDraggableLayerKey(key);
    },
    onMouseUp: () => setDraggableLayerKey(null),
    onTouchStart: () => setDraggableLayerKey(key),
    onTouchEnd: () => setDraggableLayerKey(null),
    className: "material-symbols-outlined text-outline hover:text-primary active:text-primary text-[16px] cursor-grab active:cursor-grabbing select-none",
    title: "Arrastar para reordenar camada"
  });

  const effectiveLayerOrder = React.useMemo(() => {
    const baseKeys = DEFAULT_LAYER_ORDER;
    const dynamicIds = dynamicLayers.map(l => l.id);
    const order = currentOrder.slice();

    const filtered = order.filter(k => baseKeys.includes(k) || dynamicIds.includes(k));

    baseKeys.forEach(k => {
      if (!filtered.includes(k)) {
        if (k === 'baseMap') filtered.push(k);
        else filtered.unshift(k);
      }
    });

    dynamicIds.forEach(id => {
      if (!filtered.includes(id)) {
        const baseMapIdx = filtered.indexOf('baseMap');
        if (baseMapIdx !== -1) {
          filtered.splice(baseMapIdx, 0, id);
        } else {
          filtered.push(id);
        }
      }
    });

    return filtered;
  }, [currentOrder, dynamicLayers]);

  const handleLayerDragStart = (e: React.DragEvent, key: string) => {
    if (draggableLayerKey !== key) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', `wargame-layer:${key}`);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedLayerKey(key);
  };

  const handleLayerDragOver = (e: React.DragEvent, targetKey: string) => {
    if (draggedLayerKey && draggedLayerKey !== targetKey) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const pos = e.clientY < midpoint ? 'above' : 'below';
      setDragOverLayerKey(targetKey);
      setDropPosition(pos);
    }
  };

  const handleLayerDragLeave = () => {
    setDragOverLayerKey(null);
    setDropPosition(null);
  };

  const handleLayerDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedLayerKey || draggedLayerKey === targetKey) {
      setDraggedLayerKey(null);
      setDragOverLayerKey(null);
      setDropPosition(null);
      setDraggableLayerKey(null);
      return;
    }

    const currentList = [...effectiveLayerOrder];
    const fromIndex = currentList.indexOf(draggedLayerKey);
    if (fromIndex === -1) return;

    currentList.splice(fromIndex, 1);
    let targetIndex = currentList.indexOf(targetKey);
    if (targetIndex === -1) {
      targetIndex = currentList.length;
    } else if (dropPosition === 'below') {
      targetIndex += 1;
    }

    currentList.splice(targetIndex, 0, draggedLayerKey);
    handleReorder(currentList);

    setDraggedLayerKey(null);
    setDragOverLayerKey(null);
    setDropPosition(null);
    setDraggableLayerKey(null);
  };

  const handleLayerDragEnd = () => {
    setDraggedLayerKey(null);
    setDragOverLayerKey(null);
    setDropPosition(null);
    setDraggableLayerKey(null);
  };

  useEffect(() => {
    const fetchLayers = async () => {
      const { data } = await supabase.from('Map_Layers').select('*').order('z_index', { ascending: false });
      if (data) setDynamicLayers(data as MapLayer[]);
    };

    const fetchPois = async () => {
      const { data } = await supabase.from(poisTable).select('*');
      if (data) setPois(data as MapPOI[]);
    };

    const fetchHazards = async () => {
      let query = supabase.from(hazardsTable).select('*');
      if (!isModerator && role !== 'Moderator') {
        if (role) {
          query = query.contains('visible_to_teams', [role]);
        } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      }
      const { data } = await query;
      if (data) setHazards(data as BattleHazard[]);
    };

    fetchLayers();
    if (isModerator || role === 'Moderator') {
      fetchPois();
      fetchHazards();
    } else if (role) {
      const fetchPlayerPois = async () => {
        const { data } = await supabase.from(poisTable).select('*').or(`owner.eq.${role},is_visible_to_enemy.eq.true`);
        if (data) setPois(data as MapPOI[]);
      };
      fetchPlayerPois();
      fetchHazards();
    }

    const layerChannel = supabase.channel('sidebar-map-layers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Map_Layers' }, () => fetchLayers())
      .subscribe();

    let poiChannel: ReturnType<typeof supabase.channel> | null = null;
    let hazardChannel: ReturnType<typeof supabase.channel> | null = null;

    if (isModerator || role) {
      poiChannel = supabase.channel(`sidebar-map-pois-${poisTable}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: poisTable }, () => {
          if (isModerator || role === 'Moderator') fetchPois();
          else if (role) {
             supabase.from(poisTable).select('*').or(`owner.eq.${role},is_visible_to_enemy.eq.true`).then(({data}) => {
                if(data) setPois(data as MapPOI[]);
             });
          }
        })
        .subscribe();

      hazardChannel = supabase.channel(`sidebar-map-hazards-${hazardsTable}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: hazardsTable }, () => fetchHazards())
        .subscribe();
    }

    return () => {
      supabase.removeChannel(layerChannel);
      if (poiChannel) supabase.removeChannel(poiChannel);
      if (hazardChannel) supabase.removeChannel(hazardChannel);
    };
  }, [isModerator, role, poisTable, hazardsTable]);

  const toggleDynamic = (id: string) => {
    if (hiddenDynamicLayers.includes(id)) {
      setHiddenDynamicLayers(hiddenDynamicLayers.filter(l => l !== id));
    } else {
      setHiddenDynamicLayers([...hiddenDynamicLayers, id]);
    }
  };

  const toggleLocalPoi = (id: string) => {
    if (hiddenPois.includes(id)) {
      setHiddenPois(hiddenPois.filter(p => p !== id));
    } else {
      setHiddenPois([...hiddenPois, id]);
    }
  };

  const toggleLocalHazard = (id: string) => {
    if (hiddenHazards.includes(id)) {
      setHiddenHazards(hiddenHazards.filter(h => h !== id));
    } else {
      setHiddenHazards([...hiddenHazards, id]);
    }
  };

  const handleDragStartNATO = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('text/plain', `nato-template:${type}`);
    e.dataTransfer.effectAllowed = 'all';
  };

  return (
    <aside 
      className={`h-full flex flex-col bg-surface-parchment/95 backdrop-blur-md text-on-surface z-40 border-border-parchment ${
        isResizingSidebar ? '' : 'transition-all duration-300 ease-in-out'
      } overflow-hidden absolute top-0 left-0 lg:relative ${
        isMobileOpen 
          ? 'border-r shadow-[4px_0_20px_rgba(0,0,0,0.12)]' 
          : 'border-r-0 shadow-none'
      } ${
        !isOpen 
          ? 'lg:border-r-0 lg:shadow-none pointer-events-none' 
          : 'lg:border-r lg:shadow-[4px_0_20px_rgba(0,0,0,0.12)] pointer-events-auto'
      }`} 
      style={{
        width: isOpen ? `${sidebarWidth}px` : 0,
        minWidth: isOpen ? `${sidebarWidth}px` : 0,
        maxWidth: '85vw',
      }}
      id="left-panel"
    >
      {/* Resize Handle on Right Edge of Left Sidebar */}
      {isOpen && (
        <div
          onPointerDown={handleResizeStart}
          className="hidden lg:block absolute top-0 right-0 w-2.5 h-full cursor-col-resize z-50 group select-none hover:bg-primary/20 active:bg-primary/30 transition-colors"
          title="Arraste para ajustar a largura do painel de camadas"
        >
          <div className="absolute top-0 right-0 w-[2px] h-full bg-border-parchment/80 group-hover:bg-primary group-active:bg-primary transition-colors" />
        </div>
      )}
      
      {/* Left Panel Section Header */}
      <div className="bg-primary-container px-3 py-2 flex items-center justify-between shadow-sm border-b border-white/10 shrink-0">

        {isOpen && (
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary-fixed-dim text-[17px]">layers</span>
            <div className="flex flex-col">
              <span className="font-headline-sm text-[9.5px] font-bold text-text-on-dark uppercase tracking-wider leading-tight">Camadas do Mapa</span>
              <span className="font-tag-overline text-[8px] text-primary-fixed-dim leading-none mt-0.5">Cartografia Setorial</span>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {isOpen && isModerator && (
            <button 
              onClick={() => setShowUploadModal(true)}
              className="bg-primary hover:bg-chrome-hover px-2 py-0.5 rounded text-text-on-dark transition-colors flex items-center gap-1 shadow-sm font-semibold border border-primary-fixed-dim/20" 
              title="Carregar Nova Camada" 
              type="button"
            >
              <span className="material-symbols-outlined text-[12px]">add</span>
              <span className="text-[9.5px]">Carregar</span>
            </button>
          )}
          <button 
            className="p-1 rounded text-primary-fixed-dim hover:text-white hover:bg-white/10 transition-colors" 
            onClick={toggleIsOpen} 
            title={isOpen ? "Recolher Painel de Camadas" : "Expandir Painel de Camadas"} 
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">{isOpen ? 'keyboard_double_arrow_left' : 'keyboard_double_arrow_right'}</span>
          </button>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto p-3.5 space-y-2.5 text-on-surface custom-scrollbar relative z-0 ${!isOpen ? 'hidden' : 'block'}`} id="layer-tree">
        {effectiveLayerOrder.map(key => {
          const isDragging = draggedLayerKey === key;
          const isOver = dragOverLayerKey === key;

          const cardWrapperProps = {
            draggable: draggableLayerKey === key,
            onDragStart: (e: React.DragEvent) => handleLayerDragStart(e, key),
            onDragOver: (e: React.DragEvent) => handleLayerDragOver(e, key),
            onDragLeave: handleLayerDragLeave,
            onDrop: (e: React.DragEvent) => handleLayerDrop(e, key),
            onDragEnd: handleLayerDragEnd,
            className: `transition-all duration-150 rounded-lg relative ${
              isDragging ? 'opacity-30 scale-[0.98]' : ''
            } ${
              isOver && dropPosition === 'above' ? 'border-t-2 border-primary -mt-0.5' : ''
            } ${
              isOver && dropPosition === 'below' ? 'border-b-2 border-primary -mb-0.5' : ''
            }`
          };

          if (key === 'baseMap') {
            return (
              <div key={key} {...cardWrapperProps}>
                <div className={`group rounded-lg p-2.5 border transition-all ${layers.baseMap ? 'bg-surface-card/90 border-border-parchment hover:border-secondary/40 shadow-sm hover:bg-surface-parchment-dim' : 'bg-surface-container opacity-60 border-transparent'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span {...getDragHandleProps('baseMap')}>drag_indicator</span>
                      <button 
                        onClick={() => toggleLayer('baseMap')}
                        onMouseDown={(e) => e.stopPropagation()}
                        draggable={false}
                        className="text-secondary hover:text-primary transition-colors flex items-center justify-center w-6 h-6 rounded hover:bg-surface-container" 
                        type="button"
                        title={layers.baseMap ? "Ocultar mapa base" : "Exibir mapa base"}
                      >
                        <span className="material-symbols-outlined text-[16px]">{layers.baseMap ? 'visibility' : 'visibility_off'}</span>
                      </button>
                      <div className="flex flex-col min-w-0">
                        <span className={`font-label-md text-[10px] truncate font-bold ${layers.baseMap ? 'text-on-surface' : 'text-on-surface-variant'}`}>Mapa Base</span>
                        <span className="font-tag-overline text-[8px] text-on-surface-variant truncate">Cartografia Principal</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="bg-surface-container px-1 py-0.5 rounded text-[9px] font-mono font-semibold text-on-surface-variant">
                        {Math.round((layerOpacities?.['baseMap'] ?? 1) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Transparency Slider */}
                  {layers.baseMap && onOpacityChange && (
                    <div className="mt-2 pt-2 border-t border-border-parchment/60 flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()} draggable={false}>
                      <span className="material-symbols-outlined text-outline text-[14px]" title="Transparência do Mapa Base">opacity</span>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={Math.round((layerOpacities?.['baseMap'] ?? 1) * 100)}
                        onChange={(e) => onOpacityChange('baseMap', Number(e.target.value) / 100)}
                        className="w-full h-1.5 bg-surface-dim rounded-lg appearance-none cursor-pointer accent-[#2d7d74]"
                      />
                      <span className="font-mono text-[9px] font-semibold text-on-surface-variant w-7 text-right">
                        {Math.round((layerOpacities?.['baseMap'] ?? 1) * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (key === 'pois') {
            return (
              <div key={key} {...cardWrapperProps}>
                <div className={`rounded-lg p-2.5 border shadow-sm ${layers.pois ? 'bg-surface-card/90 border-border-parchment' : 'bg-surface-container opacity-60 border-transparent'}`}>
                  <div className="flex items-center justify-between gap-2 cursor-pointer" onClick={() => setIsPoiExpanded(!isPoiExpanded)}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span {...getDragHandleProps('pois')}>drag_indicator</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleLayer('pois'); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        draggable={false}
                        className="text-secondary hover:text-primary transition-colors flex items-center justify-center w-6 h-6 rounded hover:bg-surface-container" 
                        type="button"
                        title={layers.pois ? "Ocultar objetivos estratégicos" : "Exibir objetivos estratégicos"}
                      >
                        <span className="material-symbols-outlined text-[16px]">{layers.pois ? 'visibility' : 'visibility_off'}</span>
                      </button>
                      <div className="flex flex-col min-w-0">
                        <span className={`font-label-md text-[10px] truncate font-bold ${layers.pois ? 'text-on-surface' : 'text-on-surface-variant'}`}>Objetivos Estratégicos</span>
                        <span className={`font-tag-overline text-[8px] font-bold ${layers.pois ? 'text-status-objective' : 'text-on-surface-variant'}`}>
                          {pois.length === 1 ? '1 Ativo Estratégico' : `${pois.length} Ativos Estratégicos`}
                        </span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-outline text-[15px]" title={isPoiExpanded ? "Recolher objetivos" : "Expandir objetivos"}>
                      {isPoiExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                  
                  {/* POI Sub-Items */}
                  {isPoiExpanded && (
                    <div className="mt-2.5 ml-5 pl-2.5 space-y-1 bg-surface-parchment-dim/80 rounded-md p-2 border border-border-parchment/60" onMouseDown={(e) => e.stopPropagation()} draggable={false}>
                      {pois.length === 0 ? (
                        <div className="text-[9px] italic text-on-surface-variant">Nenhum objetivo ativo</div>
                      ) : (
                        pois.map(poi => {
                           const isVisible = !hiddenPois.includes(poi.id);
                           const isSelected = selectedPoiId === poi.id;
                           const displayName = poi.name || poiTypeLabels[poi.type] || 'Objetivo Sem Nome';
                           return (
                             <div 
                               key={poi.id} 
                               className={`flex items-center justify-between text-[10px] font-body-ui py-1 px-1.5 rounded cursor-pointer group transition-all ${
                                 isSelected 
                                   ? 'bg-surface-card border border-status-objective/60 shadow-xs' 
                                   : 'hover:bg-surface-card/70 border border-transparent'
                               }`}
                               onClick={() => onEditPoi?.(poi)}
                               title={`Ver detalhes de ${displayName}`}
                             >
                               <span className={`flex items-center gap-1.5 truncate pr-2 ${isVisible ? (isSelected ? 'text-primary font-bold' : 'text-on-surface font-semibold') : 'text-on-surface-variant'}`}>
                                 <span className={`w-1.5 h-1.5 rounded-full shadow-sm shrink-0 ${isVisible ? 'bg-status-objective' : 'bg-surface-dim'}`}></span>
                                 <span className="truncate group-hover:text-primary transition-colors">{displayName}</span>
                               </span>
                               <button
                                 type="button"
                                 title={isVisible ? "Ocultar objetivo individual" : "Exibir objetivo individual"}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   toggleLocalPoi(poi.id);
                                 }}
                                 className="p-0.5 rounded hover:bg-surface-container flex items-center justify-center transition-colors shrink-0"
                               >
                                 <span className={`material-symbols-outlined text-[13px] ${isVisible ? 'text-primary' : 'text-outline-variant opacity-40 group-hover:opacity-100'}`}>
                                   {isVisible ? 'visibility' : 'visibility_off'}
                                 </span>
                               </button>
                             </div>
                           );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (key === 'teamA') {
            return (
              <div key={key} {...cardWrapperProps}>
                <div className={`rounded-lg p-2.5 border shadow-sm transition-all ${layers.teamA ? 'bg-surface-card/90 border-border-parchment hover:border-faction-friendly/50' : 'bg-surface-container opacity-60 border-transparent'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span {...getDragHandleProps('teamA')}>drag_indicator</span>
                      <button 
                        onClick={() => toggleLayer('teamA')}
                        onMouseDown={(e) => e.stopPropagation()}
                        draggable={false}
                        className="text-secondary hover:text-primary transition-colors flex items-center justify-center w-6 h-6 rounded hover:bg-surface-container" 
                        type="button"
                        title={layers.teamA ? "Ocultar forças do Time A" : "Exibir forças do Time A"}
                      >
                        <span className="material-symbols-outlined text-[16px]">{layers.teamA ? 'visibility' : 'visibility_off'}</span>
                      </button>
                      <div className="flex flex-col min-w-0">
                        <span className={`font-label-md text-[10px] truncate font-bold ${layers.teamA ? 'text-on-surface' : 'text-on-surface-variant'}`}>Forças Time A</span>
                        <span className={`font-tag-overline text-[8px] font-bold ${layers.teamA ? 'text-faction-friendly' : 'text-on-surface-variant'}`}>
                          {teamACount === 1 ? '1 Unidade Ativa' : `${teamACount} Unidades Ativas`}
                        </span>
                      </div>
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${layers.teamA ? 'bg-faction-friendly ring-2 ring-faction-friendly/20' : 'bg-surface-dim'}`}></span>
                  </div>
                </div>
              </div>
            );
          }

          if (key === 'teamB') {
            return (
              <div key={key} {...cardWrapperProps}>
                <div className={`rounded-lg p-2.5 border shadow-sm transition-all ${layers.teamB ? 'bg-surface-card/90 border-border-parchment hover:border-faction-hostile/50' : 'bg-surface-container opacity-60 border-transparent'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span {...getDragHandleProps('teamB')}>drag_indicator</span>
                      <button 
                        onClick={() => toggleLayer('teamB')}
                        onMouseDown={(e) => e.stopPropagation()}
                        draggable={false}
                        className="text-secondary hover:text-primary transition-colors flex items-center justify-center w-6 h-6 rounded hover:bg-surface-container" 
                        type="button"
                        title={layers.teamB ? "Ocultar forças do Time B" : "Exibir forças do Time B"}
                      >
                        <span className="material-symbols-outlined text-[16px]">{layers.teamB ? 'visibility' : 'visibility_off'}</span>
                      </button>
                      <div className="flex flex-col min-w-0">
                        <span className={`font-label-md text-[10px] truncate font-bold ${layers.teamB ? 'text-on-surface' : 'text-on-surface-variant'}`}>Forças Time B</span>
                        <span className={`font-tag-overline text-[8px] font-bold ${layers.teamB ? 'text-faction-hostile' : 'text-on-surface-variant'}`}>
                          {teamBCount === 1 ? '1 Unidade Ativa' : `${teamBCount} Unidades Ativas`}
                        </span>
                      </div>
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${layers.teamB ? 'bg-faction-hostile ring-2 ring-faction-hostile/20' : 'bg-surface-dim'}`}></span>
                  </div>
                </div>
              </div>
            );
          }

          if (key === 'unconfirmed') {
            return (
              <div key={key} {...cardWrapperProps}>
                <div className={`rounded-lg p-2.5 border shadow-sm transition-all ${layers.unconfirmed ? 'bg-surface-card/90 border-border-parchment hover:border-faction-unknown/50' : 'bg-surface-container opacity-60 border-transparent'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span {...getDragHandleProps('unconfirmed')}>drag_indicator</span>
                      <button 
                        onClick={() => toggleLayer('unconfirmed')}
                        onMouseDown={(e) => e.stopPropagation()}
                        draggable={false}
                        className="text-secondary hover:text-primary transition-colors flex items-center justify-center w-6 h-6 rounded hover:bg-surface-container" 
                        type="button"
                        title={layers.unconfirmed ? "Ocultar contatos não confirmados" : "Exibir contatos não confirmados"}
                      >
                        <span className="material-symbols-outlined text-[16px]">{layers.unconfirmed ? 'visibility' : 'visibility_off'}</span>
                      </button>
                      <div className="flex flex-col min-w-0">
                        <span className={`font-label-md text-[10px] truncate font-bold ${layers.unconfirmed ? 'text-on-surface' : 'text-on-surface-variant'}`}>Contatos Não Confirmados</span>
                        <span className={`font-tag-overline text-[8px] font-bold ${layers.unconfirmed ? 'text-faction-unknown' : 'text-on-surface-variant'}`}>
                          {unconfirmedCount === 1 ? '1 Sinal Ambíguo' : `${unconfirmedCount} Sinais Ambíguos`}
                        </span>
                      </div>
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${layers.unconfirmed ? 'bg-faction-unknown ring-2 ring-faction-unknown/20' : 'bg-surface-dim'}`}></span>
                  </div>
                </div>
              </div>
            );
          }

          if (key === 'hazards') {
            return (
              <div key={key} {...cardWrapperProps}>
                <div className={`rounded-lg p-2.5 border shadow-sm ${layers.hazards ? 'bg-surface-card/90 border-border-parchment' : 'bg-surface-container opacity-60 border-transparent'}`}>
                  <div className="flex items-center justify-between gap-2 cursor-pointer" onClick={() => setIsHazardsExpanded(!isHazardsExpanded)}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span {...getDragHandleProps('hazards')}>drag_indicator</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleLayer('hazards'); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        draggable={false}
                        className="text-secondary hover:text-primary transition-colors flex items-center justify-center w-6 h-6 rounded hover:bg-surface-container" 
                        type="button"
                        title={layers.hazards ? "Ocultar zonas operacionais" : "Exibir zonas operacionais"}
                      >
                        <span className="material-symbols-outlined text-[16px]">{layers.hazards ? 'visibility' : 'visibility_off'}</span>
                      </button>
                      <div className="flex flex-col min-w-0">
                        <span className={`font-label-md text-[10px] truncate font-bold ${layers.hazards ? 'text-on-surface' : 'text-on-surface-variant'}`}>Zonas Operacionais</span>
                        <span className="font-tag-overline text-[8px] text-on-surface-variant font-bold">
                          {hazards.length === 1 ? '1 Zona Ativa' : `${hazards.length} Zonas Ativas`}
                        </span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-outline text-[15px]" title={isHazardsExpanded ? "Recolher zonas" : "Expandir zonas"}>
                      {isHazardsExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                  
                  {/* Hazards Sub-Items */}
                  {isHazardsExpanded && (
                    <div className="mt-2.5 ml-5 pl-2.5 space-y-1 bg-surface-parchment-dim/80 rounded-md p-2 border border-border-parchment/60" onMouseDown={(e) => e.stopPropagation()} draggable={false}>
                      {hazards.length === 0 ? (
                        <div className="text-[9px] italic text-on-surface-variant">Nenhuma zona operacional ativa</div>
                      ) : (
                        hazards.map(hazard => {
                           const isVisible = !hiddenHazards.includes(hazard.id);
                           const isSelected = selectedHazardId === hazard.id;
                           const displayName = hazard.label || hazardTypeLabels[hazard.hazard_type] || 'Zona Operacional';
                           return (
                             <div 
                               key={hazard.id} 
                               className={`flex items-center justify-between text-[10px] font-body-ui py-1 px-1.5 rounded cursor-pointer group transition-all ${
                                 isSelected 
                                   ? 'bg-surface-card border border-secondary/60 shadow-xs' 
                                   : 'hover:bg-surface-card/70 border border-transparent'
                               }`}
                               onClick={() => onEditHazard?.(hazard)}
                               title={`Ver detalhes de ${displayName}`}
                             >
                               <span className={`flex items-center gap-1.5 truncate pr-2 ${isVisible ? (isSelected ? 'text-primary font-bold' : 'text-on-surface font-semibold') : 'text-on-surface-variant'}`}>
                                 <span className={`w-1.5 h-1.5 rounded-full shadow-sm shrink-0 ${isVisible ? getHazardDotColor(hazard.hazard_type) : 'bg-surface-dim'}`}></span>
                                 <span className="truncate group-hover:text-primary transition-colors">{displayName}</span>
                               </span>
                               <button
                                 type="button"
                                 title={isVisible ? "Ocultar zona individual" : "Exibir zona individual"}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   toggleLocalHazard(hazard.id);
                                 }}
                                 className="p-0.5 rounded hover:bg-surface-container flex items-center justify-center transition-colors shrink-0"
                               >
                                 <span className={`material-symbols-outlined text-[13px] ${isVisible ? 'text-primary' : 'text-outline-variant opacity-40 group-hover:opacity-100'}`}>
                                   {isVisible ? 'visibility' : 'visibility_off'}
                                 </span>
                               </button>
                             </div>
                           );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (key === 'tacticalGrid') {
            return (
              <div key={key} {...cardWrapperProps}>
                <div className={`rounded-lg p-2.5 border transition-all ${layers.tacticalGrid ? 'bg-surface-card/90 border-border-parchment shadow-sm hover:border-secondary/30' : 'bg-surface-card/60 border-border-parchment/60 opacity-60'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span {...getDragHandleProps('tacticalGrid')}>drag_indicator</span>
                      <button 
                        onClick={() => toggleLayer('tacticalGrid')}
                        onMouseDown={(e) => e.stopPropagation()}
                        draggable={false}
                        className="text-outline hover:text-on-surface transition-colors flex items-center justify-center w-6 h-6 rounded hover:bg-surface-container" 
                        type="button"
                        title={layers.tacticalGrid ? "Ocultar grade tática" : "Exibir grade tática"}
                      >
                        <span className="material-symbols-outlined text-[16px]">{layers.tacticalGrid ? 'visibility' : 'visibility_off'}</span>
                      </button>
                      <div className="flex flex-col min-w-0">
                        <span className={`font-label-md text-[10px] truncate font-bold ${layers.tacticalGrid ? 'text-on-surface' : 'text-outline'}`}>Grade Tática (MGRS 10k)</span>
                        <span className={`font-tag-overline text-[8px] ${layers.tacticalGrid ? 'text-primary' : 'text-outline'}`}>{layers.tacticalGrid ? 'Camada Ativa' : 'Camada Inativa'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="bg-surface-container px-1 py-0.5 rounded text-[9px] font-mono font-semibold text-on-surface-variant">
                        {Math.round((layerOpacities?.['tacticalGrid'] ?? 0.45) * 100)}%
                      </span>
                      <span className={`material-symbols-outlined text-[15px] ${layers.tacticalGrid ? 'text-on-surface' : 'text-outline'}`}>grid_4x4</span>
                    </div>
                  </div>

                  {/* Transparency Slider */}
                  {layers.tacticalGrid && onOpacityChange && (
                    <div className="mt-2 pt-2 border-t border-border-parchment/60 flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()} draggable={false}>
                      <span className="material-symbols-outlined text-outline text-[14px]" title="Transparência da Grade">opacity</span>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={Math.round((layerOpacities?.['tacticalGrid'] ?? 0.45) * 100)}
                        onChange={(e) => onOpacityChange('tacticalGrid', Number(e.target.value) / 100)}
                        className="w-full h-1.5 bg-surface-dim rounded-lg appearance-none cursor-pointer accent-[#2d7d74]"
                      />
                      <span className="font-mono text-[9px] font-semibold text-on-surface-variant w-7 text-right">
                        {Math.round((layerOpacities?.['tacticalGrid'] ?? 0.45) * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // Dynamic Uploaded Layer
          const layer = dynamicLayers.find(l => l.id === key);
          if (!layer) return null;

          const isVisible = !hiddenDynamicLayers.includes(layer.id) && layer.is_global_visible;
          const currentOpacity = layerOpacities?.[layer.id] ?? 1;

          return (
            <div key={key} {...cardWrapperProps}>
              <div className={`rounded-lg p-2.5 border shadow-sm transition-all ${isVisible ? 'bg-surface-card/90 border-border-parchment hover:border-primary/30' : 'bg-surface-container opacity-60 border-transparent'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span {...getDragHandleProps(layer.id)}>drag_indicator</span>
                    <button 
                      onClick={() => toggleDynamic(layer.id)}
                      onMouseDown={(e) => e.stopPropagation()}
                      draggable={false}
                      className="text-secondary hover:text-primary transition-colors flex items-center justify-center w-6 h-6 rounded hover:bg-surface-container" 
                      type="button"
                      title={isVisible ? "Ocultar camada" : "Exibir camada"}
                    >
                      <span className="material-symbols-outlined text-[16px]">{isVisible ? 'visibility' : 'visibility_off'}</span>
                    </button>
                    <div className="flex flex-col min-w-0">
                      <span className={`font-label-md text-[10px] truncate font-bold ${isVisible ? 'text-on-surface' : 'text-on-surface-variant'}`}>{layer.name}</span>
                      <span className="font-tag-overline text-[8px] text-on-surface-variant">Camada Personalizada</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-surface-container px-1 py-0.5 rounded text-[9px] font-mono font-semibold text-on-surface-variant">
                      {Math.round(currentOpacity * 100)}%
                    </span>
                    {isModerator && (
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          if(window.confirm('Excluir esta camada?')) await supabase.from('Map_Layers').delete().eq('id', layer.id);
                        }} 
                        onMouseDown={(e) => e.stopPropagation()}
                        draggable={false}
                        className="text-status-alert hover:text-red-700 p-1" 
                        title="Excluir camada"
                      >
                        <span className="material-symbols-outlined text-[13px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Transparency Slider */}
                {isVisible && onOpacityChange && (
                  <div className="mt-2 pt-2 border-t border-border-parchment/60 flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()} draggable={false}>
                    <span className="material-symbols-outlined text-outline text-[14px]" title="Transparência da Camada">opacity</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={Math.round(currentOpacity * 100)}
                      onChange={(e) => onOpacityChange(layer.id, Number(e.target.value) / 100)}
                      className="w-full h-1.5 bg-surface-dim rounded-lg appearance-none cursor-pointer accent-[#2d7d74]"
                    />
                    <span className="font-mono text-[9px] font-semibold text-on-surface-variant w-7 text-right">
                      {Math.round(currentOpacity * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom: Quick Unit & Counter Staging Palette */}
      {isOpen && (isModerator || activeTab === 'planning') && (
        <div className="p-3 bg-surface-parchment-dim/90 border-t border-border-parchment shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="font-tag-overline text-[9px] text-primary uppercase font-bold tracking-wider">Paleta de Unidades NATO</span>
            <span className="font-tag-overline text-[8px] text-on-surface-variant">Arrastar ao Mapa</span>
          </div>
          <button 
            onClick={() => setShowNovaUnidadeModal(true)}
            className="w-full mb-2 py-1.5 px-2.5 bg-primary-container hover:bg-chrome-hover text-text-on-dark font-headline-sm text-[11px] font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 border border-primary-fixed-dim/20 transition-all active:scale-95" 
            type="button"
            title="Criar Nova Unidade"
          >
            <span className="material-symbols-outlined text-[15px] text-primary-fixed-dim">add_circle</span>
            <span>Nova Unidade</span>
          </button>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            
            <div draggable onDragStart={(e) => handleDragStartNATO(e, 'infantaria')} title="Arrastar Infantaria ao mapa" className="bg-surface-card hover:bg-secondary-fixed/40 transition-all p-1.5 rounded-lg border border-border-parchment shadow-sm cursor-grab flex flex-col items-center group hover:shadow">
              <div className="group-hover:scale-110 transition-transform h-[24px] flex items-center justify-center">
                <NatoSymbol sidc={`S${role === 'Player B' ? 'H' : 'F'}GPUCI--------`} size={20} variant="quick-panel" />
              </div>
              <span className="font-tag-overline text-[8px] text-on-surface mt-0.5">Infantaria</span>
            </div>
            
            <div draggable onDragStart={(e) => handleDragStartNATO(e, 'blindados')} title="Arrastar Blindados ao mapa" className="bg-surface-card hover:bg-secondary-fixed/40 transition-all p-1.5 rounded-lg border border-border-parchment shadow-sm cursor-grab flex flex-col items-center group hover:shadow">
              <div className="group-hover:scale-110 transition-transform h-[24px] flex items-center justify-center">
                <NatoSymbol sidc={`S${role === 'Player B' ? 'H' : 'F'}GPUCA--------`} size={20} variant="quick-panel" />
              </div>
              <span className="font-tag-overline text-[8px] text-on-surface mt-0.5">Blindados</span>
            </div>
            
            <div draggable onDragStart={(e) => handleDragStartNATO(e, 'artilharia')} title="Arrastar Artilharia ao mapa" className="bg-surface-card hover:bg-secondary-fixed/40 transition-all p-1.5 rounded-lg border border-border-parchment shadow-sm cursor-grab flex flex-col items-center group hover:shadow">
              <div className="group-hover:scale-110 transition-transform h-[24px] flex items-center justify-center">
                <NatoSymbol sidc={`S${role === 'Player B' ? 'H' : 'F'}GPUCF--------`} size={20} variant="quick-panel" />
              </div>
              <span className="font-tag-overline text-[8px] text-on-surface mt-0.5">Artilharia</span>
            </div>
            
            <div draggable onDragStart={(e) => handleDragStartNATO(e, 'combatenteSuperficie')} title="Arrastar Força Naval ao mapa" className="bg-surface-card hover:bg-secondary-fixed/40 transition-all p-1.5 rounded-lg border border-border-parchment shadow-sm cursor-grab flex flex-col items-center group hover:shadow">
              <div className="group-hover:scale-110 transition-transform h-[24px] flex items-center justify-center">
                <NatoSymbol sidc={`S${role === 'Player B' ? 'H' : 'F'}SPCL---------`} size={20} variant="quick-panel" />
              </div>
              <span className="font-tag-overline text-[8px] text-on-surface mt-0.5">Naval</span>
            </div>
            
            <div draggable onDragStart={(e) => handleDragStartNATO(e, 'caca')} title="Arrastar Aviação ao mapa" className="bg-surface-card hover:bg-secondary-fixed/40 transition-all p-1.5 rounded-lg border border-border-parchment shadow-sm cursor-grab flex flex-col items-center group hover:shadow">
              <div className="group-hover:scale-110 transition-transform h-[24px] flex items-center justify-center">
                <NatoSymbol sidc={`S${role === 'Player B' ? 'H' : 'F'}APMF---------`} size={20} variant="quick-panel" />
              </div>
              <span className="font-tag-overline text-[8px] text-on-surface mt-0.5">Aviação</span>
            </div>
            
            <div draggable onDragStart={(e) => handleDragStartNATO(e, 'comunicacoes')} title="Arrastar Comunicações ao mapa" className="bg-surface-card hover:bg-secondary-fixed/40 transition-all p-1.5 rounded-lg border border-border-parchment shadow-sm cursor-grab flex flex-col items-center group hover:shadow">
              <div className="group-hover:scale-110 transition-transform h-[24px] flex items-center justify-center">
                <NatoSymbol sidc={`S${role === 'Player B' ? 'H' : 'F'}GPUUS--------`} size={20} variant="quick-panel" />
              </div>
              <span className="font-tag-overline text-[8px] text-on-surface mt-0.5">Comunicações</span>
            </div>
            
          </div>
        </div>
      )}

      {/* Modals */}
      {showUploadModal && isModerator && (
        <div className="absolute inset-0 z-50 bg-black/50 flex flex-col justify-end">
          <div className="bg-surface-parchment rounded-t-xl shadow-[0_-8px_30px_rgba(0,0,0,0.3)] p-4 border-t border-border-parchment flex flex-col max-h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-headline-sm text-primary font-bold">Carregar Camada</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-on-surface-variant hover:text-status-alert" title="Fechar">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="overflow-y-auto">
               <LayerManager 
                 layers={dynamicLayers} 
                 hiddenDynamicLayers={hiddenDynamicLayers} 
                 toggleLocalDynamic={toggleDynamic}
                 layerOpacities={layerOpacities}
                 onOpacityChange={onOpacityChange}
               />
            </div>
          </div>
        </div>
      )}

      {showNovaUnidadeModal && (
        <UnitCreationModal 
          table={unitsTable || (isModerator ? 'Moderator_Units' : 'Planning_Units')} 
          draftOwner={role}
          isModerator={isModerator}
          onClose={() => setShowNovaUnidadeModal(false)}
        />
      )}

    </aside>
  );
}
