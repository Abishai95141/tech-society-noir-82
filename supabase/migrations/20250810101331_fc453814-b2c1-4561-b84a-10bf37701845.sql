-- Align DB schema with existing UI code expectations
-- 1) profiles.status for approvals
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'PENDING';

-- 2) tech_buddies column names and timestamps
ALTER TABLE public.tech_buddies RENAME COLUMN user_id TO requester_id;
ALTER TABLE public.tech_buddies RENAME COLUMN buddy_user_id TO recipient_id;
ALTER TABLE public.tech_buddies ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Normalize status casing
UPDATE public.tech_buddies SET status = upper(status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_tech_buddies_updated_at ON public.tech_buddies;
CREATE TRIGGER trg_tech_buddies_updated_at
BEFORE UPDATE ON public.tech_buddies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS stays the same: adjust policies to renamed columns
DROP POLICY IF EXISTS "Users can view own buddy edges" ON public.tech_buddies;
CREATE POLICY "Users can view own buddy edges" ON public.tech_buddies
FOR SELECT TO authenticated USING (requester_id = auth.uid() OR recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can create buddy requests" ON public.tech_buddies;
CREATE POLICY "Users can create buddy requests" ON public.tech_buddies
FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own buddy edges" ON public.tech_buddies;
CREATE POLICY "Users can update own buddy edges" ON public.tech_buddies
FOR UPDATE TO authenticated USING (requester_id = auth.uid() OR recipient_id = auth.uid());

-- 3) events fields used by UI
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS venue_type text;