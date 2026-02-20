
-- Fix RLS: allow public reads on all tables
DROP POLICY IF EXISTS "Allow public read access" ON public.transactions;
DROP POLICY IF EXISTS "Allow public read access" ON public.shell_companies;
DROP POLICY IF EXISTS "Allow public read access" ON public.zones;
DROP POLICY IF EXISTS "Allow public read access" ON public.dropbox_submissions;
DROP POLICY IF EXISTS "Allow public insert" ON public.dropbox_submissions;
DROP POLICY IF EXISTS "Allow public update" ON public.dropbox_submissions;

CREATE POLICY "Allow public read access" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.shell_companies FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.zones FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.dropbox_submissions FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.dropbox_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.dropbox_submissions FOR UPDATE USING (true);
