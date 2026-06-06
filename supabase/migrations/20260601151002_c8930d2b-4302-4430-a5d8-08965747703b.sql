
CREATE TYPE public.app_status AS ENUM ('Applied','Under Review','OA Received','Interview','Rejected','Offer');

CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  status public.app_status NOT NULL DEFAULT 'Applied',
  applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  event TEXT NOT NULL,
  status public.app_status,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_timeline_application ON public.timeline_events(application_id);
CREATE INDEX idx_applications_updated ON public.applications(updated_at DESC);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER applications_touch BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timeline_events TO anon, authenticated;
GRANT ALL ON public.applications TO service_role;
GRANT ALL ON public.timeline_events TO service_role;

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

-- Single-user personal app: permissive policies
CREATE POLICY "Public full access" ON public.applications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON public.timeline_events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
