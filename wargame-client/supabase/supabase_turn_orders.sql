-- Supabase Schema Migration for Turn Orders & Arbitral C2 Desk (UFSMUN War Cabinet)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Turn_Orders table for Player Directives & Moderator Evaluation
CREATE TABLE IF NOT EXISTS public."Turn_Orders" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL,                         -- Ex: 'ORD-A01', 'ORD-B02'
    team TEXT NOT NULL,                         -- 'Player A' | 'Player B'
    brigade_name TEXT,                          -- Ex: '3ª BRIGADA MECANIZADA'
    title TEXT NOT NULL,                        -- Ex: 'Avanço e Fixação em Cabeça de Ponte'
    turn_number INTEGER NOT NULL DEFAULT 2,      -- Turn number (0, 1, 2, 3...)
    phase TEXT DEFAULT 'planejamento',          -- 'planejamento' | 'avaliacao' | 'resolvido'
    operation_name TEXT NOT NULL DEFAULT 'OPERAÇÃO MARTELO DE ÉUFRATES',
    directive_text TEXT,                        -- Tactical Directive & SITREP
    roe_text TEXT,                              -- Rules of Engagement (ROE)
    unit_instructions TEXT,                     -- Specific unit instructions / allocations
    committed_units JSONB DEFAULT '[]'::jsonb,  -- [{ id, name, type, health, role, symbol }]
    attachments JSONB DEFAULT '[]'::jsonb,      -- [{ name, url, size, type, description }]
    status TEXT NOT NULL DEFAULT 'draft',       -- 'draft' | 'submitted' | 'evaluated' | 'archived'
    
    -- Arbitral C2 Evaluation Fields:
    verdict TEXT,                               -- 'Sucesso Total' | 'Sucesso Parcial' | 'Falha / Repelido' | 'Embate Conflitante' | 'Impugnada' | 'Inócuo'
    moderator_feedback TEXT,                    -- Referee comment / impact note
    tactical_metrics JSONB DEFAULT '{
      "effectiveness": "92%",
      "losses": "0 baixas",
      "objective_status": "CONSOLIDADO",
      "attached_doc": "Relatório C2"
    }'::jsonb,

    submitted_at TIMESTAMP WITH TIME ZONE,
    submitted_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Turn_Sitreps table for Consolidated Turn SITREP (Public, Team A, Team B)
CREATE TABLE IF NOT EXISTS public."Turn_Sitreps" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turn_number INTEGER NOT NULL UNIQUE,
    operation_name TEXT DEFAULT 'Operação Tempestade do Vale // Fase de Atrito Terrestre',
    public_text TEXT DEFAULT '',
    team_a_text TEXT DEFAULT '',
    team_b_text TEXT DEFAULT '',
    public_linked_entities JSONB DEFAULT '[]'::jsonb,
    team_a_linked_entities JSONB DEFAULT '[]'::jsonb,
    team_b_linked_entities JSONB DEFAULT '[]'::jsonb,
    public_attachments JSONB DEFAULT '[]'::jsonb,
    team_a_attachments JSONB DEFAULT '[]'::jsonb,
    team_b_attachments JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'draft',                 -- 'draft' | 'published'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Extend Game_State with C2 Temporal & Lockdown Controls
ALTER TABLE public."Game_State" 
ADD COLUMN IF NOT EXISTS current_turn INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS turn_time_remaining INTEGER DEFAULT 869,
ADD COLUMN IF NOT EXISTS turn_max_seconds INTEGER DEFAULT 2700,
ADD COLUMN IF NOT EXISTS is_timer_running BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_locked_down BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS team_a_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS team_b_locked BOOLEAN DEFAULT FALSE;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public."Turn_Orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Turn_Sitreps" ENABLE ROW LEVEL SECURITY;

-- Policies for Turn_Orders
DROP POLICY IF EXISTS "Allow read for authenticated users on Turn_Orders" ON public."Turn_Orders";
CREATE POLICY "Allow read for authenticated users on Turn_Orders"
ON public."Turn_Orders" FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow insert and update for authenticated users on Turn_Orders" ON public."Turn_Orders";
CREATE POLICY "Allow insert and update for authenticated users on Turn_Orders"
ON public."Turn_Orders" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Policies for Turn_Sitreps
DROP POLICY IF EXISTS "Allow all for authenticated users on Turn_Sitreps" ON public."Turn_Sitreps";
CREATE POLICY "Allow all for authenticated users on Turn_Sitreps"
ON public."Turn_Sitreps" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
