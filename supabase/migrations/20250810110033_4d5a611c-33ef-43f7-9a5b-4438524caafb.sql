-- 1) Projects: feature/flag/archive columns
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_note text,
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_projects_featured ON public.projects (featured);
CREATE INDEX IF NOT EXISTS idx_projects_flagged ON public.projects (flagged);
CREATE INDEX IF NOT EXISTS idx_projects_archived ON public.projects (archived);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects (updated_at DESC);

-- 2) Events: archive column (feature + RSVP lock already exist as is_featured, allow_rsvp)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_events_status_start ON public.events (status, start_at);
CREATE INDEX IF NOT EXISTS idx_events_archived ON public.events (archived);

-- 3) Event participants table for tagging community members
CREATE TABLE IF NOT EXISTS public.event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- Function to set added_by automatically
CREATE OR REPLACE FUNCTION public.set_added_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.added_by IS NULL THEN
    NEW.added_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to populate added_by
DROP TRIGGER IF EXISTS trg_event_participants_added_by ON public.event_participants;
CREATE TRIGGER trg_event_participants_added_by
BEFORE INSERT ON public.event_participants
FOR EACH ROW
EXECUTE FUNCTION public.set_added_by();

-- RLS policies for event_participants
DO $$
BEGIN
  -- Public can read participants
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'event_participants' AND policyname = 'Participants are public'
  ) THEN
    CREATE POLICY "Participants are public"
    ON public.event_participants
    FOR SELECT
    USING (true);
  END IF;

  -- Admins manage participants
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'event_participants' AND policyname = 'Admin manage participants'
  ) THEN
    CREATE POLICY "Admin manage participants"
    ON public.event_participants
    FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;

  -- Event owner can manage participants
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'event_participants' AND policyname = 'Owner manage participants'
  ) THEN
    CREATE POLICY "Owner manage participants"
    ON public.event_participants
    FOR INSERT
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_participants.event_id AND e.created_by = auth.uid()
    ));

    CREATE POLICY "Owner update participants"
    ON public.event_participants
    FOR UPDATE
    USING (EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_participants.event_id AND e.created_by = auth.uid()
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_participants.event_id AND e.created_by = auth.uid()
    ));

    CREATE POLICY "Owner delete participants"
    ON public.event_participants
    FOR DELETE
    USING (EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_participants.event_id AND e.created_by = auth.uid()
    ));
  END IF;
END
$$;

-- 4) Triggers for timestamps and event defaults/status recompute
-- Projects updated_at on update
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Events updated_at on update
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Events defaults + status recompute on insert/update
DROP TRIGGER IF EXISTS events_set_defaults ON public.events;
CREATE TRIGGER events_set_defaults
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.set_event_defaults();

-- 5) Helpful indexes for participants
CREATE INDEX IF NOT EXISTS idx_event_participants_event ON public.event_participants (event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user ON public.event_participants (user_id);
