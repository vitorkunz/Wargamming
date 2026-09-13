"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { MapLayer } from './LayerManager'; 
import LayerManager from './LayerManager';
import { MapPOI, BattleHazard } from './MapGrid';

export interface LayerVisibility {
  units: boolean;
  pois: boolean;
  hazards: boolean;
}

interface SidebarProps {
  layers: LayerVisibility;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  hiddenDynamicLayers: string[];
  setHiddenDynamicLayers: (ids: string[]) => void;
  isModerator?: boolean;
  onEditPoi?: (poi: MapPOI) => void;
  onEditHazard?: (hazard: BattleHazard) => void;
}

export default function Sidebar({ layers, toggleLayer, hiddenDynamicLayers, setHiddenDynamicLayers, isModerator, onEditPoi, onEditHazard }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [dynamicLayers, setDynamicLayers] = useState<MapLayer[]>([]);

  const [pois, setPois] = useState<MapPOI[]>([]);
  const [hazards, setHazards] = useState<BattleHazard[]>([]);

  useEffect(() => {
    const fetchLayers = async () => {
      const { data } = await supabase.from('Map_Layers').select('*').order('z_index', { ascending: false });
      if (data) setDynamicLayers(data as MapLayer[]);
    };

    const fetchPois = async () => {
      const { data } = await supabase.from('Map_POIs').select('*');
      if (data) setPois(data as MapPOI[]);
    };

    const fetchHazards = async () => {
      const { data } = await supabase.from('Battle_Hazards').select('*');
      if (data) setHazards(data as BattleHazard[]);
    };

    fetchLayers();
    if (isModerator) {
      fetchPois();
      fetchHazards();
    }

    const layerChannel = supabase.channel('sidebar-map-layers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Map_Layers' }, () => fetchLayers())
      .subscribe();

    let poiChannel: any = null;
    let hazardChannel: any = null;

    if (isModerator) {
      poiChannel = supabase.channel('sidebar-map-pois')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'Map_POIs' }, () => fetchPois())
        .subscribe();
      hazardChannel = supabase.channel('sidebar-map-hazards')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'Battle_Hazards' }, () => fetchHazards())
        .subscribe();
    }

    return () => {
      supabase.removeChannel(layerChannel);
      if (poiChannel) supabase.removeChannel(poiChannel);
      if (hazardChannel) supabase.removeChannel(hazardChannel);
    };
  }, [isModerator]);

  const toggleDynamic = (id: string) => {
    if (hiddenDynamicLayers.includes(id)) {
      setHiddenDynamicLayers(hiddenDynamicLayers.filter(l => l !== id));
    } else {
      setHiddenDynamicLayers([...hiddenDynamicLayers, id]);
    }
  };

  if (!isOpen) {
    return (
      <aside className="w-12 bg-slate-800 text-white flex flex-col items-center py-4 shadow-xl transition-all duration-300 z-50 shrink-0 h-full">
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          title="Open Control Panel"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-slate-800 text-white p-5 flex flex-col shadow-xl relative transition-all duration-300 z-50 shrink-0 h-full overflow-hidden">
      <button 
        onClick={() => setIsOpen(false)}
        className="absolute top-5 right-4 p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
        title="Hide Control Panel"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      </button>

      <h2 className="text-xl font-bold mb-6 border-b border-slate-600 pb-2 pr-8 shrink-0">Control Panel</h2>
      
      <div className="overflow-y-auto flex-1 pr-2 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Map Features</h3>
          <div className="space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input type="checkbox" checked={layers.pois} onChange={() => toggleLayer('pois')} className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-yellow-500 focus:ring-yellow-500" />
              <span className="font-medium">Points of Interest</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input type="checkbox" checked={layers.hazards} onChange={() => toggleLayer('hazards')} className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-orange-500 focus:ring-orange-500" />
              <span className="font-medium">Hazards (Mines, Floods)</span>
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Core View</h3>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={layers.units} 
              onChange={() => toggleLayer('units')}
              className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-red-500 focus:ring-red-500"
            />
            <span className="font-medium">Show Units</span>
          </label>
        </div>

        {isModerator ? (
          <div className="space-y-6 border-t border-slate-600 pt-4">
             <LayerManager 
                layers={dynamicLayers} 
                hiddenDynamicLayers={hiddenDynamicLayers}
                toggleLocalDynamic={toggleDynamic}
             />

             {/* Moderator POIs List */}
             <div>
               <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Manage POIs</h3>
               {pois.length === 0 && <p className="text-xs text-slate-500">No POIs active.</p>}
               <ul className="space-y-2">
                 {pois.map(poi => (
                   <li key={poi.id} className="flex justify-between items-center bg-slate-700 p-2 rounded text-sm">
                     <span className="truncate flex-1 font-medium">{poi.name}</span>
                     <div className="flex gap-2 ml-2">
                       {onEditPoi && (
                         <button onClick={() => onEditPoi(poi)} className="text-blue-400 hover:text-blue-300" title="Edit POI">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                           </svg>
                         </button>
                       )}
                       <button onClick={async () => {
                         if (confirm('Delete POI?')) await supabase.from('Map_POIs').delete().eq('id', poi.id);
                       }} className="text-red-400 hover:text-red-300" title="Delete POI">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                         </svg>
                       </button>
                     </div>
                   </li>
                 ))}
               </ul>
             </div>

             {/* Moderator Hazards List */}
             <div>
               <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Manage Hazards</h3>
               {hazards.length === 0 && <p className="text-xs text-slate-500">No hazards active.</p>}
               <ul className="space-y-2">
                 {hazards.map(hazard => (
                   <li key={hazard.id} className="flex justify-between items-center bg-slate-700 p-2 rounded text-sm">
                     <div className="flex flex-col truncate flex-1">
                       <span className="font-medium">{hazard.label || hazard.hazard_type}</span>
                       <span className="text-[10px] text-slate-400">Vis: {hazard.visible_to_teams.join(', ')}</span>
                     </div>
                     <div className="flex gap-2 ml-2 items-center">
                       {onEditHazard && (
                         <button onClick={() => onEditHazard(hazard)} className="text-orange-400 hover:text-orange-300" title="Edit Hazard">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                           </svg>
                         </button>
                       )}
                       <button onClick={async () => {
                         if (confirm('Delete Hazard?')) await supabase.from('Battle_Hazards').delete().eq('id', hazard.id);
                       }} className="text-red-400 hover:text-red-300" title="Delete Hazard">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                         </svg>
                       </button>
                     </div>
                   </li>
                 ))}
               </ul>
             </div>

          </div>
        ) : (
          dynamicLayers.length > 0 && (
            <div className="space-y-3 border-t border-slate-600 pt-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Map Layers</h3>
              {dynamicLayers.map(layer => (
                <label key={layer.id} className="flex items-center space-x-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={!hiddenDynamicLayers.includes(layer.id) && layer.is_global_visible} 
                    onChange={() => toggleDynamic(layer.id)}
                    disabled={!layer.is_global_visible}
                    className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500 disabled:opacity-50"
                  />
                  <span className={`font-medium ${!layer.is_global_visible ? 'text-slate-500 italic' : ''}`}>
                    {layer.name} {!layer.is_global_visible && '(Hidden by Mod)'}
                  </span>
                </label>
              ))}
            </div>
          )
        )}
      </div>
    </aside>
  );
}
