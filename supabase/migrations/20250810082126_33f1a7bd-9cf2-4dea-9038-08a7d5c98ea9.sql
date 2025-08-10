-- Create event RSVPs table for attendance tracking
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_rsvps_unique UNIQUE (event_id, user_id)
);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read RSVPs"
ON public.event_rsvps
FOR SELECT
USING (true);

CREATE POLICY "Approved users can RSVP"
ON public.event_rsvps
FOR INSERT
WITH CHECK (is_approved(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "User can cancel own RSVP"
ON public.event_rsvps
FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Owner can manage RSVPs on their event"
ON public.event_rsvps
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_rsvps.event_id AND e.created_by = auth.uid()
  )
);

CREATE POLICY "Admin can manage RSVPs"
ON public.event_rsvps
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Updated at trigger
CREATE TRIGGER update_event_rsvps_updated_at
BEFORE UPDATE ON public.event_rsvps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure events status/created_by are set automatically
CREATE TRIGGER set_event_defaults_before_insert
BEFORE INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.set_event_defaults();

CREATE TRIGGER set_event_status_before_update
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.set_event_defaults();

-- Keep events.updated_at fresh
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_events_updated_at'
  ) THEN
    CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Storage policies for event cover uploads
-- Public read access to covers
CREATE POLICY IF NOT EXISTS "Event covers are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'event-covers');

-- Approved users can upload covers
CREATE POLICY IF NOT EXISTS "Approved users can upload event covers"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-covers' AND is_approved(auth.uid()));