"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import MapGrid, { Unit } from './MapGrid';
import Sidebar, { LayerVisibility } from './Sidebar';
import ReservesPanel from './ReservesPanel';
import UnitPanel from './UnitPanel';

interface PlayerDashboardProps {
  role: 'Player A' | 'Player B';
}

export default function PlayerDashboard({ role }: PlayerDashboardProps) {
  const [hiddenDynamicLayers, setHiddenDynamicLayers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'planning' | 'battle'>('planning');
  const [layers, setLayers] = useState<LayerVisibility>({
    units: true
  });

  const [planningUnits, setPlanningUnits] = useState<Unit[]>([]);
  const [battleUnits, setBattleUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const toggleLayer = (layer: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  useEffect(() => {
    const fetchPlanning = async () => {
      const { data } = await supabase.from('Planning_Units').select('*').eq('owner', role);
      if (data) setPlanningUnits(data as Unit[]);
    };
    
    const fetchBattle = async () => {
      const { data } = await supabase.from('Battle_Units').select('*').or(`owner.eq.${role},is_visible_to_enemy.eq.true`);
      if (data) setBattleUnits(data as Unit[]);
    };

    fetchPlanning();
    fetchBattle();

    const planChannel = supabase.channel('player-planning')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Planning_Units', filter: `owner=eq.${role}` }, (payload) => {
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
  };

  const handleGridClick = async (x: number, y: number) => {
    if (activeTab !== 'planning') return;

    const { error } = await supabase.from('Planning_Units').insert({
      type: 'Infantry',
      owner: role,
      x_coord: x,
      y_coord: y,
      health: 100,
      in_reserve: false
    });

    if (error) {
      console.error("Failed to insert planning unit", error);
      alert("Failed to create unit. Check RLS policies.");
    }
  };

  const handleUnitDrop = async (unitId: string, x: number, y: number) => {
    if (activeTab === 'planning') {
      setPlanningUnits(prev => prev.map(u => u.id === unitId ? { ...u, x_coord: x, y_coord: y, in_reserve: false } : u));
      const { error } = await supabase
        .from('Planning_Units')
        .update({ x_coord: x, y_coord: y, in_reserve: false })
        .eq('id', unitId)
        .eq('owner', role);

      if (error) alert("Failed to move planning unit.");
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
    return unit.owner === role; // Can drag own units on either map
  };

  const currentUnits = activeTab === 'planning' ? planningUnits : battleUnits;
  const activeUnits = currentUnits.filter(u => !u.in_reserve);
  const reserveUnits = currentUnits.filter(u => u.in_reserve && u.owner === role); // Only own reserves
  const selectedUnit = currentUnits.find(u => u.id === selectedUnitId) || null;

  return (
    <div className="flex h-full w-full bg-slate-100 text-slate-800 relative overflow-hidden">
      <Sidebar 
        layers={layers} 
        toggleLayer={toggleLayer}
        hiddenDynamicLayers={hiddenDynamicLayers}
        setHiddenDynamicLayers={setHiddenDynamicLayers}
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

        <div className="mb-4 text-center">
          <h1 className="text-3xl font-bold text-slate-700">{role} - {activeTab === 'planning' ? 'Planning Phase' : 'Active Battle'}</h1>
          <p className="text-slate-500">
            {activeTab === 'planning' 
              ? 'Click to deploy Infantry. Drag and drop to reposition your units.' 
              : 'Viewing live battle data (your units and revealed enemy units).'}
          </p>
        </div>

        <ReservesPanel 
          units={reserveUnits} 
          isDraggable={checkIsDraggable} 
          onUnitClick={handleUnitClick}
        />

        <MapGrid 
          layers={layers}
          hiddenDynamicLayers={hiddenDynamicLayers} 
          units={activeUnits} 
          onGridClick={activeTab === 'planning' ? handleGridClick : undefined}
          isDraggable={checkIsDraggable}
          onUnitDrop={handleUnitDrop}
          onUnitClick={handleUnitClick}
        />
      </main>
      
      <UnitPanel 
        units={currentUnits}
        selectedUnit={selectedUnit} 
        isModerator={false} 
        onSelectUnit={setSelectedUnitId}
        onClose={() => {}} 
        role={role}
      />
    </div>
  );
}
