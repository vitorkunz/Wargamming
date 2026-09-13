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

  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<MapPOI | null>(null);
  const [selectedHazard, setSelectedHazard] = useState<BattleHazard | null>(null);
  
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
      const { data, error } = await supabase.from('Battle_Units').select('*');
      if (!error && data) setUnits(data as Unit[]);
    };
    fetchUnits();

    const channel = supabase
      .channel('mod-battle-units')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Battle_Units' }, (payload) => {
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
  }, []);

  // Removed duplicate handleUnitClick

  // Drag Drop -> Move any unit on the Battle Map (and take it out of reserve)
  const handleUnitDrop = async (unitId: string, x: number, y: number) => {
    // Optimistically update UI
    setUnits(prev => prev.map(u => u.id === unitId ? { ...u, x_coord: x, y_coord: y, in_reserve: false } : u));

    const { error } = await supabase
      .from('Battle_Units')
      .update({ x_coord: x, y_coord: y, in_reserve: false })
      .eq('id', unitId);

    if (error) {
      console.error("Failed to move unit:", error);
      alert("Failed to move unit. Check RLS policies.");
    }
  };

  const handlePoiDrop = async (poiId: string, x: number, y: number) => {
    // We don't have pois in ModeratorDashboard state (MapGrid fetches them)
    // but the db update will trigger the realtime subscription to re-render in MapGrid.
    const { error } = await supabase
      .from('Map_POIs')
      .update({ x_coord: x, y_coord: y })
      .eq('id', poiId);

    if (error) {
      console.error("Failed to move POI:", error);
      alert("Failed to move POI: " + error.message);
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
        
        <TeamAssignment />
        <UnitCreation />
        <HazardCreation 
          isDrawingHazard={isDrawingHazard}
          setIsDrawingHazard={setIsDrawingHazard}
          pendingHazardPoints={pendingHazardPoints}
          setPendingHazardPoints={setPendingHazardPoints}
        />
        <PoiCreation />
        
        <ReservesPanel 
          units={reserveUnits} 
          isDraggable={() => true} 
          onUnitClick={handleUnitClick}
        />

        <MapGrid 
          layers={layers}  
          hiddenDynamicLayers={hiddenDynamicLayers}
          units={activeUnits} 
          selectedUnitId={selectedUnitId}
          onUnitClick={handleUnitClick} 
          onPOIClick={handlePOIClick}
          onHazardClick={handleHazardClick}
          isDraggable={() => true} // Mod can drag any unit
          onUnitDrop={handleUnitDrop}
          isPoiDraggable={() => true} // Mod can drag any POI
          onPoiDrop={handlePoiDrop}
          isDrawingMode={isDrawingHazard}
          onDrawComplete={handleDrawComplete}
        />
      </main>
      
      {selectedHazard ? (
        <HazardPanel 
          selectedHazard={selectedHazard}
          onClose={() => setSelectedHazard(null)}
          onSelectHazard={setSelectedHazard}
          isModerator={true}
        />
      ) : selectedPoi ? (
        <PoiPanel 
          pois={[]} 
          selectedPoi={selectedPoi} 
          onClose={() => setSelectedPoi(null)} 
          onSelectPoi={() => setSelectedPoi(null)} 
          isModerator={true} 
        />
      ) : (
        <UnitPanel 
          units={units}
          selectedUnit={selectedUnit} 
          isModerator={true} 
          onSelectUnit={setSelectedUnitId}
          onClose={() => {}} 
        />
      )}
    </div>
  );
}
