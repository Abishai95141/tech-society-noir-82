-- Fix: create enums using DO blocks (IF NOT EXISTS not supported for TYPE)

-- App roles enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
  END IF;
END $$;

-- Event status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
    CREATE TYPE public.event_status AS ENUM ('PAST','LIVE','UPCOMING');
  END IF;
END $$;

-- Project status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
    CREATE TYPE public.project_status AS ENUM ('INCUBATION','DEVELOPING','PRODUCTION','RESEARCH');
  END IF;
END $$;

-- Helper function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Roles table and has_role function
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- RLS for user_roles
CREATE POLICY IF NOT EXISTS "Users can view own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "Users can insert their user role (self)" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "Users can update their user role (self or admin)" ON public.user_roles
FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- View for role_assignments expected by UI
CREATE OR REPLACE VIEW public.role_assignments AS
SELECT id, user_id, role::text AS role
FROM public.user_roles;

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  community_slug text,
  specialization text,
  avatar_url text,
  spotlight boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER IF NOT EXISTS trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY IF NOT EXISTS "Public can view profiles" ON public.profiles
FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can insert own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Events table
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  status public.event_status NOT NULL DEFAULT 'UPCOMING',
  start_at timestamptz,
  end_at timestamptz,
  location text,
  host text,
  tba boolean NOT NULL DEFAULT false,
  image_url text,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER IF NOT EXISTS trg_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_event_times()
RETURNS trigger AS $$
BEGIN
  IF NEW.start_at IS NOT NULL AND NEW.end_at IS NOT NULL AND NEW.end_at < NEW.start_at THEN
    RAISE EXCEPTION 'end_at must be after start_at';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trg_events_validate_times
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.validate_event_times();

CREATE POLICY IF NOT EXISTS "Public can view events" ON public.events
FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Admins manage events" ON public.events
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE INDEX IF NOT EXISTS idx_events_status_start ON public.events(status, start_at);
CREATE INDEX IF NOT EXISTS idx_events_featured ON public.events(featured) WHERE featured = true;

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  abstract text,
  status public.project_status NOT NULL DEFAULT 'INCUBATION',
  image_url text,
  tech_stack text[] NOT NULL DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  looking_for_teammates boolean NOT NULL DEFAULT false,
  looking_for text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER IF NOT EXISTS trg_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY IF NOT EXISTS "Public can view projects" ON public.projects
FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Owners insert projects" ON public.projects
FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY IF NOT EXISTS "Owners update projects" ON public.projects
FOR UPDATE TO authenticated USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE INDEX IF NOT EXISTS idx_projects_featured ON public.projects(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_looking ON public.projects(looking_for_teammates) WHERE looking_for_teammates = true;

-- CMS posts table
CREATE TABLE IF NOT EXISTS public.cms_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  excerpt text,
  content text,
  published_at timestamptz,
  author_name text,
  type text,
  tags text[] NOT NULL DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  cover_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_posts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER IF NOT EXISTS trg_cms_posts_updated_at
BEFORE UPDATE ON public.cms_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY IF NOT EXISTS "Public can view cms_posts" ON public.cms_posts
FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Admins manage cms_posts" ON public.cms_posts
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE INDEX IF NOT EXISTS idx_cms_posts_published_at ON public.cms_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_cms_posts_type ON public.cms_posts(type);

-- Tech buddies
CREATE TABLE IF NOT EXISTS public.tech_buddies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buddy_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tech_buddies ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own buddy edges" ON public.tech_buddies
FOR SELECT TO authenticated USING (user_id = auth.uid() OR buddy_user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can create buddy requests" ON public.tech_buddies
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update own buddy edges" ON public.tech_buddies
FOR UPDATE TO authenticated USING (user_id = auth.uid() OR buddy_user_id = auth.uid());