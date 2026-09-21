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
    let currentSidc = unit.type;
    // If it was created with the previous erroneous medical code (UAM---), patch to USM---
    if (currentSidc.includes('UAM---')) {
      currentSidc = currentSidc.replace('UAM---', 'USM---');
    }
    // Override affiliation if owner is provided (e.g., when a unit changes teams)
    if (unit.owner) {
      const expectedAffiliation = 
        unit.owner === 'Player A' ? 'F' : 
        unit.owner === 'Player B' ? 'H' : 
        unit.owner === 'Unknown' ? 'U' : 'N';
      if (currentSidc[1] !== expectedAffiliation) {
        currentSidc = currentSidc.substring(0, 1) + expectedAffiliation + currentSidc.substring(2);
      }
    }
    // Force echelon to unspecified '-'
    if (currentSidc[11] !== '-') {
      currentSidc = currentSidc.substring(0, 11) + '-' + currentSidc.substring(12);
    }
    return currentSidc;
  }

  // Legacy mapping
  const affiliation = unit.owner === 'Player A' ? 'F' : (unit.owner === 'Player B' ? 'H' : (unit.owner === 'Unknown' ? 'U' : 'N'));
  let selectedDef: UnitTypeDefinition = UNIT_TYPES.infantaria;
  
  const lowerType = (unit.type || '').toLowerCase();

  // Air
  if (lowerType.includes('fighter') || lowerType.includes('jet') || lowerType.includes('aircraft') || lowerType.includes('plane') || lowerType.includes('caça') || lowerType.includes('caca') || lowerType.includes('asa fixa')) {
    selectedDef = UNIT_TYPES.caca;
  } else if (lowerType.includes('heli') || lowerType.includes('rotary') || lowerType.includes('helicóptero') || lowerType.includes('helicoptero') || lowerType.includes('asa rotativa')) {
    selectedDef = UNIT_TYPES.helicoptero;
  } else if (lowerType.includes('drone') || lowerType.includes('uav') || lowerType.includes('vant')) {
    selectedDef = UNIT_TYPES.drone;
  } else if (lowerType.includes('air transport') || lowerType.includes('cargo plane') || lowerType.includes('transporte aéreo') || lowerType.includes('transporte aereo')) {
    selectedDef = UNIT_TYPES.transporteAereo;
  }
  // Maritime
  else if (lowerType.includes('submarine') || lowerType.includes('sub') || lowerType.includes('submarino')) {
    selectedDef = UNIT_TYPES.submarino;
  } else if (lowerType.includes('patrol craft') || lowerType.includes('patrol boat') || lowerType.includes('patrulha') || lowerType.includes('lancha')) {
    selectedDef = UNIT_TYPES.patrulha;
  } else if (lowerType.includes('amphibious') || lowerType.includes('anfíbio') || lowerType.includes('anfibio') || lowerType.includes('desembarque')) {
    selectedDef = UNIT_TYPES.anfibio;
  } else if (lowerType.includes('ship') || lowerType.includes('naval') || lowerType.includes('surface combatant') || lowerType.includes('destroyer') || lowerType.includes('frigate') || lowerType.includes('fragata') || lowerType.includes('corveta') || lowerType.includes('escolta') || lowerType.includes('navio')) {
    selectedDef = UNIT_TYPES.combatenteSuperficie;
  }
  // Special & Irregular
  else if (lowerType.includes('special force') || lowerType.includes('sof') || lowerType.includes('commando') || lowerType.includes('comandos') || lowerType.includes('forças especiais') || lowerType.includes('forcas especiais')) {
    selectedDef = UNIT_TYPES.forcasEspeciais;
  } else if (lowerType.includes('intel') || lowerType.includes('intelligence') || lowerType.includes('inteligência') || lowerType.includes('inteligencia')) {
    selectedDef = UNIT_TYPES.inteligencia;
  } else if (lowerType.includes('electronic warfare') || lowerType.includes('ew') || lowerType.includes('guerra eletrônica') || lowerType.includes('guerra eletronica')) {
    selectedDef = UNIT_TYPES.guerraEletronica;
  } else if (lowerType.includes('militia') || lowerType.includes('irregular') || lowerType.includes('partisan') || lowerType.includes('guerrilla') || lowerType.includes('guerrilha') || lowerType.includes('milícia') || lowerType.includes('milicia')) {
    selectedDef = UNIT_TYPES.milicia;
  }
  // Combat Support
  else if (lowerType.includes('police') || lowerType.includes('mp') || lowerType.includes('polícia') || lowerType.includes('policia') || lowerType.includes('pe')) {
    selectedDef = UNIT_TYPES.policiaExercito;
  } else if (lowerType.includes('signal') || lowerType.includes('comms') || lowerType.includes('communication') || lowerType.includes('comunicações') || lowerType.includes('comunicacoes')) {
    selectedDef = UNIT_TYPES.comunicacoes;
  } else if (lowerType.includes('transport') || lowerType.includes('transporte')) {
    selectedDef = UNIT_TYPES.transporte;
  } else if (lowerType.includes('maintenance') || lowerType.includes('repair') || lowerType.includes('manutenção') || lowerType.includes('manutencao')) {
    selectedDef = UNIT_TYPES.manutencao;
  } else if (lowerType.includes('supply') || lowerType.includes('logistics') || lowerType.includes('suprimento') || lowerType.includes('logística') || lowerType.includes('logistica')) {
    selectedDef = UNIT_TYPES.suprimento;
  } else if (lowerType.includes('medical') || lowerType.includes('medic') || lowerType.includes('hospital') || lowerType.includes('saúde') || lowerType.includes('saude')) {
    selectedDef = UNIT_TYPES.saude;
  }
  // Ground Combat
  else if (lowerType.includes('anti-tank') || lowerType.includes('anti tank') || lowerType.includes('anti-armor') || lowerType.includes('anti armor') || lowerType.includes('atgm') || lowerType.includes('anticarro') || lowerType.includes('antitanque')) {
    selectedDef = UNIT_TYPES.anticarro;
  } else if (lowerType.includes('tank') || lowerType.includes('armor') || lowerType.includes('blindado') || lowerType.includes('carro de combate') || lowerType.includes('cbt')) {
    selectedDef = UNIT_TYPES.blindados;
  } else if (lowerType.includes('mech') || lowerType.includes('mecanizada')) {
    selectedDef = UNIT_TYPES.mecanizada;
  } else if (lowerType.includes('artillery') || lowerType.includes('artilharia')) {
    selectedDef = UNIT_TYPES.artilharia;
  } else if (lowerType.includes('recon') || lowerType.includes('reconhecimento')) {
    selectedDef = UNIT_TYPES.reconhecimento;
  } else if (lowerType.includes('air defense') || lowerType.includes('anti air') || lowerType.includes('antiair') || lowerType.includes('antiaérea') || lowerType.includes('antiaerea')) {
    selectedDef = UNIT_TYPES.defesaAntiaerea;
  } else if (lowerType.includes('engineer') || lowerType.includes('engenharia')) {
    selectedDef = UNIT_TYPES.engenharia;
  } else if (lowerType.includes('infantry') || lowerType.includes('infantaria')) {
    selectedDef = UNIT_TYPES.infantaria;
  }

  return `S${affiliation}${selectedDef.dimension}P${selectedDef.code}-----`;
}

/**
 * Parses an SIDC code back to a human-readable string if needed.
 */
export function getHumanReadableFromSidc(sidc: string): string {
  if (!sidc || sidc.length !== 15) return sidc || 'Não identificado';
  
  const dim = sidc[2];
  const typeCode = sidc.substring(4, 10);
  if (typeCode === 'UAM---') return 'Saúde';

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

  return 'Unidade Desconhecida';
}

export function parseSidc(sidc: string) {
  const result = {
    affiliationKey: 'friendly' as keyof typeof AFFILIATIONS,
    typeKey: 'infantaria' as UnitTypeKey,
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
    result.typeKey = 'saude';
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
