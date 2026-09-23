"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseResizablePanelOptions {
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
  side: 'left' | 'right';
  storageKey?: string;
}

export function useResizablePanel({
  initialWidth,
  minWidth,
  maxWidth,
  side,
  storageKey,
}: UseResizablePanelOptions) {
  const [width, setWidth] = useState<number>(initialWidth);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(initialWidth);
  const currentWidthRef = useRef<number>(initialWidth);

  // Restore persisted width on client mount to avoid hydration mismatch
  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
          setWidth(parsed);
          currentWidthRef.current = parsed;
        }
      }
    } catch {
      // ignore localStorage errors
    }
  }, [storageKey, minWidth, maxWidth]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = currentWidthRef.current;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startXRef.current;
      let newWidth: number;

      if (side === 'left') {
        newWidth = startWidthRef.current + deltaX;
      } else {
        // For right panel, dragging towards left (negative deltaX) increases width
        newWidth = startWidthRef.current - deltaX;
      }

      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      currentWidthRef.current = newWidth;
      setWidth(newWidth);
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      if (storageKey && typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, currentWidthRef.current.toString());
        } catch {
          // ignore
        }
      }
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [side, minWidth, maxWidth, storageKey]);

  return {
    width,
    setWidth,
    isDragging,
    handlePointerDown,
  };
}
