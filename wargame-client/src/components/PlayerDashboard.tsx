"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import MapGrid, { Unit, MapPOI, BattleHazard } from './MapGrid';
import Sidebar, { LayerVisibility } from './Sidebar';
import UnitCreationModal from './UnitCreationModal';
import ReservesPanel from './ReservesPanel';
import UnitPanel from './UnitPanel';
import PoiPanel from './PoiPanel';
import HazardPanel from './HazardPanel';
import TopBar from './ui/TopBar';
import BottomNavbar, { BottomPanelType } from './BottomNavbar';

interface PlayerDashboardProps {
  userEmail: string;
  role: string;
  onSignOut: () => void;
}

export default function PlayerDashboard({ userEmail, role, onSignOut }: PlayerDashboardProps) {
  const [hiddenDynamicLayers, setHiddenDynamicLayers] = useState<string[]>([]);
  const [hiddenPois, setHiddenPois] = useState<string[]>([]);
  const [hiddenHazards, setHiddenHazards] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'planning' | 'battle'>('planning');
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [activeBottomPanel, setActiveBottomPanel] = useState<BottomPanelType>(null);
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
  
  const [layerOpacities, setLayerOpacities] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('wargame_layer_opacities');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading layer opacities from localStorage', e);
      }
    }
    return { baseMap: 1, tacticalGrid: 0.45 };
  });

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

  const [planningUnits, setPlanningUnits] = useState<Unit[]>([]);
  const [battleUnits, setBattleUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<MapPOI | null>(null);
  const [selectedHazard, setSelectedHazard] = useState<BattleHazard | null>(null);

  const [clipboard, setClipboard] = useState<{ type: 'unit' | 'poi' | 'hazard', data: any } | null>(null);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (activeTab !== 'planning') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedUnitId) {
          if (confirm('Delete unit?')) {
            await supabase.from('Planning_Units').delete().eq('id', selectedUnitId);
            setSelectedUnitId(null);
          }
        } else if (selectedPoi) {
          if (confirm('Delete POI?')) {
            await supabase.from('Map_POIs').delete().eq('id', selectedPoi.id);
            setSelectedPoi(null);
          }
        } else if (selectedHazard) {
          if (confirm('Delete Hazard?')) {
            await supabase.from('Battle_Hazards').delete().eq('id', selectedHazard.id);
            setSelectedHazard(null);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, selectedUnitId, selectedPoi, selectedHazard, planningUnits]);

  const handleSyncDraft = async () => {
    if (!confirm("Are you sure you want to sync your planning map from the live battle map? This will overwrite your current planned units!")) return;
    
    const { error: delError } = await supabase.from('Planning_Units').delete().eq('draft_owner', role);
    if (delError) {
      alert("Failed to clear planning units: " + delError.message);
      return;
    }

    const { data: liveUnits, error: fetchError } = await supabase.from('Battle_Units').select('*').or(`owner.eq.${role},is_visible_to_enemy.eq.true`);
    if (fetchError) {
      alert("Failed to fetch live units: " + fetchError.message);
      return;
    }

    if (liveUnits && liveUnits.length > 0) {
      const unitsToInsert = liveUnits.map(u => {
        const { id, created_at, is_visible_to_enemy, is_health_visible_to_enemy, ...rest } = u;
        return { ...rest, draft_owner: role };
      });
      const { error: insertError } = await supabase.from('Planning_Units').insert(unitsToInsert);
      if (insertError) {
        alert("Failed to sync units: " + insertError.message);
      } else {
        const { data } = await supabase.from('Planning_Units').select('*').eq('draft_owner', role);
        if (data) setPlanningUnits(data as Unit[]);
      }
    }
  };

  const toggleLayer = (layer: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  useEffect(() => {
    const fetchPlanning = async () => {
      const { data } = await supabase.from('Planning_Units').select('*').eq('draft_owner', role);
      if (data) setPlanningUnits(data as Unit[]);
    };
    
    const fetchBattle = async () => {
      const { data } = await supabase.from('Battle_Units').select('*').or(`owner.eq.${role},is_visible_to_enemy.eq.true`);
      if (data) setBattleUnits(data as Unit[]);
    };

    fetchPlanning();
    fetchBattle();

    const planChannel = supabase.channel('player-planning')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Planning_Units', filter: `draft_owner=eq.${role}` }, (payload) => {
        if (payload.eventType === 'INSERT') setPlanningUnits(p => [...p, payload.new as Unit]);
        if (payload.eventType === 'UPDATE') setPlanningUnits(p => p.map(u => u.id === payload.new.id ? payload.new as Unit : u));
        if (payload.eventType === 'DELETE') {
          setPlanningUnits(p => p.filter(u => u.id !== payload.old.id));
          setSelectedUnitId(prevId => prevId === payload.old.id ? null : prevId);
        }
      }).subscribe();

    const battleChannel = supabase.channel('player-battle')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Battle_Units' }, (payload) => {
        fetchBattle();
        if (payload.eventType === 'DELETE') {
          setSelectedUnitId(prevId => prevId === payload.old.id ? null : prevId);
        }
      }).subscribe();

    return () => {
      supabase.removeChannel(planChannel);
      supabase.removeChannel(battleChannel);
    };
  }, [role]);

  const handleUnitClick = (unit: Unit) => {
    setSelectedUnitId(unit.id);
    setSelectedPoi(null);
    setSelectedHazard(null);
    setIsRightPanelOpen(true);
  };

  const handlePoiClick = (poi: MapPOI) => {
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



  const handleUnitDrop = async (unitId: string, x: number, y: number) => {
    if (activeTab === 'planning') {
      setPlanningUnits(prev => prev.map(u => u.id === unitId ? { ...u, x_coord: x, y_coord: y, in_reserve: false } : u));
      const { error } = await supabase
        .from('Planning_Units')
        .update({ x_coord: x, y_coord: y, in_reserve: false })
        .eq('id', unitId);

      if (error) alert("Failed to move planning unit: " + error.message);
    } else {
      setBattleUnits(prev => prev.map(u => u.id === unitId ? { ...u, x_coord: x, y_coord: y, in_reserve: false } : u));
      const { error } = await supabase
        .from('Battle_Units')
        .update({ x_coord: x, y_coord: y, in_reserve: false })
        .eq('id', unitId)
        .eq('owner', role);

      if (error) alert("Failed to move battle unit.");
    }
  };

  const [spawnModalData, setSpawnModalData] = useState<{ templateType: string, x: number, y: number } | null>(null);

  const handleSpawnUnitAt = async (templateType: string, x: number, y: number) => {
    if (activeTab !== 'planning') return;
    setSpawnModalData({ templateType, x, y });
  };

  const checkIsDraggable = (unit: Unit) => {
    if (activeTab === 'planning') return true;
    return unit.owner === role;
  };

  const unitsTable = activeTab === 'planning' ? 'Planning_Units' : 'Battle_Units';
  const currentUnits = activeTab === 'planning' ? planningUnits : battleUnits;
  const activeUnits = currentUnits.filter(u => !u.in_reserve);
  const reserveUnits = currentUnits.filter(u => u.in_reserve && (activeTab === 'planning' || u.owner === role));
  const selectedUnit = currentUnits.find(u => u.id === selectedUnitId) || null;

  const teamACount = activeUnits.filter(u => u.owner === 'Player A').length;
  const teamBCount = activeUnits.filter(u => u.owner === 'Player B').length;
  const unconfirmedCount = activeUnits.filter(u => u.owner === 'Unknown').length;

  return (
    <div className="bg-surface-canvas-void font-body-base text-on-surface min-h-screen flex flex-col overflow-hidden">
      <TopBar userEmail={userEmail} role={role} onSignOut={onSignOut}>
        <nav className="bg-primary/90 px-space-xs py-space-xs rounded-lg flex items-center gap-space-xs shadow-inner border border-primary-fixed-dim/20">
          <button 
            className={`font-label-md text-label-md px-space-md py-space-xs transition-colors rounded-lg ${activeTab === 'planning' ? 'bg-surface-card text-primary font-bold shadow-[0_1px_4px_rgba(0,75,65,0.2)]' : 'text-text-on-dark hover:bg-chrome-hover'}`}
            onClick={() => setActiveTab('planning')}
          >
            Planning Map
          </button>
          <button 
            className={`font-label-md text-label-md px-space-md py-space-xs transition-colors rounded-lg ${activeTab === 'battle' ? 'bg-surface-card text-primary font-bold shadow-[0_1px_4px_rgba(0,75,65,0.2)]' : 'text-text-on-dark hover:bg-chrome-hover'}`}
            onClick={() => setActiveTab('battle')}
          >
            Battle Map
          </button>
        </nav>
      </TopBar>

      <main className="relative pt-[104px] lg:pt-16 w-full h-screen bg-surface-canvas-void flex flex-col">
        <div className="relative w-full h-full flex overflow-hidden bg-surface-canvas-void select-none">
          {/* Left Panel */}
          <Sidebar 
            layers={layers} 
            toggleLayer={toggleLayer}
            hiddenDynamicLayers={hiddenDynamicLayers}
            setHiddenDynamicLayers={setHiddenDynamicLayers}
            hiddenPois={hiddenPois}
            setHiddenPois={setHiddenPois}
            hiddenHazards={hiddenHazards}
            setHiddenHazards={setHiddenHazards}
            role={role}
            onEditPoi={handlePoiClick}
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
            activeTab={activeTab}
          />

          {/* Center Canvas */}
          <div className="flex-1 relative flex flex-col h-full bg-surface-canvas-void overflow-hidden transition-all duration-300">
            {/* Floating Panel Restorer / Reopen Buttons (Visible when collapsed) */}
            {!isLeftPanelOpen && (
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
            {!isRightPanelOpen && (
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

            <div className="flex-1 relative cursor-crosshair overflow-hidden">
              <MapGrid 
                hudRightActions={
                  activeTab === 'planning' && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleSyncDraft} 
                        className="group bg-inverse-surface/90 hover:bg-inverse-surface text-text-on-dark px-3 py-1.5 rounded-lg border border-white/15 flex items-center gap-2 transition-all hover:border-secondary-fixed/50" 
                        title="Sincronizar mapa de planejamento com mapa de batalha" 
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary-fixed-dim group-hover:rotate-180 transition-transform duration-300">sync</span>
                        <div className="flex flex-col text-left">
                          <span className="text-[11px] font-bold tracking-wider uppercase text-text-on-dark leading-none whitespace-nowrap" style={{ fontFamily: 'var(--font-montserrat)' }}>Sync Draft</span>
                          <span className="text-[9px] text-primary-fixed-dim leading-none mt-0.5 whitespace-nowrap" style={{ fontFamily: 'var(--font-montserrat)' }}>From Live</span>
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

                isDraggable={checkIsDraggable}
                onUnitDrop={handleUnitDrop}
                onUnitClick={handleUnitClick}
                onPOIClick={handlePoiClick}
                onHazardClick={handleHazardClick}
                onSpawnUnitAt={handleSpawnUnitAt}
                unitsTable={unitsTable}
                isModerator={false}
                fixedOwner={role === 'Player A' || role === 'Player B' ? role : undefined}
                role={role}
                hideEditingTools={activeTab === 'battle'}
                layerOpacities={layerOpacities}
                onOpacityChange={handleOpacityChange}
              />
            </div>

            {/* Staging Tray Dock */}
            <div className={`lg:relative lg:block lg:z-30 lg:w-full lg:bg-surface-parchment/90 lg:backdrop-blur-md lg:border-t lg:border-border-parchment lg:px-5 lg:py-3 lg:shadow-[0_-8px_24px_rgba(0,0,0,0.25)]
              ${activeBottomPanel === 'reserves' ? 'absolute bottom-[80px] left-0 w-full z-30 bg-surface-parchment/95 backdrop-blur-md border-t border-border-parchment px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.25)]' : 'hidden lg:block'}`}>
              <ReservesPanel 
                units={reserveUnits} 
                isDraggable={checkIsDraggable} 
                onUnitClick={handleUnitClick}
              />
            </div>
          </div>
          
          {/* Right Panel */}
          <aside className={`h-full flex flex-col bg-surface-parchment/95 backdrop-blur-md text-on-surface z-40 border-border-parchment transition-all duration-300 ease-in-out overflow-hidden absolute top-0 right-0 lg:relative ${activeBottomPanel === 'dossier' ? 'w-[280px] min-w-[280px] border-l shadow-[-4px_0_20px_rgba(0,0,0,0.12)]' : 'w-0 min-w-0 border-l-0 shadow-none'} ${!isRightPanelOpen ? 'lg:w-0 lg:min-w-0 lg:border-l-0 lg:shadow-none' : 'lg:w-[280px] lg:min-w-[280px] lg:border-l lg:shadow-[-4px_0_20px_rgba(0,0,0,0.12)]'}`}>

            <div className={`flex-1 flex flex-col overflow-hidden relative z-0 ${(!isRightPanelOpen && activeBottomPanel !== 'dossier') ? 'hidden' : 'block'}`}>
              {selectedHazard ? (
              <HazardPanel
                selectedHazard={selectedHazard}
                onClose={() => { setIsRightPanelOpen(false); setActiveBottomPanel(null); }}
                onSelectHazard={setSelectedHazard}
                isModerator={false}
                targetTable="Battle_Hazards"
              />
            ) : selectedPoi ? (
              <PoiPanel 
                pois={[]} 
                selectedPoi={selectedPoi} 
                onClose={() => { setIsRightPanelOpen(false); setActiveBottomPanel(null); }} 
                onSelectPoi={() => setSelectedPoi(null)}
                isModerator={false} 
                targetTable="Map_POIs"
                role={role}
              />
            ) : (
              <UnitPanel 
                units={activeTab === 'planning' ? planningUnits : battleUnits} 
                selectedUnit={selectedUnit} 
                onClose={() => { setIsRightPanelOpen(false); setActiveBottomPanel(null); }}
                onSelectUnit={setSelectedUnitId}
                isModerator={false}
                role={role}
                activeTab={activeTab}
              />
            )}

            </div>
          </aside>
          
          {/* Bottom Navbar for Mobile */}
          <BottomNavbar activePanel={activeBottomPanel} onTogglePanel={setActiveBottomPanel} />
        </div>
      </main>
      
      {spawnModalData && (
        <UnitCreationModal 
          table="Planning_Units" 
          draftOwner={role}
          isModerator={false}
          initialCoordinates={{ x: spawnModalData.x, y: spawnModalData.y }}
          initialType={spawnModalData.templateType}
          onClose={() => setSpawnModalData(null)}
        />
      )}
    </div>
  );
}
