"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import MapGrid, { Unit } from './MapGrid';
import Sidebar, { LayerVisibility } from './Sidebar';
import TeamAssignment from './TeamAssignment';
import UnitCreation from './UnitCreation';
import HazardCreation from './HazardCreation';
import PoiCreation from './PoiCreation';
import ReservesPanel from './ReservesPanel';
import UnitPanel from './UnitPanel';
import PoiPanel from './PoiPanel';
import HazardPanel from './HazardPanel';
import { MapPOI, BattleHazard } from './MapGrid';
import TopBar from './ui/TopBar';
import Panel from './ui/Panel';

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

  const [activeView, setActiveView] = useState<'edit_map' | 'view_published' | 'manage_players'>('edit_map');
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<MapPOI | null>(null);
  const [selectedHazard, setSelectedHazard] = useState<BattleHazard | null>(null);
  
  const [clipboard, setClipboard] = useState<{ type: 'unit' | 'poi' | 'hazard', data: any } | null>(null);

  const unitsTable = activeView === 'edit_map' ? 'Moderator_Units' : 'Battle_Units';
  const poisTable = activeView === 'edit_map' ? 'Moderator_POIs' : 'Map_POIs';
  const hazardsTable = activeView === 'edit_map' ? 'Moderator_Hazards' : 'Battle_Hazards';

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (activeView !== 'edit_map') return;
      
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

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
  }, [activeView, selectedUnitId, selectedPoi, selectedHazard, unitsTable, poisTable, hazardsTable]);

  const [isDrawingHazard, setIsDrawingHazard] = useState(false);
  const [pendingHazardPoints, setPendingHazardPoints] = useState<{x:number, y:number}[] | null>(null);

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

    const channel = supabase
      .channel(`mod-units-${unitsTable}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: unitsTable }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setUnits((prev) => [...prev, payload.new as Unit]);
        } else if (payload.eventType === 'UPDATE') {
          setUnits((prev) => prev.map(u => (u.id === payload.new.id ? (payload.new as Unit) : u)));
        } else if (payload.eventType === 'DELETE') {
          setUnits((prev) => prev.filter(u => u.id !== payload.old.id));
          setSelectedUnitId(prevId => prevId === payload.old.id ? null : prevId);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [unitsTable]);

  const handleUnitDrop = async (unitId: string, x: number, y: number) => {
    if (activeView === 'view_published') return;
    setUnits(prev => prev.map(u => u.id === unitId ? { ...u, x_coord: x, y_coord: y, in_reserve: false } : u));
    await supabase.from(unitsTable).update({ x_coord: x, y_coord: y, in_reserve: false }).eq('id', unitId);
  };

  const handlePoiDrop = async (poiId: string, x: number, y: number) => {
    if (activeView === 'view_published') return;
    await supabase.from(poisTable).update({ x_coord: x, y_coord: y }).eq('id', poiId);
  };

  const handleSpawnUnitAt = async (templateType: string, x: number, y: number) => {
    if (activeView === 'view_published') return;
    const newUnit = {
      name: `New ${templateType.toUpperCase()}`,
      owner: 'Player A',
      unit_type: templateType,
      health: 100,
      in_reserve: false,
      x_coord: x,
      y_coord: y
    };
    await supabase.from(unitsTable).insert([newUnit]);
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
      if (error) alert("Failed to sync map: " + error.message);
      else alert("Draft map synced from live successfully!");
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
            Manage Players
          </button>
          <button 
            className={`font-label-md text-label-md px-space-md py-space-xs transition-colors rounded-lg ${activeView === 'edit_map' ? 'bg-surface-card text-primary font-bold shadow-[0_1px_4px_rgba(0,75,65,0.2)]' : 'text-text-on-dark hover:bg-chrome-hover'}`}
            onClick={() => setActiveView('edit_map')}
          >
            Edit Map
          </button>
          <button 
            className={`font-label-md text-label-md px-space-md py-space-xs transition-colors rounded-lg ${activeView === 'view_published' ? 'bg-surface-card text-primary font-bold shadow-[0_1px_4px_rgba(0,75,65,0.2)]' : 'text-text-on-dark hover:bg-chrome-hover'}`}
            onClick={() => setActiveView('view_published')}
          >
            View Published Map
          </button>
        </nav>
      </TopBar>

      <main className="relative pt-16 w-full h-screen bg-surface-canvas-void flex flex-col">
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
              onEditPoi={handlePOIClick}
              onEditHazard={handleHazardClick}
              isOpen={isLeftPanelOpen}
              onToggleOpen={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
              teamACount={teamACount}
              teamBCount={teamBCount}
              unconfirmedCount={unconfirmedCount}
            />
          )}

          {/* Center Canvas */}
          <div className="flex-1 relative flex flex-col h-full bg-surface-canvas-void overflow-hidden transition-all duration-300">
            {/* Floating Panel Restorer / Reopen Buttons (Visible when collapsed) */}
            {!isLeftPanelOpen && activeView !== 'manage_players' && (
              <button 
                className="absolute top-4 left-4 z-40 bg-surface-parchment/90 hover:bg-white text-primary px-3 py-2 rounded-lg border border-white/40 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md flex items-center gap-1.5 transition-all text-label-md font-bold" 
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
                className="absolute top-4 right-4 z-40 bg-surface-parchment/90 hover:bg-white text-primary px-3 py-2 rounded-lg border border-white/40 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md flex items-center gap-1.5 transition-all text-label-md font-bold" 
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
              <div className="p-8 w-full h-full overflow-y-auto bg-surface-parchment text-on-surface">
                <h1 className="text-3xl font-bold text-primary mb-6 font-display-lg">Manage Players</h1>
                <TeamAssignment />
              </div>
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
                  />
                </div>

                {/* Staging Tray Dock */}
                {activeView === 'edit_map' && (
                  <div className="relative z-30 w-full bg-surface-parchment/90 backdrop-blur-md border-t border-border-parchment px-5 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.25)]">
                    <ReservesPanel 
                      units={reserveUnits} 
                      isDraggable={() => true} 
                      onUnitClick={handleUnitClick}
                    />
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Right Panel */}
          {activeView !== 'manage_players' && (
            <aside className={`relative h-full flex flex-col bg-surface-parchment/95 backdrop-blur-md text-on-surface z-20 border-l border-border-parchment shadow-[-4px_0_20px_rgba(0,0,0,0.12)] transition-all duration-300 ease-in-out overflow-hidden ${!isRightPanelOpen ? 'w-0 min-w-0 border-l-0' : 'w-[280px] min-w-[280px]'}`}>

              <div className={`flex-1 flex flex-col overflow-hidden relative z-0 ${!isRightPanelOpen ? 'hidden' : 'block'}`}>

              {selectedHazard ? (
                <HazardPanel 
                  selectedHazard={selectedHazard}
                  onClose={() => setIsRightPanelOpen(false)}
                  onSelectHazard={setSelectedHazard}
                  isModerator={activeView === 'edit_map'}
                  targetTable={hazardsTable}
                />
              ) : selectedPoi ? (
                <PoiPanel 
                  pois={[]} 
                  selectedPoi={selectedPoi} 
                  onClose={() => setIsRightPanelOpen(false)} 
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
                  onClose={() => setIsRightPanelOpen(false)} 
                  targetTable={unitsTable}
                />
              )}
              
              {activeView === 'edit_map' && !selectedHazard && !selectedPoi && !selectedUnitId && (
                <div className="flex-1 overflow-y-auto p-4 border-t border-border-parchment mt-4 space-y-4">
                  <h3 className="font-headline-sm text-primary uppercase">Quick Actions</h3>
                  <UnitCreation table={unitsTable} />
                  <PoiCreation table={poisTable} />
                  <HazardCreation 
                    isDrawingHazard={isDrawingHazard}
                    setIsDrawingHazard={setIsDrawingHazard}
                    pendingHazardPoints={pendingHazardPoints}
                    setPendingHazardPoints={setPendingHazardPoints}
                    table={hazardsTable}
                  />
                </div>
              )}
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}

