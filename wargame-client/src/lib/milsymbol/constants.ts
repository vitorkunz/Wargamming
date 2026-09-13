export const AFFILIATIONS = {
  friendly: 'F', // Friendly
  hostile: 'H',  // Hostile
  neutral: 'N',  // Neutral
  unknown: 'U'   // Unknown
} as const;

export type AffiliationKey = keyof typeof AFFILIATIONS;

// A small subset of APP-6/2525C unit types (characters 5-10)
export const UNIT_TYPES = {
  infantry: 'UCI---',         // Infantry
  mechanized: 'UCM---',       // Mechanized Infantry
  armor: 'UCA---',            // Armor
  recon: 'UCR---',            // Reconnaissance
  artillery: 'UCF---',        // Field Artillery
  antiAir: 'UCD---',          // Air Defense
  engineer: 'UCE---',         // Engineer
  medical: 'UAM---',          // Medical
  hq: 'U----A'                // Headquarters (modifier)
} as const;

export type UnitTypeKey = keyof typeof UNIT_TYPES;

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
