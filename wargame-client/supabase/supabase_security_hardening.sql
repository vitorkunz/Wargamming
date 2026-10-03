-- ==============================================================================
-- Security Hardening & Remediation Migration
-- Project: Gabinete de Guerra UFSMUN
--
-- Instructions: Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Privilege Escalation Prevention on Profiles.role
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
DECLARE
  caller_role text;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Allow direct database operations (e.g. Supabase Dashboard SQL Editor, migrations)
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT role INTO caller_role 
    FROM public."Profiles" 
    WHERE id = auth.uid();

    IF caller_role IS NULL OR caller_role != 'Moderator' THEN
      RAISE EXCEPTION 'Access Denied: Only Moderators can modify user roles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_profile_role ON public."Profiles";
CREATE TRIGGER tr_protect_profile_role
BEFORE UPDATE ON public."Profiles"
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();


-- ------------------------------------------------------------------------------
-- 2. Restrict RPC Permissions & Enforce Caller Role Verification
-- ------------------------------------------------------------------------------
-- Revoke execution from anonymous / public users
REVOKE EXECUTE ON FUNCTION public.publish_draft_to_live() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_draft_from_live() FROM PUBLIC, anon;

-- Grant execution to authenticated users (role check inside function will enforce 'Moderator')
GRANT EXECUTE ON FUNCTION public.publish_draft_to_live() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_draft_from_live() TO authenticated;

-- Hardened publish_draft_to_live() with explicit caller check and ammo support
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

-- Hardened sync_draft_from_live() with explicit caller check and ammo support
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


-- ------------------------------------------------------------------------------
-- 3. Prevent Fog-of-War Leakage: Full Replica Identity & Realtime Publication
-- ------------------------------------------------------------------------------
ALTER TABLE public."Battle_Units" REPLICA IDENTITY FULL;
ALTER TABLE public."Battle_Hazards" REPLICA IDENTITY FULL;
ALTER TABLE public."Map_POIs" REPLICA IDENTITY FULL;
ALTER TABLE public."Map_Layers" REPLICA IDENTITY FULL;
ALTER TABLE public."Moderator_Units" REPLICA IDENTITY FULL;
ALTER TABLE public."Moderator_POIs" REPLICA IDENTITY FULL;
ALTER TABLE public."Moderator_Hazards" REPLICA IDENTITY FULL;

-- Ensure RLS is active on live game tables
ALTER TABLE public."Battle_Units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Battle_Hazards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Map_POIs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Map_Layers" ENABLE ROW LEVEL SECURITY;

-- Ensure tables are bound to supabase_realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."Battle_Units";
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."Battle_Hazards";
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."Map_POIs";
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."Map_Layers";
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."Planning_Units";
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;


-- ------------------------------------------------------------------------------
-- 4. Storage Bucket Restriction: Allow Raster Images & SVG Vector Maps
-- ------------------------------------------------------------------------------
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
WHERE id = 'maps';


-- ------------------------------------------------------------------------------
-- 5. Duplication Spam / Flood Protection: Planning Units Safety Quota (Ceiling: 1000)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_planning_units_quota()
RETURNS TRIGGER AS $$
DECLARE
  current_count integer;
  target_owner text;
BEGIN
  target_owner := COALESCE(NEW.draft_owner, NEW.owner);

  SELECT count(*) INTO current_count
  FROM public."Planning_Units"
  WHERE COALESCE(draft_owner, owner) = target_owner;

  IF current_count >= 1000 THEN
    RAISE EXCEPTION 'Unit limit reached: Faction planning unit quota exceeded (maximum 1000 units).';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_planning_units_quota ON public."Planning_Units";
CREATE TRIGGER tr_check_planning_units_quota
BEFORE INSERT ON public."Planning_Units"
FOR EACH ROW EXECUTE FUNCTION public.check_planning_units_quota();
