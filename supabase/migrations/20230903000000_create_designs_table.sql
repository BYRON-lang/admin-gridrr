-- Create designs table
CREATE TABLE IF NOT EXISTS public.designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  designer_name TEXT NOT NULL,
  designer_email TEXT NOT NULL,
  twitter_handle TEXT,
  instagram_handle TEXT,
  tools_used TEXT[],
  tags TEXT[],
  image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_designs_status ON public.designs(status);
CREATE INDEX IF NOT EXISTS idx_designs_created_at ON public.designs(created_at);

-- Add comments
COMMENT ON TABLE public.designs IS 'Stores design submissions from the upload form';
COMMENT ON COLUMN public.designs.status IS 'Current status of the design submission';

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_designs_updated_at
BEFORE UPDATE ON public.designs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
CREATE POLICY "Enable read access for all users"
ON public.designs
FOR SELECT
TO public
USING (status = 'approved');

CREATE POLICY "Enable insert for authenticated users"
ON public.designs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
ON public.designs
FOR UPDATE
TO authenticated
USING (designer_email = auth.jwt() ->> 'email');

CREATE POLICY "Enable all for service role"
ON public.designs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
