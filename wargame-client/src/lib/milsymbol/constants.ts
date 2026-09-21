export const AFFILIATIONS = {
  friendly: 'F', // Friendly
  hostile: 'H',  // Hostile
  neutral: 'N',  // Neutral
  unknown: 'U'   // Unknown
} as const;

export type AffiliationKey = keyof typeof AFFILIATIONS;

export const AFFILIATION_LABELS: Record<AffiliationKey, string> = {
  friendly: 'Amigo / Aliado',
  hostile: 'Hostil / Inimigo',
  neutral: 'Neutro',
  unknown: 'Incógnito / Não Confirmado'
};

export type UnitCategory = 
  | 'Combate Terrestre'
  | 'Apoio ao Combate'
  | 'Operações Especiais & Irregulares'
  | 'Unidades Aéreas'
  | 'Unidades Navais';

export interface UnitTypeDefinition {
  code: string;         // 6-character function ID (MIL-STD-2525)
  dimension: 'G' | 'A' | 'S' | 'U'; // Battle dimension (Ground, Air, Sea Surface, Subsurface)
  category: UnitCategory;
  label: string;
}

export const UNIT_TYPES = {
  // Combate Terrestre
  infantaria: { code: 'UCI---', dimension: 'G', category: 'Combate Terrestre', label: 'Infantaria' },
  mecanizada: { code: 'UCIZ--', dimension: 'G', category: 'Combate Terrestre', label: 'Infantaria Mecanizada' },
  blindados: { code: 'UCA---', dimension: 'G', category: 'Combate Terrestre', label: 'Blindados / Carros de Combate' },
  anticarro: { code: 'UCAA--', dimension: 'G', category: 'Combate Terrestre', label: 'Anticarro / Antitanque' },
  reconhecimento: { code: 'UCR---', dimension: 'G', category: 'Combate Terrestre', label: 'Reconhecimento' },
  artilharia: { code: 'UCF---', dimension: 'G', category: 'Combate Terrestre', label: 'Artilharia de Campanha' },
  defesaAntiaerea: { code: 'UCD---', dimension: 'G', category: 'Combate Terrestre', label: 'Defesa Antiaérea' },
  engenharia: { code: 'UCE---', dimension: 'G', category: 'Combate Terrestre', label: 'Engenharia' },

  // Apoio ao Combate
  saude: { code: 'USM---', dimension: 'G', category: 'Apoio ao Combate', label: 'Saúde / Hospitalar' },
  suprimento: { code: 'USS---', dimension: 'G', category: 'Apoio ao Combate', label: 'Suprimento / Logística' },
  manutencao: { code: 'USX---', dimension: 'G', category: 'Apoio ao Combate', label: 'Manutenção' },
  transporte: { code: 'UST---', dimension: 'G', category: 'Apoio ao Combate', label: 'Transporte' },
  comunicacoes: { code: 'UUS---', dimension: 'G', category: 'Apoio ao Combate', label: 'Comunicações' },
  policiaExercito: { code: 'UUL---', dimension: 'G', category: 'Apoio ao Combate', label: 'Polícia do Exército (PE)' },

  // Operações Especiais & Irregulares
  forcasEspeciais: { code: 'UCS---', dimension: 'G', category: 'Operações Especiais & Irregulares', label: 'Forças Especiais' },
  inteligencia: { code: 'UUM---', dimension: 'G', category: 'Operações Especiais & Irregulares', label: 'Inteligência Militar' },
  guerraEletronica: { code: 'UUE---', dimension: 'G', category: 'Operações Especiais & Irregulares', label: 'Guerra Eletrônica' },
  milicia: { code: 'UC----', dimension: 'G', category: 'Operações Especiais & Irregulares', label: 'Milícia / Forças Irregulares' },

  // Unidades Aéreas
  caca: { code: 'MF----', dimension: 'A', category: 'Unidades Aéreas', label: 'Caça / Asa Fixa' },
  helicoptero: { code: 'MH----', dimension: 'A', category: 'Unidades Aéreas', label: 'Helicóptero de Ataque / Asa Rotativa' },
  drone: { code: 'MFQ---', dimension: 'A', category: 'Unidades Aéreas', label: 'Drone / VANT' },
  transporteAereo: { code: 'MFC---', dimension: 'A', category: 'Unidades Aéreas', label: 'Transporte Aéreo / Carga' },

  // Unidades Navais
  combatenteSuperficie: { code: 'CL----', dimension: 'S', category: 'Unidades Navais', label: 'Combatente de Superfície' },
  patrulha: { code: 'CP----', dimension: 'S', category: 'Unidades Navais', label: 'Navio-Patrulha' },
  anfibio: { code: 'CA----', dimension: 'S', category: 'Unidades Navais', label: 'Força Anfíbia / Desembarque' },
  submarino: { code: 'SL----', dimension: 'U', category: 'Unidades Navais', label: 'Submarino' },
} as const;

export type UnitTypeKey = keyof typeof UNIT_TYPES;

// Mapeamento retroativo para garantir que referências ou dados legados em inglês continuem funcionando perfeitamente
export const LEGACY_TYPE_MAP: Record<string, UnitTypeKey> = {
  infantry: 'infantaria',
  mechanized: 'mecanizada',
  armor: 'blindados',
  antiTank: 'anticarro',
  recon: 'reconhecimento',
  artillery: 'artilharia',
  antiAir: 'defesaAntiaerea',
  engineer: 'engenharia',
  medical: 'saude',
  supply: 'suprimento',
  maintenance: 'manutencao',
  transportation: 'transporte',
  signal: 'comunicacoes',
  militaryPolice: 'policiaExercito',
  specialForces: 'forcasEspeciais',
  intel: 'inteligencia',
  electronicWarfare: 'guerraEletronica',
  militia: 'milicia',
  fighter: 'caca',
  helicopter: 'helicoptero',
  uav: 'drone',
  airTransport: 'transporteAereo',
  surfaceCombatant: 'combatenteSuperficie',
  patrolCraft: 'patrulha',
  amphibious: 'anfibio',
  submarine: 'submarino',
};

export const UNIT_CATEGORIES: UnitCategory[] = [
  'Combate Terrestre',
  'Apoio ao Combate',
  'Operações Especiais & Irregulares',
  'Unidades Aéreas',
  'Unidades Navais',
];

// Echelon sizes (character 12 no SIDC)
export const ECHELONS = {
  none: '-',                  // Sem Escalão
  team: 'A',                  // Equipe / Guarnição
  squad: 'B',                 // Grupo de Combate (GC) / Esquadra
  section: 'C',               // Seção
  platoon: 'E',               // Pelotão / Destacamento
  company: 'F',               // Companhia / Bateria / Esquadrão
  battalion: 'G',             // Batalhão / Grupo
  regiment: 'H',              // Regimento
  brigade: 'I',               // Brigada
  division: 'J',              // Divisão
} as const;

export type EchelonKey = keyof typeof ECHELONS;

export const ECHELON_LABELS: Record<EchelonKey, string> = {
  none: 'Sem Escalão',
  team: 'Equipe / Guarnição',
  squad: 'Grupo de Combate (GC)',
  section: 'Seção',
  platoon: 'Pelotão',
  company: 'Companhia / Bateria',
  battalion: 'Batalhão / Grupo',
  regiment: 'Regimento',
  brigade: 'Brigada',
  division: 'Divisão'
};
// Custom Color palettes to integrate milsymbol with Wargame's CSS theme
export const WARGAME_COLOR_MODE = {
  Friend: '#2d7d74',   // Player A: Teal green
  Hostile: '#4e1a3d',  // Player B: Dark plum
  Neutral: '#26265b',  // Neutral: Navy slate
  Unknown: '#d4a017',  // Unknown: Tactical gold/yellow
  Civilian: '#26265b',
  Suspect: '#c03a6b'
};

export const WARGAME_FRAME_COLOR_MODE = {
  Friend: '#a4f1e5',   // Player A: Mint accent
  Hostile: '#c03a6b',  // Player B: Magenta accent
  Neutral: '#a4f1e5',  // Neutral: Light cyan
  Unknown: '#d4a017',  // Unknown: Gold accent
  Civilian: '#a4f1e5',
  Suspect: '#c03a6b'
};

export const WARGAME_ICON_COLOR_MODE = {
  Friend: '#ffffff',
  Hostile: '#ffffff',
  Neutral: '#ffffff',
  Unknown: '#ffffff',
  Civilian: '#ffffff',
  Suspect: '#ffffff'
};
