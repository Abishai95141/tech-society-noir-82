-- Enable required extensions (gen_random_uuid)
create extension if not exists pgcrypto;

-- 1) Enums
-- App roles
create type if not exists public.app_role as enum ('admin','moderator','user');

-- Event status
create type if not exists public.event_status as enum ('PAST','LIVE','UPCOMING');

-- Project status
create type if not exists public.project_status as enum ('INCUBATION','DEVELOPING','PRODUCTION','RESEARCH');

-- 2) Helper function for updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 3) Roles table and function
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- RLS policies for user_roles
-- Only the user (or admins) can see their roles; admins can see all
create policy if not exists "Users can view own roles" on public.user_roles
for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy if not exists "Users can insert their user role (self)" on public.user_roles
for insert to authenticated with check (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy if not exists "Users can update their user role (self or admin)" on public.user_roles
for update to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

-- 4) Back-compat view expected by UI: role_assignments
create or replace view public.role_assignments as
select id, user_id, role::text as role
from public.user_roles;

-- 5) Profiles (public subset of user data)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  community_slug text,
  specialization text,
  avatar_url text,
  spotlight boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create trigger if not exists trg_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- Public can view safe profile fields
create policy if not exists "Public can view profiles" on public.profiles
for select using (true);

-- Users can insert/update their own profile
create policy if not exists "Users can insert own profile" on public.profiles
for insert to authenticated with check (auth.uid() = id);

create policy if not exists "Users can update own profile" on public.profiles
for update to authenticated using (auth.uid() = id);

-- 6) Events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  status public.event_status not null default 'UPCOMING',
  start_at timestamptz,
  end_at timestamptz,
  location text,
  host text,
  tba boolean not null default false,
  image_url text,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;

create trigger if not exists trg_events_updated_at
before update on public.events
for each row execute function public.update_updated_at_column();

-- Validation trigger example: ensure end_at >= start_at when both present
create or replace function public.validate_event_times()
returns trigger as $$
begin
  if new.start_at is not null and new.end_at is not null and new.end_at < new.start_at then
    raise exception 'end_at must be after start_at';
  end if;
  return new;
end; $$ language plpgsql;

create trigger if not exists trg_events_validate_times
before insert or update on public.events
for each row execute function public.validate_event_times();

-- Public can view events
create policy if not exists "Public can view events" on public.events
for select using (true);

-- Admins/moderators can manage
create policy if not exists "Admins manage events" on public.events
for all to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'moderator')) with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'moderator'));

-- Helpful indexes
create index if not exists idx_events_status_start on public.events(status, start_at);
create index if not exists idx_events_featured on public.events(featured) where featured = true;

-- 7) Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  abstract text,
  status public.project_status not null default 'INCUBATION',
  image_url text,
  tech_stack text[] not null default '{}',
  featured boolean not null default false,
  looking_for_teammates boolean not null default false,
  looking_for text,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create trigger if not exists trg_projects_updated_at
before update on public.projects
for each row execute function public.update_updated_at_column();

-- Public can view projects
create policy if not exists "Public can view projects" on public.projects
for select using (true);

-- Owners can insert/update their projects; admins can manage
create policy if not exists "Owners insert projects" on public.projects
for insert to authenticated with check (auth.uid() = owner_id or public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'moderator'));

create policy if not exists "Owners update projects" on public.projects
for update to authenticated using (auth.uid() = owner_id or public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'moderator'));

-- Indexes
create index if not exists idx_projects_featured on public.projects(featured) where featured = true;
create index if not exists idx_projects_updated_at on public.projects(updated_at desc);
create index if not exists idx_projects_looking on public.projects(looking_for_teammates) where looking_for_teammates = true;

-- 8) CMS Posts
create table if not exists public.cms_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text,
  content text,
  published_at timestamptz,
  author_name text,
  type text,          -- e.g. 'resource', 'announcement', 'post'
  tags text[] not null default '{}',
  featured boolean not null default false,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cms_posts enable row level security;

create trigger if not exists trg_cms_posts_updated_at
before update on public.cms_posts
for each row execute function public.update_updated_at_column();

-- Public can view posts
create policy if not exists "Public can view cms_posts" on public.cms_posts
for select using (true);

-- Admins/mods can manage
create policy if not exists "Admins manage cms_posts" on public.cms_posts
for all to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'moderator')) with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'moderator'));

create index if not exists idx_cms_posts_published_at on public.cms_posts(published_at desc);
create index if not exists idx_cms_posts_type on public.cms_posts(type);

-- 9) Tech Buddies (minimal for existing components)
create table if not exists public.tech_buddies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  buddy_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.tech_buddies enable row level security;

-- Users can see their own buddy edges
create policy if not exists "Users can view own buddy edges" on public.tech_buddies
for select to authenticated using (user_id = auth.uid() or buddy_user_id = auth.uid());

-- Users can create buddy requests
create policy if not exists "Users can create buddy requests" on public.tech_buddies
for insert to authenticated with check (user_id = auth.uid());

-- Users can update if involved (e.g., accept)
create policy if not exists "Users can update own buddy edges" on public.tech_buddies
for update to authenticated using (user_id = auth.uid() or buddy_user_id = auth.uid());

-- 10) Optional: expose role_assignments for PostgREST (view already created)
-- No separate RLS needed; policies apply on underlying user_roles.

-- 11) Performance settings helpful for realtime (optional)
-- Not enabling realtime publication here to keep minimal; can be added later if needed.
