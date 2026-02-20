
-- Create evidence storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', true);

-- Allow anyone to upload to evidence bucket
CREATE POLICY "Anyone can upload evidence"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'evidence');

-- Allow public reads on evidence bucket
CREATE POLICY "Evidence is publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'evidence');

-- Add AI analysis columns to dropbox_submissions
ALTER TABLE public.dropbox_submissions
ADD COLUMN ai_risk_score integer,
ADD COLUMN ai_analysis text;

-- Allow updates to dropbox_submissions (for edge function to write AI results)
CREATE POLICY "Service can update submissions"
ON public.dropbox_submissions FOR UPDATE
USING (true)
WITH CHECK (true);
