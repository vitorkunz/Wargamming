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
  hiddenPois: string[];
  setHiddenPois: (ids: string[]) => void;
  hiddenHazards: string[];
  setHiddenHazards: (ids: string[]) => void;
  isModerator?: boolean;
  onEditPoi?: (poi: MapPOI) => void;
  onEditHazard?: (hazard: BattleHazard) => void;
  role?: string;
}

export default function Sidebar({ 
  layers, toggleLayer, 
  hiddenDynamicLayers, setHiddenDynamicLayers, 
  hiddenPois, setHiddenPois,
  hiddenHazards, setHiddenHazards,
  isModerator, onEditPoi, onEditHazard, role 
}: SidebarProps) {
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

  return (
    <aside className={`relative h-full flex flex-col bg-surface-parchment/95 backdrop-blur-md text-on-surface z-20 border-r border-border-parchment shadow-[4px_0_20px_rgba(0,0,0,0.12)] transition-all duration-300 ease-in-out overflow-hidden ${!isOpen ? 'w-12 min-w-12' : 'w-[300px] min-w-[300px]'}`}>
      
      {/* Header */}
      <div className="bg-primary-container p-3 flex items-center justify-between shadow-sm relative z-10 border-b border-white/10 shrink-0">
        {isOpen && (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-text-on-dark text-[20px]">layers</span>
            <h2 className="font-headline-sm text-text-on-dark uppercase tracking-wider font-bold">Cartografia</h2>
          </div>
        )}
        <button 
          className="p-1 rounded text-primary-fixed-dim hover:text-white hover:bg-white/10 transition-colors mx-auto" 
          onClick={() => setIsOpen(!isOpen)} 
          title="Recolher / Expandir"
        >
          <span className="material-symbols-outlined text-[18px]">{isOpen ? 'keyboard_double_arrow_left' : 'keyboard_double_arrow_right'}</span>
        </button>
      </div>

      <div className={`flex-1 overflow-y-auto p-4 space-y-5 text-on-surface custom-scrollbar relative z-0 ${!isOpen ? 'hidden' : 'block'}`}>
        
        {/* Seção: Elementos Táticos */}
        <div className="space-y-2.5">
          <h3 className="font-headline-sm text-primary uppercase font-bold tracking-wider border-b border-border-parchment pb-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">category</span>
            Elementos Táticos
          </h3>
          
          <div className="space-y-1.5 mt-2">
            <SidebarToggle 
              checked={layers.units}
              onChange={() => toggleLayer('units')}
              label="Unidades (ORBAT)"
              icon="military_tech"
              iconColor="text-secondary-fixed"
            />
            <SidebarToggle 
              checked={layers.hazards}
              onChange={() => toggleLayer('hazards')}
              label="Zonas de Perigo"
              icon="warning"
              iconColor="text-faction-hostile"
            />
            <SidebarToggle 
              checked={layers.pois}
              onChange={() => toggleLayer('pois')}
              label="Pontos Estratégicos"
              icon="location_on"
              iconColor="text-on-surface-variant"
            />
          </div>
        </div>

        {/* Dynamic Map Layers */}
        {isModerator ? (
          <div className="space-y-2.5 mt-5">
            <h3 className="font-headline-sm text-primary uppercase font-bold tracking-wider border-b border-border-parchment pb-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">map</span>
              Map Layers
            </h3>
            <div className="mt-2">
              <LayerManager 
                layers={dynamicLayers} 
                hiddenDynamicLayers={hiddenDynamicLayers}
                toggleLocalDynamic={toggleDynamic}
              />
            </div>
          </div>
        ) : (
          dynamicLayers.length > 0 && (
            <div className="space-y-2.5 mt-5">
              <h3 className="font-headline-sm text-primary uppercase font-bold tracking-wider border-b border-border-parchment pb-1 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">map</span>
                Map Layers
              </h3>
              <div className="space-y-1.5 mt-2">
                {dynamicLayers.map(layer => (
                  <SidebarToggle 
                    key={layer.id}
                    checked={!hiddenDynamicLayers.includes(layer.id) && layer.is_global_visible}
                    onChange={() => toggleDynamic(layer.id)}
                    label={layer.name}
                    icon="layers"
                    iconColor="text-primary"
                  />
                ))}
              </div>
            </div>
          )
        )}

        <div className="space-y-5 pt-4">
          {/* POIs List (Visible to all, actions restricted) */}
          <div>
            <h3 className="font-headline-sm text-primary uppercase font-bold tracking-wider border-b border-border-parchment pb-1 flex items-center gap-1.5 mb-2">
              <span className="material-symbols-outlined text-[16px]">location_on</span>
              Manage POIs
            </h3>
            {pois.length === 0 && <p className="text-xs text-on-surface-variant italic">No POIs active.</p>}
            <ul className="space-y-2">
              {pois.map(poi => {
                const canEdit = isModerator || (role && poi.owner === role);
                return (
                  <li key={poi.id} className="flex justify-between items-center bg-surface-card border border-border-parchment p-2 rounded-lg text-sm shadow-sm">
                    <span className="truncate flex-1 font-bold text-on-surface">{poi.name}</span>
                    <div className="flex gap-1.5 ml-2 items-center">
                      <label className="flex items-center space-x-1 cursor-pointer mr-1" title="Show Local">
                        <input 
                          type="checkbox" 
                          checked={!hiddenPois.includes(poi.id)} 
                          onChange={() => toggleLocalPoi(poi.id)}
                          className="w-3.5 h-3.5 rounded bg-surface-container border-border-parchment text-secondary-fixed focus:ring-secondary-fixed"
                        />
                      </label>
                      
                      {canEdit && onEditPoi && (
                        <button onClick={() => onEditPoi(poi)} className="text-primary hover:text-primary-fixed-dim" title="Edit POI">
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                      )}
                      
                      {canEdit && (
                        <button onClick={async () => {
                          if (confirm('Delete POI?')) await supabase.from('Map_POIs').delete().eq('id', poi.id);
                        }} className="text-status-alert hover:text-red-700" title="Delete POI">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          
          {/* Hazards List */}
          <div>
            <h3 className="font-headline-sm text-primary uppercase font-bold tracking-wider border-b border-border-parchment pb-1 flex items-center gap-1.5 mb-2">
              <span className="material-symbols-outlined text-[16px]">warning</span>
              Manage Hazards
            </h3>
            {hazards.length === 0 && <p className="text-xs text-on-surface-variant italic">No hazards active.</p>}
            <ul className="space-y-2">
              {hazards.map(hazard => {
                const canEdit = isModerator || (role && hazard.visible_to_teams.includes(role));
                return (
                  <li key={hazard.id} className="flex justify-between items-center bg-surface-card border border-border-parchment p-2 rounded-lg text-sm shadow-sm">
                    <div className="flex flex-col truncate flex-1">
                      <span className="font-bold text-on-surface">{hazard.label || hazard.hazard_type}</span>
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase mt-0.5">Vis: {hazard.visible_to_teams.join(', ')}</span>
                    </div>
                    <div className="flex gap-1.5 ml-2 items-center">
                      <label className="flex items-center space-x-1 cursor-pointer mr-1" title="Show Local">
                        <input 
                          type="checkbox" 
                          checked={!hiddenHazards.includes(hazard.id)} 
                          onChange={() => toggleLocalHazard(hazard.id)}
                          className="w-3.5 h-3.5 rounded bg-surface-container border-border-parchment text-faction-hostile focus:ring-faction-hostile"
                        />
                      </label>
                      {canEdit && onEditHazard && (
                        <button onClick={() => onEditHazard(hazard)} className="text-primary hover:text-primary-fixed-dim" title="Edit Hazard">
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={async () => {
                          if (confirm('Delete Hazard?')) await supabase.from('Battle_Hazards').delete().eq('id', hazard.id);
                        }} className="text-status-alert hover:text-red-700" title="Delete Hazard">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarToggle({ checked, onChange, label, icon, iconColor }: { checked: boolean, onChange: () => void, label: string, icon: string, iconColor: string }) {
  return (
    <label className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border group ${checked ? 'hover:bg-surface-parchment-dim border-transparent hover:border-border-parchment' : 'bg-surface-container border-border-parchment opacity-60'}`}>
      <div className="flex items-center gap-2.5">
        <span className={`material-symbols-outlined ${iconColor} text-[18px] group-hover:scale-110 transition-transform`}>{icon}</span>
        <span className={`font-label-md text-[13px] font-bold ${checked ? 'text-on-surface' : 'text-on-surface-variant'}`}>{label}</span>
      </div>
      <div className={`relative inline-block w-8 rounded-full h-4 transition-colors border ${checked ? 'bg-primary border-transparent' : 'bg-surface-dim border-outline-variant'}`}>
        <input type="checkbox" className="opacity-0 w-0 h-0" checked={checked} onChange={onChange} />
        <span className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform ${checked ? 'right-0.5 bg-white' : 'left-0.5 bg-on-surface-variant'}`}></span>
      </div>
    </label>
  );
}
