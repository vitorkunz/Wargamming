-- Migration: Add Moderator Draft Tables and Sync/Publish RPCs
-- Execute this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ntjwmfbikkuobdwxcrhr/sql

-- 1. Create Moderator_Units table (Draft)
CREATE TABLE IF NOT EXISTS public."Moderator_Units" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    type TEXT NOT NULL,
    owner TEXT NOT NULL,
    x_coord INTEGER NOT NULL,
    y_coord INTEGER NOT NULL,
    health INTEGER NOT NULL,
    is_visible_to_enemy BOOLEAN NOT NULL DEFAULT FALSE,
    in_reserve BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Moderator_POIs table (Draft)
CREATE TABLE IF NOT EXISTS public."Moderator_POIs" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    owner TEXT NOT NULL,
    x_coord INTEGER NOT NULL,
    y_coord INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'operational',
    notes TEXT,
    is_visible_to_enemy BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Moderator_Hazards table (Draft)
CREATE TABLE IF NOT EXISTS public."Moderator_Hazards" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hazard_type TEXT NOT NULL,
    label TEXT,
    created_by TEXT NOT NULL,
    coordinates JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    visible_to_teams TEXT[] NOT NULL DEFAULT ARRAY['Moderator'],
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public."Moderator_Units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Moderator_POIs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Moderator_Hazards" ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: Moderators have full access
DROP POLICY IF EXISTS "Moderator full access on Moderator_Units" ON public."Moderator_Units";
CREATE POLICY "Moderator full access on Moderator_Units" ON public."Moderator_Units"
FOR ALL USING ( public.get_user_role() = 'Moderator' );

DROP POLICY IF EXISTS "Moderator full access on Moderator_POIs" ON public."Moderator_POIs";
CREATE POLICY "Moderator full access on Moderator_POIs" ON public."Moderator_POIs"
FOR ALL USING ( public.get_user_role() = 'Moderator' );

DROP POLICY IF EXISTS "Moderator full access on Moderator_Hazards" ON public."Moderator_Hazards";
CREATE POLICY "Moderator full access on Moderator_Hazards" ON public."Moderator_Hazards"
FOR ALL USING ( public.get_user_role() = 'Moderator' );

-- 6. Add tables to Supabase Realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."Moderator_Units";
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."Moderator_POIs";
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."Moderator_Hazards";
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- 7. RPC Function: Publish Draft to Live Battle
CREATE OR REPLACE FUNCTION public.publish_draft_to_live()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF public.get_user_role() <> 'Moderator' THEN
    RAISE EXCEPTION 'Apenas moderadores podem publicar o mapa.';
  END IF;

  DELETE FROM public."Battle_Units" WHERE id IS NOT NULL;
  INSERT INTO public."Battle_Units" (id, name, type, owner, x_coord, y_coord, health, is_visible_to_enemy, in_reserve, created_at)
  SELECT id, name, type, owner, x_coord, y_coord, health, is_visible_to_enemy, in_reserve, created_at FROM public."Moderator_Units";

  DELETE FROM public."Map_POIs" WHERE id IS NOT NULL;
  INSERT INTO public."Map_POIs" (id, name, type, owner, x_coord, y_coord, status, notes, is_visible_to_enemy, created_at)
  SELECT id, name, type, owner, x_coord, y_coord, status, notes, is_visible_to_enemy, created_at FROM public."Moderator_POIs";

  DELETE FROM public."Battle_Hazards" WHERE id IS NOT NULL;
  INSERT INTO public."Battle_Hazards" (id, hazard_type, label, created_by, coordinates, status, visible_to_teams, notes, created_at)
  SELECT id, hazard_type, label, created_by, coordinates, status, visible_to_teams, notes, created_at FROM public."Moderator_Hazards";
END;
$$;

-- 8. RPC Function: Sync Draft from Live Battle
CREATE OR REPLACE FUNCTION public.sync_draft_from_live()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF public.get_user_role() <> 'Moderator' THEN
    RAISE EXCEPTION 'Apenas moderadores podem sincronizar o rascunho.';
  END IF;

  DELETE FROM public."Moderator_Units" WHERE id IS NOT NULL;
  INSERT INTO public."Moderator_Units" (id, name, type, owner, x_coord, y_coord, health, is_visible_to_enemy, in_reserve, created_at)
  SELECT id, name, type, owner, x_coord, y_coord, health, is_visible_to_enemy, in_reserve, created_at FROM public."Battle_Units";

  DELETE FROM public."Moderator_POIs" WHERE id IS NOT NULL;
  INSERT INTO public."Moderator_POIs" (id, name, type, owner, x_coord, y_coord, status, notes, is_visible_to_enemy, created_at)
  SELECT id, name, type, owner, x_coord, y_coord, status, notes, is_visible_to_enemy, created_at FROM public."Map_POIs";

  DELETE FROM public."Moderator_Hazards" WHERE id IS NOT NULL;
  INSERT INTO public."Moderator_Hazards" (id, hazard_type, label, created_by, coordinates, status, visible_to_teams, notes, created_at)
  SELECT id, hazard_type, label, created_by, coordinates, status, visible_to_teams, notes, created_at FROM public."Battle_Hazards";
END;
$$;

-- 9. Initial copy from live to draft (populates draft tables so they are not empty on start)
INSERT INTO public."Moderator_Units"
SELECT * FROM public."Battle_Units"
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Moderator_POIs"
SELECT * FROM public."Map_POIs"
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Moderator_Hazards"
SELECT * FROM public."Battle_Hazards"
ON CONFLICT (id) DO NOTHING;
