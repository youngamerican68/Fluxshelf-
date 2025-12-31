-- Storage Buckets Setup
-- Run this in your Supabase SQL Editor after enabling Storage

-- Create the main storage bucket for all FluxShield assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fluxshield',
  'fluxshield',
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/zip']
)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies

-- Allow users to upload to their own folder
CREATE POLICY "Users can upload own files" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'fluxshield' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to view their own files
CREATE POLICY "Users can view own files" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'fluxshield' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to update their own files
CREATE POLICY "Users can update own files" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'fluxshield' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'fluxshield' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Service role bypass for worker operations
-- Note: Service role automatically bypasses RLS, but we'll document the folder structure:
-- {user_id}/brands/{brand_id}/assets/{filename}
-- {user_id}/campaigns/{campaign_id}/generated/{filename}
-- {user_id}/campaigns/{campaign_id}/exports/{filename}
-- {user_id}/campaigns/{campaign_id}/downloads/{filename}
