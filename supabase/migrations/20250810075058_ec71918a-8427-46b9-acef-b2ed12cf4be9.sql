-- Add venue_type enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'venue_type') THEN
    CREATE TYPE public.venue_type AS ENUM ('ONLINE','IN_PERSON','HYBRID');
  END IF;
END$$;

-- Add missing columns to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS theme TEXT,
  ADD COLUMN IF NOT EXISTS host TEXT,
  ADD COLUMN IF NOT EXISTS community_slug TEXT,
  ADD COLUMN IF NOT EXISTS venue_type public.venue_type,
  ADD COLUMN IF NOT EXISTS meeting_link TEXT,
  ADD COLUMN IF NOT EXISTS capacity INTEGER,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_rsvp BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tba BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- Helpful index for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_events_start_at ON public.events (start_at);
CREATE INDEX IF NOT EXISTS idx_events_community ON public.events (community_slug);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events (status);

-- Compute event status based on dates and TBA
CREATE OR REPLACE FUNCTION public.compute_event_status(_start timestamptz, _end timestamptz, _tba boolean)
RETURNS event_status
LANGUAGE plpgsql
AS $$
DECLARE
  _status event_status;
  _now timestamptz := now();
  _end_eff timestamptz;
BEGIN
  IF COALESCE(_tba, false) THEN
    RETURN 'UPCOMING'::event_status;
  END IF;

  IF _start IS NULL THEN
    RETURN 'UPCOMING'::event_status;
  END IF;

  _end_eff := COALESCE(_end, _start + interval '1 hour');

  IF _now >= _start AND _now <= _end_eff THEN
    _status := 'LIVE'::event_status;
  ELSIF _now < _start THEN
    _status := 'UPCOMING'::event_status;
  ELSE
    _status := 'PAST'::event_status;
  END IF;

  RETURN _status;
END;
$$;

-- Trigger to set defaults and compute status
CREATE OR REPLACE FUNCTION public.set_event_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  NEW.status := public.compute_event_status(NEW.start_at, NEW.end_at, NEW.tba);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_events_defaults ON public.events;
CREATE TRIGGER trg_events_defaults
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.set_event_defaults();

-- Storage bucket for event covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-covers', 'event-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event covers
DO $$
BEGIN
  -- Public read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Event covers are publicly accessible'
  ) THEN
    CREATE POLICY "Event covers are publicly accessible"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'event-covers');
  END IF;

  -- Upload own
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload their own event cover'
  ) THEN
    CREATE POLICY "Users can upload their own event cover"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'event-covers'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Update own
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update their own event cover'
  ) THEN
    CREATE POLICY "Users can update their own event cover"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'event-covers'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Delete own
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their own event cover'
  ) THEN
    CREATE POLICY "Users can delete their own event cover"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'event-covers'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END$$;

-- Events RLS policies for approved members
DO $$
BEGIN
  -- Allow approved users to insert (created_by is filled by trigger)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Approved can create events'
  ) THEN
    CREATE POLICY "Approved can create events"
    ON public.events
    FOR INSERT
    TO authenticated
    WITH CHECK (is_approved(auth.uid()));
  END IF;

  -- Owner can update
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Owner can update event'
  ) THEN
    CREATE POLICY "Owner can update event"
    ON public.events
    FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());
  END IF;

  -- Owner can delete
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Owner can delete event'
  ) THEN
    CREATE POLICY "Owner can delete event"
    ON public.events
    FOR DELETE
    TO authenticated
    USING (created_by = auth.uid());
  END IF;
END$$;