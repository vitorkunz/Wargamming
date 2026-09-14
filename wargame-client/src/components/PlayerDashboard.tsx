"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import MapGrid, { Unit, MapPOI, BattleHazard } from './MapGrid';
import Sidebar, { LayerVisibility } from './Sidebar';
import UnitCreation from './UnitCreation';
import ReservesPanel from './ReservesPanel';
import UnitPanel from './UnitPanel';
import PoiPanel from './PoiPanel';
import HazardPanel from './HazardPanel';

interface PlayerDashboardProps {
  role: string;
}

export default function PlayerDashboard({ role }: PlayerDashboardProps) {
  const [hiddenDynamicLayers, setHiddenDynamicLayers] = useState<string[]>([]);
  const [hiddenPois, setHiddenPois] = useState<string[]>([]);
  const [hiddenHazards, setHiddenHazards] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'planning' | 'battle'>('planning');
  const [layers, setLayers] = useState<LayerVisibility>({
    units: true,
    pois: true,
    hazards: true
  });
  
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

      if (e.ctrlKey && e.key === 'c') {
        if (selectedUnitId) {
          const unit = planningUnits.find(u => u.id === selectedUnitId);
          if (unit) setClipboard({ type: 'unit', data: unit });
        } else if (selectedPoi) {
          setClipboard({ type: 'poi', data: selectedPoi });
        } else if (selectedHazard) {
          setClipboard({ type: 'hazard', data: selectedHazard });
        }
      }

      if (e.ctrlKey && e.key === 'v' && clipboard) {
        if (clipboard.type === 'unit') {
          const u = clipboard.data as Unit;
          await supabase.from('Planning_Units').insert({
            ...u, id: undefined, created_at: undefined,
            x_coord: u.x_coord + 10, y_coord: u.y_coord + 10
          });
        } else if (clipboard.type === 'poi') {
          const p = clipboard.data as MapPOI;
          await supabase.from('Map_POIs').insert({
            ...p, id: undefined, created_at: undefined,
            x_coord: p.x_coord + 10, y_coord: p.y_coord + 10
          });
        } else if (clipboard.type === 'hazard') {
          const h = clipboard.data as BattleHazard;
          const offsetCoords = (h.coordinates as any[]).map(c => ({ x: c.x + 10, y: c.y + 10 }));
          await supabase.from('Battle_Hazards').insert({
            ...h, id: undefined, created_at: undefined,
            coordinates: offsetCoords
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, selectedUnitId, selectedPoi, selectedHazard, clipboard, planningUnits]);

  const handleSyncDraft = async () => {
    if (!confirm("Are you sure you want to sync your planning map from the live battle map? This will overwrite your current planned units!")) return;
    
    const { error: delError } = await supabase.from('Planning_Units').delete().eq('owner', role);
    if (delError) {
      alert("Failed to clear planning units: " + delError.message);
      return;
    }

    const { data: liveUnits, error: fetchError } = await supabase.from('Battle_Units').select('*').eq('owner', role);
    if (fetchError) {
      alert("Failed to fetch live units: " + fetchError.message);
      return;
    }

    if (liveUnits && liveUnits.length > 0) {
      const unitsToInsert = liveUnits.map(u => ({
        ...u,
        id: undefined, // Let Supabase generate a new ID for the planning copy
        created_at: undefined
      }));
      const { error: insertError } = await supabase.from('Planning_Units').insert(unitsToInsert);
      if (insertError) {
        alert("Failed to sync units: " + insertError.message);
      }
    }
  };

  const toggleLayer = (layer: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  useEffect(() => {
    const fetchPlanning = async () => {
      const { data } = await supabase.from('Planning_Units').select('*');
      if (data) setPlanningUnits(data as Unit[]);
    };
    
    const fetchBattle = async () => {
      const { data } = await supabase.from('Battle_Units').select('*').or(`owner.eq.${role},is_visible_to_enemy.eq.true`);
      if (data) setBattleUnits(data as Unit[]);
    };

    fetchPlanning();
    fetchBattle();

    const planChannel = supabase.channel('player-planning')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Planning_Units' }, (payload) => {
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
  };

  const handlePoiClick = (poi: MapPOI) => {
    setSelectedPoi(poi);
    setSelectedUnitId(null);
    setSelectedHazard(null);
  };

  const handleHazardClick = (hazard: BattleHazard) => {
    setSelectedHazard(hazard);
    setSelectedPoi(null);
    setSelectedUnitId(null);
  };

  const handleGridClick = async (x: number, y: number) => {
    if (activeTab !== 'planning') return;

    const { error } = await supabase.from('Planning_Units').insert({
      type: 'Infantry',
      owner: role,
      x_coord: x,
      y_coord: y,
      health: 100,
      is_visible_to_enemy: false,
      in_reserve: false
    });

    if (error) {
      alert("Failed to create unit: " + error.message);
    }
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

  const checkIsDraggable = (unit: Unit) => {
    if (activeTab === 'planning') return true; // Can drag own and enemy units in planning
    return unit.owner === role; // Can only drag own units in battle
  };

  const currentUnits = activeTab === 'planning' ? planningUnits : battleUnits;
  const activeUnits = currentUnits.filter(u => !u.in_reserve);
  const reserveUnits = currentUnits.filter(u => u.in_reserve && (activeTab === 'planning' || u.owner === role));
  const selectedUnit = currentUnits.find(u => u.id === selectedUnitId) || null;

  return (
    <div className="flex h-full w-full bg-slate-100 text-slate-800 relative overflow-hidden">
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
      />
      <main className="flex-1 p-8 overflow-auto flex flex-col items-center">
        
        <div className="mb-6 flex space-x-4">
          <button 
            className={`px-6 py-2 rounded-full font-bold shadow-md transition-colors ${activeTab === 'planning' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('planning')}
          >
            Planning Map
          </button>
          <button 
            className={`px-6 py-2 rounded-full font-bold shadow-md transition-colors ${activeTab === 'battle' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('battle')}
          >
            Battle Map
          </button>
        </div>

        <div className="w-full flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-700">{role} - {activeTab === 'planning' ? 'Planning Phase' : 'Active Battle'}</h1>
            <p className="text-slate-500">
              {activeTab === 'planning' 
                ? 'Spawn new units to reserve or click on the map to deploy Infantry. Drag and drop to reposition your units.' 
                : 'Viewing live battle data (your units and revealed enemy units).'}
            </p>
          </div>
          {activeTab === 'planning' && (
            <button 
              onClick={handleSyncDraft}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Sync Draft from Live</span>
            </button>
          )}
        </div>

        {activeTab === 'planning' && (
          <UnitCreation 
            table="Planning_Units" 
            title="Plan New Unit"
          />
        )}

        <ReservesPanel 
          units={reserveUnits} 
          isDraggable={checkIsDraggable} 
          onUnitClick={handleUnitClick}
        />

        <MapGrid 
          layers={layers}
          hiddenDynamicLayers={hiddenDynamicLayers} 
          hiddenPois={hiddenPois}
          hiddenHazards={hiddenHazards}
          units={activeUnits} 
          selectedUnitId={selectedUnitId}
          onGridClick={activeTab === 'planning' ? handleGridClick : undefined}
          isDraggable={checkIsDraggable}
          onUnitDrop={handleUnitDrop}
          onUnitClick={handleUnitClick}
          onPOIClick={handlePoiClick}
          onHazardClick={handleHazardClick}
        />
      </main>
      
      {selectedHazard ? (
        <HazardPanel
          selectedHazard={selectedHazard}
          onClose={() => setSelectedHazard(null)}
          onSelectHazard={setSelectedHazard}
          isModerator={false}
          targetTable="Battle_Hazards"
        />
      ) : selectedPoi ? (
        <PoiPanel 
          pois={[]} 
          selectedPoi={selectedPoi} 
          onClose={() => setSelectedPoi(null)} 
          onSelectPoi={() => setSelectedPoi(null)}
          isModerator={false} 
          targetTable="Map_POIs"
          role={role}
        />
      ) : (
        <UnitPanel 
          units={activeTab === 'planning' ? planningUnits : battleUnits} 
          selectedUnit={selectedUnit} 
          onClose={() => setSelectedUnitId(null)}
          onSelectUnit={setSelectedUnitId}
          isModerator={false}
          role={role}
          activeTab={activeTab}
        />
      )}
    </div>
  );
}
