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
