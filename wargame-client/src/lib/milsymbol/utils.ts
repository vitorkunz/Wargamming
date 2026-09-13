import { Unit } from '@/components/MapGrid';
import { AFFILIATIONS, UNIT_TYPES, ECHELONS } from './constants';

/**
 * Returns a valid SIDC string for a unit.
 * If the unit's type is already a 15-char SIDC, it returns it.
 * Otherwise, it attempts to map legacy types (Infantry, Tank, etc.) to an SIDC.
 */
export function getSidcForUnit(unit: { type: string, owner?: string }): string {
  // If it's already an SIDC (15 chars, usually starts with S)
  if (unit.type && unit.type.length === 15 && unit.type.startsWith('S')) {
    return unit.type;
  }

  // Legacy mapping
  const affiliation = unit.owner === 'Player A' ? 'H' : (unit.owner === 'Player B' ? 'F' : 'U'); // Assuming Player A is hostile to B, or just Red vs Blue.
  let typeCode = UNIT_TYPES.infantry;
  
  const lowerType = (unit.type || '').toLowerCase();
  if (lowerType.includes('tank') || lowerType.includes('armor')) typeCode = UNIT_TYPES.armor;
  else if (lowerType.includes('artillery')) typeCode = UNIT_TYPES.artillery;
  else if (lowerType.includes('recon')) typeCode = UNIT_TYPES.recon;
  else if (lowerType.includes('hq')) typeCode = UNIT_TYPES.hq;
  else if (lowerType.includes('air defense')) typeCode = UNIT_TYPES.antiAir;
  else if (lowerType.includes('engineer')) typeCode = UNIT_TYPES.engineer;

  return `S${affiliation}GP${typeCode}-F---`;
}

/**
 * Parses an SIDC code back to a human-readable string if needed.
 */
export function getHumanReadableFromSidc(sidc: string): string {
  if (!sidc || sidc.length !== 15) return sidc || 'Unknown';
  
  const typeCode = sidc.substring(4, 10);
  for (const [key, val] of Object.entries(UNIT_TYPES)) {
    if (val === typeCode) {
      return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
    }
  }
  return 'Unknown Unit';
}

export function parseSidc(sidc: string) {
  const result = {
    affiliationKey: 'friendly' as keyof typeof AFFILIATIONS,
    typeKey: 'infantry' as keyof typeof UNIT_TYPES,
    echelonKey: 'none' as keyof typeof ECHELONS,
  };

  if (!sidc || sidc.length !== 15 || !sidc.startsWith('S')) return result;

  const affilCode = sidc[1];
  const typeCode = sidc.substring(4, 10);
  const echelonCode = sidc[11];

  for (const [key, val] of Object.entries(AFFILIATIONS)) {
    if (val === affilCode) result.affiliationKey = key as keyof typeof AFFILIATIONS;
  }
  for (const [key, val] of Object.entries(UNIT_TYPES)) {
    if (val === typeCode) result.typeKey = key as keyof typeof UNIT_TYPES;
  }
  for (const [key, val] of Object.entries(ECHELONS)) {
    if (val === echelonCode) result.echelonKey = key as keyof typeof ECHELONS;
  }

  return result;
}
