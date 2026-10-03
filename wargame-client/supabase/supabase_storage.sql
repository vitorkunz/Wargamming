-- Enable Storage (Allows raster images PNG, JPEG, WebP and vector SVG)
INSERT INTO storage.buckets (id, name, public, allowed_mime_types) 
VALUES ('maps', 'maps', true, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

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
