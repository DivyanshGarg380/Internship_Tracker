
-- Wipe publicly-writable rows (any data here was exposed to the internet)
DELETE FROM public.timeline_events;
DELETE FROM public.applications;

-- Add owner columns
ALTER TABLE public.applications  ADD COLUMN user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.timeline_events ADD COLUMN user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX applications_user_id_idx   ON public.applications(user_id);
CREATE INDEX timeline_events_user_id_idx ON public.timeline_events(user_id);

-- Auto-fill user_id from auth.uid() on insert so client code doesn't need to set it
CREATE OR REPLACE FUNCTION public.set_user_id_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER applications_set_user_id
  BEFORE INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id_from_auth();

CREATE TRIGGER timeline_events_set_user_id
  BEFORE INSERT ON public.timeline_events
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id_from_auth();

-- Replace permissive policies with per-user policies
DROP POLICY IF EXISTS "Public full access" ON public.applications;
DROP POLICY IF EXISTS "Public full access" ON public.timeline_events;

REVOKE ALL ON public.applications  FROM anon;
REVOKE ALL ON public.timeline_events FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timeline_events TO authenticated;
GRANT ALL ON public.applications  TO service_role;
GRANT ALL ON public.timeline_events TO service_role;

CREATE POLICY "Users manage their own applications"
  ON public.applications FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage their own timeline events"
  ON public.timeline_events FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
