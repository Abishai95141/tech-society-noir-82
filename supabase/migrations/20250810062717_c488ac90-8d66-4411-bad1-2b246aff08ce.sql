-- Normalize project status and add missing columns, FKs, and memberships

-- 1) Create project_status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'project_status'
  ) THEN
    CREATE TYPE project_status AS ENUM (
      'IDEATION', 'INCUBATION', 'DEVELOPING', 'PRODUCTION', 'STARTUP', 'RESEARCH'
    );
  END IF;
END$$;

-- 2) Add useful columns to projects (non-breaking)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS tech_stack text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS github_url text,
  ADD COLUMN IF NOT EXISTS drive_url text;

-- 3) Try to align projects.status column to our enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'projects' AND c.column_name = 'status'
      AND c.udt_name <> 'project_status'
  ) THEN
    -- Attempt to cast via upper(text)
    ALTER TABLE public.projects
      ALTER COLUMN status TYPE project_status
      USING UPPER(status)::project_status;
  END IF;
END$$;

-- 4) Add FKs for FK-based joins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_owner_id_fkey'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'join_requests_project_id_fkey'
  ) THEN
    ALTER TABLE public.join_requests
      ADD CONSTRAINT join_requests_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'join_requests_requester_id_fkey'
  ) THEN
    ALTER TABLE public.join_requests
      ADD CONSTRAINT join_requests_requester_id_fkey
      FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END$$;

-- 5) Create project_members table for team management
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint to avoid duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_members_project_user_key'
  ) THEN
    ALTER TABLE public.project_members
      ADD CONSTRAINT project_members_project_user_key UNIQUE (project_id, user_id);
  END IF;
END$$;

-- FKs for memberships
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_members_project_id_fkey'
  ) THEN
    ALTER TABLE public.project_members
      ADD CONSTRAINT project_members_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_members_user_id_fkey'
  ) THEN
    ALTER TABLE public.project_members
      ADD CONSTRAINT project_members_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END$$;

-- 6) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects(updated_at);
CREATE INDEX IF NOT EXISTS idx_projects_title ON public.projects(title);

-- 7) RLS for project_members
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'project_members' AND policyname = 'Approved can view members'
  ) THEN
    CREATE POLICY "Approved can view members"
    ON public.project_members
    FOR SELECT
    USING (is_approved(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'project_members' AND policyname = 'Owner manages members'
  ) THEN
    CREATE POLICY "Owner manages members"
    ON public.project_members
    FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_members.project_id AND p.owner_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_members.project_id AND p.owner_id = auth.uid()
    ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'project_members' AND policyname = 'User can view own memberships'
  ) THEN
    CREATE POLICY "User can view own memberships"
    ON public.project_members
    FOR SELECT
    USING (user_id = auth.uid());
  END IF;
END$$;