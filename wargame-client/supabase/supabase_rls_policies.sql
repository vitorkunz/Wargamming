-- Row Level Security (RLS) Policies

-- Helper function to get the current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public."Profiles" WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ==========================================
-- PROFILES POLICIES
-- ==========================================
DROP POLICY IF EXISTS "Users can read own profile" ON public."Profiles";
CREATE POLICY "Users can read own profile" 
ON public."Profiles" FOR SELECT 
USING ( id = auth.uid() OR public.get_user_role() = 'Moderator' );

DROP POLICY IF EXISTS "Moderators can update profiles" ON public."Profiles";
CREATE POLICY "Moderators can update profiles" 
ON public."Profiles" FOR UPDATE 
USING ( public.get_user_role() = 'Moderator' );

-- Prevent privilege escalation on Profiles.role
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
DECLARE
  caller_role text;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
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

-- ==========================================
-- GAME_STATE POLICIES
-- ==========================================
DROP POLICY IF EXISTS "Anyone can read game state" ON public."Game_State";
CREATE POLICY "Anyone can read game state" 
ON public."Game_State" FOR SELECT 
USING ( auth.uid() IS NOT NULL );

DROP POLICY IF EXISTS "Moderators can update game state" ON public."Game_State";
CREATE POLICY "Moderators can update game state" 
ON public."Game_State" FOR UPDATE 
USING ( public.get_user_role() = 'Moderator' );

DROP POLICY IF EXISTS "Moderators can insert game state" ON public."Game_State";
CREATE POLICY "Moderators can insert game state" 
ON public."Game_State" FOR INSERT 
WITH CHECK ( public.get_user_role() = 'Moderator' );

-- ==========================================
-- BATTLE_UNITS POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Moderator full access on Battle_Units" ON public."Battle_Units";
CREATE POLICY "Moderator full access on Battle_Units" 
ON public."Battle_Units" 
FOR ALL 
USING ( public.get_user_role() = 'Moderator' );

DROP POLICY IF EXISTS "Player read access on Battle_Units" ON public."Battle_Units";
CREATE POLICY "Player read access on Battle_Units" 
ON public."Battle_Units" 
FOR SELECT 
USING ( 
    owner = public.get_user_role() 
    OR is_visible_to_enemy = TRUE 
);

DROP POLICY IF EXISTS "Player update own Battle_Units" ON public."Battle_Units";
CREATE POLICY "Player update own Battle_Units" 
ON public."Battle_Units" 
FOR UPDATE 
USING ( owner = public.get_user_role() );

DROP POLICY IF EXISTS "Player insert own Battle_Units" ON public."Battle_Units";
CREATE POLICY "Player insert own Battle_Units" 
ON public."Battle_Units" 
FOR INSERT 
WITH CHECK ( owner = public.get_user_role() );


-- ==========================================
-- PLANNING_UNITS POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Player full access to own Planning_Units" ON public."Planning_Units";
DROP POLICY IF EXISTS "Moderator read access on Planning_Units" ON public."Planning_Units";
DROP POLICY IF EXISTS "Authenticated users full access on Planning_Units" ON public."Planning_Units";

-- Allow players and moderators full access to plan, edit, move, and remove friendly and enemy planning units
CREATE POLICY "Authenticated users full access on Planning_Units" 
ON public."Planning_Units" 
FOR ALL 
TO authenticated
USING ( true )
WITH CHECK ( true );

-- Prevent Duplication Spam / Flood DoS: Limit planning units to max 60 per faction
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


-- ==========================================
-- MAP_POIS POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Moderator full access on Map_POIs" ON public."Map_POIs";
CREATE POLICY "Moderator full access on Map_POIs" 
ON public."Map_POIs" 
FOR ALL 
USING ( public.get_user_role() = 'Moderator' );

DROP POLICY IF EXISTS "Player read access on Map_POIs" ON public."Map_POIs";
CREATE POLICY "Player read access on Map_POIs" 
ON public."Map_POIs" 
FOR SELECT 
USING ( 
    owner = public.get_user_role() 
    OR is_visible_to_enemy = TRUE 
);

-- ==========================================
-- BATTLE_HAZARDS POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Moderator full access on Battle_Hazards" ON public."Battle_Hazards";
CREATE POLICY "Moderator full access on Battle_Hazards" 
ON public."Battle_Hazards" 
FOR ALL 
USING ( public.get_user_role() = 'Moderator' );

DROP POLICY IF EXISTS "Player read access on Battle_Hazards" ON public."Battle_Hazards";
CREATE POLICY "Player read access on Battle_Hazards" 
ON public."Battle_Hazards" 
FOR SELECT 
USING ( 
    public.get_user_role() = ANY (visible_to_teams)
);

-- ==========================================
-- MAP_LAYERS POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Moderator full access on Map_Layers" ON public."Map_Layers";
CREATE POLICY "Moderator full access on Map_Layers" 
ON public."Map_Layers" 
FOR ALL 
USING ( public.get_user_role() = 'Moderator' );

DROP POLICY IF EXISTS "Player read access on Map_Layers" ON public."Map_Layers";
CREATE POLICY "Player read access on Map_Layers" 
ON public."Map_Layers" 
FOR SELECT 
USING ( is_global_visible = TRUE );

-- ==========================================
-- MODERATOR DRAFT TABLES POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Moderator full access on Moderator_Units" ON public."Moderator_Units";
CREATE POLICY "Moderator full access on Moderator_Units" 
ON public."Moderator_Units" 
FOR ALL 
USING ( public.get_user_role() = 'Moderator' );

DROP POLICY IF EXISTS "Moderator full access on Moderator_POIs" ON public."Moderator_POIs";
CREATE POLICY "Moderator full access on Moderator_POIs" 
ON public."Moderator_POIs" 
FOR ALL 
USING ( public.get_user_role() = 'Moderator' );

DROP POLICY IF EXISTS "Moderator full access on Moderator_Hazards" ON public."Moderator_Hazards";
CREATE POLICY "Moderator full access on Moderator_Hazards" 
ON public."Moderator_Hazards" 
FOR ALL 
USING ( public.get_user_role() = 'Moderator' );


