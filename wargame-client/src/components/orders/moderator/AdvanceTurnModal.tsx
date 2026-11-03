"use client";
import React, { useEffect, useId, useRef } from 'react';

interface AdvanceTurnModalProps {
  isOpen: boolean;
  nextTurnNumber: number;
  onClose: () => void;
  onConfirmAdvance: () => void;
}

export default function AdvanceTurnModal({
  isOpen,
  nextTurnNumber,
  onClose,
  onConfirmAdvance,
}: AdvanceTurnModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

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

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as any)}
      className="m-auto bg-white border border-[#d6cfbe] rounded-xl p-6 max-w-md w-full shadow-2xl text-center backdrop:bg-[#00322b]/50 backdrop:backdrop-blur-xs"
    >
      <div className="flex flex-col gap-4">
        <div className="w-12 h-12 rounded-full bg-[#dcf2ec] text-[#004d40] flex items-center justify-center mx-auto border border-[#b2ded2]">
          <span className="material-symbols-outlined text-[26px]">verified</span>
        </div>
        <div>
          <h2 id={titleId} className="font-headline text-[17px] font-bold text-[#00322b]">
            Confirmar Avanço para o Turno 0{nextTurnNumber}?
          </h2>
          <p className="text-[13px] text-[#475569] mt-2 leading-relaxed">
            O SITREP será congelado e publicado nos mapas dos delegados. O cronômetro do Turno 0
            {nextTurnNumber} será iniciado automaticamente com a duração regulamentar de 45
            minutos.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <form method="dialog">
            <button
              type="submit"
              value="cancel"
              autoFocus
              className="w-full py-2 rounded-lg bg-[#f2eee3] hover:bg-[#e4ded0] text-[#1e293b] font-headline text-[11px] font-bold uppercase tracking-wider border border-[#d6cfbe] cursor-pointer"
            >
              Revisar Ordens
            </button>
          </form>
          <button
            type="button"
            onClick={onConfirmAdvance}
            className="py-2 rounded-lg bg-[#00322b] hover:bg-[#00473d] text-white font-headline text-[11px] font-bold uppercase tracking-wider shadow-sm cursor-pointer"
          >
            Avançar Turno
          </button>
        </div>
      </div>
    </dialog>
  );
}
