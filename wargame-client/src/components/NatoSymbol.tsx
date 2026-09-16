import ms from 'milsymbol';
import { useMemo } from 'react';
import { WARGAME_COLOR_MODE, WARGAME_FRAME_COLOR_MODE, WARGAME_ICON_COLOR_MODE } from '@/lib/milsymbol/constants';

export interface NatoSymbolProps {
  sidc: string;
  size?: number;
  className?: string;
}

export function NatoSymbol({ sidc, size = 64, className = '' }: NatoSymbolProps) {
  // Memoize the generated symbol so we don't recalculate on every single render
  const symbolUrl = useMemo(() => {
    try {
      // Air (A), Sea Surface (S), and Subsurface (U) frame shapes 
      // are visually much larger than ground frames in milsymbol. 
      // We scale them down to match visual weight.
      const dim = sidc.length >= 3 ? sidc[2].toUpperCase() : '';
      let finalSize = size;
      if (dim === 'A' || dim === 'S' || dim === 'U') {
        finalSize = Math.round(size * 0.75);
      }

      const symbol = new ms.Symbol(sidc, { 
        size: finalSize,
        strokeWidth: 4,
        colorMode: WARGAME_COLOR_MODE,
        frameColor: WARGAME_FRAME_COLOR_MODE,
        iconColor: WARGAME_ICON_COLOR_MODE
      });
      return symbol.toDataURL();
    } catch (e) {
      console.error("Failed to generate NATO symbol for SIDC:", sidc, e);
      return '';
    }
  }, [sidc, size]);

  if (!symbolUrl) return null;

  // We use a regular img tag since this is dynamically generated Base64 SVG data
  /* eslint-disable @next/next/no-img-element */
  return (
    <img 
      src={symbolUrl} 
      alt={`NATO Symbol: ${sidc}`} 
      className={className} 
    />
  );
}
