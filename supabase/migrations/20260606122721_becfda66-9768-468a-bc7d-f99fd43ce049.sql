
ALTER TABLE public.applications ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.timeline_events ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "Users can view their own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can insert their own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can update their own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can delete their own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can view their own timeline events" ON public.timeline_events;
DROP POLICY IF EXISTS "Users can insert their own timeline events" ON public.timeline_events;
DROP POLICY IF EXISTS "Users can update their own timeline events" ON public.timeline_events;
DROP POLICY IF EXISTS "Users can delete their own timeline events" ON public.timeline_events;

CREATE POLICY "Public access applications" ON public.applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access timeline events" ON public.timeline_events FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timeline_events TO anon, authenticated;
