
-- Transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  txn_id TEXT NOT NULL UNIQUE,
  from_entity TEXT NOT NULL,
  to_entity TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  amount_display TEXT NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 0,
  txn_type TEXT NOT NULL DEFAULT 'wire',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transactions are publicly readable"
ON public.transactions FOR SELECT USING (true);

-- Shell companies table
CREATE TABLE public.shell_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  registered_date TEXT NOT NULL,
  zone TEXT NOT NULL,
  employees INTEGER NOT NULL DEFAULT 0,
  revenue TEXT NOT NULL DEFAULT '$0',
  connections INTEGER NOT NULL DEFAULT 0,
  risk_score INTEGER NOT NULL DEFAULT 0,
  flags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shell_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shell companies are publicly readable"
ON public.shell_companies FOR SELECT USING (true);

-- Zones table
CREATE TABLE public.zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  zone_id TEXT NOT NULL UNIQUE,
  threat_level INTEGER NOT NULL DEFAULT 0,
  entities INTEGER NOT NULL DEFAULT 0,
  volume TEXT NOT NULL DEFAULT '$0',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Zones are publicly readable"
ON public.zones FOR SELECT USING (true);

-- Dropbox submissions table
CREATE TABLE public.dropbox_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  entity_name TEXT,
  zone TEXT,
  description TEXT NOT NULL,
  evidence_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dropbox_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit tips"
ON public.dropbox_submissions FOR INSERT WITH CHECK (true);

CREATE POLICY "Submissions are publicly readable"
ON public.dropbox_submissions FOR SELECT USING (true);

-- Enable realtime for transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
