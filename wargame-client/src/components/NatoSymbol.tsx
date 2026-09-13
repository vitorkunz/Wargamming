import ms from 'milsymbol';
import { useMemo } from 'react';

export interface NatoSymbolProps {
  sidc: string;
  size?: number;
  className?: string;
}

export function NatoSymbol({ sidc, size = 64, className = '' }: NatoSymbolProps) {
  // Memoize the generated symbol so we don't recalculate on every single render
  const symbolUrl = useMemo(() => {
    try {
      const symbol = new ms.Symbol(sidc, { size });
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
      width={size} 
      height={size}
      className={className} 
    />
  );
}
