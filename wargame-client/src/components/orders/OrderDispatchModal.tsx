"use client";
import React, { useState, useEffect, useId, useRef } from 'react';
import {
  TurnOrder,
  CommittedUnitSnapshot,
  OrderAttachment,
  C2ClockState,
} from '@/types/orders';
import {
  INITIAL_PLAYER_CURRENT_ORDER,
  INITIAL_PAST_HISTORY_ORDERS,
  loadClockState,
  submitPlayerOrderToC2,
} from '@/lib/ordersService';
import { Unit } from '../MapGrid';
import OrderDetailsModal from './OrderDetailsModal';

interface OrderDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  role: string;
  playerUnits?: Unit[];
}

export default function OrderDispatchModal({
  isOpen,
  onClose,
  userEmail,
  role,
  playerUnits = [],
}: OrderDispatchModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directiveTextareaRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();

  const [isCurrentAccordionOpen, setIsCurrentAccordionOpen] = useState(true);
  const [isHistoryAccordionOpen, setIsHistoryAccordionOpen] = useState(true);

  const [currentOrder, setCurrentOrder] = useState<TurnOrder>(() => ({
    ...INITIAL_PLAYER_CURRENT_ORDER,
    team: role === 'Player B' ? 'Player B' : 'Player A',
    code: role === 'Player B' ? 'ORD-B04' : 'ORD-A05',
  }));

  const [pastOrders, setPastOrders] = useState<TurnOrder[]>(INITIAL_PAST_HISTORY_ORDERS);
  const [clockState, setClockState] = useState<C2ClockState>(() => loadClockState());
  const [saveDraftToast, setSaveDraftToast] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<TurnOrder | null>(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // Sync clock and countdown
  useEffect(() => {
    setClockState(loadClockState());
    const handleClockUpdate = () => setClockState(loadClockState());
    window.addEventListener('ufsmun:clock-updated', handleClockUpdate);

    const interval = setInterval(() => {
      setClockState((prev) => {
        if (!prev.is_timer_running || prev.turn_time_remaining <= 0) return prev;
        return { ...prev, turn_time_remaining: prev.turn_time_remaining - 1 };
      });
    }, 1000);

    return () => {
      window.removeEventListener('ufsmun:clock-updated', handleClockUpdate);
      clearInterval(interval);
    };
  }, []);

  // Load saved draft if available in localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedKey = `ufsmun_player_draft_${role}`;
    const saved = localStorage.getItem(savedKey);
    if (saved) {
      try {
        setCurrentOrder(JSON.parse(saved));
      } catch {
        // ignore parse error
      }
    }
  }, [role]);

  // Native <dialog> open/close lifecycle
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };
    dialog.addEventListener('close', handleClose);

    // Fallback for browsers without native closedby="any" light dismiss
    let cleanupLightDismiss: (() => void) | undefined;
    if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
      const isOutside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      let pressedOutside = false;
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e)) {
          dialog.close();
        }
      };
      dialog.addEventListener('pointerdown', onPointerDown);
      dialog.addEventListener('pointerup', onPointerUp);
      cleanupLightDismiss = () => {
        dialog.removeEventListener('pointerdown', onPointerDown);
        dialog.removeEventListener('pointerup', onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      cleanupLightDismiss?.();
    };
  }, [onClose]);

  const isTeamChannelLocked =
    clockState.is_locked_down ||
    (role === 'Player B' ? clockState.team_b_locked : clockState.team_a_locked);

  const isOrderLocked = currentOrder.status === 'submitted' || isTeamChannelLocked;

  const formatCountdown = (seconds: number) => {
    const safeSec = Math.max(0, seconds);
    const m = Math.floor(safeSec / 60);
    const s = safeSec % 60;
    return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };

  // Word and character count for Directive Textarea
  const directiveText = currentOrder.directive_text || '';
  const wordCount = directiveText.trim()
    ? directiveText.trim().split(/\s+/).length
    : 0;
  const charCount = directiveText.length.toLocaleString('pt-BR');

  const handleInsertFormatting = (snippet: string) => {
    if (isOrderLocked) return;
    const textarea = directiveTextareaRef.current;
    if (!textarea) {
      setCurrentOrder((prev) => ({
        ...prev,
        directive_text: prev.directive_text + snippet,
      }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = directiveText.substring(start, end);
    let replacement = snippet;
    if (snippet === '**Negrito**' && selected) replacement = `**${selected}**`;
    if (snippet === '*Itálico*' && selected) replacement = `*${selected}*`;

    const updated =
      directiveText.substring(0, start) + replacement + directiveText.substring(end);
    setCurrentOrder((prev) => ({ ...prev, directive_text: updated }));
  };

  const handleRemoveUnit = (unitId: string) => {
    if (isOrderLocked) return;
    setCurrentOrder((prev) => ({
      ...prev,
      committed_units: prev.committed_units.filter((u) => u.id !== unitId),
    }));
  };

  const handleAddUnit = (unit: CommittedUnitSnapshot) => {
    if (isOrderLocked) return;
    if (currentOrder.committed_units.some((u) => u.id === unit.id)) return;
    setCurrentOrder((prev) => ({
      ...prev,
      committed_units: [...prev.committed_units, unit],
    }));
    setShowUnitPicker(false);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || isOrderLocked) return;
    const newAttachments: OrderAttachment[] = Array.from(files).map((file, idx) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const fileType: OrderAttachment['type'] =
        ext === 'pdf'
          ? 'pdf'
          : ['png', 'jpg', 'jpeg', 'webp'].includes(ext)
          ? 'image'
          : ext === 'kml'
          ? 'kml'
          : 'doc';
      const sizeMB =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(file.size / 1024))} KB`;

      return {
        id: `att-${Date.now()}-${idx}`,
        name: file.name,
        size: sizeMB,
        type: fileType,
        description:
          fileType === 'pdf'
            ? 'Relatório Operacional'
            : fileType === 'image'
            ? 'Croqui / Imagem de Satélite'
            : 'Anexo Tático',
      };
    });

    setCurrentOrder((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments],
    }));
  };

  const handleRemoveAttachment = (attId: string) => {
    if (isOrderLocked) return;
    setCurrentOrder((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((a) => a.id !== attId),
    }));
  };

  const handleSaveDraft = () => {
    if (isOrderLocked) return;
    const savedKey = `ufsmun_player_draft_${role}`;
    localStorage.setItem(savedKey, JSON.stringify(currentOrder));
    setSaveDraftToast(true);
    setTimeout(() => setSaveDraftToast(false), 2000);
  };

  const handleConfirmSubmission = async () => {
    if (isOrderLocked) return;
    const submitted = await submitPlayerOrderToC2(currentOrder, userEmail);
    setCurrentOrder(submitted);
    const savedKey = `ufsmun_player_draft_${role}`;
    localStorage.setItem(savedKey, JSON.stringify(submitted));
    setShowConfirmSubmit(false);
  };

  // Candidate units from map or tactical reserve pool
  const availableTheaterUnits: CommittedUnitSnapshot[] = [
    ...playerUnits.map((u) => ({
      id: u.id,
      name: u.name || `Unidade ${u.type}`,
      type: `${u.owner} • Posição (${u.x_coord}, ${u.y_coord})`,
      health: u.health ?? 100,
      role: 'Unidade no Teatro',
      symbol: 'II',
      accentType: (role === 'Player B' ? 'dark' : 'allied') as 'allied' | 'primary' | 'dark',
    })),
    {
      id: 'unit-bateria-155',
      name: 'Bateria de Obuseiros 155mm (M109A6)',
      type: 'Apoio de Fogo Indireto • Retaguarda M4',
      health: 100,
      role: 'Artilharia Pesada',
      symbol: '●',
      accentType: 'primary' as const,
    },
    {
      id: 'unit-drone-isr',
      name: 'Drone ISR-01 [Órbita Tabqa]',
      type: 'Reconhecimento Aéreo • Entroncamento Oeste',
      health: 100,
      role: 'Vetor ISR',
      symbol: 'R',
      accentType: 'allied' as const,
    },
    {
      id: 'unit-eng-combate',
      name: '3ª Cia de Engenharia de Combate',
      type: 'Transposição de Curso de Água • Jarabulos',
      health: 95,
      role: 'Engenharia Militar',
      symbol: 'E',
      accentType: 'dark' as const,
    },
  ].filter((cand) => !currentOrder.committed_units.some((c) => c.id === cand.id));

  if (!isOpen) return null;

  return (
    <>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        {...({ closedby: 'any' } as any)}
        className="m-auto w-[95vw] max-w-6xl bg-surface-parchment text-[#0a0f0c] rounded-DEFAULT shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-[#404846]/40 p-0 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        {/* 1. DOSSIER HEADER: Military Classification Banner (Fixed Top Bar) */}
        <div className="bg-[#00322b] px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md text-[#dfe4dd] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-DEFAULT bg-[#0a0f0c] flex items-center justify-center text-[#beece1] shadow-inner">
              <span className="material-symbols-outlined text-[24px]">military_tech</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  id={titleId}
                  className="font-headline-sm text-headline-sm uppercase tracking-tight text-[#f7f4eb] font-bold"
                >
                  DIRETIVA DE COMBATE &amp; ORDENS DE BATALHA
                </h1>
                <span className="px-1.5 py-0.5 rounded-DEFAULT bg-[#ef4444]/20 text-[#ffb4ab] font-label-sm text-[9px] uppercase font-bold tracking-widest">
                  CONFIDENCIAL // MESA C2
                </span>
              </div>
              <div className="flex items-center gap-2 text-[#709b92] font-label-md text-[11px]">
                <span>
                  Turno {clockState.current_turn} • Dia 1 - 12:00h (Fase de Planejamento Tático)
                </span>
                <span>•</span>
                <span className="text-[#88d4c9]">UFSMUN War Cabinet Simulation</span>
              </div>
            </div>
          </div>

          {/* Top Right Meta & Status Indicator */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Submission Countdown Clock */}
            <div className="flex items-center gap-1.5 bg-[#0a0f0c] px-3 py-1 rounded-DEFAULT shadow-inner">
              <span className="material-symbols-outlined text-[#e07a2f] text-[16px] animate-pulse">
                timer
              </span>
              <div className="flex flex-col">
                <span className="font-label-sm text-[9px] text-[#8a9290] uppercase tracking-wider leading-tight">
                  Limite da Mesa
                </span>
                <span className="font-label-md text-[12px] font-bold text-[#f7f4eb] font-display tracking-wider leading-tight">
                  {formatCountdown(clockState.turn_time_remaining)}
                </span>
              </div>
            </div>

            {/* Status Badge with Tooltip Trigger */}
            <div className="relative group">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#262b27] rounded-DEFAULT cursor-help shadow-sm">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOrderLocked ? 'bg-[#ef4444]' : 'bg-[#16a34a] animate-ping'
                  }`}
                ></span>
                <span className="font-label-sm text-[10px] font-bold uppercase tracking-wider text-[#f7f4eb]">
                  {currentOrder.status === 'submitted'
                    ? 'SUBMETIDO (TRAVADO)'
                    : isTeamChannelLocked
                    ? 'CANAL BLOQUEADO'
                    : 'RASCUNHO ABERTO'}
                </span>
                <span className="material-symbols-outlined text-[#8a9290] text-[14px]">info</span>
              </div>
              {/* Tooltip Hover Card */}
              <div className="absolute right-0 top-full mt-2 w-64 p-2.5 bg-[#0a0f0c] text-[#dfe4dd] rounded-DEFAULT shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 pointer-events-none border border-[#404846]">
                <p className="font-label-md text-[11px] text-[#a2d0c5] font-bold uppercase mb-1">
                  Status do Despacho
                </p>
                <p className="font-body-sm text-[12px] text-[#c0c8c5]">
                  {isOrderLocked
                    ? 'Esta ordem encontra-se travada (🔒) na Mesa Arbitral C2 e não pode ser modificada até a resolução do turno.'
                    : "Este rascunho está aberto e editável por qualquer operador da força. Ao clicar em 'Submeter', a ordem será travada (🔒) e enviada para a Mesa Arbitral C2."}
                </p>
              </div>
            </div>

            {/* Modal Window Controls */}
            <form method="dialog">
              <button
                type="submit"
                value="close"
                className="w-7 h-7 flex items-center justify-center bg-[#313632] hover:bg-[#ef4444] text-[#dfe4dd] hover:text-white rounded-DEFAULT transition-colors cursor-pointer"
                title="Fechar Visualização"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </form>
          </div>
        </div>

        {/* SCROLLABLE ACCORDION CONTAINER */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-4 bg-[#f7f4eb]">
          {/* ============================================================ */}
          {/* ACCORDION 1: ORDEM ATUAL • TURNO 2 (EM EDIÇÃO) */}
          {/* ============================================================ */}
          <section
            className="border border-[#404846]/30 rounded-DEFAULT bg-[#f7f4eb] shadow-md overflow-hidden"
            id="accordionCurrentOrder"
          >
            {/* Accordion 1 Header */}
            <button
              type="button"
              onClick={() => setIsCurrentAccordionOpen((prev) => !prev)}
              className="w-full text-left bg-[#ede9dd] hover:bg-[#ede9dd]/80 px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#404846]/30 transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className="material-symbols-outlined text-[#00322b] text-[24px] transform transition-transform duration-200"
                  style={{
                    transform: isCurrentAccordionOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                  }}
                >
                  expand_more
                </span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-headline-sm text-[16px] font-bold uppercase text-[#00322b] tracking-tight">
                      1. Ordem Atual • Turno {clockState.current_turn} (
                      {isOrderLocked ? 'Submetida / Travada' : 'Em Edição'})
                    </span>
                    {isOrderLocked ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-DEFAULT bg-[#00322b]/15 text-[#00322b] font-label-sm text-[10px] uppercase font-bold tracking-wider">
                        🔒 Travado na Mesa C2
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-DEFAULT bg-[#16a34a]/20 text-[#16a34a] font-label-sm text-[10px] uppercase font-bold tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-ping"></span>
                        🟢 Rascunho Aberto
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#4e1a3d] text-white font-label-sm text-[10px] uppercase font-bold tracking-widest rounded-DEFAULT shadow-sm">
                  SECRETO // {role === 'Player B' ? 'TIME B' : 'TIME A'}
                </span>
                <span className="font-label-sm text-[10px] uppercase font-bold text-[#00322d] bg-white px-2 py-0.5 rounded-DEFAULT shadow-inner">
                  Fase de Planejamento
                </span>
              </div>
            </button>

            {/* Accordion 1 Body */}
            {isCurrentAccordionOpen && (
              <div className="p-4 space-y-4 bg-[#f7f4eb]">
                {/* 2. CLASSIFICATION & OPERATION METADATA STRIP */}
                <div className="bg-[#ede9dd] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 rounded-DEFAULT shadow-inner text-[#313632] border border-[#404846]/20">
                  <div className="flex items-center gap-4 flex-1 min-w-[280px]">
                    <div className="flex items-center gap-2 flex-1">
                      <label
                        className="font-label-sm text-[10px] uppercase tracking-wider text-[#404846] shrink-0 font-bold"
                        htmlFor="opName"
                      >
                        Codinome da Operação:
                      </label>
                      <input
                        id="opName"
                        type="text"
                        disabled={isOrderLocked}
                        value={currentOrder.operation_name}
                        onChange={(e) =>
                          setCurrentOrder((prev) => ({
                            ...prev,
                            operation_name: e.target.value,
                          }))
                        }
                        className="w-full bg-white px-2.5 py-1 rounded-DEFAULT font-headline-sm text-[15px] text-[#00322b] font-bold uppercase tracking-wide focus:outline-none focus:ring-1 focus:ring-[#22d3ee] shadow-sm border border-[#404846]/30 disabled:opacity-70"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#404846] font-label-sm text-[10px] shrink-0">
                    <span className="material-symbols-outlined text-[16px] text-[#2d7d74]">
                      cloud_sync
                    </span>
                    {saveDraftToast && (
                      <span className="text-[#16a34a] font-bold uppercase">Rascunho Salvo ✓</span>
                    )}
                  </div>
                </div>

                {/* SECTION 1: EDITOR DE DIRETIVA OPERACIONAL */}
                <div className="bg-white p-4 rounded-DEFAULT shadow-md flex flex-col gap-3 border border-[#404846]/20">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[#00322b] text-[20px]">
                        description
                      </span>
                      <h2 className="font-headline-sm text-[15px] text-[#00322b] font-bold uppercase tracking-tight">
                        Diretiva Tática de Operações &amp; SITREP de Despacho
                      </h2>
                    </div>

                    {/* Technical Toolbar for Directive Editor */}
                    <div className="flex items-center gap-1 bg-[#f7f4eb] px-2 py-1 rounded-DEFAULT shadow-inner flex-wrap border border-[#404846]/20">
                      <button
                        type="button"
                        disabled={isOrderLocked}
                        onClick={() => handleInsertFormatting('**Negrito**')}
                        className="p-1 hover:bg-[#ede9dd] rounded-DEFAULT text-[#00322b] font-bold text-label-md disabled:opacity-50 cursor-pointer"
                        title="Negrito"
                      >
                        <span className="material-symbols-outlined text-[16px]">format_bold</span>
                      </button>
                      <button
                        type="button"
                        disabled={isOrderLocked}
                        onClick={() => handleInsertFormatting('*Itálico*')}
                        className="p-1 hover:bg-[#ede9dd] rounded-DEFAULT text-[#00322b] text-label-md disabled:opacity-50 cursor-pointer"
                        title="Itálico"
                      >
                        <span className="material-symbols-outlined text-[16px]">format_italic</span>
                      </button>
                      <div className="w-px h-4 bg-[#404846]/30 mx-1"></div>
                      <button
                        type="button"
                        disabled={isOrderLocked}
                        onClick={() => handleInsertFormatting('\n- ')}
                        className="p-1 hover:bg-[#ede9dd] rounded-DEFAULT text-[#00322b] text-label-md disabled:opacity-50 cursor-pointer"
                        title="Lista Tática"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          format_list_bulleted
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={isOrderLocked}
                        onClick={() => handleInsertFormatting('\n1. ')}
                        className="p-1 hover:bg-[#ede9dd] rounded-DEFAULT text-[#00322b] text-label-md disabled:opacity-50 cursor-pointer"
                        title="Lista Numerada"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          format_list_numbered
                        </span>
                      </button>
                      <div className="w-px h-4 bg-[#404846]/30 mx-1"></div>
                      <button
                        type="button"
                        disabled={isOrderLocked}
                        onClick={() => handleInsertFormatting(' [OBJETIVO: ALVO-ALFA] ')}
                        className="px-1.5 py-0.5 hover:bg-[#ede9dd] rounded-DEFAULT text-[#00322b] font-label-sm text-[10px] uppercase font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                        title="Adicionar Marcador de Alvo"
                      >
                        <span className="material-symbols-outlined text-[14px] text-[#ef4444]">
                          adjust
                        </span>
                        <span>Alvo</span>
                      </button>
                      <button
                        type="button"
                        disabled={isOrderLocked}
                        onClick={() => handleInsertFormatting(' (Grade 37S DU 5218 9410) ')}
                        className="px-1.5 py-0.5 hover:bg-[#ede9dd] rounded-DEFAULT text-[#00322b] font-label-sm text-[10px] uppercase font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                        title="Inserir Coordenada MGRS"
                      >
                        <span className="material-symbols-outlined text-[14px] text-[#00322d]">
                          grid_4x4
                        </span>
                        <span>MGRS</span>
                      </button>
                    </div>
                  </div>

                  {/* Structured Directive Textarea */}
                  <div className="flex flex-col gap-1">
                    <textarea
                      ref={directiveTextareaRef}
                      rows={7}
                      disabled={isOrderLocked}
                      value={currentOrder.directive_text}
                      onChange={(e) =>
                        setCurrentOrder((prev) => ({
                          ...prev,
                          directive_text: e.target.value,
                        }))
                      }
                      className="w-full bg-[#f7f4eb]/40 p-3 rounded-DEFAULT font-body-md text-[14px] text-[#0a0f0c] leading-relaxed focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#22d3ee] shadow-inner resize-y border border-[#404846]/30 disabled:opacity-75"
                    />
                    <div className="flex items-center justify-between text-[#404846] font-label-sm text-[10px] pt-1 font-bold">
                      <span>
                        Palavras: {wordCount} | Caracteres: {charCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SECTION 2 & 3: REGRAS DE ENGAJAMENTO (ROE) & RECURSOS */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* ROE Selection Matrix (Col 7) */}
                  <div className="lg:col-span-7 bg-white p-4 rounded-DEFAULT shadow-md flex flex-col gap-3 border border-[#404846]/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[#00322b] text-[20px]">
                          shield
                        </span>
                        <h3 className="font-headline-sm text-[15px] text-[#00322b] font-bold uppercase tracking-tight">
                          2. Regras de Engajamento (ROE)
                        </h3>
                      </div>
                      <span className="font-label-sm text-[9px] uppercase font-bold text-[#e07a2f] px-1.5 py-0.5 bg-[#e07a2f]/10 rounded-DEFAULT">
                        Parâmetro de Combate
                      </span>
                    </div>
                    <p className="font-body-sm text-[12px] text-[#313632] leading-relaxed">
                      Especifique a postura operacional geral, critérios de abertura de fogo,
                      limitações de escalada e restrições a alvos civis ou de infraestrutura
                      crítica.
                    </p>
                    <div className="flex flex-col gap-1 flex-1">
                      <label className="sr-only" htmlFor="customRoeInput">
                        Diretrizes de Engajamento Personalizadas
                      </label>
                      <textarea
                        id="customRoeInput"
                        rows={6}
                        disabled={isOrderLocked}
                        value={currentOrder.roe_text}
                        onChange={(e) =>
                          setCurrentOrder((prev) => ({
                            ...prev,
                            roe_text: e.target.value,
                          }))
                        }
                        placeholder="Descreva detalhadamente a postura de engajamento, condições de abertura de fogo, regras para danos colaterais e alvos de alta prioridade..."
                        className="w-full flex-1 bg-[#f7f4eb]/40 p-3 rounded-DEFAULT font-body-md text-[14px] text-[#0a0f0c] leading-relaxed focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#22d3ee] shadow-inner resize-y border border-[#404846]/30 disabled:opacity-75"
                      />
                      <div className="flex items-center justify-between text-[#404846] font-label-sm text-[10px] pt-1">
                        <span>Parâmetros de Restrição: Nível II (Hostilidade Confirmada)</span>
                        <span className="text-[#00322d] font-bold uppercase tracking-wider">
                          Diretiva Vinculante ao Turno
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: RECURSOS & ATIVOS DE APOIO (Col 5) */}
                  <div className="lg:col-span-5 bg-white p-4 rounded-DEFAULT shadow-md flex flex-col gap-3 border border-[#404846]/20">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[#00322b] text-[20px]">
                          tune
                        </span>
                        <h3 className="font-headline-sm text-[15px] text-[#00322b] font-bold uppercase tracking-tight">
                          3. Unidades &amp; Alocação de Apoio
                        </h3>
                      </div>
                      <button
                        type="button"
                        disabled={isOrderLocked}
                        onClick={() => setShowUnitPicker((prev) => !prev)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-[#00322b] hover:bg-[#00625a] text-[#f7f4eb] rounded-DEFAULT font-label-sm text-[9px] font-bold uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">add</span>
                        <span>Empenhar Unidades</span>
                      </button>
                    </div>

                    {/* Inline Unit Selector Dropdown */}
                    {showUnitPicker && !isOrderLocked && (
                      <div className="p-2.5 bg-[#ede9dd] rounded-DEFAULT border border-[#404846]/30 space-y-1.5">
                        <span className="font-label-sm text-[9px] uppercase font-bold text-[#00322b] block">
                          Selecionar Unidade Disponível no Teatro:
                        </span>
                        {availableTheaterUnits.length === 0 ? (
                          <p className="text-[11px] text-[#404846]">
                            Todas as unidades táticas já foram empenhadas nesta ordem.
                          </p>
                        ) : (
                          availableTheaterUnits.map((cand) => (
                            <button
                              key={cand.id}
                              type="button"
                              onClick={() => handleAddUnit(cand)}
                              className="w-full text-left flex items-center justify-between p-1.5 bg-white hover:bg-[#f7f4eb] rounded border border-[#404846]/20 text-[11px] transition-colors cursor-pointer"
                            >
                              <span className="font-bold text-[#00322b] truncate">{cand.name}</span>
                              <span className="text-[9px] font-bold text-[#16a34a] px-1.5 py-0.5 bg-[#16a34a]/10 rounded">
                                + Adicionar ({cand.health}% HP)
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[#404846] font-label-sm text-[9px] uppercase font-bold tracking-wider">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-[#00322d]">
                            shield
                          </span>
                          Unidades Selecionadas no Teatro ({currentOrder.committed_units.length})
                        </span>
                        <span className="text-[#00322b]">Prontas para Despacho</span>
                      </div>

                      <div className="space-y-1.5">
                        {currentOrder.committed_units.map((unit) => {
                          const badgeBg =
                            unit.accentType === 'allied'
                              ? 'bg-[#2d7d74] text-[#beece1]'
                              : unit.accentType === 'primary'
                              ? 'bg-[#00322b] text-[#f7f4eb]'
                              : 'bg-[#313632] text-[#dfe4dd]';
                          return (
                            <div
                              key={unit.id}
                              className="flex items-center justify-between p-2 bg-[#f7f4eb] rounded-DEFAULT shadow-sm border border-[#404846]/20"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`w-6 h-6 rounded-DEFAULT flex items-center justify-center text-[9px] font-label-sm font-bold shrink-0 ${badgeBg}`}
                                >
                                  {unit.symbol}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-label-md text-[11px] font-bold uppercase text-[#00322b] truncate">
                                      {unit.name}
                                    </span>
                                    <span
                                      className={`px-1 py-0.2 rounded-DEFAULT text-[9px] font-bold uppercase ${
                                        unit.health >= 90
                                          ? 'bg-[#16a34a]/20 text-[#16a34a]'
                                          : 'bg-[#a4f1e5]/40 text-[#00322d]'
                                      }`}
                                    >
                                      {unit.health}% HP
                                    </span>
                                  </div>
                                  <span className="font-body-sm text-[11px] text-[#404846] truncate">
                                    {unit.type}
                                  </span>
                                </div>
                              </div>
                              {!isOrderLocked && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveUnit(unit.id)}
                                  className="p-1 text-[#404846] hover:text-[#ef4444] hover:bg-[#ede9dd] rounded-DEFAULT transition-colors shrink-0 cursor-pointer"
                                  title="Desmarcar Unidade"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    close
                                  </span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 flex-1">
                      <label
                        className="font-label-sm text-[10px] uppercase font-bold text-[#00322b] tracking-wider flex items-center gap-1"
                        htmlFor="unitInstructionsInput"
                      >
                        <span className="material-symbols-outlined text-[14px] text-[#00322b]">
                          assignment
                        </span>
                        OUTROS Empenhos ou Instruções Específicas
                      </label>
                      <textarea
                        id="unitInstructionsInput"
                        rows={3}
                        disabled={isOrderLocked}
                        value={currentOrder.unit_instructions}
                        onChange={(e) =>
                          setCurrentOrder((prev) => ({
                            ...prev,
                            unit_instructions: e.target.value,
                          }))
                        }
                        placeholder="Descreva tarefas táticas, regras de deslocamento, setores de tiro e alvos prioritários para as unidades selecionadas acima..."
                        className="w-full flex-1 bg-[#f7f4eb]/40 p-2.5 rounded-DEFAULT font-body-md text-[13px] text-[#0a0f0c] leading-relaxed focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#22d3ee] shadow-inner resize-y border border-[#404846]/30 disabled:opacity-75"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 4: ÁREA DE ANEXOS TÁTICOS (DRAG & DROP) */}
                <div className="bg-white p-4 rounded-DEFAULT shadow-md flex flex-col gap-3 border border-[#404846]/20">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[#00322b] text-[20px]">
                        attach_file
                      </span>
                      <h3 className="font-headline-sm text-[15px] text-[#00322b] font-bold uppercase tracking-tight">
                        4. Documentação Gráfica &amp; Anexos Operacionais
                      </h3>
                    </div>
                    <span className="font-label-sm text-[10px] text-[#404846] uppercase font-semibold">
                      Formatos: PNG, JPG, PDF, TXT, DOCX (Max 15MB)
                    </span>
                  </div>

                  {/* Drag and Drop Dropzone */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    disabled={isOrderLocked}
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                  <div
                    onClick={() => !isOrderLocked && fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleFileUpload(e.dataTransfer.files);
                    }}
                    className={`w-full p-4 rounded-DEFAULT bg-[#f7f4eb]/60 hover:bg-[#f7f4eb] transition-colors flex flex-col items-center justify-center text-center shadow-inner group border border-dashed border-[#8a9290] ${
                      isOrderLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-[#00322b] group-hover:scale-105 transition-transform mb-2 shadow-sm">
                      <span className="material-symbols-outlined text-[26px]">cloud_upload</span>
                    </div>
                    <p className="font-headline-sm text-[14px] text-[#00322b] font-bold uppercase tracking-wide">
                      Arraste mapas de apoio, fotos de satélite anotadas ou relatórios de
                      inteligência
                    </p>
                    <p className="font-body-sm text-[12px] text-[#313632] mt-0.5">
                      ou clique para selecionar arquivos do seu computador
                    </p>
                  </div>

                  {/* Attached Files Roster */}
                  <div className="space-y-1.5">
                    <span className="font-label-sm text-[10px] uppercase font-bold text-[#404846] tracking-wider">
                      Arquivos Vinculados a Este Turno ({currentOrder.attachments.length})
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {currentOrder.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2.5 bg-[#f7f4eb] rounded-DEFAULT shadow-sm border border-[#404846]/20"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-DEFAULT bg-white flex items-center justify-center shrink-0 shadow-sm ${
                                att.type === 'pdf' ? 'text-[#ef4444]' : 'text-[#00322d]'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {att.type === 'pdf' ? 'picture_as_pdf' : 'image'}
                              </span>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span
                                className="font-label-md text-[12px] font-bold text-[#00322b] truncate"
                                title={att.name}
                              >
                                {att.name}
                              </span>
                              <span className="font-body-sm text-[11px] text-[#404846]">
                                {att.size} • {att.description || 'Anexo Operacional'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              type="button"
                              className="p-1 hover:bg-white rounded-DEFAULT text-[#00322b] cursor-pointer"
                              title="Download / Visualizar Anexo"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                download
                              </span>
                            </button>
                            {!isOrderLocked && (
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(att.id)}
                                className="p-1 hover:bg-[#93000a] hover:text-white rounded-DEFAULT text-[#ef4444] cursor-pointer"
                                title="Remover Arquivo"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  delete
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ACCORDION 1 INLINE ACTIONS / FORM CONTROLS */}
                <div className="bg-[#ede9dd] p-3 rounded-DEFAULT flex flex-wrap items-center justify-between gap-3 shadow-inner border border-[#404846]/30">
                  <div className="flex items-center gap-1.5 text-[#404846] font-label-md text-[12px]">
                    <span className="material-symbols-outlined text-[16px] text-[#00322d]">
                      info
                    </span>
                    <span>Despacho sujeito a trava irreversível após submissão à Mesa C2</span>
                  </div>

                  {showConfirmSubmit ? (
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-DEFAULT border border-[#ef4444] shadow-md">
                      <span className="text-[11px] font-bold text-[#93000a] uppercase">
                        Confirmar submissão definitiva à Mesa C2?
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowConfirmSubmit(false)}
                        className="px-2.5 py-1 bg-[#ede9dd] hover:bg-[#dcd5c5] text-[#0a0f0c] rounded text-[10px] font-bold uppercase cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmSubmission}
                        className="px-3 py-1 bg-[#16a34a] hover:bg-[#15803d] text-white rounded text-[10px] font-bold uppercase cursor-pointer"
                      >
                        Confirmar e Travar 🔒
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={isOrderLocked}
                        onClick={handleSaveDraft}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#f7f4eb] text-[#00322d] rounded-DEFAULT font-label-md text-[11px] uppercase tracking-wider font-bold shadow-sm transition-colors border border-[#404846]/30 disabled:opacity-50 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">save</span>
                        <span>{saveDraftToast ? 'Rascunho Salvo ✓' : 'Salvar Rascunho'}</span>
                      </button>

                      {currentOrder.status === 'submitted' ? (
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#16a34a] text-[#f7f4eb] rounded-DEFAULT font-label-lg text-[12px] uppercase tracking-wider font-bold shadow-lg cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            check_circle
                          </span>
                          <span>SUBMETIDO À MESA (TRAVADO)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isTeamChannelLocked}
                          onClick={() => setShowConfirmSubmit(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#00322b] hover:bg-[#00625a] text-[#f7f4eb] rounded-DEFAULT font-label-lg text-[12px] uppercase tracking-wider font-bold shadow-lg transition-all ring-1 ring-[#a2d0c5]/40 disabled:opacity-50 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">send</span>
                          <span>Submeter à Mesa Arbitral</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ============================================================ */}
          {/* ACCORDION 2: HISTÓRICO & GAVETA DE ORDENS SUBMETIDAS */}
          {/* ============================================================ */}
          <section
            className="border border-[#404846]/30 rounded-DEFAULT bg-[#f7f4eb] shadow-md overflow-hidden"
            id="accordionOrderHistory"
          >
            {/* Accordion 2 Header */}
            <button
              type="button"
              onClick={() => setIsHistoryAccordionOpen((prev) => !prev)}
              className="w-full text-left bg-[#ede9dd] hover:bg-[#ede9dd]/80 px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#404846]/30 transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className="material-symbols-outlined text-[#00322b] text-[24px] transform transition-transform duration-200"
                  style={{
                    transform: isHistoryAccordionOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                  }}
                >
                  expand_more
                </span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-headline-sm text-[16px] font-bold uppercase text-[#00322b] tracking-tight">
                      2. Histórico &amp; Gaveta de Ordens Submetidas
                    </span>
                    <span className="px-2 py-0.5 rounded-DEFAULT bg-[#00625a] text-[#8fdbd0] font-label-sm text-[9px] uppercase font-bold tracking-wider">
                      {pastOrders.length} Ordens Anteriores
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#313632] font-label-sm text-[11px]">
                    <span>
                      Registro oficial de diretivas enviadas pela Força-Tarefa Tigre e feedback
                      arbitral C2
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[#404846] font-label-sm text-[10px] uppercase">
                <span className="material-symbols-outlined text-[#00322d] text-[18px]">
                  history_edu
                </span>
                <span className="font-bold">Dossiê de Gabinete</span>
              </div>
            </button>

            {/* Accordion 2 Body */}
            {isHistoryAccordionOpen && (
              <div className="p-4 space-y-4 bg-[#f7f4eb]">
                {/* Summary / Search Filter Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#404846]/20">
                  <div className="flex items-center gap-1.5 text-[#313632] font-label-md text-[12px] uppercase font-bold">
                    <span className="material-symbols-outlined text-[18px] text-[#00322b]">
                      folder_special
                    </span>
                    <span>Despachos Anteriores Processados pela Moderação</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1 text-[#00322b] hover:underline font-label-sm text-[10px] font-bold uppercase cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">file_download</span>
                      Exportar Histórico Completo (PDF)
                    </button>
                  </div>
                </div>

                {/* List of Past Military Orders / SITREPs */}
                <div className="space-y-3">
                  {pastOrders.map((past) => {
                    const isArchived = past.status === 'archived';
                    return (
                      <div
                        key={past.id}
                        className={`bg-white p-3.5 rounded-DEFAULT shadow-md flex flex-col gap-2.5 border border-[#404846]/20 ${
                          isArchived ? 'opacity-80 hover:opacity-100 transition-opacity' : ''
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#404846]/20 pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-DEFAULT font-label-sm text-[9px] uppercase font-bold ${
                                isArchived
                                  ? 'bg-[#ede9dd] text-[#313632]'
                                  : past.turn_number === 1
                                  ? 'bg-[#00322b] text-[#f7f4eb]'
                                  : 'bg-[#ede9dd] text-[#313632]'
                              }`}
                            >
                              {isArchived
                                ? 'Turno 01 B • Variante'
                                : `Turno 0${past.turn_number} (${
                                    past.turn_number === 1 ? '10:00h' : '08:00h'
                                  })`}
                            </span>
                            <span
                              className={`font-title-md text-[14px] font-bold uppercase tracking-tight ${
                                isArchived ? 'text-[#404846]' : 'text-[#00322b]'
                              }`}
                            >
                              {past.title}
                            </span>
                            {isArchived ? (
                              <span className="px-2 py-0.5 rounded-DEFAULT bg-[#404846]/20 text-[#404846] font-label-sm text-[9px] uppercase font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">lock</span>
                                ARQUIVADO / SUBSTITUÍDO
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-DEFAULT bg-[#16a34a]/20 text-[#16a34a] font-label-sm text-[9px] uppercase font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">
                                  check_circle
                                </span>
                                {past.turn_number === 1
                                  ? 'RESOLVIDO / APROVADO PELA MESA'
                                  : 'EXECUTADO'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[#404846] font-label-sm text-[10px]">
                            {isArchived ? (
                              <>
                                <span>
                                  Substituído por: <strong>{past.replaced_by}</strong>
                                </span>
                                <span>•</span>
                                <span>{past.submitted_at}</span>
                              </>
                            ) : (
                              <>
                                <span>
                                  Despachado por:{' '}
                                  <strong className="text-[#0a0f0c]">{past.submitted_by}</strong>
                                </span>
                                <span>•</span>
                                <span>Enviado às {past.submitted_at}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {!isArchived && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-[#f7f4eb] p-2.5 rounded-DEFAULT text-[12px] shadow-inner">
                            <div>
                              <span className="font-label-sm text-[9px] uppercase text-[#404846] block font-bold">
                                Efetividade Tática:
                              </span>
                              <span className="font-headline-sm text-[15px] font-bold text-[#16a34a]">
                                {past.tactical_metrics.effectiveness}
                              </span>
                            </div>
                            <div>
                              <span className="font-label-sm text-[9px] uppercase text-[#404846] block font-bold">
                                Baixas / Perdas:
                              </span>
                              <span
                                className={`font-headline-sm text-[15px] font-bold ${
                                  past.tactical_metrics.losses === '0 baixas'
                                    ? 'text-[#00322d]'
                                    : 'text-[#ef4444]'
                                }`}
                              >
                                {past.tactical_metrics.losses}
                              </span>
                            </div>
                            <div>
                              <span className="font-label-sm text-[9px] uppercase text-[#404846] block font-bold">
                                {past.turn_number === 1 ? 'Objetivo Primário:' : 'Desdobramento:'}
                              </span>
                              <span className="font-headline-sm text-[15px] font-bold text-[#00322d]">
                                {past.tactical_metrics.objective_status}
                              </span>
                            </div>
                            <div>
                              <span className="font-label-sm text-[9px] uppercase text-[#404846] block font-bold">
                                {past.turn_number === 1 ? 'Documento Anexado:' : 'Comunicações:'}
                              </span>
                              <span className="font-headline-sm text-[15px] font-bold text-[#00322b]">
                                {past.tactical_metrics.attached_doc}
                              </span>
                            </div>
                          </div>
                        )}

                        {isArchived ? (
                          <div className="bg-[#f7f4eb] p-2.5 rounded-DEFAULT text-[12px] text-[#313632] shadow-inner">
                            <span className="font-label-sm text-[9px] uppercase text-[#404846] font-bold block mb-0.5">
                              Nota de Arquivo:
                            </span>
                            {past.archive_note}
                          </div>
                        ) : (
                          <div className="bg-[#f7f4eb] p-2.5 rounded-DEFAULT text-[12px] text-[#0a0f0c] shadow-inner border-l-2 border-[#00322b]">
                            <span className="font-label-sm text-[9px] uppercase text-[#00322b] font-bold block mb-0.5">
                              Resumo do Feedback Arbitral (Mesa C2):
                            </span>
                            {past.moderator_feedback}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailOrder(past)}
                            className="inline-flex items-center gap-1 text-[#00322b] hover:text-[#00625a] font-label-md text-[11px] font-bold uppercase transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              visibility
                            </span>
                            <span>
                              {isArchived ? 'Ver Rascunho Arquivado' : 'Ver Diretiva Enviada'}
                            </span>
                          </button>
                          <span className="font-label-sm text-[9px] text-[#404846] uppercase font-bold">
                            {isArchived
                              ? 'Versão Depreciada'
                              : `ID do Registro: ${past.record_id}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* 4. MODAL FOOTER: ACTION CONTROLS & STATUS STRIP (Fixed Bottom Bar) */}
        <div className="bg-[#ede9dd] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md text-[#313632] shrink-0 border-t border-[#404846]/30">
          <div className="flex items-center gap-1.5 text-[#404846] font-label-md text-[11px]">
            <span className="material-symbols-outlined text-[16px] text-[#00322d]">history</span>
            <span>
              2 seções operacionais ativas (Ordem do Turno {clockState.current_turn} &amp;
              Histórico de Gabinete)
            </span>
          </div>
          <form method="dialog" className="flex items-center gap-2 flex-wrap">
            <button
              type="submit"
              value="close"
              className="px-3.5 py-1.5 bg-white hover:bg-[#f7f4eb] text-[#00322b] rounded-DEFAULT font-label-md text-[11px] uppercase tracking-wider font-bold shadow-sm transition-colors border border-[#404846]/30 cursor-pointer"
            >
              Fechar / Ver Mapa
            </button>
          </form>
        </div>
      </dialog>

      <OrderDetailsModal
        order={selectedDetailOrder}
        onClose={() => setSelectedDetailOrder(null)}
      />
    </>
  );
}
