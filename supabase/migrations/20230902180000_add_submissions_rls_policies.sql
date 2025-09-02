-- Enable RLS on all relevant tables if not already enabled
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_media ENABLE ROW LEVEL SECURITY;

-- Function to safely drop policy if it exists
CREATE OR REPLACE FUNCTION safe_drop_policy(policy_name text, table_name text) RETURNS void AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = policy_name AND tablename = table_name) THEN
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON %I', policy_name, table_name);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop existing policies if they exist
SELECT safe_drop_policy('Allow public insert on submissions', 'submissions');
SELECT safe_drop_policy('Allow public read own submissions', 'submissions');
SELECT safe_drop_policy('Allow public update own submissions', 'submissions');
SELECT safe_drop_policy('Allow public insert on design_submissions', 'design_submissions');
SELECT safe_drop_policy('Allow public read own design_submissions', 'design_submissions');
SELECT safe_drop_policy('Allow public insert on submission_media', 'submission_media');
SELECT safe_drop_policy('Allow public read own submission_media', 'submission_media');
SELECT safe_drop_policy('Allow all access to submissions for service role', 'submissions');
SELECT safe_drop_policy('Allow all access to design_submissions for service role', 'design_submissions');
SELECT safe_drop_policy('Allow all access to submission_media for service role', 'submission_media');
SELECT safe_drop_policy('Allow public read access to approved submissions', 'submissions');
SELECT safe_drop_policy('Allow public read access to approved submission media', 'submission_media');
SELECT safe_drop_policy('Allow public read access to approved design submissions', 'design_submissions');

-- Create policies
CREATE POLICY "Allow public insert on submissions"
ON public.submissions FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow public read own submissions"
ON public.submissions FOR SELECT
TO authenticated
USING (auth.uid()::text = submitted_by OR auth.role() = 'service_role');

CREATE POLICY "Allow public update own submissions"
ON public.submissions FOR UPDATE
TO authenticated
USING (auth.uid()::text = submitted_by OR auth.role() = 'service_role');

CREATE POLICY "Allow public insert on design_submissions"
ON public.design_submissions FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow public read own design_submissions"
ON public.design_submissions FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.submissions s 
  WHERE s.id = submission_id 
  AND (s.submitted_by = auth.uid()::text OR auth.role() = 'service_role')
));

CREATE POLICY "Allow public insert on submission_media"
ON public.submission_media FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow public read own submission_media"
ON public.submission_media FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.submissions s 
  WHERE s.id = submission_id 
  AND (s.submitted_by = auth.uid()::text OR auth.role() = 'service_role')
));

-- Service role policies
CREATE POLICY "Allow all access to submissions for service role"
ON public.submissions
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all access to design_submissions for service role"
ON public.design_submissions
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all access to submission_media for service role"
ON public.submission_media
TO service_role
USING (true)
WITH CHECK (true);

-- Public read access policies
CREATE POLICY "Allow public read access to approved submissions"
ON public.submissions FOR SELECT
TO anon, authenticated
USING (status = 'approved');

CREATE POLICY "Allow public read access to approved submission media"
ON public.submission_media FOR SELECT
TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.submissions s 
  WHERE s.id = submission_id AND s.status = 'approved'
));

CREATE POLICY "Allow public read access to approved design submissions"
ON public.design_submissions FOR SELECT
TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.submissions s 
  WHERE s.id = submission_id AND s.status = 'approved'
));

-- Note: Storage policies for Supabase Storage should be created through the Storage section
-- in the Supabase dashboard or using the storage API in your application code.
-- The following is a reference for the policy that should be set up:

/*
-- This policy should be set up in the Supabase Dashboard under Storage -> Policies
-- or using the storage API in your application code:

create or replace function public.is_authenticated()
returns boolean as $$
  select auth.role() = 'authenticated' or auth.role() = 'service_role';
$$ language sql security definer;

create policy "Allow authenticated users to upload to designs bucket"
on storage.objects for insert
with check (
  bucket_id = 'designs' and
  (storage.foldername(name))[1] = 'public' and
  auth.role() = 'authenticated'
);

create policy "Allow public read access to designs bucket"
on storage.objects for select
using (
  bucket_id = 'designs' and
  (storage.foldername(name))[1] = 'public'
);

-- Note: You'll need to create the 'designs' bucket first in the Supabase Dashboard
-- under Storage -> Create a new bucket
*/
