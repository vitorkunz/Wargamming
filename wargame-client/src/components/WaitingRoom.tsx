"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface WaitingRoomProps {
  userEmail: string;
  userId: string;
  onSignOut: () => void;
}

export default function WaitingRoom({ userEmail, userId, onSignOut }: WaitingRoomProps) {
  const totalSeconds = 6;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          triggerSimulatedSync();
          return totalSeconds;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`waiting-room-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Profiles', filter: `id=eq.${userId}` },
        (payload) => {
          if (payload.new.role !== 'Unassigned') {
            window.location.reload();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const triggerSimulatedSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 800);
  };

  const handleManualRefresh = () => {
    setSecondsLeft(totalSeconds);
    triggerSimulatedSync();
    window.location.reload();
  };

  const emailPrefix = userEmail ? userEmail.split('@')[0] : 'Usuário';
  const formattedName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
  const progressPct = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  return (
    <div className="bg-surface font-body-base text-body-base text-on-surface min-h-screen flex flex-col w-full">
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-primary-container text-text-on-dark shadow-[0_6px_16px_-4px_rgba(0,75,65,0.2)]">
        <div className="w-full h-full px-gutter-lg flex items-center justify-between relative">
          <div className="flex items-center gap-space-md lg:min-w-[280px]">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-surface-canvas-void text-primary-fixed-dim border border-primary-fixed-dim/30 shadow p-0.5 overflow-hidden">
              <img alt="UFSMUN" className="w-full h-full object-contain" src="/ufsmun-logo.png" />
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md tracking-wider text-text-on-dark uppercase leading-tight">
                Mapa UFSMUN
              </span>
              <span className="font-tag-overline text-tag-overline text-primary-fixed-dim uppercase leading-none mt-0.5">
                Gabinete de Guerra
              </span>
            </div>
          </div>
          <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
            <div className="px-space-md py-space-xs bg-primary text-text-on-dark font-body-ui-bold rounded flex items-center justify-center shadow-sm">
              <span className="font-label-md text-label-md text-text-on-dark">Sala de Espera</span>
            </div>
          </nav>
          <div className="flex items-center gap-space-sm pl-space-md py-space-xs">
            <div className="flex flex-col items-end leading-tight">
              <span className="font-body-ui-bold text-[14px] text-text-on-dark font-bold leading-tight">
                {formattedName}
              </span>
              <span className="font-tag-overline text-[10px] text-primary-fixed-dim uppercase tracking-wider font-bold leading-tight">
                Indefinido
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-primary/80 border border-primary-fixed-dim/30 flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-text-on-dark text-[20px]">person</span>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full pt-16 flex-1 bg-surface-parchment flex flex-col">
        <div className="relative w-full min-h-[calc(100vh-4rem)] flex items-center justify-center p-margin-mobile md:p-margin-desktop bg-surface-canvas-void overflow-hidden my-auto">
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern
                  height="80"
                  id="tactical-coord-grid"
                  patternUnits="userSpaceOnUse"
                  width="80"
                >
                  <path
                    d="M 80 0 L 0 0 0 80"
                    fill="none"
                    stroke="#7dbaad"
                    strokeDasharray="3,3"
                    strokeWidth="0.75"
                  />
                  <circle cx="80" cy="80" fill="#7dbaad" r="1.5" />
                </pattern>
              </defs>
              <rect fill="url(#tactical-coord-grid)" height="100%" width="100%" />
            </svg>
          </div>
          <div className="absolute top-4 left-6 hidden lg:flex flex-col text-on-primary-container font-mono text-[11px] tracking-widest opacity-60 select-none">
            <span>GRID: 29°41'03"S / 53°48'25"W</span>
            <span>SETOR: DELTA-BRAVO // REGIÃO DE SANTA MARIA</span>
            <span>COMUNICAÇÃO C2: LINK SEGURO // FREQ 384.150 MHz</span>
          </div>
          <div className="absolute bottom-4 right-6 hidden lg:flex flex-col items-end text-on-primary-container font-mono text-[11px] tracking-widest opacity-60 select-none">
            <span>CONTROLADOR DO WARGAME: HOST ONLINE</span>
            <span>PROTOCOLO: DESPACHO VETORIAL APP-6C</span>
            <span>CAMADA DE CRIPTOGRAFIA: SHA-512 MIL-SPEC</span>
          </div>

          <div className="relative z-10 w-full max-w-xl bg-surface-parchment rounded-xl shadow-xl p-space-md sm:p-space-lg flex flex-col gap-space-md m-auto">
            <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-sm border-b-2 border-surface-parchment-dim">
              <div className="flex items-center gap-space-xs bg-surface-parchment-dim px-space-md py-space-xs rounded-full">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-objective opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-objective"></span>
                </span>
                <span className="font-tag-overline text-tag-overline text-tertiary tracking-wider uppercase">
                  STATUS: CREDENCIAIS AUTENTICADAS
                </span>
              </div>
              <span className="font-tag-overline text-tag-overline text-secondary uppercase tracking-widest">
                SALA // COMITÊ DE CRISE UFSMUN
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-md">
              <div className="relative flex-shrink-0 w-16 h-16 rounded-full bg-primary-container flex items-center justify-center shadow-md">
                <svg className="absolute inset-0 w-full h-full p-1" viewBox="0 0 100 100">
                  <circle
                    className="opacity-40"
                    cx="50"
                    cy="50"
                    fill="none"
                    r="44"
                    stroke="#2d7d74"
                    strokeDasharray="4 2"
                    strokeWidth="1.5"
                  />
                  <circle
                    className="opacity-30"
                    cx="50"
                    cy="50"
                    fill="none"
                    r="30"
                    stroke="#95d2c5"
                    strokeWidth="1"
                  />
                  <line
                    opacity="0.3"
                    stroke="#7dbaad"
                    strokeDasharray="2 2"
                    strokeWidth="0.75"
                    x1="50"
                    x2="50"
                    y1="6"
                    y2="94"
                  />
                  <line
                    opacity="0.3"
                    stroke="#7dbaad"
                    strokeDasharray="2 2"
                    strokeWidth="0.75"
                    x1="6"
                    x2="94"
                    y1="50"
                    y2="50"
                  />
                  <circle className="animate-pulse" cx="50" cy="50" fill="#22d3ee" r="4" />
                  <line
                    stroke="#22d3ee"
                    strokeLinecap="round"
                    strokeWidth="2"
                    x1="50"
                    x2="80"
                    y1="50"
                    y2="20"
                  >
                    <animateTransform
                      attributeName="transform"
                      dur="4s"
                      from="0 50 50"
                      repeatCount="indefinite"
                      to="360 50 50"
                      type="rotate"
                    />
                  </line>
                </svg>
                <span className="material-symbols-outlined text-[#2d7d74] text-[26px] relative z-10">
                  radar
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-space-xs text-secondary font-tag-overline text-tag-overline uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[14px]">hourglass_top</span>
                  <span>AGUARDANDO ALOCAÇÃO DE FORÇAS</span>
                </div>
                <h1 className="font-headline-md text-headline-md text-on-surface">
                  Aguardando Atribuição
                </h1>
                <p className="font-body-base text-sm text-on-surface-variant mt-space-xs leading-relaxed">
                  A moderação ainda não alocou sua delegação a uma equipe. Por favor, aguarde a
                  liberação do acesso ao mapa tático.
                </p>
              </div>
            </div>

            <div className="w-full bg-surface-card rounded-lg p-space-md shadow-sm flex flex-col gap-space-sm">
              <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-secondary text-[16px]">
                    terminal
                  </span>
                  <span className="font-label-md text-[13px] text-on-surface uppercase">
                    TELEMETRIA DA CONEXÃO
                  </span>
                </div>
                <span className="font-tag-overline text-tag-overline text-faction-friendly bg-secondary-container/40 px-space-xs py-0.5 rounded uppercase">
                  STANDBY ATIVO
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm pt-space-xs">
                <div className="flex flex-col">
                  <span className="font-tag-overline text-tag-overline text-on-surface-variant uppercase">
                    DELEGADO IDENTIFICADO
                  </span>
                  <div className="flex items-center gap-space-xs mt-0.5">
                    <span className="font-body-ui-bold text-body-ui-bold text-on-surface">
                      {formattedName}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                      ({userEmail})
                    </span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="font-tag-overline text-tag-overline text-on-surface-variant uppercase">
                    PROTOCOLO DE ACESSO
                  </span>
                  <span className="font-body-ui-bold text-[13px] text-faction-friendly font-mono mt-0.5">
                    C2-NET-8842 // TOKEN VALIDADO
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-tag-overline text-tag-overline text-on-surface-variant uppercase">
                    POSIÇÃO NA FILA
                  </span>
                  <div className="flex items-center gap-space-xs mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-status-alert"></span>
                    <span className="font-body-ui text-[13px] text-on-surface font-semibold">
                      Aguardando mesa
                    </span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="font-tag-overline text-tag-overline text-on-surface-variant uppercase">
                    DIAGNÓSTICO DE REDE
                  </span>
                  <div className="flex items-center gap-space-xs mt-0.5 font-label-sm text-[11px] text-on-surface-variant font-mono">
                    <span className="text-secondary font-bold">16ms</span>
                    <span>•</span>
                    <span>AES-256</span>
                    <span>•</span>
                    <span className="text-status-objective font-bold">SSL ATIVO</span>
                  </div>
                </div>
              </div>
              <div className="mt-space-xs pt-space-sm border-t border-surface-container-high flex flex-col gap-space-xs">
                <div className="flex justify-between items-center text-[12px]">
                  <span className="font-tag-overline text-tag-overline text-on-surface-variant uppercase">
                    Sincronização com a mesa
                  </span>
                  <span className="font-mono text-secondary font-bold">
                    Próxima checagem em 0{secondsLeft}s
                  </span>
                </div>
                <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary transition-all duration-1000 ease-linear"
                    style={{ width: `${progressPct}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-sm pt-2">
              <button
                className="inline-flex items-center justify-center gap-space-xs px-space-lg py-2 rounded-lg bg-primary-container text-text-on-dark font-label-md text-[13px] uppercase tracking-wider hover:bg-chrome-hover transition-colors shadow-sm active:scale-95"
                type="button"
                onClick={handleManualRefresh}
              >
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    isSyncing ? 'animate-spin' : ''
                  }`}
                >
                  sync
                </span>
                <span>Atualizar Status</span>
              </button>
              <div className="flex items-center justify-end gap-space-md">
                <button
                  className="inline-flex items-center gap-space-xs font-body-ui text-[13px] text-secondary hover:underline"
                  onClick={() =>
                    alert('Canal de comunicação com a Mesa Diretora aberto via rádio interno do Kriegspiel.')
                  }
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">support_agent</span>
                  <span>Contatar Mesa Diretora</span>
                </button>
                <form action={onSignOut}>
                  <button
                    className="inline-flex items-center gap-space-xs font-body-ui text-[13px] text-status-critical hover:underline"
                    type="submit"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    <span>Desconectar Estação</span>
                  </button>
                </form>
              </div>
            </div>

            <div className="bg-surface-parchment-dim rounded-lg p-3 flex items-start gap-2">
              <span className="material-symbols-outlined text-status-objective text-[18px] mt-0.5 flex-shrink-0">
                info
              </span>
              <div className="flex flex-col">
                <span className="font-tag-overline text-[10px] text-tertiary tracking-wider uppercase">
                  AVISO TÁTICO OPERACIONAL
                </span>
                <p className="font-label-sm text-[11px] text-on-surface-variant mt-0.5">
                  Aviso: A página sincroniza automaticamente em tempo real assim que a moderação definir
                  sua delegação entre Time A ou Time B.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full bg-surface-container text-on-surface-variant shadow-[0_1px_8px_rgba(0,0,0,0.04)] py-space-lg z-10">
        <div className="w-full px-gutter-lg flex flex-col md:flex-row items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-secondary text-[18px]">shield</span>
            <span className="font-label-sm text-label-sm text-on-surface">
              Motor de Simulação Tática UFSMUN v4.2 • Simulação Estratégica Internacional
            </span>
          </div>
          <div className="font-tag-overline text-tag-overline text-on-surface-variant tracking-wider uppercase">
            TERMINAL AUTENTICADO • PROTOCOLO C2 ATIVO • SANTA MARIA, RS
          </div>
        </div>
      </footer>
    </div>
  );
}
