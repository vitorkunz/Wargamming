-- Supabase Schema for War Game

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Profiles table to manage roles mapping to Supabase Auth users
CREATE TABLE IF NOT EXISTS public."Profiles" (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Unassigned', -- 'Moderator', 'Player A', 'Player B', 'Unassigned'
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Game_State table to manage global settings like base map URL
CREATE TABLE IF NOT EXISTS public."Game_State" (
    id INTEGER PRIMARY KEY DEFAULT 1, -- Single row table
    base_map_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Create Battle_Units table
CREATE TABLE IF NOT EXISTS public."Battle_Units" (
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

-- Create Planning_Units table
CREATE TABLE IF NOT EXISTS public."Planning_Units" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    type TEXT NOT NULL,
    owner TEXT NOT NULL,
    x_coord INTEGER NOT NULL,
    y_coord INTEGER NOT NULL,
    health INTEGER NOT NULL,
    in_reserve BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Optional: Add basic Row Level Security (RLS) policies 
-- Assuming user roles can be identified via Supabase auth or a custom claim

ALTER TABLE public."Battle_Units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Planning_Units" ENABLE ROW LEVEL SECURITY;

-- Example RLS setup: 
-- Moderators can view and edit everything.
-- Players can only see their own Planning Units.
-- Players can see their own Battle Units, and enemy Battle Units where is_visible_to_enemy = TRUE.

ALTER TABLE public."Profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Game_State" ENABLE ROW LEVEL SECURITY;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."Profiles" (id, email, role)
  VALUES (new.id, new.email, 'Unassigned');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create Map_POIs table
CREATE TABLE IF NOT EXISTS public."Map_POIs" (
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

-- Create Battle_Hazards table
CREATE TABLE IF NOT EXISTS public."Battle_Hazards" (
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

ALTER TABLE public."Map_POIs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Battle_Hazards" ENABLE ROW LEVEL SECURITY;
