import React from 'react';

interface TopBarProps {
  userEmail: string;
  role: string;
  onSignOut: () => void;
  children?: React.ReactNode;
}

export default function TopBar({ userEmail, role, onSignOut, children }: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 w-full h-16 bg-primary-container text-text-on-dark z-50 shadow-[0_4px_16px_-2px_rgba(0,75,65,0.35)] backdrop-blur border-b border-primary-container/80">
      <div className="w-full h-16 px-space-lg flex items-center justify-between gap-space-md">
        
        {/* Logo / Brand Area */}
        <div className="flex items-center gap-space-md min-w-[280px]">
          {/* Logo placeholder, using a generic map icon if image isn't available, or keeping the img */}
          <div className="flex items-center justify-center w-8 h-8 rounded bg-surface-canvas-void text-primary-fixed-dim border border-primary-fixed-dim/30 shadow">
            <span className="material-symbols-outlined text-[20px]">public</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-md text-label-md tracking-wider text-text-on-dark uppercase leading-tight">Mapa UFSMUN</span>
            <span className="font-tag-overline text-tag-overline text-primary-fixed-dim uppercase leading-none mt-0.5">Gabinete de Guerra</span>
          </div>
        </div>

        {/* Central Nav Area (Passed as children) */}
        <div className="flex-1 flex justify-center">
          {children}
        </div>

        {/* User / Settings Area */}
        <div className="flex justify-end gap-space-md min-w-[320px] items-center">
          <form action={onSignOut} className="flex">
            <button type="submit" className="text-[11px] font-label-md uppercase bg-black/20 hover:bg-black/40 px-3 py-1.5 rounded transition-colors text-text-on-dark border border-white/10">
              Sign Out
            </button>
          </form>
          <div className="h-7 w-[1px] bg-secondary/70"></div>
          <div className="flex items-center gap-space-sm">
            <div className="flex flex-col items-end hidden lg:flex">
              <span className="font-label-md text-label-md text-text-on-dark leading-none">{userEmail.split('@')[0]}</span>
              <span className="font-tag-overline text-tag-overline text-primary-fixed-dim leading-none uppercase">{role}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center ring-1 ring-primary-fixed-dim/30 shadow-inner">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
