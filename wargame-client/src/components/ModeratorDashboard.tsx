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

export default function ModeratorDashboard() {
  const [hiddenDynamicLayers, setHiddenDynamicLayers] = useState<string[]>([]);
  const [layers, setLayers] = useState<LayerVisibility>({
    units: true,
    pois: true,
    hazards: true
  });

  const [activeView, setActiveView] = useState<'draft' | 'published'>('draft');

  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<MapPOI | null>(null);
  const [selectedHazard, setSelectedHazard] = useState<BattleHazard | null>(null);
  
  const [isDrawingHazard, setIsDrawingHazard] = useState(false);
  const [pendingHazardPoints, setPendingHazardPoints] = useState<{x:number, y:number}[] | null>(null);

  const unitsTable = activeView === 'draft' ? 'Moderator_Units' : 'Battle_Units';
  const poisTable = activeView === 'draft' ? 'Moderator_POIs' : 'Map_POIs';
  const hazardsTable = activeView === 'draft' ? 'Moderator_Hazards' : 'Battle_Hazards';

  const handleDrawComplete = (points: {x:number, y:number}[]) => {
    setPendingHazardPoints(points);
    setIsDrawingHazard(false);
  };

  const handlePOIClick = (poi: MapPOI) => {
    setSelectedPoi(poi);
    setSelectedUnitId(null);
    setSelectedHazard(null);
  };

  const handleHazardClick = (hazard: BattleHazard) => {
    setSelectedHazard(hazard);
    setSelectedPoi(null);
    setSelectedUnitId(null);
  };

  const handleUnitClick = (unit: Unit) => {
    setSelectedUnitId(unit.id);
    setSelectedPoi(null);
    setSelectedHazard(null);
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

  // Removed duplicate handleUnitClick

  // Drag Drop -> Move any unit on the map (and take it out of reserve)
  const handleUnitDrop = async (unitId: string, x: number, y: number) => {
    if (activeView === 'published') return; // Read-only
    // Optimistically update UI
    setUnits(prev => prev.map(u => u.id === unitId ? { ...u, x_coord: x, y_coord: y, in_reserve: false } : u));

    const { error } = await supabase
      .from(unitsTable)
      .update({ x_coord: x, y_coord: y, in_reserve: false })
      .eq('id', unitId);

    if (error) {
      console.error("Failed to move unit:", error);
      alert("Failed to move unit. Check RLS policies.");
    }
  };

  const handlePoiDrop = async (poiId: string, x: number, y: number) => {
    if (activeView === 'published') return; // Read-only
    // We don't have pois in ModeratorDashboard state (MapGrid fetches them)
    // but the db update will trigger the realtime subscription to re-render in MapGrid.
    const { error } = await supabase
      .from(poisTable)
      .update({ x_coord: x, y_coord: y })
      .eq('id', poiId);

    if (error) {
      console.error("Failed to move POI:", error);
      alert("Failed to move POI: " + error.message);
    }
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

  return (
    <div className="flex h-full w-full bg-slate-100 text-slate-800 relative overflow-hidden">
      <Sidebar 
        layers={layers} 
        toggleLayer={toggleLayer} 
        hiddenDynamicLayers={hiddenDynamicLayers}
        setHiddenDynamicLayers={setHiddenDynamicLayers}
        isModerator={true}
        onEditPoi={handlePOIClick}
        onEditHazard={handleHazardClick}
      />
      <main className="flex-1 p-8 overflow-auto flex flex-col items-center">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-purple-700">Moderator Dashboard</h1>
          <p className="text-slate-500">Assign players, manage units, and control the fog of war.</p>
        </div>

        <div className="mb-6 flex flex-col items-center gap-4">
          <div className="flex space-x-4 bg-white p-1 rounded-full shadow-md">
            <button 
              className={`px-6 py-2 rounded-full font-bold transition-colors ${activeView === 'draft' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setActiveView('draft')}
            >
              Draft Map
            </button>
            <button 
              className={`px-6 py-2 rounded-full font-bold transition-colors ${activeView === 'published' ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setActiveView('published')}
            >
              Published Map
            </button>
          </div>
          
          <div className="flex space-x-4">
            {activeView === 'draft' && (
              <button onClick={handlePublish} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded shadow-md flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Publish Draft to Live
              </button>
            )}
            <button onClick={handleSyncFromLive} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-6 rounded shadow-md flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Sync Draft from Live
            </button>
          </div>
        </div>

        {activeView === 'draft' && (
          <>
            <TeamAssignment />
            <UnitCreation table={unitsTable} />
            <HazardCreation 
              isDrawingHazard={isDrawingHazard}
              setIsDrawingHazard={setIsDrawingHazard}
              pendingHazardPoints={pendingHazardPoints}
              setPendingHazardPoints={setPendingHazardPoints}
              table={hazardsTable}
            />
            <PoiCreation table={poisTable} />
          </>
        )}
        
        <ReservesPanel 
          units={reserveUnits} 
          isDraggable={() => activeView === 'draft'} 
          onUnitClick={handleUnitClick}
        />

        <MapGrid 
          layers={layers}  
          hiddenDynamicLayers={hiddenDynamicLayers}
          units={activeUnits} 
          selectedUnitId={selectedUnitId}
          poisTable={poisTable}
          hazardsTable={hazardsTable}
          onUnitClick={handleUnitClick} 
          onPOIClick={handlePOIClick}
          onHazardClick={handleHazardClick}
          isDraggable={() => activeView === 'draft'} // Only drag in draft
          onUnitDrop={handleUnitDrop}
          isPoiDraggable={() => activeView === 'draft'} // Only drag in draft
          onPoiDrop={handlePoiDrop}
          isDrawingMode={isDrawingHazard && activeView === 'draft'}
          onDrawComplete={handleDrawComplete}
        />
      </main>
      
      {selectedHazard ? (
        <HazardPanel 
          selectedHazard={selectedHazard}
          onClose={() => setSelectedHazard(null)}
          onSelectHazard={setSelectedHazard}
          isModerator={activeView === 'draft'}
          targetTable={hazardsTable}
        />
      ) : selectedPoi ? (
        <PoiPanel 
          pois={[]} 
          selectedPoi={selectedPoi} 
          onClose={() => setSelectedPoi(null)} 
          onSelectPoi={() => setSelectedPoi(null)} 
          isModerator={activeView === 'draft'} 
          targetTable={poisTable}
        />
      ) : (
        <UnitPanel 
          units={units}
          selectedUnit={selectedUnit} 
          isModerator={activeView === 'draft'} 
          onSelectUnit={setSelectedUnitId}
          onClose={() => {}} 
          targetTable={unitsTable}
        />
      )}
    </div>
  );
}
