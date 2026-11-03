"use client";
import React, { useEffect, useId, useRef } from 'react';
import { TurnOrder } from '@/types/orders';

interface OrderDetailsModalProps {
  order: TurnOrder | null;
  onClose: () => void;
}

export default function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (order) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [order]);

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

  if (!order) return null;

  const isTeamA = order.team === 'Player A';

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as any)}
      className="m-auto bg-white border border-[#d6cfbe] rounded-xl p-5 max-w-xl w-full shadow-2xl text-on-surface backdrop:bg-[#00322b]/50 backdrop:backdrop-blur-xs"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#eee8d9] pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-headline text-[11px] font-bold px-2 py-0.5 rounded text-white uppercase tracking-wider ${
                isTeamA ? 'bg-[#00322b]' : 'bg-[#8a2444]'
              }`}
            >
              {order.code}
            </span>
            <span className="font-headline text-[11px] text-on-surface-variant uppercase font-semibold">
              {isTeamA ? 'Time A • Governo' : 'Time B • Revoltosos'}
            </span>
            {order.brigade_name && (
              <span className="font-headline text-[10px] text-[#004d40] bg-[#e6f2ee] px-2 py-0.5 rounded font-bold uppercase">
                {order.brigade_name}
              </span>
            )}
          </div>
          <form method="dialog">
            <button
              type="submit"
              value="close"
              aria-label="Fechar detalhes da ordem"
              className="p-1 rounded-md hover:bg-surface-parchment-dim text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </form>
        </div>

        <div>
          <h2 id={titleId} className="font-headline text-[16px] font-bold text-[#00322b]">
            {order.operation_name || order.title}
          </h2>
          <p className="text-[14px] text-on-surface-variant mt-2 leading-relaxed whitespace-pre-line">
            {order.directive_text || order.intent_summary}
          </p>
        </div>

        {order.roe_text && (
          <div className="bg-surface-parchment p-3 rounded-lg border border-[#e2dccf] flex flex-col gap-1 text-[13px]">
            <span className="font-headline text-[10px] font-bold uppercase text-[#b45309]">
              Regras de Engajamento (ROE):
            </span>
            <p className="text-on-surface whitespace-pre-line text-[12px]">{order.roe_text}</p>
          </div>
        )}

        {order.commitment_summary && (
          <div className="bg-white p-3 rounded-lg border border-[#e2dccf] flex flex-col gap-1 text-[13px]">
            <span className="font-headline text-[10px] font-bold uppercase text-[#004d40]">
              Tropas & Recursos Empenhados:
            </span>
            <p className="text-on-surface font-medium text-[12px]">{order.commitment_summary}</p>
          </div>
        )}

        <div className="bg-surface-parchment-dim p-3.5 rounded-lg border border-[#e2dccf] flex flex-col gap-1 text-[13px]">
          <span className="font-headline text-[11px] font-bold uppercase text-[#004d40]">
            Diretrizes da Mesa para Resolução:
          </span>
          <p className="text-on-surface">
            {order.moderator_feedback
              ? order.moderator_feedback
              : 'Esta ordem está em interação direta com as forças adjacentes no setor. A rolagem de dispersão e cobertura é soberana da arbitragem.'}
          </p>
        </div>

        <form method="dialog" className="flex justify-end gap-2 pt-1">
          <button
            type="submit"
            value="close"
            autoFocus
            className="px-4 py-1.5 rounded-lg bg-surface-parchment-dim hover:bg-[#e4ded0] text-[#00322b] font-headline text-[11px] font-bold uppercase tracking-wider border border-[#d6cfbe] cursor-pointer"
          >
            Fechar
          </button>
        </form>
      </div>
    </dialog>
  );
}
