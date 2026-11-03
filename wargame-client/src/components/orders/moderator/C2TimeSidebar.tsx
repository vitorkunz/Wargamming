"use client";
import React, { useState, useEffect } from 'react';
import { C2ClockState, TurnOrder } from '@/types/orders';

interface C2TimeSidebarProps {
  clockState: C2ClockState;
  orders: TurnOrder[];
  onAddTime: (minutes: number) => void;
  onTogglePause: () => void;
  onToggleMasterLockdown: () => void;
  onToggleTeamLock: (team: 'A' | 'B') => void;
}

export default function C2TimeSidebar({
  clockState,
  orders,
  onAddTime,
  onTogglePause,
  onToggleMasterLockdown,
  onToggleTeamLock,
}: C2TimeSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [wallClock, setWallClock] = useState('16:03 BRT');

  useEffect(() => {
    const updateWallClock = () => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5) + ' BRT';
      setWallClock(timeStr);
    };
    updateWallClock();
    const interval = setInterval(updateWallClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (sec: number) => {
    const safeSec = Math.max(0, sec);
    const m = Math.floor(safeSec / 60);
    const s = safeSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const elapsed = Math.max(0, clockState.turn_max_seconds - clockState.turn_time_remaining);
  const frac = Math.min(1, elapsed / Math.max(1, clockState.turn_max_seconds));
  const percent = Math.round(frac * 100);
  const baseMinutes = Math.round(clockState.turn_max_seconds / 60);

  const teamASubmitted = orders.filter(
    (o) => o.team === 'Player A' && o.status !== 'draft'
  ).length;
  const teamADrafts = orders.filter((o) => o.team === 'Player A' && o.status === 'draft').length || 1;

  const teamBSubmitted = orders.filter(
    (o) => o.team === 'Player B' && o.status !== 'draft'
  ).length;
  const teamBDrafts = orders.filter((o) => o.team === 'Player B' && o.status === 'draft').length || 2;

  const statusLabel = clockState.is_locked_down
    ? 'LOCKDOWN TOTAL'
    : clockState.turn_time_remaining === 0
    ? 'PRAZO ESGOTADO'
    : clockState.is_timer_running
    ? 'SUBMISSÃO ABERTA'
    : 'PAUSADO';

  const pulseDotClass =
    clockState.is_locked_down || clockState.turn_time_remaining === 0
      ? 'w-2 h-2 rounded-full bg-[#b91c1c]'
      : clockState.is_timer_running
      ? 'w-2 h-2 rounded-full bg-[#0284c7] animate-pulse'
      : 'w-2 h-2 rounded-full bg-[#b45309]';

  const progressBarColor =
    clockState.turn_time_remaining <= 300 && clockState.turn_time_remaining > 0
      ? 'bg-[#b91c1c]'
      : clockState.turn_time_remaining === 0
      ? 'bg-[#94a3b8]'
      : 'bg-[#004d40]';

  return (
    <>
      {/* Floating Expand Button when Sidebar is Collapsed */}
      {isCollapsed && (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="fixed left-0 top-24 z-40 bg-white hover:bg-[#f2eee3] text-[#004d40] border border-l-0 border-[#d6cfbe] shadow-md py-3 px-2 rounded-r-lg flex flex-col items-center gap-2 group transition-all cursor-pointer"
          title="Expandir Controle de Tempo"
        >
          <span className="material-symbols-outlined text-[18px] text-[#004d40] group-hover:scale-110 transition-transform">
            timer
          </span>
          <span className="font-headline text-[9px] font-bold uppercase tracking-wider [writing-mode:vertical-lr] rotate-180 text-[#1e293b]">
            Controle do Turno
          </span>
          <span className="material-symbols-outlined text-[16px] text-[#28685e]">
            keyboard_double_arrow_right
          </span>
        </button>
      )}

      <aside
        id="c2-time-sidebar"
        className={`shrink-0 bg-[#f7f4eb] border-b xl:border-b-0 xl:border-r border-[#e2dccf] xl:sticky xl:top-16 xl:h-[calc(100vh-4rem)] xl:overflow-y-auto transition-all duration-300 relative flex flex-col z-30 ${
          isCollapsed ? 'w-0 xl:w-0 p-0 overflow-hidden' : 'w-full xl:w-80 p-4 xl:p-5'
        }`}
      >
        {!isCollapsed && (
          <div className="flex flex-col flex-1 min-h-full transition-opacity duration-300">
            {/* Cabeçalho Integrado no Topo da Gaveta */}
            <div className="h-14 px-4 bg-[#ede9dd] border-b border-[#e2dccf] flex items-center justify-between shrink-0 rounded-t-lg">
              <div className="flex items-center gap-2 text-[#004d40] font-headline text-[12px] font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-[20px] text-[#004d40]">timer</span>
                <span>Controle do Turno</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsCollapsed(true)}
                  className="p-1.5 rounded text-[#475569] hover:text-[#004d40] hover:bg-white/80 transition-colors border border-transparent hover:border-[#b8dfd6] flex items-center justify-center cursor-pointer"
                  title="Recolher Painel de Tempo"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    keyboard_double_arrow_left
                  </span>
                </button>
              </div>
            </div>

            {/* Corpo Rolável com Módulos Táticos */}
            <div className="p-4 flex flex-col gap-4 flex-1">
              {/* MÓDULO DIGITAL COUNTDOWN TIMER */}
              <div className="bg-white rounded-lg p-3.5 border border-[#e2dccf] shadow-xs relative flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={pulseDotClass}></span>
                    <span className="font-headline text-[10px] font-bold uppercase tracking-widest text-[#004d40]">
                      {statusLabel}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[#475569] font-medium">
                    {wallClock}
                  </span>
                </div>

                {/* Big Clear Digits */}
                <div className="my-1 text-center">
                  <span className="font-headline text-[38px] font-extrabold text-[#00322b] tracking-tight tabular-nums leading-none">
                    {formatTime(clockState.turn_time_remaining)}
                  </span>
                  <span className="block font-headline text-[9px] text-[#475569] font-bold uppercase tracking-widest mt-1">
                    Tempo Restante de Turno
                  </span>
                </div>

                {/* Progress Bar Indicator */}
                <div className="w-full mt-2.5">
                  <div className="w-full bg-[#dfd8c7] h-2 rounded-full overflow-hidden">
                    <div
                      className={`${progressBarColor} h-full rounded-full transition-all duration-700`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-[#475569] mt-1.5 font-medium">
                    <span>
                      Base: <strong>{baseMinutes} min</strong>
                    </span>
                    <span className="text-[#004d40] font-bold">{percent}% decorrido</span>
                  </div>
                </div>

                {/* Quick Extension Buttons */}
                <div className="grid grid-cols-3 gap-1.5 w-full mt-3">
                  <button
                    type="button"
                    onClick={() => onAddTime(5)}
                    className="py-1 px-2 rounded bg-[#fbf9f4] hover:bg-[#e1ede9] hover:text-[#00322b] text-[#1e293b] font-headline text-[11px] font-bold uppercase transition-colors text-center border border-[#d3ccbc] shadow-xs cursor-pointer"
                  >
                    +5m
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddTime(10)}
                    className="py-1 px-2 rounded bg-[#fbf9f4] hover:bg-[#e1ede9] hover:text-[#00322b] text-[#1e293b] font-headline text-[11px] font-bold uppercase transition-colors text-center border border-[#d3ccbc] shadow-xs cursor-pointer"
                  >
                    +10m
                  </button>
                  <button
                    type="button"
                    onClick={onTogglePause}
                    className="py-1 px-2 rounded bg-[#fbf9f4] hover:bg-[#fbf2e5] text-[#b45309] font-headline text-[11px] font-bold uppercase transition-colors text-center flex items-center justify-center gap-1 border border-[#d3ccbc] shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {clockState.is_timer_running ? 'pause' : 'play_arrow'}
                    </span>
                    <span>{clockState.is_timer_running ? 'Pausar' : 'Retomar'}</span>
                  </button>
                </div>

                {/* Lockdown Master Switch */}
                <div className="w-full mt-3 pt-2.5 flex items-center justify-between border-t border-[#eee8d9]">
                  <div className="flex flex-col">
                    <span className="font-headline text-[11px] font-bold uppercase text-[#b91c1c]">
                      Lockdown Geral
                    </span>
                    <span className="text-[10px] text-[#475569]">
                      Congela envios imediatamente
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label="Trava Geral de Segurança"
                    onClick={onToggleMasterLockdown}
                    className={`w-12 h-6 rounded-full p-0.5 transition-colors relative flex items-center shadow-inner cursor-pointer ${
                      clockState.is_locked_down ? 'bg-[#b91c1c]' : 'bg-[#d8d0bf]'
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full bg-[#b91c1c] transition-transform transform shadow-sm flex items-center justify-center"
                      style={{
                        transform: clockState.is_locked_down
                          ? 'translateX(24px)'
                          : 'translateX(0px)',
                      }}
                    >
                      <span className="material-symbols-outlined text-[13px] text-white">
                        {clockState.is_locked_down ? 'lock' : 'lock_open'}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* FASE & TURNO */}
              <div className="flex flex-col gap-1.5">
                <span className="font-headline text-[10px] font-bold uppercase text-[#475569] tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#28685e]">
                    view_timeline
                  </span>
                  Fase &amp; Turno
                </span>
                <div className="space-y-1">
                  <div className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-white border border-[#e2dccf] text-left shadow-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-[#004d40]">
                        check_circle
                      </span>
                      <span className="font-headline text-[11px] text-[#1e293b] font-bold uppercase">
                        T-0{Math.max(1, clockState.current_turn - 1)} Histórico
                      </span>
                    </div>
                    <span className="font-headline text-[10px] text-[#475569] font-semibold">
                      Concluído (7/7)
                    </span>
                  </div>

                  <div className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-[#00322b] text-white shadow-xs border-l-4 border-[#a4f1e5]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="material-symbols-outlined text-[15px] text-[#a4f1e5] animate-spin"
                        style={{ animationDuration: '6s' }}
                      >
                        timelapse
                      </span>
                      <span className="font-headline text-[11px] text-white font-bold uppercase tracking-wide">
                        T-0{clockState.current_turn} Ativo
                      </span>
                    </div>
                    <span className="font-headline text-[10px] font-bold text-[#a4f1e5] uppercase tracking-wider">
                      Avaliação
                    </span>
                  </div>

                  <div className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-white/60 border border-[#e8e2d4] text-left opacity-60 cursor-not-allowed">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-[#94a3b8]">
                        lock
                      </span>
                      <span className="font-headline text-[11px] text-[#94a3b8] font-bold uppercase">
                        T-0{clockState.current_turn + 1} Próximo
                      </span>
                    </div>
                    <span className="font-headline text-[10px] text-[#94a3b8]">Bloqueado</span>
                  </div>
                </div>
              </div>

              {/* TELEMETRIA CARDS (TIME A & TIME B) */}
              <div className="flex flex-col gap-2.5">
                <span className="font-headline text-[10px] font-bold uppercase text-[#475569] tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#28685e]">hub</span>
                  Telemetria de Submissão
                </span>

                {/* TIME A TELEMETRY CARD */}
                <div className="bg-white rounded-lg p-2.5 border-l-4 border-[#1b6d61] border border-[#e2dccf] shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-headline text-[11px] font-bold uppercase text-[#00322b]">
                      Time A (Governo)
                    </span>
                    <span className="font-headline text-[9px] px-1.5 py-0.5 rounded bg-[#d6ede6] text-[#004d40] font-bold uppercase border border-[#b2ded2]">
                      Pronto
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-center my-1 bg-[#fbf9f4] p-1.5 rounded border border-[#e8e2d4]">
                    <div>
                      <span className="font-headline text-[9px] text-[#475569] block uppercase font-medium">
                        Submetidas
                      </span>
                      <span className="font-headline text-[16px] font-black text-[#004d40]">
                        {teamASubmitted}
                      </span>
                    </div>
                    <div>
                      <span className="font-headline text-[9px] text-[#475569] block uppercase font-medium">
                        Rascunhos
                      </span>
                      <span className="font-headline text-[16px] font-bold text-[#b45309]">
                        {teamADrafts}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between pt-1">
                    <span
                      className={
                        clockState.team_a_locked || clockState.is_locked_down
                          ? 'text-[10px] text-[#b91c1c] font-bold uppercase'
                          : 'text-[10px] text-[#475569] font-medium'
                      }
                    >
                      Canal:{' '}
                      {clockState.team_a_locked || clockState.is_locked_down
                        ? 'Travado'
                        : 'Aberto'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleTeamLock('A')}
                      className={
                        clockState.team_a_locked
                          ? 'px-2 py-0.5 rounded bg-[#fee2e2] text-[#991b1b] font-headline text-[9px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 border border-[#fca5a5] cursor-pointer'
                          : 'px-2 py-0.5 rounded bg-[#fbf9f4] hover:bg-[#fee2e2] text-[#1e293b] hover:text-[#991b1b] font-headline text-[9px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 border border-[#d6cfbe] cursor-pointer'
                      }
                    >
                      <span className="material-symbols-outlined text-[12px]">
                        {clockState.team_a_locked ? 'lock_open' : 'lock'}
                      </span>
                      <span>{clockState.team_a_locked ? 'Destravar' : 'Travar Envio'}</span>
                    </button>
                  </div>
                </div>

                {/* TIME B TELEMETRY CARD */}
                <div className="bg-white rounded-lg p-2.5 border-l-4 border-[#8a2444] border border-[#e2dccf] shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-headline text-[11px] font-bold uppercase text-[#8a2444]">
                      Time B (Revoltosos)
                    </span>
                    <span className="font-headline text-[9px] px-1.5 py-0.5 rounded bg-[#fef3c7] text-[#92400e] font-bold uppercase border border-[#fde68a] animate-pulse">
                      Edição
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-center my-1 bg-[#fbf9f4] p-1.5 rounded border border-[#e8e2d4]">
                    <div>
                      <span className="font-headline text-[9px] text-[#475569] block uppercase font-medium">
                        Submetidas
                      </span>
                      <span className="font-headline text-[16px] font-black text-[#004d40]">
                        {teamBSubmitted}
                      </span>
                    </div>
                    <div>
                      <span className="font-headline text-[9px] text-[#475569] block uppercase font-medium">
                        Rascunhos
                      </span>
                      <span className="font-headline text-[16px] font-bold text-[#b91c1c]">
                        {teamBDrafts}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between pt-1">
                    <span
                      className={
                        clockState.team_b_locked || clockState.is_locked_down
                          ? 'text-[10px] text-[#b91c1c] font-bold uppercase'
                          : 'text-[10px] text-[#475569] font-medium'
                      }
                    >
                      Canal:{' '}
                      {clockState.team_b_locked || clockState.is_locked_down
                        ? 'Travado'
                        : 'Aberto'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleTeamLock('B')}
                      className={
                        clockState.team_b_locked
                          ? 'px-2 py-0.5 rounded bg-[#fee2e2] text-[#991b1b] font-headline text-[9px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 border border-[#fca5a5] cursor-pointer'
                          : 'px-2 py-0.5 rounded bg-[#fbf9f4] hover:bg-[#fee2e2] text-[#1e293b] hover:text-[#991b1b] font-headline text-[9px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 border border-[#d6cfbe] cursor-pointer'
                      }
                    >
                      <span className="material-symbols-outlined text-[12px]">
                        {clockState.team_b_locked ? 'lock_open' : 'lock'}
                      </span>
                      <span>{clockState.team_b_locked ? 'Destravar' : 'Travar Envio'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Rodapé da Barra Lateral: Auditoria C2 */}
              <div className="mt-auto pt-3 border-t border-[#e2dccf] flex items-center justify-between text-[11px] text-[#475569]">
                <span className="flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-[14px] text-[#004d40]">
                    security
                  </span>
                  Auditoria C2 Ativa
                </span>
                <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-[#e3dcd0]">
                  LAT: 18ms
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
