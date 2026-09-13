export const AFFILIATIONS = {
  friendly: 'F', // Friendly
  hostile: 'H',  // Hostile
  neutral: 'N',  // Neutral
  unknown: 'U'   // Unknown
} as const;

export type AffiliationKey = keyof typeof AFFILIATIONS;

export type UnitCategory = 
  | 'Ground Combat'
  | 'Combat Support'
  | 'Special & Irregular'
  | 'Air Units'
  | 'Maritime Units';

export interface UnitTypeDefinition {
  code: string;         // 6-character function ID
  dimension: 'G' | 'A' | 'S' | 'U'; // Battle dimension (Ground, Air, Sea Surface, Subsurface)
  category: UnitCategory;
  label: string;
}

export const UNIT_TYPES = {
  // Ground Combat
  infantry: { code: 'UCI---', dimension: 'G', category: 'Ground Combat', label: 'Infantry' },
  mechanized: { code: 'UCM---', dimension: 'G', category: 'Ground Combat', label: 'Mechanized Infantry' },
  armor: { code: 'UCA---', dimension: 'G', category: 'Ground Combat', label: 'Armor / Tank' },
  recon: { code: 'UCR---', dimension: 'G', category: 'Ground Combat', label: 'Reconnaissance' },
  artillery: { code: 'UCF---', dimension: 'G', category: 'Ground Combat', label: 'Field Artillery' },
  antiAir: { code: 'UCD---', dimension: 'G', category: 'Ground Combat', label: 'Air Defense' },
  engineer: { code: 'UCE---', dimension: 'G', category: 'Ground Combat', label: 'Engineer' },

  // Combat Support
  medical: { code: 'USM---', dimension: 'G', category: 'Combat Support', label: 'Medical' },
  supply: { code: 'USS---', dimension: 'G', category: 'Combat Support', label: 'Supply / Logistics' },
  maintenance: { code: 'USX---', dimension: 'G', category: 'Combat Support', label: 'Maintenance' },
  transportation: { code: 'UST---', dimension: 'G', category: 'Combat Support', label: 'Transportation' },
  signal: { code: 'UUS---', dimension: 'G', category: 'Combat Support', label: 'Signal / Communications' },
  militaryPolice: { code: 'UUP---', dimension: 'G', category: 'Combat Support', label: 'Military Police (MP)' },

  // Special & Irregular
  specialForces: { code: 'UCS---', dimension: 'G', category: 'Special & Irregular', label: 'Special Forces' },
  intel: { code: 'UUM---', dimension: 'G', category: 'Special & Irregular', label: 'Military Intelligence' },
  electronicWarfare: { code: 'UUE---', dimension: 'G', category: 'Special & Irregular', label: 'Electronic Warfare' },
  militia: { code: 'UCIZ--', dimension: 'G', category: 'Special & Irregular', label: 'Militia / Irregular' },

  // Air Units
  fighter: { code: 'MF----', dimension: 'A', category: 'Air Units', label: 'Fighter / Fixed-Wing' },
  helicopter: { code: 'MH----', dimension: 'A', category: 'Air Units', label: 'Attack Helicopter / Rotary' },
  uav: { code: 'MFQ---', dimension: 'A', category: 'Air Units', label: 'Drone / UAV' },
  airTransport: { code: 'MFC---', dimension: 'A', category: 'Air Units', label: 'Air Transport / Cargo' },

  // Maritime Units
  surfaceCombatant: { code: 'CL----', dimension: 'S', category: 'Maritime Units', label: 'Surface Combatant' },
  patrolCraft: { code: 'CP----', dimension: 'S', category: 'Maritime Units', label: 'Patrol Craft' },
  amphibious: { code: 'CA----', dimension: 'S', category: 'Maritime Units', label: 'Amphibious Warfare' },
  submarine: { code: 'SL----', dimension: 'U', category: 'Maritime Units', label: 'Submarine' },
} as const;

export type UnitTypeKey = keyof typeof UNIT_TYPES;

export const UNIT_CATEGORIES: UnitCategory[] = [
  'Ground Combat',
  'Combat Support',
  'Special & Irregular',
  'Air Units',
  'Maritime Units',
];

// Echelon sizes (character 12)
export const ECHELONS = {
  none: '-',                  // No Echelon
  team: 'A',                  // Team/Crew
  squad: 'B',                 // Squad
  section: 'C',               // Section
  platoon: 'E',               // Platoon/Detachment
  company: 'F',               // Company/Battery/Troop
  battalion: 'G',             // Battalion/Squadron
  regiment: 'H',              // Regiment/Group
  brigade: 'I',               // Brigade
  division: 'J',              // Division
} as const;

export type EchelonKey = keyof typeof ECHELONS;
