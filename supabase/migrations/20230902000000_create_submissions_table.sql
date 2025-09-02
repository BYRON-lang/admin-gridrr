-- Create enum type for submission status
CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected', 'draft');

-- Create submissions table
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('website', 'design')),
  contact_email TEXT NOT NULL,
  twitter_handle TEXT,
  instagram_handle TEXT,
  submitted_by TEXT,
  additional_notes TEXT,
  status submission_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_type ON public.submissions(submission_type);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.submissions(created_at);

-- Add comments
COMMENT ON TABLE public.submissions IS 'Stores all types of submissions';
COMMENT ON COLUMN public.submissions.submission_type IS 'Type of submission (website, design, etc.)';
COMMENT ON COLUMN public.submissions.status IS 'Current status of the submission';

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_submissions_updated_at
BEFORE UPDATE ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
