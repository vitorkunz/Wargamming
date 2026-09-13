"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { MapLayer } from './LayerManager'; 
import LayerManager from './LayerManager';

export interface LayerVisibility {
  units: boolean;
}

interface SidebarProps {
  layers: LayerVisibility;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  hiddenDynamicLayers: string[];
  setHiddenDynamicLayers: (ids: string[]) => void;
  isModerator?: boolean;
}

export default function Sidebar({ layers, toggleLayer, hiddenDynamicLayers, setHiddenDynamicLayers, isModerator }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [dynamicLayers, setDynamicLayers] = useState<MapLayer[]>([]);

  useEffect(() => {
    const fetchLayers = async () => {
      const { data } = await supabase.from('Map_Layers').select('*').order('z_index', { ascending: false });
      if (data) setDynamicLayers(data as MapLayer[]);
    };

    fetchLayers();
    const channel = supabase.channel('sidebar-map-layers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Map_Layers' }, () => {
        fetchLayers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
          <div className="border-t border-slate-600 pt-4">
             <LayerManager 
                layers={dynamicLayers} 
                hiddenDynamicLayers={hiddenDynamicLayers}
                toggleLocalDynamic={toggleDynamic}
             />
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
