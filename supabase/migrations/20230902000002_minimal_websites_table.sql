-- Drop existing policies if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'websites') THEN
    DROP POLICY IF EXISTS public_websites_select_policy ON public.websites;
    DROP POLICY IF EXISTS authenticated_insert_policy ON public.websites;
    DROP POLICY IF EXISTS user_view_own_submissions_policy ON public.websites;
    DROP POLICY IF EXISTS user_update_own_submissions_policy ON public.websites;
    DROP POLICY IF EXISTS service_role_bypass_policy ON public.websites;
    DROP POLICY IF EXISTS admin_full_access_policy ON public.websites;
  END IF;
END $$;

-- Create a minimal websites table with only the fields from the upload form
CREATE TABLE IF NOT EXISTS public.websites_minimal (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  built_with TEXT,
  tags TEXT,
  preview_video_url TEXT NOT NULL,
  email TEXT NOT NULL,
  submitted_by TEXT,
  twitter_handle TEXT,
  instagram_handle TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT websites_url_key UNIQUE (url)
);

-- Copy only the necessary data from the old table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'websites') THEN
    INSERT INTO public.websites_minimal (
      id, title, url, built_with, tags,
      preview_video_url, email, submitted_by,
      twitter_handle, instagram_handle, status,
      created_at, updated_at, deleted_at
    )
    SELECT 
id, title, url, built_with, tags,
      preview_video_url, contact_email, submitted_by,
      twitter_handle, instagram_handle, status,
      created_at, updated_at, deleted_at
    FROM public.websites;
    
    -- Drop the old table
    DROP TABLE public.websites;
  END IF;
END $$;

-- Rename the new table
ALTER TABLE public.websites_minimal RENAME TO websites;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_websites_status ON public.websites(status);
CREATE INDEX IF NOT EXISTS idx_websites_created_at ON public.websites(created_at);

-- Enable RLS but allow all operations for any authenticated user
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;

-- Allow all operations for any authenticated user
CREATE POLICY allow_all_for_authenticated ON public.websites
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Recreate the update_updated_at function and trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger for updated_at
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
