-- Migration: Add Ammo to Unit Tables
-- Execute this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ntjwmfbikkuobdwxcrhr/sql

-- 1. Add ammo column to Battle_Units
ALTER TABLE public."Battle_Units" 
ADD COLUMN IF NOT EXISTS ammo INTEGER NOT NULL DEFAULT 100;

-- 2. Add ammo column to Moderator_Units
ALTER TABLE public."Moderator_Units" 
ADD COLUMN IF NOT EXISTS ammo INTEGER NOT NULL DEFAULT 100;

-- 3. Add ammo column to Planning_Units
ALTER TABLE public."Planning_Units" 
ADD COLUMN IF NOT EXISTS ammo INTEGER NOT NULL DEFAULT 100;

-- 4. Update the publish/sync RPCs to include ammo and restrict execution
REVOKE EXECUTE ON FUNCTION public.publish_draft_to_live() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_draft_from_live() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.publish_draft_to_live() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_draft_from_live() TO authenticated;

CREATE OR REPLACE FUNCTION public.publish_draft_to_live()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  caller_role text;
BEGIN
  SELECT role INTO caller_role FROM public."Profiles" WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role != 'Moderator' THEN
    RAISE EXCEPTION 'Access Denied: Only Moderators can publish turns.';
  END IF;

  DELETE FROM public."Battle_Units" WHERE id IS NOT NULL;
  INSERT INTO public."Battle_Units" (id, name, type, owner, x_coord, y_coord, health, ammo, is_visible_to_enemy, in_reserve, created_at)
  SELECT id, name, type, owner, x_coord, y_coord, health, ammo, is_visible_to_enemy, in_reserve, created_at FROM public."Moderator_Units";

  DELETE FROM public."Map_POIs" WHERE id IS NOT NULL;
  INSERT INTO public."Map_POIs" (id, name, type, owner, x_coord, y_coord, status, notes, is_visible_to_enemy, created_at)
  SELECT id, name, type, owner, x_coord, y_coord, status, notes, is_visible_to_enemy, created_at FROM public."Moderator_POIs";

  DELETE FROM public."Battle_Hazards" WHERE id IS NOT NULL;
  INSERT INTO public."Battle_Hazards" (id, hazard_type, label, created_by, coordinates, status, visible_to_teams, notes, created_at)
  SELECT id, hazard_type, label, created_by, coordinates, status, visible_to_teams, notes, created_at FROM public."Moderator_Hazards";
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_draft_from_live()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  caller_role text;
BEGIN
  SELECT role INTO caller_role FROM public."Profiles" WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role != 'Moderator' THEN
    RAISE EXCEPTION 'Access Denied: Only Moderators can sync drafts.';
  END IF;

  DELETE FROM public."Moderator_Units" WHERE id IS NOT NULL;
  INSERT INTO public."Moderator_Units" (id, name, type, owner, x_coord, y_coord, health, ammo, is_visible_to_enemy, in_reserve, created_at)
  SELECT id, name, type, owner, x_coord, y_coord, health, ammo, is_visible_to_enemy, in_reserve, created_at FROM public."Battle_Units";

  DELETE FROM public."Moderator_POIs" WHERE id IS NOT NULL;
  INSERT INTO public."Moderator_POIs" (id, name, type, owner, x_coord, y_coord, status, notes, is_visible_to_enemy, created_at)
  SELECT id, name, type, owner, x_coord, y_coord, status, notes, is_visible_to_enemy, created_at FROM public."Map_POIs";

  DELETE FROM public."Moderator_Hazards" WHERE id IS NOT NULL;
  INSERT INTO public."Moderator_Hazards" (id, hazard_type, label, created_by, coordinates, status, visible_to_teams, notes, created_at)
  SELECT id, hazard_type, label, created_by, coordinates, status, visible_to_teams, notes, created_at FROM public."Battle_Hazards";
END;
$$;
