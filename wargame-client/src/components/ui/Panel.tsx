import React from 'react';

interface PanelProps {
  title?: string;
  side: 'left' | 'right';
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export default function Panel({ title, side, isCollapsed, onToggle, children }: PanelProps) {
  const widthClass = isCollapsed ? 'w-12' : 'w-80';
  const positionClass = side === 'left' ? 'border-r border-slate-300' : 'border-l border-slate-300';
  
  return (
    <div className={`flex flex-col bg-[var(--color-parchment)] text-slate-800 transition-all duration-300 ease-in-out ${widthClass} ${positionClass} h-full z-10 shadow-lg relative`}>
      {/* Toggle Button */}
      <button 
        onClick={onToggle}
        className={`absolute top-4 bg-[var(--color-brand-green)] text-white p-1 rounded-full shadow-md hover:bg-emerald-800 z-20 ${side === 'left' ? '-right-4' : '-left-4'}`}
      >
        {side === 'left' ? (isCollapsed ? '>>' : '<<') : (isCollapsed ? '<<' : '>>')}
      </button>

      {/* Header */}
      {!isCollapsed && title && (
        <div className="p-4 border-b border-slate-300 bg-[var(--color-brand-green)] text-white">
          <h2 className="font-bold text-lg font-sans">{title}</h2>
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'hidden' : 'block'} p-4 custom-scrollbar`}>
        {children}
      </div>
      
      {/* Collapsed view icons could go here */}
      {isCollapsed && (
        <div className="flex-1 flex flex-col items-center py-6 gap-4">
          <div className="w-8 h-8 rounded bg-slate-300 flex items-center justify-center opacity-50">
            {/* icon placeholder */}
            ...
          </div>
        </div>
      )}
    </div>
  );
}
