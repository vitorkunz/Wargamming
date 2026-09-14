import { Unit } from '@/components/MapGrid';
import { AFFILIATIONS, UNIT_TYPES, ECHELONS, UnitTypeKey, UnitTypeDefinition } from './constants';

/**
 * Returns a valid SIDC string for a unit.
 * If the unit's type is already a 15-char SIDC, it returns it.
 * Otherwise, it attempts to map legacy types (Infantry, Tank, etc.) to an SIDC.
 */
export function getSidcForUnit(unit: { type: string, owner?: string }): string {
  // If it's already an SIDC (15 chars, usually starts with S)
  if (unit.type && unit.type.length === 15 && unit.type.startsWith('S')) {
    // If it was created with the previous erroneous medical code (UAM---), patch to USM---
    if (unit.type.includes('UAM---')) {
      return unit.type.replace('UAM---', 'USM---');
    }
    return unit.type;
  }

  // Legacy mapping
  const affiliation = unit.owner === 'Player A' ? 'H' : (unit.owner === 'Player B' ? 'F' : 'U');
  let selectedDef: UnitTypeDefinition = UNIT_TYPES.infantry;
  
  const lowerType = (unit.type || '').toLowerCase();

  // Air
  if (lowerType.includes('fighter') || lowerType.includes('jet') || lowerType.includes('aircraft') || lowerType.includes('plane')) {
    selectedDef = UNIT_TYPES.fighter;
  } else if (lowerType.includes('heli') || lowerType.includes('rotary')) {
    selectedDef = UNIT_TYPES.helicopter;
  } else if (lowerType.includes('drone') || lowerType.includes('uav')) {
    selectedDef = UNIT_TYPES.uav;
  } else if (lowerType.includes('air transport') || lowerType.includes('cargo plane')) {
    selectedDef = UNIT_TYPES.airTransport;
  }
  // Maritime
  else if (lowerType.includes('submarine') || lowerType.includes('sub')) {
    selectedDef = UNIT_TYPES.submarine;
  } else if (lowerType.includes('patrol craft') || lowerType.includes('patrol boat')) {
    selectedDef = UNIT_TYPES.patrolCraft;
  } else if (lowerType.includes('amphibious')) {
    selectedDef = UNIT_TYPES.amphibious;
  } else if (lowerType.includes('ship') || lowerType.includes('naval') || lowerType.includes('surface combatant') || lowerType.includes('destroyer') || lowerType.includes('frigate')) {
    selectedDef = UNIT_TYPES.surfaceCombatant;
  }
  // Special & Irregular
  else if (lowerType.includes('special force') || lowerType.includes('sof') || lowerType.includes('commando')) {
    selectedDef = UNIT_TYPES.specialForces;
  } else if (lowerType.includes('intel') || lowerType.includes('intelligence')) {
    selectedDef = UNIT_TYPES.intel;
  } else if (lowerType.includes('electronic warfare') || lowerType.includes('ew')) {
    selectedDef = UNIT_TYPES.electronicWarfare;
  } else if (lowerType.includes('militia') || lowerType.includes('irregular') || lowerType.includes('partisan') || lowerType.includes('guerrilla')) {
    selectedDef = UNIT_TYPES.militia;
  }
  // Combat Support
  else if (lowerType.includes('police') || lowerType.includes('mp')) {
    selectedDef = UNIT_TYPES.militaryPolice;
  } else if (lowerType.includes('signal') || lowerType.includes('comms') || lowerType.includes('communication')) {
    selectedDef = UNIT_TYPES.signal;
  } else if (lowerType.includes('transport')) {
    selectedDef = UNIT_TYPES.transportation;
  } else if (lowerType.includes('maintenance') || lowerType.includes('repair')) {
    selectedDef = UNIT_TYPES.maintenance;
  } else if (lowerType.includes('supply') || lowerType.includes('logistics')) {
    selectedDef = UNIT_TYPES.supply;
  } else if (lowerType.includes('medical') || lowerType.includes('medic') || lowerType.includes('hospital')) {
    selectedDef = UNIT_TYPES.medical;
  }
  // Ground Combat
  else if (lowerType.includes('anti-tank') || lowerType.includes('anti tank') || lowerType.includes('anti-armor') || lowerType.includes('anti armor') || lowerType.includes('atgm')) {
    selectedDef = UNIT_TYPES.antiTank;
  } else if (lowerType.includes('tank') || lowerType.includes('armor')) {
    selectedDef = UNIT_TYPES.armor;
  } else if (lowerType.includes('mech')) {
    selectedDef = UNIT_TYPES.mechanized;
  } else if (lowerType.includes('artillery')) {
    selectedDef = UNIT_TYPES.artillery;
  } else if (lowerType.includes('recon')) {
    selectedDef = UNIT_TYPES.recon;
  } else if (lowerType.includes('air defense') || lowerType.includes('anti air') || lowerType.includes('antiair')) {
    selectedDef = UNIT_TYPES.antiAir;
  } else if (lowerType.includes('engineer')) {
    selectedDef = UNIT_TYPES.engineer;
  }

  return `S${affiliation}${selectedDef.dimension}P${selectedDef.code}-F---`;
}

/**
 * Parses an SIDC code back to a human-readable string if needed.
 */
export function getHumanReadableFromSidc(sidc: string): string {
  if (!sidc || sidc.length !== 15) return sidc || 'Unknown';
  
  const dim = sidc[2];
  const typeCode = sidc.substring(4, 10);
  if (typeCode === 'UAM---') return 'Medical';

  // Try exact match with dimension + function code
  for (const [, val] of Object.entries(UNIT_TYPES)) {
    if (val.code === typeCode && val.dimension === dim) {
      return val.label;
    }
  }

  // Fallback to code only
  for (const [, val] of Object.entries(UNIT_TYPES)) {
    if (val.code === typeCode) {
      return val.label;
    }
  }

  return 'Unknown Unit';
}

export function parseSidc(sidc: string) {
  const result = {
    affiliationKey: 'friendly' as keyof typeof AFFILIATIONS,
    typeKey: 'infantry' as UnitTypeKey,
    echelonKey: 'none' as keyof typeof ECHELONS,
  };

  if (!sidc || sidc.length !== 15 || !sidc.startsWith('S')) return result;

  const affilCode = sidc[1];
  const dim = sidc[2];
  const typeCode = sidc.substring(4, 10);
  const echelonCode = sidc[11];

  for (const [key, val] of Object.entries(AFFILIATIONS)) {
    if (val === affilCode) result.affiliationKey = key as keyof typeof AFFILIATIONS;
  }
  
  if (typeCode === 'UAM---') {
    result.typeKey = 'medical';
  } else {
    // Exact match with dimension and code first
    let matched = false;
    for (const [key, val] of Object.entries(UNIT_TYPES)) {
      if (val.code === typeCode && val.dimension === dim) {
        result.typeKey = key as UnitTypeKey;
        matched = true;
        break;
      }
    }
    // Fallback if dimension was different
    if (!matched) {
      for (const [key, val] of Object.entries(UNIT_TYPES)) {
        if (val.code === typeCode) {
          result.typeKey = key as UnitTypeKey;
          break;
        }
      }
    }
  }

  for (const [key, val] of Object.entries(ECHELONS)) {
    if (val === echelonCode) result.echelonKey = key as keyof typeof ECHELONS;
  }

  return result;
}
