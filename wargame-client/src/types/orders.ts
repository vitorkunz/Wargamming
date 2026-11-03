export type OrderVerdict =
  | 'Sucesso Total'
  | 'Sucesso Parcial'
  | 'Falha / Repelido'
  | 'Embate Conflitante'
  | 'Impugnada'
  | 'Inócuo'
  | 'Sucesso Total (Campo Ativo)'
  | 'Falha / Neutralizado'
  | '';

export type OrderStatus = 'draft' | 'submitted' | 'evaluated' | 'archived';

export interface CommittedUnitSnapshot {
  id: string;
  name: string;
  type: string;
  health: number;
  role: string;
  symbol: string;
  accentType?: 'allied' | 'primary' | 'dark';
}

export interface OrderAttachment {
  id: string;
  name: string;
  size: string;
  type: 'image' | 'pdf' | 'kml' | 'doc';
  description?: string;
  url?: string;
}

export interface TacticalMetrics {
  effectiveness: string;
  losses: string;
  objective_status: string;
  attached_doc: string;
}

export interface TurnOrder {
  id: string;
  code: string;
  team: 'Player A' | 'Player B';
  brigade_name: string;
  title: string;
  turn_number: number;
  phase: 'planejamento' | 'avaliacao' | 'resolvido';
  operation_name: string;
  intent_summary: string;
  commitment_summary: string;
  directive_text: string;
  roe_text: string;
  unit_instructions: string;
  committed_units: CommittedUnitSnapshot[];
  attachments: OrderAttachment[];
  status: OrderStatus;
  verdict: OrderVerdict;
  moderator_feedback: string;
  tactical_metrics: TacticalMetrics;
  submitted_at?: string;
  submitted_by?: string;
  replaced_by?: string;
  archive_note?: string;
  record_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LinkedEntity {
  id: string;
  label: string;
  kind: 'unit' | 'poi';
  icon: string;
  faction?: 'allied' | 'opposing' | 'neutral';
}

export interface TurnSitrep {
  id: string;
  turn_number: number;
  operation_name: string;
  public_text: string;
  team_a_text: string;
  team_b_text: string;
  public_linked_entities: LinkedEntity[];
  team_a_linked_entities: LinkedEntity[];
  team_b_linked_entities: LinkedEntity[];
  public_attachments: OrderAttachment[];
  team_a_attachments: OrderAttachment[];
  team_b_attachments: OrderAttachment[];
  status: 'draft' | 'published';
  updated_at?: string;
}

export interface C2ClockState {
  current_turn: number;
  turn_time_remaining: number;
  turn_max_seconds: number;
  is_timer_running: boolean;
  is_locked_down: boolean;
  team_a_locked: boolean;
  team_b_locked: boolean;
}
