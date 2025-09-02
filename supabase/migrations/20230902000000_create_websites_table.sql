-- Create enum type for website status if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'website_status') THEN
        CREATE TYPE website_status AS ENUM ('pending', 'approved', 'rejected', 'draft');
    END IF;
END$$;

-- Create websites table
CREATE TABLE IF NOT EXISTS public.websites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  built_with TEXT,
  tools_used TEXT[],
  preview_video_url TEXT,
  contact_email TEXT NOT NULL,
  submitted_by TEXT,
  twitter_handle TEXT,
  instagram_handle TEXT,
  status website_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT websites_url_key UNIQUE (url)
);

-- Enable RLS
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS public_websites_select_policy ON public.websites;
DROP POLICY IF EXISTS authenticated_insert_policy ON public.websites;
DROP POLICY IF EXISTS user_view_own_submissions_policy ON public.websites;
DROP POLICY IF EXISTS user_update_own_submissions_policy ON public.websites;
DROP POLICY IF EXISTS service_role_bypass_policy ON public.websites;
DROP POLICY IF EXISTS admin_full_access_policy ON public.websites;

-- Public read access
CREATE POLICY public_websites_select_policy ON public.websites
FOR SELECT USING (status = 'approved');

-- Authenticated users can insert
CREATE POLICY authenticated_insert_policy ON public.websites
FOR INSERT TO authenticated WITH CHECK (true);

-- Users can view their own submissions
CREATE POLICY user_view_own_submissions_policy ON public.websites
FOR SELECT USING (auth.role() = 'authenticated' AND submitted_by = auth.uid()::text);

-- Users can update their own submissions
CREATE POLICY user_update_own_submissions_policy ON public.websites
FOR UPDATE
USING (auth.role() = 'authenticated' AND submitted_by = auth.uid()::text)
WITH CHECK (auth.role() = 'authenticated' AND submitted_by = auth.uid()::text);

-- Service role bypass
CREATE POLICY service_role_bypass_policy ON public.websites
USING (auth.role() = 'service_role');

-- Admin full access
CREATE POLICY admin_full_access_policy ON public.websites
USING (EXISTS (
  SELECT 1 FROM auth.users 
  WHERE id = auth.uid() AND 
  (raw_user_meta_data->>'role')::text = 'admin'
));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_websites_status ON public.websites(status);
CREATE INDEX IF NOT EXISTS idx_websites_created_at ON public.websites(created_at);

-- Add comments
COMMENT ON TABLE public.websites IS 'Stores all website submissions';
COMMENT ON COLUMN public.websites.url IS 'The URL of the submitted website';
COMMENT ON COLUMN public.websites.built_with IS 'Technologies used to build the website';
COMMENT ON COLUMN public.websites.tools_used IS 'Array of tools/libraries used in the project';
COMMENT ON COLUMN public.websites.preview_video_url IS 'URL to the video preview in storage';

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_websites_updated_at'
    ) THEN
        CREATE TRIGGER update_websites_updated_at
        BEFORE UPDATE ON public.websites
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;
