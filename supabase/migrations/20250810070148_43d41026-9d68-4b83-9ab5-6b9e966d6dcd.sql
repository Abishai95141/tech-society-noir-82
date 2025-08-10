-- Add FK relationship so Supabase can join projects -> profiles via owner_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_owner_id_fkey'
  ) THEN
    ALTER TABLE public.projects
    ADD CONSTRAINT projects_owner_id_fkey
    FOREIGN KEY (owner_id)
    REFERENCES public.profiles(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE;
  END IF;
END $$;

-- Helpful index for owner lookups
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);