import ms from 'milsymbol';
import { useMemo } from 'react';
import { WARGAME_COLOR_MODE, WARGAME_FRAME_COLOR_MODE, WARGAME_ICON_COLOR_MODE } from '@/lib/milsymbol/constants';

export interface NatoSymbolProps {
  sidc: string;
  size?: number;
  className?: string;
  variant?: 'default' | 'quick-panel';
}

export function NatoSymbol({ sidc, size = 64, className = '', variant = 'default' }: NatoSymbolProps) {
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

      const options: any = { size: finalSize, strokeWidth: 4 };
      if (variant === 'quick-panel') {
        const whiteMode = { Friend: '#ffffff', Hostile: '#ffffff', Neutral: '#ffffff', Unknown: '#ffffff', Civilian: '#ffffff', Suspect: '#ffffff' };
        const greenMode = { Friend: '#2d7d74', Hostile: '#2d7d74', Neutral: '#2d7d74', Unknown: '#2d7d74', Civilian: '#2d7d74', Suspect: '#2d7d74' };
        options.colorMode = whiteMode;
        options.frameColor = greenMode;
        options.iconColor = greenMode;
      } else {
        options.colorMode = WARGAME_COLOR_MODE;
        options.frameColor = WARGAME_FRAME_COLOR_MODE;
        options.iconColor = WARGAME_ICON_COLOR_MODE;
      }

      const symbol = new ms.Symbol(sidc, options);
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
