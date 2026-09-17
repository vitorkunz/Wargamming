"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface MapLayer {
  id: string;
  name: string;
  image_url: string;
  z_index: number;
  is_global_visible: boolean;
}

interface LayerManagerProps {
  layers: MapLayer[];
  hiddenDynamicLayers: string[];
  toggleLocalDynamic: (id: string) => void;
  layerOpacities?: Record<string, number>;
  onOpacityChange?: (id: string, opacity: number) => void;
}

export default function LayerManager({ 
  layers, 
  hiddenDynamicLayers, 
  toggleLocalDynamic,
  layerOpacities,
  onOpacityChange
}: LayerManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [newLayerName, setNewLayerName] = useState("");

  const uploadLayer = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!newLayerName.trim()) {
        alert('Please provide a name for the layer before uploading an image.');
        event.target.value = '';
        return;
      }

      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `layer-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('maps')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('maps').getPublicUrl(filePath);

      const nextZIndex = layers.length > 0 ? Math.max(...layers.map(l => l.z_index)) + 1 : 0;

      const { error: insertError } = await supabase
        .from('Map_Layers')
        .insert({
          name: newLayerName,
          image_url: data.publicUrl,
          z_index: nextZIndex,
          is_global_visible: true
        });

      if (insertError) throw insertError;

      setNewLayerName("");
      event.target.value = '';
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const toggleGlobalVisibility = async (layer: MapLayer) => {
    await supabase.from('Map_Layers').update({ is_global_visible: !layer.is_global_visible }).eq('id', layer.id);
  };

  const deleteLayer = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this layer?")) {
      await supabase.from('Map_Layers').delete().eq('id', id);
    }
  };

  const moveLayer = async (layer: MapLayer, direction: 'up' | 'down') => {
    const index = layers.findIndex(l => l.id === layer.id);
    if (direction === 'up' && index > 0) {
      const swapLayer = layers[index - 1];
      await Promise.all([
        supabase.from('Map_Layers').update({ z_index: swapLayer.z_index }).eq('id', layer.id),
        supabase.from('Map_Layers').update({ z_index: layer.z_index }).eq('id', swapLayer.id)
      ]);
    } else if (direction === 'down' && index < layers.length - 1) {
      const swapLayer = layers[index + 1];
      await Promise.all([
        supabase.from('Map_Layers').update({ z_index: swapLayer.z_index }).eq('id', layer.id),
        supabase.from('Map_Layers').update({ z_index: layer.z_index }).eq('id', swapLayer.id)
      ]);
    }
  };

  return (
    <div className="flex flex-col space-y-6 w-full">
      
      {/* Upload New Layer */}
      <div className="bg-slate-700 p-3 rounded-lg border border-slate-600 shadow-inner">
        <h3 className="font-bold text-slate-200 mb-2 text-sm">Add New Layer</h3>
        <div className="flex flex-col gap-2">
          <input 
            type="text" 
            placeholder="Layer Name..." 
            value={newLayerName}
            onChange={(e) => setNewLayerName(e.target.value)}
            className="w-full p-1.5 text-sm bg-slate-800 text-white border border-slate-600 rounded outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
          />
          <div className="relative">
            <input 
              type="file" 
              accept="image/*,.svg,image/svg+xml"
              onChange={uploadLayer}
              disabled={uploading || !newLayerName.trim()}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              title={newLayerName.trim() ? "Upload Image" : "Enter a name first"}
            />
            <button 
              disabled={uploading || !newLayerName.trim()}
              className="w-full py-1.5 bg-blue-600 text-white text-sm font-bold rounded shadow disabled:bg-slate-600 disabled:text-slate-400 transition-colors"
            >
              {uploading ? 'Uploading...' : 'Upload Image'}
            </button>
          </div>
        </div>
      </div>

      {/* Layer List */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Manage Layers</h3>
        {layers.length === 0 ? (
          <p className="text-slate-500 italic text-sm">No map layers.</p>
        ) : (
          <div className="space-y-2">
            {layers.map((layer, index) => (
              <div key={layer.id} className="flex flex-col p-2.5 bg-slate-700 border border-slate-600 rounded-lg">
                
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-slate-100 truncate w-32" title={layer.name}>{layer.name}</span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => moveLayer(layer, 'up')} 
                      disabled={index === 0}
                      className="text-slate-400 hover:text-blue-400 disabled:opacity-30 p-1"
                      title="Move Up"
                    >
                      ?
                    </button>
                    <button 
                      onClick={() => moveLayer(layer, 'down')} 
                      disabled={index === layers.length - 1}
                      className="text-slate-400 hover:text-blue-400 disabled:opacity-30 p-1"
                      title="Move Down"
                    >
                      ?
                    </button>
                    <button 
                      onClick={() => deleteLayer(layer.id)}
                      className="text-red-400 hover:text-red-300 ml-1 p-1"
                      title="Delete Layer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs border-t border-slate-600 pt-2">
                   <label className="flex items-center space-x-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={!hiddenDynamicLayers.includes(layer.id)}
                        onChange={() => toggleLocalDynamic(layer.id)}
                        className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-600 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-slate-300 group-hover:text-white">Show Local</span>
                   </label>
                   
                   <label className="flex items-center space-x-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={layer.is_global_visible}
                        onChange={() => toggleGlobalVisibility(layer)}
                        className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-600 text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-slate-300 group-hover:text-white">Global</span>
                   </label>
                </div>

                {onOpacityChange && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-600/70">
                    <span className="text-xs text-slate-300 font-medium whitespace-nowrap">Opacity:</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={Math.round((layerOpacities?.[layer.id] ?? 1) * 100)}
                      onChange={(e) => onOpacityChange(layer.id, Number(e.target.value) / 100)}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="text-xs text-slate-300 font-mono w-8 text-right">
                      {Math.round((layerOpacities?.[layer.id] ?? 1) * 100)}%
                    </span>
                  </div>
                )}
                
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
