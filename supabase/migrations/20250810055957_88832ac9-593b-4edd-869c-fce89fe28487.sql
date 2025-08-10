-- 1) Create enum for buddy status (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tech_buddy_status') THEN
    CREATE TYPE public.tech_buddy_status AS ENUM ('PENDING','ACCEPTED','REJECTED','BLOCKED');
  END IF;
END$$;

-- 2) Helper function to check if a user is APPROVED
CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND p.status = 'APPROVED'::user_status
  );
$$;

-- 3) Tech buddies table
CREATE TABLE IF NOT EXISTS public.tech_buddies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  status public.tech_buddy_status NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tech_buddies_no_self CHECK (requester_id <> recipient_id)
);

-- Unique pair constraint (order-independent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_tech_buddies_pair'
  ) THEN
    CREATE UNIQUE INDEX uq_tech_buddies_pair
    ON public.tech_buddies (
      LEAST(requester_id, recipient_id),
      GREATEST(requester_id, recipient_id)
    );
  END IF;
END$$;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_tech_buddies_requester ON public.tech_buddies (requester_id);
CREATE INDEX IF NOT EXISTS idx_tech_buddies_recipient ON public.tech_buddies (recipient_id);
CREATE INDEX IF NOT EXISTS idx_tech_buddies_status ON public.tech_buddies (status);

-- Trigger to maintain updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tech_buddies_updated_at'
  ) THEN
    CREATE TRIGGER trg_tech_buddies_updated_at
    BEFORE UPDATE ON public.tech_buddies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- 4) Enable RLS
ALTER TABLE public.tech_buddies ENABLE ROW LEVEL SECURITY;

-- 5) RLS policies
-- Read own buddy rows when approved
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='tech_buddies' AND policyname='Approved users see their buddy rows'
  ) THEN
    CREATE POLICY "Approved users see their buddy rows"
    ON public.tech_buddies
    FOR SELECT
    USING (
      public.is_approved(auth.uid())
      AND (requester_id = auth.uid() OR recipient_id = auth.uid())
    );
  END IF;
END$$;

-- Send request (insert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='tech_buddies' AND policyname='Approved users can request buddies'
  ) THEN
    CREATE POLICY "Approved users can request buddies"
    ON public.tech_buddies
    FOR INSERT
    WITH CHECK (
      public.is_approved(auth.uid())
      AND requester_id = auth.uid()
      AND requester_id <> recipient_id
      AND public.is_approved(recipient_id)
    );
  END IF;
END$$;

-- Recipient can respond (accept/reject/block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='tech_buddies' AND policyname='Recipient can respond to requests'
  ) THEN
    CREATE POLICY "Recipient can respond to requests"
    ON public.tech_buddies
    FOR UPDATE
    USING (
      public.is_approved(auth.uid()) AND recipient_id = auth.uid()
    )
    WITH CHECK (
      recipient_id = auth.uid() AND status IN ('ACCEPTED','REJECTED','BLOCKED')
    );
  END IF;
END$$;

-- Requester can cancel outgoing pending
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='tech_buddies' AND policyname='Requester can cancel outgoing pending'
  ) THEN
    CREATE POLICY "Requester can cancel outgoing pending"
    ON public.tech_buddies
    FOR DELETE
    USING (
      public.is_approved(auth.uid()) AND requester_id = auth.uid() AND status = 'PENDING'
    );
  END IF;
END$$;

-- Either side can remove accepted buddy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='tech_buddies' AND policyname='Either side can remove accepted buddy'
  ) THEN
    CREATE POLICY "Either side can remove accepted buddy"
    ON public.tech_buddies
    FOR DELETE
    USING (
      public.is_approved(auth.uid())
      AND status = 'ACCEPTED'
      AND (requester_id = auth.uid() OR recipient_id = auth.uid())
    );
  END IF;
END$$;

-- 6) Profiles: allow approved users to read other approved profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Approved users can read approved profiles'
  ) THEN
    CREATE POLICY "Approved users can read approved profiles"
    ON public.profiles
    FOR SELECT
    USING (
      public.is_approved(auth.uid()) AND status = 'APPROVED'
    );
  END IF;
END$$;