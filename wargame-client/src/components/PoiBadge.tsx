import React from 'react';
import { 
  Shield, 
  Factory, 
  MoveHorizontal, 
  Plane, 
  ShieldAlert, 
  MapPin, 
  Warehouse, 
  Anchor, 
  Radar, 
  Flag,
  Building2,
  HelpCircle,
  X
} from 'lucide-react';

interface PoiBadgeProps {
  type: string;
  owner?: string;
  status?: string;
  size?: number;
  className?: string;
}

export function PoiBadge({ type, owner, status = 'operational', size = 24, className = '' }: PoiBadgeProps) {
  const getIcon = () => {
    const iconSize = Math.max(10, Math.round(size * 0.58));
    const props = { size: iconSize, color: 'white' };
    switch (type) {
      case 'military_base': return <Shield {...props} />;
      case 'hq':
      case 'headquarters': return <Building2 {...props} />;
      case 'factory': return <Factory {...props} />;
      case 'bridge': return <MoveHorizontal {...props} />; // Closest to a bridge structure
      case 'airfield': return <Plane {...props} />;
      case 'bunker': return <ShieldAlert {...props} />;
      case 'checkpoint': return <MapPin {...props} />;
      case 'depot': return <Warehouse {...props} />;
      case 'port': return <Anchor {...props} />;
      case 'radar': return <Radar {...props} />;
      case 'outpost': return <Flag {...props} />;
      default: return <HelpCircle {...props} />;
    }
  };

  const getOwnerColors = () => {
    switch (owner) {
      case 'Player A': return 'bg-red-700 border-red-400 text-red-100';
      case 'Player B': return 'bg-blue-600 border-blue-400 text-blue-100';
      default: return 'bg-slate-600 border-slate-400 text-slate-100'; // Neutral or undefined
    }
  };

  const getStatusStyles = () => {
    switch (status) {
      case 'damaged': return 'border-dashed border-orange-500 opacity-80';
      case 'destroyed': return 'grayscale opacity-60 border-solid border-slate-800 bg-slate-900';
      case 'under_construction': return 'border-dotted opacity-90';
      default: return '';
    }
  };

  return (
    <div 
      className={`relative ${size < 26 ? 'rounded border' : 'rounded-md border-2'} shadow-md flex items-center justify-center transition-all ${getOwnerColors()} ${getStatusStyles()} ${className}`}
      style={{ width: size, height: size }}
    >
      {getIcon()}
      
      {/* Overlay for destroyed status */}
      {status === 'destroyed' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <X size={size * 0.8} color="#ef4444" strokeWidth={3} className="opacity-80 drop-shadow-md" />
        </div>
      )}
    </div>
  );
}
