-- Enable Storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('maps', 'maps', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'maps');

DROP POLICY IF EXISTS "Moderator Upload Access" ON storage.objects;
CREATE POLICY "Moderator Upload Access" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'maps' AND public.get_user_role() = 'Moderator'
);

DROP POLICY IF EXISTS "Moderator Update Access" ON storage.objects;
CREATE POLICY "Moderator Update Access" ON storage.objects FOR UPDATE USING (
  bucket_id = 'maps' AND public.get_user_role() = 'Moderator'
);

DROP POLICY IF EXISTS "Moderator Delete Access" ON storage.objects;
CREATE POLICY "Moderator Delete Access" ON storage.objects FOR DELETE USING (
  bucket_id = 'maps' AND public.get_user_role() = 'Moderator'
);
