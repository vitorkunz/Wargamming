import React from 'react';

export type BottomPanelType = 'layers' | 'reserves' | 'dossier' | null;

interface BottomNavbarProps {
  activePanel: BottomPanelType;
  onTogglePanel: (panel: BottomPanelType) => void;
}

export default function BottomNavbar({ activePanel, onTogglePanel }: BottomNavbarProps) {
  return (
    <div className="lg:hidden absolute bottom-0 left-0 w-full z-50 bg-[#18221d]/95 backdrop-blur-md border-t border-[#2d7d74]/50 shadow-[0_-4px_24px_rgba(0,0,0,0.4)] px-4 pb-4 pt-2 flex justify-around items-center">
      <button 
        onClick={() => onTogglePanel(activePanel === 'layers' ? null : 'layers')}
        className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activePanel === 'layers' ? 'text-[#2d7d74]' : 'text-white/60 hover:text-white'}`}
      >
        <span className="material-symbols-outlined text-2xl">layers</span>
        <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Layers</span>
      </button>

      <button 
        onClick={() => onTogglePanel(activePanel === 'reserves' ? null : 'reserves')}
        className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activePanel === 'reserves' ? 'text-[#2d7d74]' : 'text-white/60 hover:text-white'}`}
      >
        <span className="material-symbols-outlined text-2xl">inventory_2</span>
        <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Reserves</span>
      </button>

      <button 
        onClick={() => onTogglePanel(activePanel === 'dossier' ? null : 'dossier')}
        className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activePanel === 'dossier' ? 'text-[#2d7d74]' : 'text-white/60 hover:text-white'}`}
      >
        <span className="material-symbols-outlined text-2xl">article</span>
        <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Dossier</span>
      </button>
    </div>
  );
}
