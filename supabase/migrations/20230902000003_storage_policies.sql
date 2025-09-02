-- Disable RLS for public access
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Allow all operations on the websites bucket
CREATE POLICY "Allow all on websites bucket"
ON storage.objects FOR ALL
USING (bucket_id = 'websites')
WITH CHECK (bucket_id = 'websites');
