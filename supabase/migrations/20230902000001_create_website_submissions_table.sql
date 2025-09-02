-- Create website_submissions table
CREATE TABLE IF NOT EXISTS public.website_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  built_with TEXT,
  tools_used TEXT[],
  preview_video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.website_submissions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_website_submissions_submission_id ON public.website_submissions(submission_id);
CREATE INDEX IF NOT EXISTS idx_website_submissions_url ON public.website_submissions(url);

-- Add comments
COMMENT ON TABLE public.website_submissions IS 'Stores website-specific submission details';
COMMENT ON COLUMN public.website_submissions.url IS 'The URL of the submitted website';
COMMENT ON COLUMN public.website_submissions.built_with IS 'Technologies used to build the website';
COMMENT ON COLUMN public.website_submissions.tools_used IS 'Array of tools/libraries used in the project';
COMMENT ON COLUMN public.website_submissions.preview_video_url IS 'URL to the video preview in storage';

-- Create trigger for updated_at
CREATE TRIGGER update_website_submissions_updated_at
BEFORE UPDATE ON public.website_submissions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
