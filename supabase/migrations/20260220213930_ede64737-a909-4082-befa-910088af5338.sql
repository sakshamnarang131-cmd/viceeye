
-- Create table for micro-transaction crisis analyses
CREATE TABLE public.micro_transaction_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  input_records JSONB NOT NULL,
  cluster_risk_score INTEGER NOT NULL DEFAULT 0,
  classification TEXT NOT NULL DEFAULT 'Low anomaly',
  entities_involved TEXT[] NOT NULL DEFAULT '{}',
  detected_patterns JSONB NOT NULL DEFAULT '[]',
  ai_summary TEXT,
  raw_analysis JSONB
);

-- Enable RLS
ALTER TABLE public.micro_transaction_analyses ENABLE ROW LEVEL SECURITY;

-- Public read/insert (anonymous intelligence tool)
CREATE POLICY "Anyone can create analyses"
  ON public.micro_transaction_analyses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Analyses are publicly readable"
  ON public.micro_transaction_analyses FOR SELECT
  USING (true);
