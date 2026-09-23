"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import MapGrid, { Unit } from './MapGrid';
import Sidebar, { LayerVisibility, DEFAULT_LAYER_ORDER } from './Sidebar';
import TeamAssignment from './TeamAssignment';
import UnitCreationModal from './UnitCreationModal';
import HazardCreationModal from './HazardCreationModal';
import ReservesPanel from './ReservesPanel';
import UnitPanel from './UnitPanel';
import PoiPanel from './PoiPanel';
import HazardPanel from './HazardPanel';
import { MapPOI, BattleHazard } from './MapGrid';
import TopBar from './ui/TopBar';
import Panel from './ui/Panel';
import BottomNavbar, { BottomPanelType } from './BottomNavbar';

interface ModeratorDashboardProps {
  userEmail: string;
  role: string;
  onSignOut: () => void;
}

export default function ModeratorDashboard({ userEmail, role, onSignOut }: ModeratorDashboardProps) {
  const [hiddenDynamicLayers, setHiddenDynamicLayers] = useState<string[]>([]);
  const [hiddenPois, setHiddenPois] = useState<string[]>([]);
  const [hiddenHazards, setHiddenHazards] = useState<string[]>([]);
  const [layers, setLayers] = useState<LayerVisibility>({
    baseMap: true,
    pois: true,
    units: true,
    teamA: true,
    teamB: true,
    unconfirmed: true,
    hazards: true,
    tacticalGrid: true
  });

  const [layerOpacities, setLayerOpacities] = useState<Record<string, number>>({ baseMap: 1, tacticalGrid: 0.45 });
  const [layerOrder, setLayerOrder] = useState<string[]>(DEFAULT_LAYER_ORDER);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('wargame_layer_opacities');
      if (saved) {
        setLayerOpacities(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading layer opacities from localStorage', e);
    }

    try {
      const savedOrder = localStorage.getItem('wargame_layer_order');
      if (savedOrder) {
        const parsed = JSON.parse(savedOrder);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLayerOrder(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading layer order from localStorage', e);
    }
  }, []);

  const handleOpacityChange = (layerId: string, opacity: number) => {
    const clamped = Math.max(0, Math.min(1, Math.round(opacity * 100) / 100));
    setLayerOpacities(prev => {
      const next = { ...prev, [layerId]: clamped };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('wargame_layer_opacities', JSON.stringify(next));
        } catch (e) {
          console.error('Error saving layer opacities to localStorage', e);
        }
      }
      return next;
    });
  };

  const handleReorderLayers = (newOrder: string[]) => {
    setLayerOrder(newOrder);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('wargame_layer_order', JSON.stringify(newOrder));
      } catch (e) {
        console.error('Error saving layer order to localStorage', e);
      }
    }
  };

  const [activeView, setActiveView] = useState<'edit_map' | 'view_published' | 'manage_players'>('edit_map');
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [activeBottomPanel, setActiveBottomPanel] = useState<BottomPanelType>(null);


  const [units, setUnits] = useState<Unit[]>([]);
  const [hazards, setHazards] = useState<BattleHazard[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<MapPOI | null>(null);
  const [selectedHazard, setSelectedHazard] = useState<BattleHazard | null>(null);
  const [isDrawingHazard, setIsDrawingHazard] = useState(false);
  const [pendingHazardPoints, setPendingHazardPoints] = useState<{x:number, y:number}[] | null>(null);
  
  const [clipboard, setClipboard] = useState<{ type: 'unit' | 'poi' | 'hazard', data: any } | null>(null);

  const unitsTable = activeView === 'edit_map' ? 'Moderator_Units' : 'Battle_Units';
  const poisTable = activeView === 'edit_map' ? 'Moderator_POIs' : 'Map_POIs';
  const hazardsTable = activeView === 'edit_map' ? 'Moderator_Hazards' : 'Battle_Hazards';

  const unitsRef = useRef(units);
  useEffect(() => {
    unitsRef.current = units;
  }, [units]);

  const isDuplicatingRef = useRef(false);

  const handleDuplicateUnit = async (unitToDuplicate: Unit) => {
    if (activeView !== 'edit_map' || isDuplicatingRef.current) return;
    isDuplicatingRef.current = true;
    try {
      const duplicatePayload = {
        name: unitToDuplicate.name || null,
        type: unitToDuplicate.type,
        owner: unitToDuplicate.owner,
        health: unitToDuplicate.health ?? 100,
        ammo: unitToDuplicate.ammo ?? 100,
        x_coord: 0,
        y_coord: 0,
        in_reserve: true,
        is_visible_to_enemy: unitToDuplicate.is_visible_to_enemy ?? false,
      };

      const { data, error } = await supabase
        .from(unitsTable)
        .insert(duplicatePayload)
        .select()
        .single();

      if (error) {
        console.error("Failed to duplicate unit to reserve:", error);
        alert("Failed to duplicate unit: " + error.message);
      } else if (data) {
        setUnits(prev => prev.some(u => u.id === data.id) ? prev : [...prev, data as Unit]);
      }
    } finally {
      isDuplicatingRef.current = false;
    }
  };

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (activeView !== 'edit_map') return;
      
      // Escape key to deselect
      if (e.key === 'Escape') {
        if (
          e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement ||
          (e.target as HTMLElement)?.isContentEditable
        ) {
          (e.target as HTMLElement).blur();
        }
        if (pendingHazardPoints) {
          e.preventDefault();
          setPendingHazardPoints(null);
          return;
        }
        if (selectedUnitId) {
          e.preventDefault();
          setSelectedUnitId(null);
          return;
        }
        if (selectedPoi) {
          e.preventDefault();
          setSelectedPoi(null);
          return;
        }
        if (selectedHazard) {
          e.preventDefault();
          setSelectedHazard(null);
          return;
        }
        return;
      }

      // Ignore if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) return;

      // Duplicate unit on Ctrl+C / Cmd+C
      const isCopy = (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'c' || e.key === 'C' || e.code === 'KeyC');
      if (isCopy) {
        if (e.repeat) return;
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
          return;
        }

        if (selectedUnitId) {
          const unitToDuplicate = unitsRef.current.find(u => u.id === selectedUnitId);
          if (unitToDuplicate) {
            e.preventDefault();
            await handleDuplicateUnit(unitToDuplicate);
          }
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedUnitId) {
          if (confirm('Delete unit?')) {
            await supabase.from(unitsTable).delete().eq('id', selectedUnitId);
            setSelectedUnitId(null);
          }
        } else if (selectedPoi) {
          if (confirm('Delete POI?')) {
            await supabase.from(poisTable).delete().eq('id', selectedPoi.id);
            setSelectedPoi(null);
          }
        } else if (selectedHazard) {
          if (confirm('Delete Hazard?')) {
            await supabase.from(hazardsTable).delete().eq('id', selectedHazard.id);
            setSelectedHazard(null);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, selectedUnitId, selectedPoi, selectedHazard, unitsTable, poisTable, hazardsTable, pendingHazardPoints]);

  const handleDrawComplete = (points: {x:number, y:number}[]) => {
    setPendingHazardPoints(points);
    setIsDrawingHazard(false);
  };

  const handlePOIClick = (poi: MapPOI) => {
    setSelectedPoi(poi);
    setSelectedUnitId(null);
    setSelectedHazard(null);
    setIsRightPanelOpen(true);
  };

  const handleHazardClick = (hazard: BattleHazard) => {
    setSelectedHazard(hazard);
    setSelectedPoi(null);
    setSelectedUnitId(null);
    setIsRightPanelOpen(true);
  };

  const handleUnitClick = (unit: Unit) => {
    setSelectedUnitId(unit.id);
    setSelectedPoi(null);
    setSelectedHazard(null);
    setIsRightPanelOpen(true);
  };

  const toggleLayer = (layer: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  useEffect(() => {
    const fetchUnits = async () => {
      const { data, error } = await supabase.from(unitsTable).select('*');
      if (!error && data) setUnits(data as Unit[]);
    };
    fetchUnits();

    const fetchHazards = async () => {
      const { data, error } = await supabase.from(hazardsTable).select('*');
      if (!error && data) setHazards(data as BattleHazard[]);
    };
    fetchHazards();

    const unitsChannel = supabase
      .channel(`mod-units-${unitsTable}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: unitsTable }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setUnits((prev) => prev.some(u => u.id === payload.new.id) ? prev : [...prev, payload.new as Unit]);
        } else if (payload.eventType === 'UPDATE') {
          setUnits((prev) => prev.map(u => (u.id === payload.new.id ? (payload.new as Unit) : u)));
        } else if (payload.eventType === 'DELETE') {
          setUnits((prev) => prev.filter(u => u.id !== payload.old.id));
          setSelectedUnitId(prevId => prevId === payload.old.id ? null : prevId);
        }
      })
      .subscribe();

    const hazardsChannel = supabase
      .channel(`mod-hazards-${hazardsTable}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: hazardsTable }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setHazards((prev) => prev.some(h => h.id === payload.new.id) ? prev : [...prev, payload.new as BattleHazard]);
        } else if (payload.eventType === 'UPDATE') {
          setHazards((prev) => prev.map(h => (h.id === payload.new.id ? (payload.new as BattleHazard) : h)));
        } else if (payload.eventType === 'DELETE') {
          setHazards((prev) => prev.filter(h => h.id !== payload.old.id));
          setSelectedHazard(prevId => prevId?.id === payload.old.id ? null : prevId);
        }
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(unitsChannel); 
      supabase.removeChannel(hazardsChannel);
    };
  }, [unitsTable, hazardsTable]);

  const handleUnitDrop = async (unitId: string, x: number, y: number) => {
    if (activeView === 'view_published') return;
    setUnits(prev => prev.map(u => u.id === unitId ? { ...u, x_coord: x, y_coord: y, in_reserve: false } : u));
    await supabase.from(unitsTable).update({ x_coord: x, y_coord: y, in_reserve: false }).eq('id', unitId);
  };

  const handlePoiDrop = async (poiId: string, x: number, y: number) => {
    if (activeView === 'view_published') return;
    await supabase.from(poisTable).update({ x_coord: x, y_coord: y }).eq('id', poiId);
  };

  const [spawnModalData, setSpawnModalData] = useState<{ templateType: string, x: number, y: number } | null>(null);

  const handleSpawnUnitAt = async (templateType: string, x: number, y: number) => {
    if (activeView === 'view_published') return;
    setSpawnModalData({ templateType, x, y });
  };

  const handlePublish = async () => {
    if (window.confirm("Publish Draft Map to Live? This will overwrite the current live battle map players see.")) {
      const { error } = await supabase.rpc('publish_draft_to_live');
      if (error) alert("Failed to publish map: " + error.message);
      else alert("Map published successfully!");
    }
  };

  const handleSyncFromLive = async () => {
    if (window.confirm("Overwrite your current draft with the Live Map? Any unsaved draft work will be lost.")) {
      const { error } = await supabase.rpc('sync_draft_from_live');
      if (error) {
        alert("Failed to sync map: " + error.message);
      } else {
        const { data } = await supabase.from(unitsTable).select('*');
        if (data) setUnits(data as Unit[]);
        alert("Draft map synced from live successfully!");
      }
    }
  };

  const activeUnits = units.filter(u => !u.in_reserve);
  const reserveUnits = units.filter(u => u.in_reserve);
  const selectedUnit = units.find(u => u.id === selectedUnitId) || null;

  const teamACount = activeUnits.filter(u => u.owner === 'Player A').length;
  const teamBCount = activeUnits.filter(u => u.owner === 'Player B').length;
  const unconfirmedCount = activeUnits.filter(u => u.owner === 'Unknown').length;

  return (
    <div className="bg-surface-canvas-void font-body-base text-on-surface min-h-screen flex flex-col overflow-hidden">
      <TopBar userEmail={userEmail} role={role} onSignOut={onSignOut}>
        <nav className="bg-primary/90 px-space-xs py-space-xs rounded-lg flex items-center gap-space-xs shadow-inner border border-primary-fixed-dim/20">
          <button 
            className={`font-label-md text-label-md px-space-md py-space-xs transition-colors rounded-lg ${activeView === 'manage_players' ? 'bg-surface-card text-primary font-bold shadow-[0_1px_4px_rgba(0,75,65,0.2)]' : 'text-text-on-dark hover:bg-chrome-hover'}`}
            onClick={() => setActiveView('manage_players')}
          >
            Gerir Usuários
          </button>
          <button 
            className={`font-label-md text-label-md px-space-md py-space-xs transition-colors rounded-lg ${activeView === 'edit_map' ? 'bg-surface-card text-primary font-bold shadow-[0_1px_4px_rgba(0,75,65,0.2)]' : 'text-text-on-dark hover:bg-chrome-hover'}`}
            onClick={() => setActiveView('edit_map')}
          >
            Editar Mapa
          </button>
          <button 
            className={`font-label-md text-label-md px-space-md py-space-xs transition-colors rounded-lg ${activeView === 'view_published' ? 'bg-surface-card text-primary font-bold shadow-[0_1px_4px_rgba(0,75,65,0.2)]' : 'text-text-on-dark hover:bg-chrome-hover'}`}
            onClick={() => setActiveView('view_published')}
          >
            Ver Mapa Publicado
          </button>
        </nav>
      </TopBar>

      <main className="relative pt-[104px] lg:pt-16 w-full h-screen bg-surface-canvas-void flex flex-col">
        <div className="relative w-full h-full flex overflow-hidden bg-surface-canvas-void select-none">
          {/* Left Panel */}
          {activeView !== 'manage_players' && (
            <Sidebar 
              layers={layers} 
              toggleLayer={toggleLayer} 
              hiddenDynamicLayers={hiddenDynamicLayers}
              setHiddenDynamicLayers={setHiddenDynamicLayers}
              hiddenPois={hiddenPois}
              setHiddenPois={setHiddenPois}
              hiddenHazards={hiddenHazards}
              setHiddenHazards={setHiddenHazards}
              isModerator={activeView === 'edit_map'}
              poisTable={poisTable}
              hazardsTable={hazardsTable}
              unitsTable={unitsTable}
              role={role}
              onEditPoi={handlePOIClick}
              onEditHazard={handleHazardClick}
              isOpen={isLeftPanelOpen || activeBottomPanel === 'layers'}
              onToggleOpen={() => {
                setIsLeftPanelOpen(!isLeftPanelOpen);
                if (activeBottomPanel === 'layers') setActiveBottomPanel(null);
              }}
              isMobileOpen={activeBottomPanel === 'layers'}
              teamACount={teamACount}
              teamBCount={teamBCount}
              unconfirmedCount={unconfirmedCount}
              layerOpacities={layerOpacities}
              onOpacityChange={handleOpacityChange}
              layerOrder={layerOrder}
              onReorderLayers={handleReorderLayers}
            />
          )}

          {/* Center Canvas */}
          <div className="flex-1 relative flex flex-col h-full bg-surface-canvas-void overflow-hidden transition-all duration-300">
            {/* Floating Panel Restorer / Reopen Buttons (Visible when collapsed on Desktop) */}
            {!isLeftPanelOpen && activeView !== 'manage_players' && (
              <button 
                className="hidden lg:flex absolute top-4 left-4 z-40 bg-surface-parchment/90 hover:bg-white text-primary px-3 py-2 rounded-lg border border-white/40 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md items-center gap-1.5 transition-all text-label-md font-bold" 
                id="left-panel-expand-btn" 
                onClick={() => setIsLeftPanelOpen(true)} 
                title="Expandir Camadas" 
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_right</span>
                <span className="text-xs uppercase tracking-wider">Layers</span>
              </button>
            )}
            {!isRightPanelOpen && activeView !== 'manage_players' && (
              <button 
                className="hidden lg:flex absolute top-4 right-4 z-40 bg-surface-parchment/90 hover:bg-white text-primary px-3 py-2 rounded-lg border border-white/40 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md items-center gap-1.5 transition-all text-label-md font-bold" 
                id="right-panel-expand-btn" 
                onClick={() => setIsRightPanelOpen(true)} 
                title="Expandir Dossiê da Entidade" 
                type="button"
              >
                <span className="text-xs uppercase tracking-wider">Dossiê</span>
                <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_left</span>
              </button>
            )}

            {activeView === 'manage_players' ? (
              <TeamAssignment />
            ) : (
              <>
                <div className="flex-1 relative cursor-crosshair overflow-hidden">
                  <MapGrid 
                    hudRightActions={
                      activeView === 'edit_map' && (
                        <div className="flex items-center gap-2">
                          {/* Sync Draft Button */}
                          <button 
                            onClick={handleSyncFromLive} 
                            className="group bg-inverse-surface/90 hover:bg-inverse-surface text-text-on-dark px-3 py-1.5 rounded-lg border border-white/15 flex items-center gap-2 transition-all hover:border-secondary-fixed/50" 
                            title="Sincronizar e carregar estado publicado da mesa" 
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px] text-primary-fixed-dim group-hover:rotate-180 transition-transform duration-300">sync</span>
                            <div className="flex flex-col text-left">
                              <span className="text-[11px] font-bold tracking-wider uppercase text-text-on-dark leading-none whitespace-nowrap" style={{ fontFamily: 'var(--font-montserrat)' }}>Sync Draft</span>
                              <span className="text-[9px] text-primary-fixed-dim leading-none mt-0.5 whitespace-nowrap" style={{ fontFamily: 'var(--font-montserrat)' }}>Última sinc. há 3m</span>
                            </div>
                          </button>
                          {/* Publish Map Button (Primary CTA) */}
                          <button 
                            onClick={handlePublish} 
                            className="group bg-faction-friendly hover:bg-chrome-hover text-text-on-dark px-3.5 py-1.5 rounded-lg border border-secondary-fixed/40 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 ring-1 ring-secondary-fixed/30 shadow-sm" 
                            title="Publicar alterações táticas para visualização dos delegados" 
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[19px] text-secondary-fixed group-hover:scale-110 transition-transform">cell_tower</span>
                            <div className="flex flex-col text-left">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[12px] font-bold tracking-wider uppercase text-text-on-dark leading-none whitespace-nowrap" style={{ fontFamily: 'var(--font-montserrat)' }}>Publicar Mapa</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed animate-ping"></span>
                              </div>
                              <span className="text-[9px] text-secondary-fixed uppercase leading-none mt-0.5 font-bold whitespace-nowrap" style={{ fontFamily: 'var(--font-montserrat)' }}>Deploy Live</span>
                            </div>
                          </button>
                        </div>
                      )
                    }
                    layers={layers}  
                    hiddenDynamicLayers={hiddenDynamicLayers}
                    hiddenPois={hiddenPois}
                    hiddenHazards={hiddenHazards}
                    units={activeUnits} 
                    selectedUnitId={selectedUnitId}
                    poisTable={poisTable}
                    hazardsTable={hazardsTable}
                    unitsTable={unitsTable}
                    isModerator={activeView === 'edit_map'}
                    role={role}
                    onUnitClick={handleUnitClick} 
                    onPOIClick={handlePOIClick}
                    onHazardClick={handleHazardClick}
                    isDraggable={() => activeView === 'edit_map'}
                    onUnitDrop={handleUnitDrop}
                    isPoiDraggable={() => activeView === 'edit_map'}
                    onPoiDrop={handlePoiDrop}
                    onSpawnUnitAt={handleSpawnUnitAt}
                    isDrawingMode={isDrawingHazard && activeView === 'edit_map'}
                    onDrawComplete={handleDrawComplete}
                    hideEditingTools={activeView === 'view_published'}
                    layerOpacities={layerOpacities}
                    onOpacityChange={handleOpacityChange}
                    layerOrder={layerOrder}
                  />
                </div>

                {/* Staging Tray Dock */}
                {activeView === 'edit_map' && (
                  <div className={`lg:relative lg:block lg:z-30 lg:w-full lg:bg-surface-parchment/90 lg:backdrop-blur-md lg:border-t lg:border-border-parchment lg:px-5 lg:py-3 lg:shadow-[0_-8px_24px_rgba(0,0,0,0.25)]
                    ${activeBottomPanel === 'reserves' ? 'absolute bottom-[80px] left-0 w-full z-30 bg-surface-parchment/95 backdrop-blur-md border-t border-border-parchment px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.25)]' : 'hidden lg:block'}`}>
                    <ReservesPanel 
                      units={reserveUnits} 
                      isDraggable={() => true} 
                      onUnitClick={handleUnitClick}
                      selectedUnitId={selectedUnitId}
                    />
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Right Panel */}
          {activeView !== 'manage_players' && (
            <aside className={`h-full flex flex-col bg-surface-parchment/95 backdrop-blur-md text-on-surface z-40 border-border-parchment transition-all duration-300 ease-in-out overflow-hidden absolute top-0 right-0 lg:relative ${activeBottomPanel === 'dossier' ? 'w-[280px] min-w-[280px] border-l shadow-[-4px_0_20px_rgba(0,0,0,0.12)]' : 'w-0 min-w-0 border-l-0 shadow-none'} ${!isRightPanelOpen ? 'lg:w-0 lg:min-w-0 lg:border-l-0 lg:shadow-none' : 'lg:w-[280px] lg:min-w-[280px] lg:border-l lg:shadow-[-4px_0_20px_rgba(0,0,0,0.12)]'}`}>

              <div className={`flex-1 flex flex-col overflow-hidden relative z-0 ${(!isRightPanelOpen && activeBottomPanel !== 'dossier') ? 'hidden' : 'block'}`}>

              {selectedHazard ? (
                <HazardPanel 
                  selectedHazard={selectedHazard}
                  onClose={() => { setIsRightPanelOpen(false); setActiveBottomPanel(null); }}
                  onSelectHazard={setSelectedHazard}
                  isModerator={activeView === 'edit_map'}
                  targetTable={hazardsTable}
                />
              ) : selectedPoi ? (
                <PoiPanel 
                  pois={[]} 
                  selectedPoi={selectedPoi} 
                  onClose={() => { setIsRightPanelOpen(false); setActiveBottomPanel(null); }} 
                  onSelectPoi={() => setSelectedPoi(null)} 
                  isModerator={activeView === 'edit_map'} 
                  targetTable={poisTable}
                />
              ) : (
                <UnitPanel 
                  units={units}
                  selectedUnit={selectedUnit} 
                  isModerator={activeView === 'edit_map'} 
                  onSelectUnit={setSelectedUnitId}
                  onClose={() => { setIsRightPanelOpen(false); setActiveBottomPanel(null); }} 
                  targetTable={unitsTable}
                  onDuplicateUnit={handleDuplicateUnit}
                />
              )}

              
              {pendingHazardPoints && (
                <HazardCreationModal 
                  pendingHazardPoints={pendingHazardPoints}
                  onClose={() => setPendingHazardPoints(null)}
                  table={hazardsTable}
                />
              )}
              </div>
            </aside>
          )}
          
          {/* Bottom Navbar for Mobile */}
          <BottomNavbar activePanel={activeBottomPanel} onTogglePanel={setActiveBottomPanel} />
        </div>
      </main>
      
      {spawnModalData && (
        <UnitCreationModal 
          table={unitsTable} 
          isModerator={activeView === 'edit_map'}
          initialCoordinates={{ x: spawnModalData.x, y: spawnModalData.y }}
          initialType={spawnModalData.templateType}
          onClose={() => setSpawnModalData(null)}
        />
      )}
    </div>
  );
}

