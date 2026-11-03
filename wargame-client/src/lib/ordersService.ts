import { supabase } from './supabaseClient';
import {
  TurnOrder,
  TurnSitrep,
  C2ClockState,
  OrderVerdict,
} from '@/types/orders';

const STORAGE_KEYS = {
  ORDERS: 'ufsmun_c2_turn_orders_v1',
  SITREP: 'ufsmun_c2_turn_sitrep_v1',
  CLOCK: 'ufsmun_c2_clock_state_v1',
};

export const INITIAL_CLOCK_STATE: C2ClockState = {
  current_turn: 2,
  turn_time_remaining: 1122, // 18m 42s
  turn_max_seconds: 2700,    // 45m
  is_timer_running: true,
  is_locked_down: false,
  team_a_locked: false,
  team_b_locked: false,
};

export const INITIAL_PLAYER_CURRENT_ORDER: TurnOrder = {
  id: 'current-order-turn-2-a',
  code: 'ORD-A05',
  team: 'Player A',
  brigade_name: 'FORÇA-TAREFA TIGRE / 2ª LEGIÃO',
  title: 'Consolidação da Usina de Tabqa & Fixação Eixo M4',
  turn_number: 2,
  phase: 'planejamento',
  operation_name: 'OPERAÇÃO MARTELO DE ÉUFRATES',
  intent_summary: 'Consolidação defensiva prioritária do complexo hidroelétrico da Usina de Tabqa (Obj. ALFA) e avanço blindado de fixação ao longo do corredor do Eixo M4.',
  commitment_summary: '2ª Legião de Infantaria (FT-Tigre) + 1º Esquadrão Blindado (M1A2) + 1ª Comp. Anti-Tanque',
  directive_text: `I. INTENÇÃO DO COMANDANTE & OBJETIVOS IMEDIATOS:
Consolidação defensiva prioritária do complexo hidroelétrico da Usina de Tabqa (Obj. ALFA) e avanço blindado de fixação ao longo do corredor do Eixo M4. Impedir a travessia de bimotores hostis para a margem ocidental do Rio Éufrates.

II. MANOBRAS TERRESTRES & DISTRIBUIÇÃO DE FORÇAS:
- A 2ª Legião de Infantaria Motorizada (FT-Tigre) avançará em formação dispersa em direção à cabeceira sul da Ponte de Jarabulos (Grade 37S DU 5218 9410).
- O 1º Esquadrão Blindado estabelecerá posições de contenção em deflexão atrás do aterro ferroviário, provendo cobertura antitanque caso unidades blindadas da Coalizão Sul iniciem manobra de flanqueamento.

III. AÇÕES DE APOIO DE FOGO & RECONHECIMENTO AÉREO:
- Baterias de Obuseiros 155mm em prontidão para disparos de interdição na rota de aproximação M4-Sul.
- Drone ISR-01 manterá vigilância persistente sobre o entroncamento viário de Ar-Raqqah Oeste.

IV. AÇÕES DIPLOMÁTICAS & CONTROLE CIVIL:
- Estabelecimento de corredor neutro de evacuação médica coordenado com o Comitê Internacional da Cruz Vermelha para os civis do bairro periférico de Al-Thawrah.`,
  roe_text: `POSTURA OPERACIONAL: CONTROLE ATIVO PERIMETRAL.

1. Condições de Disparo: Engajar somente alvos com hostilidade confirmada por vetor ISR ou linha de visada direta da 2ª Legião.
2. Infraestrutura Crítica: Proibição terminante de fogo indireto ou ataques com munição de alto impacto no perímetro da Usina de Tabqa (Obj. ALFA).
3. Danos Colaterais: Priorizar corredores civis neutros e solicitar autorização arbitral C2 para alvos em malha urbana.`,
  unit_instructions: `- 2ª Legião: avanço coordenado até a cabeceira da ponte sob cortina de fumaça;
- 1º Esq. Blindado: assentar posições de contenção antitanque e cobrir flanco sul;
- 1ª Comp. AT: priorizar interdição de blindados hostis no entroncamento M4.`,
  committed_units: [
    {
      id: 'unit-ft-tigre',
      name: '2ª Legião de Infantaria (FT-Tigre)',
      type: 'Infantaria Motorizada • Eixo Tabqa',
      health: 100,
      role: 'Infantaria Motorizada',
      symbol: 'II',
      accentType: 'allied',
    },
    {
      id: 'unit-esq-blindado',
      name: '1º Esquadrão Blindado (M1A2)',
      type: 'Cavalaria de Choque • Aterro Ferroviário',
      health: 85,
      role: 'Cavalaria de Choque',
      symbol: '▲',
      accentType: 'primary',
    },
    {
      id: 'unit-comp-at',
      name: '1ª Comp. Anti-Tanque (TOW/Javelin)',
      type: 'Vetor Anti-Blindado • Flanco Sul',
      health: 92,
      role: 'Vetor Anti-Blindado',
      symbol: 'AT',
      accentType: 'dark',
    },
  ],
  attachments: [
    {
      id: 'att-1',
      name: 'croqui_tabqa_v2.png',
      size: '2.4 MB',
      type: 'image',
      description: 'Croqui Vetorial Tático',
    },
    {
      id: 'att-2',
      name: 'sitrep_inteligencia.pdf',
      size: '840 KB',
      type: 'pdf',
      description: 'Relatório de Inteligência',
    },
  ],
  status: 'draft',
  verdict: '',
  moderator_feedback: '',
  tactical_metrics: {
    effectiveness: '—',
    losses: '—',
    objective_status: 'EM PLANEJAMENTO',
    attached_doc: '2 Anexos',
  },
  record_id: 'DIR-2026-C2-T02-001',
};

export const INITIAL_PAST_HISTORY_ORDERS: TurnOrder[] = [
  {
    id: 'past-order-t01',
    code: 'ORD-A00-T1',
    team: 'Player A',
    brigade_name: 'FORÇA-TAREFA TIGRE',
    title: 'Operação Olho do Falcão',
    turn_number: 1,
    phase: 'resolvido',
    operation_name: 'Operação Olho do Falcão',
    intent_summary: 'Travessia rápida da margem sul do Éufrates com cobertura de artilharia 155mm.',
    commitment_summary: '2ª Legião Motorizada + Bateria 155mm',
    directive_text: `I. INTENÇÃO DO COMANDANTE:
Assegurar a margem sul do Rio Éufrates sob cobertura de artilharia pesada 155mm e posicionar sensores avançados na rota de Tabqa.

II. EXECUÇÃO TÁTICA:
- Deslocamento rápido em coluna blindada até o setor alfa;
- Supressão de posições de morteiros hostis identificadas por drone.`,
    roe_text: 'Fogo livre contra posições de artilharia confirmadas; preservação da ponte rodoviária.',
    unit_instructions: 'Avanço rápido com cobertura de bateria 155mm.',
    committed_units: [],
    attachments: [],
    status: 'evaluated',
    verdict: 'Sucesso Total',
    moderator_feedback:
      '"Avanço concluído com êxito sob cobertura de artilharia 155mm. A travessia da margem sul do Éufrates foi assegurada com perdas mínimas. Alerta: sensores hostis detectaram movimentação na rota de Tabqa."',
    tactical_metrics: {
      effectiveness: '92%',
      losses: '1 blindado M2',
      objective_status: 'CONSOLIDADO',
      attached_doc: 'Relatório C2 #01-A',
    },
    submitted_by: 'arbitro.c2@ufsmun.org (Player A)',
    submitted_at: '09:58h',
    record_id: 'DIR-2024-C2-T01-084',
  },
  {
    id: 'past-order-t00',
    code: 'ORD-A00-T0',
    team: 'Player A',
    brigade_name: 'COMANDO TIGRE',
    title: 'Desdobramento Inicial & Reconhecimento',
    turn_number: 0,
    phase: 'resolvido',
    operation_name: 'Desdobramento Inicial & Reconhecimento',
    intent_summary: 'Alocação das forças nas posições de largada e ativação da rede de comunicações C2.',
    commitment_summary: 'Efetivo Completo da Força-Tarefa Tigre',
    directive_text: `I. DESDOBRAMENTO INICIAL:
Posicionamento das unidades de fronteira e estabelecimento de enlaces seguros de comunicação com a Mesa Arbitral C2.`,
    roe_text: 'Postura estritamente defensiva de prontidão.',
    unit_instructions: 'Manter silêncio rádio até homologação do turno.',
    committed_units: [],
    attachments: [],
    status: 'evaluated',
    verdict: 'Sucesso Total',
    moderator_feedback:
      '"Desdobramento inicial aceito e homologado pelo Comitê Arbitral. Posições de largada alocadas no mapa sem atritos ou contestações de outras facções."',
    tactical_metrics: {
      effectiveness: '100%',
      losses: '0 baixas',
      objective_status: 'CONFORME O PLANO',
      attached_doc: '100% OPERACIONAIS',
    },
    submitted_by: 'Player A (Comando Tigre)',
    submitted_at: '07:55h',
    record_id: 'DIR-2024-C2-T00-012',
  },
  {
    id: 'past-order-t01-archived',
    code: 'ORD-A00-T1B',
    team: 'Player A',
    brigade_name: 'FT-TIGRE',
    title: 'Manobra Alternativa Eixo Sul',
    turn_number: 1,
    phase: 'resolvido',
    operation_name: 'Manobra Alternativa Eixo Sul',
    intent_summary: 'Versão preliminar de manobra via flanco direito.',
    commitment_summary: '1º Esquadrão Blindado',
    directive_text: 'Manobra alternativa pelo flanco direito caso a ponte principal estivesse bloqueada.',
    roe_text: 'Padrão Nível II.',
    unit_instructions: 'Cancelado após confirmação de minagem.',
    committed_units: [],
    attachments: [],
    status: 'archived',
    verdict: '',
    moderator_feedback: '',
    archive_note:
      '"Versão preliminar de manobra via flanco direito desconsiderada pela liderança da FT-Tigre após confirmação de minagem da ponte sul."',
    replaced_by: 'DIR-2024-C2-T01-084',
    submitted_at: '09:40h',
    tactical_metrics: {
      effectiveness: '—',
      losses: '—',
      objective_status: 'ARQUIVADO',
      attached_doc: 'Versão Depreciada',
    },
    record_id: 'DIR-2024-C2-T01-079',
  },
];

export const INITIAL_MODERATOR_BOARD_ORDERS: TurnOrder[] = [
  // TIME A ORDERS
  {
    id: 'mod-ord-a01',
    code: 'ORD-A01',
    team: 'Player A',
    brigade_name: '3ª BRIGADA MECANIZADA',
    title: 'Avanço e Fixação em Cabeça de Ponte',
    turn_number: 2,
    phase: 'avaliacao',
    operation_name: 'Avanço e Fixação de Cabeça de Ponte no Rio Orontes',
    intent_summary: 'Conquistar a margem oriental do rio até as 13:00h para abrir rota aos comboios logísticos.',
    commitment_summary: '3ª Cia Mecanizada (24x BMP-2) + Apoio de M109',
    directive_text:
      'Conquistar e guarnecer a travessia na cota 142 utilizando elementos de engenharia e apoio blindado leve. A 3ª Cia Mecanizada avançará sob cobertura de obuseiros autopropulsados M109.',
    roe_text: 'Engajamento autorizado contra forças hostis que bloqueiem a cota 142.',
    unit_instructions: '24x BMP-2 em vanguarda; bateria M109 em apoio direto.',
    committed_units: [],
    attachments: [
      { id: 'a01-att', name: 'croqui_avanco_ponte.pdf', size: '1.2 MB', type: 'pdf' },
    ],
    status: 'evaluated',
    verdict: 'Sucesso Parcial',
    moderator_feedback: 'Cabeça de ponte mantida sob fogo esporádico de morteiros.',
    tactical_metrics: {
      effectiveness: '78%',
      losses: '2x BMP-2 avariados',
      objective_status: 'PARCIAL',
      attached_doc: 'croqui_avanco_ponte.pdf',
    },
    submitted_at: '11:40h',
    submitted_by: 'Player A',
  },
  {
    id: 'mod-ord-a02',
    code: 'ORD-A02',
    team: 'Player A',
    brigade_name: 'ALA AÉREA TÁTICA',
    title: 'Apoio Aéreo Aproximado (CAS) em Al-Rastan',
    turn_number: 2,
    phase: 'avaliacao',
    operation_name: 'Sortida CAS com F-16 nos Depósitos de Al-Rastan',
    intent_summary: 'Degradar os pontos de reabastecimento de munição anticarro do Time B.',
    commitment_summary: '2x F-16C Fighting Falcon + Armamento GBU-31 JDAM',
    directive_text:
      'Bombardeio de precisão com kits JDAM em paióis logísticos identificados por satélite no setor norte de Al-Rastan.',
    roe_text: 'Ataque cirúrgico restrito a coordenadas militares validadas.',
    unit_instructions: 'Ingresso em baixa altitude e saída com chaff/flare.',
    committed_units: [],
    attachments: [
      { id: 'a02-att', name: 'vetor_ataque_cas.png', size: '1.8 MB', type: 'image' },
    ],
    status: 'evaluated',
    verdict: 'Sucesso Total',
    moderator_feedback: 'Paiol secundário destruído. Defesa antiaérea suprimida temporariamente.',
    tactical_metrics: {
      effectiveness: '96%',
      losses: '0 baixas',
      objective_status: 'ATINGIDO',
      attached_doc: 'vetor_ataque_cas.png',
    },
    submitted_at: '11:45h',
    submitted_by: 'Player A',
  },
  {
    id: 'mod-ord-a03',
    code: 'ORD-A03',
    team: 'Player A',
    brigade_name: '1ª BRIGADA BLINDADA',
    title: 'Flanqueamento Blindado na Rodovia M-5',
    turn_number: 2,
    phase: 'avaliacao',
    operation_name: 'Flanqueamento Blindado na Rodovia M-5',
    intent_summary: 'Cortar a linha de fuga das forças insurgentes no entroncamento norte.',
    commitment_summary: '1º Esquadrão de Carros de Combate (M1A2 Abrams)',
    directive_text:
      'Manobra de envelopamento blindado com 14 tanques Leopard/Abrams e apoio de artilharia auto-propulsada M109 visando isolar o entroncamento norte da M-5.',
    roe_text: 'Fogo livre contra blindados e posições anticarro no eixo rodoviário.',
    unit_instructions: 'Deslocamento em cunha blindada em velocidade máxima.',
    committed_units: [],
    attachments: [
      { id: 'a03-att', name: 'rota_flanqueamento_m5.kml', size: '540 KB', type: 'kml' },
    ],
    status: 'submitted',
    verdict: '',
    moderator_feedback: '',
    tactical_metrics: {
      effectiveness: '—',
      losses: '—',
      objective_status: 'PENDENTE',
      attached_doc: 'rota_flanqueamento_m5.kml',
    },
    submitted_at: '11:52h',
    submitted_by: 'Player A',
  },
  {
    id: 'mod-ord-a04',
    code: 'ORD-A04',
    team: 'Player A',
    brigade_name: 'VANT ISR (MQ-9 REAPER)',
    title: 'Reconhecimento Eletro-Óptico e Marcação',
    turn_number: 2,
    phase: 'avaliacao',
    operation_name: 'Reconhecimento Eletro-Óptico no Desfiladeiro',
    intent_summary: 'Rastrear emboscadas ou campos minados ao longo do Passo de Karyatain.',
    commitment_summary: '1x MQ-9 Reaper (Sensor Eletro-Óptico/SAR)',
    directive_text:
      'Vigilância contínua durante o turno com iluminação laser para coordenadas de artilharia ao longo do Passo de Karyatain.',
    roe_text: 'Voo de reconhecimento silencioso acima de 18.000 pés.',
    unit_instructions: 'Transmitir telemetria em tempo real para a 1ª Brigada Blindada.',
    committed_units: [],
    attachments: [
      { id: 'a04-att', name: 'recon_termico_passo.png', size: '950 KB', type: 'image' },
    ],
    status: 'evaluated',
    verdict: 'Sucesso Total',
    moderator_feedback: 'Identificado grupo de minagem do Time B nas coordenadas 33UXP 048-912.',
    tactical_metrics: {
      effectiveness: '100%',
      losses: '0 baixas',
      objective_status: 'CONCLUÍDO',
      attached_doc: 'recon_termico_passo.png',
    },
    submitted_at: '11:55h',
    submitted_by: 'Player A',
  },

  // TIME B ORDERS
  {
    id: 'mod-ord-b01',
    code: 'ORD-B01',
    team: 'Player B',
    brigade_name: 'BATALHÃO DE AT-INFANTARIA',
    title: 'Emboscada Anticarro em Karyatain',
    turn_number: 2,
    phase: 'avaliacao',
    operation_name: 'Emboscada com Mísseis Kornet em Karyatain',
    intent_summary: 'Deter coluna blindada do Governo e impor perdas materiais imediatas no estreitamento do vale.',
    commitment_summary: 'Batalhão de AT-Infantaria (Equipes Kornet-EM)',
    directive_text:
      'Desdobrar equipes caçadoras de blindados armadas com mísseis 9M133 Kornet ao longo da crista rochosa de Karyatain.',
    roe_text: 'Aguardar entrada da vanguarda blindada na zona de morte antes de abrir fogo.',
    unit_instructions: 'Disparo duplo sincronizado nos carros-comando e recuo por rotas cobertas.',
    committed_units: [],
    attachments: [
      { id: 'b01-att', name: 'coordenadas_emboscada.pdf', size: '710 KB', type: 'pdf' },
    ],
    status: 'evaluated',
    verdict: 'Sucesso Parcial',
    moderator_feedback: 'Emboscada surpresa concretizada, mas posição revelada e evacuada sob fogo.',
    tactical_metrics: {
      effectiveness: '75%',
      losses: '1 equipe AT perdida',
      objective_status: 'PARCIAL',
      attached_doc: 'coordenadas_emboscada.pdf',
    },
    submitted_at: '11:42h',
    submitted_by: 'Player B',
  },
  {
    id: 'mod-ord-b02',
    code: 'ORD-B02',
    team: 'Player B',
    brigade_name: 'BATERIA DE FOGUETES BM-21',
    title: 'Barragem de Área de Foguetes Grad',
    turn_number: 2,
    phase: 'avaliacao',
    operation_name: 'Barragem de Artilharia de Área no Setor Delta',
    intent_summary: 'Interditar a rota de suprimentos secundária e desorganizar desdobramento das tropas governistas.',
    commitment_summary: '1x Bateria BM-21 Grad (40 tubos 122mm)',
    directive_text:
      'Salva maciça de saturação com foguetes Grad 122mm contra ponto de concentração da Coalizão no Setor Delta.',
    roe_text: 'Saturação de área autorizada.',
    unit_instructions: 'Disparar salva completa em 20 segundos e reposicionar lançadores imediatamente (shoot-and-scoot).',
    committed_units: [],
    attachments: [
      { id: 'b02-att', name: 'tabela_tiro_grad.pdf', size: '620 KB', type: 'pdf' },
    ],
    status: 'evaluated',
    verdict: 'Sucesso Total',
    moderator_feedback: 'Danificou comboio secundário. Setor Delta interditado por 1 turno.',
    tactical_metrics: {
      effectiveness: '90%',
      losses: '0 baixas',
      objective_status: 'INTERDITADO',
      attached_doc: 'tabela_tiro_grad.pdf',
    },
    submitted_at: '11:49h',
    submitted_by: 'Player B',
  },
  {
    id: 'mod-ord-b03',
    code: 'ORD-B03',
    team: 'Player B',
    brigade_name: 'GRUPO TÁTICO DE ENGENHARIA',
    title: 'Minagem e Bloqueio com Obstáculos',
    turn_number: 2,
    phase: 'avaliacao',
    operation_name: 'Minagem Preventiva e Bloqueio de Desfiladeiro',
    intent_summary: 'Imobilizar blindados da 1ª Brigada adversária caso tentem o corte pela Rodovia M-5.',
    commitment_summary: 'Grupo Tático de Engenharia + 140 minas TM-62M',
    directive_text:
      'Lançamento acelerado de minas anticarro TM-62 e armadilhas anti-desminagem no eixo de acesso central do desfiladeiro.',
    roe_text: 'Negação de área prioritária.',
    unit_instructions: 'Camuflar cinturão de minas e cobrir com metralhadoras pesadas.',
    committed_units: [],
    attachments: [
      { id: 'b03-att', name: 'plano_minagem_karyatain.pdf', size: '650 KB', type: 'pdf' },
    ],
    status: 'submitted',
    verdict: '',
    moderator_feedback: '',
    tactical_metrics: {
      effectiveness: '—',
      losses: '—',
      objective_status: 'PENDENTE',
      attached_doc: 'plano_minagem_karyatain.pdf',
    },
    submitted_at: '11:57h',
    submitted_by: 'Player B',
  },
];

export const INITIAL_SITREP_TURN_2: TurnSitrep = {
  id: 'sitrep-turn-2',
  turn_number: 2,
  operation_name: 'Operação Tempestade do Vale // Fase de Atrito Terrestre',
  public_text:
    'Os combates no vale do Orontes intensificaram-se nas últimas duas horas. As forças da Coalizão conseguiram assegurar a travessia na Cota 142 após ataques aéreos pontuais contra depósitos na retaguarda de Al-Rastan. Em resposta, barragens de foguetes atingiram linhas secundárias de transporte, estabelecendo um impasse tático no desfiladeiro norte.',
  team_a_text:
    'Seu reconhecimento identificou o campo de minas no Passo de Karyatain. Os Leopard da 1ª Brigada devem contornar pelo eixo leste no Turno 03 para evitar danos críticos. Apoio aéreo permanece disponível com atraso de resposta de 15 minutos.',
  team_b_text:
    'A barragem Grad causou danos substanciais ao comboio inimigo, porém seu estoque de foguetes está reduzido a menos de 40%. A perda do depósito de Al-Rastan limitará reposições nos próximos dois turnos se a rota sul não for guarnecida.',
  public_linked_entities: [
    { id: 'pe-1', label: '3ª Cia Mecanizada', kind: 'unit', icon: 'shield', faction: 'allied' },
    { id: 'pe-2', label: '2x F-16C Fighting Falcon', kind: 'unit', icon: 'flight', faction: 'allied' },
    { id: 'pe-3', label: 'POI: Cota 142 (Travessia Orontes)', kind: 'poi', icon: 'location_on', faction: 'neutral' },
    { id: 'pe-4', label: 'POI: Setor Delta (Desfiladeiro)', kind: 'poi', icon: 'location_on', faction: 'neutral' },
  ],
  team_a_linked_entities: [
    { id: 'ae-1', label: '1x MQ-9 Reaper (ISR Recon)', kind: 'unit', icon: 'radar', faction: 'allied' },
    { id: 'ae-2', label: '1º Esq. Carros de Combate (Abrams)', kind: 'unit', icon: 'shield', faction: 'allied' },
    { id: 'ae-3', label: 'POI: Passo de Karyatain (Eixo Leste)', kind: 'poi', icon: 'location_on', faction: 'neutral' },
  ],
  team_b_linked_entities: [
    { id: 'be-1', label: 'Batalhão de AT-Infantaria (Kornet-EM)', kind: 'unit', icon: 'shield', faction: 'opposing' },
    { id: 'be-2', label: 'Grupo Tático de Engenharia (TM-62M)', kind: 'unit', icon: 'engineering', faction: 'opposing' },
    { id: 'be-3', label: 'POI: Paiol Setor Delta (Danificado)', kind: 'poi', icon: 'location_on', faction: 'neutral' },
  ],
  public_attachments: [
    { id: 'pa-1', name: 'mapa_situacao_t02_publico.pdf', size: '2.4 MB', type: 'pdf' },
    { id: 'pa-2', name: 'croqui_dano_al-rastan.png', size: '1.1 MB', type: 'image' },
  ],
  team_a_attachments: [
    { id: 'aa-1', name: 'telemetria_intel_a.kml', size: '480 KB', type: 'kml' },
    { id: 'aa-2', name: 'recon_termico_passo.png', size: '890 KB', type: 'image' },
  ],
  team_b_attachments: [
    { id: 'ba-1', name: 'plano_minagem_karyatain.pdf', size: '650 KB', type: 'pdf' },
  ],
  status: 'draft',
};

export function loadModeratorOrders(): TurnOrder[] {
  if (typeof window === 'undefined') return INITIAL_MODERATOR_BOARD_ORDERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Error loading moderator orders from localStorage:', e);
  }
  return INITIAL_MODERATOR_BOARD_ORDERS;
}

export function saveModeratorOrders(orders: TurnOrder[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent('ufsmun:orders-updated'));
  } catch (e) {
    console.warn('Error saving moderator orders to localStorage:', e);
  }
}

export function loadSitrep(): TurnSitrep {
  if (typeof window === 'undefined') return INITIAL_SITREP_TURN_2;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SITREP);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error loading SITREP from localStorage:', e);
  }
  return INITIAL_SITREP_TURN_2;
}

export function saveSitrep(sitrep: TurnSitrep): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SITREP, JSON.stringify(sitrep));
    window.dispatchEvent(new CustomEvent('ufsmun:sitrep-updated'));
  } catch (e) {
    console.warn('Error saving SITREP to localStorage:', e);
  }
}

export function loadClockState(): C2ClockState {
  if (typeof window === 'undefined') return INITIAL_CLOCK_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLOCK);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error loading clock state from localStorage:', e);
  }
  return INITIAL_CLOCK_STATE;
}

export function saveClockState(clock: C2ClockState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.CLOCK, JSON.stringify(clock));
    window.dispatchEvent(new CustomEvent('ufsmun:clock-updated'));
  } catch (e) {
    console.warn('Error saving clock state to localStorage:', e);
  }
}

export async function syncOrderVerdictToSupabase(
  orderId: string,
  verdict: OrderVerdict,
  feedback: string
): Promise<void> {
  try {
    await supabase
      .from('Turn_Orders')
      .update({
        verdict,
        moderator_feedback: feedback,
        status: verdict ? 'evaluated' : 'submitted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
  } catch {
    // Fallback already handled locally
  }
}

export async function submitPlayerOrderToC2(
  order: TurnOrder,
  userEmail: string
): Promise<TurnOrder> {
  const nowStr = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }) + 'h';

  const submittedOrder: TurnOrder = {
    ...order,
    status: 'submitted',
    submitted_at: nowStr,
    submitted_by: `${userEmail} (${order.team})`,
    updated_at: new Date().toISOString(),
  };

  // Also add or update in moderator board orders list
  const currentBoard = loadModeratorOrders();
  const existingIdx = currentBoard.findIndex((o) => o.id === submittedOrder.id);
  if (existingIdx >= 0) {
    currentBoard[existingIdx] = submittedOrder;
  } else {
    currentBoard.unshift(submittedOrder);
  }
  saveModeratorOrders(currentBoard);

  try {
    await supabase.from('Turn_Orders').upsert({
      code: submittedOrder.code,
      team: submittedOrder.team,
      brigade_name: submittedOrder.brigade_name,
      title: submittedOrder.operation_name,
      turn_number: submittedOrder.turn_number,
      phase: 'avaliacao',
      operation_name: submittedOrder.operation_name,
      directive_text: submittedOrder.directive_text,
      roe_text: submittedOrder.roe_text,
      unit_instructions: submittedOrder.unit_instructions,
      committed_units: submittedOrder.committed_units,
      attachments: submittedOrder.attachments,
      status: 'submitted',
      submitted_by: submittedOrder.submitted_by,
      submitted_at: new Date().toISOString(),
    });
  } catch {
    // Local fallback persists seamlessly
  }

  return submittedOrder;
}
