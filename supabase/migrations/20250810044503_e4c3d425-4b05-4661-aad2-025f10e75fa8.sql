-- TechSociety initial schema and seed (Supabase)
-- Enums
create type public.user_status as enum ('PENDING','APPROVED','REJECTED');
create type public.event_status as enum ('PAST','LIVE','UPCOMING');
create type public.project_status as enum ('INCUBATION','PRODUCTION','STARTUP','RESEARCH');
create type public.join_status as enum ('PENDING','APPROVED','REJECTED');
create type public.app_role as enum ('admin','coordinator','assistant_coordinator','secretary','joint_secretary','member');

-- Helper function for updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Communities
create table public.communities (
  slug text primary key,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_communities_updated before update on public.communities
for each row execute function public.update_updated_at_column();

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text,
  degree text,
  specialization text,
  phone text,
  linkedin_url text,
  github_url text,
  community_slug text references public.communities(slug),
  status public.user_status not null default 'PENDING',
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.update_updated_at_column();

-- Roles
create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  community_slug text null references public.communities(slug),
  created_at timestamptz not null default now(),
  unique (user_id, role, community_slug)
);

-- Events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  start_at timestamptz,
  end_at timestamptz,
  location text,
  status public.event_status not null default 'UPCOMING',
  cover_image text,
  links jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_events_updated before update on public.events
for each row execute function public.update_updated_at_column();

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  status public.project_status not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  community_slug text null references public.communities(slug),
  looking_for text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_projects_updated before update on public.projects
for each row execute function public.update_updated_at_column();

-- Join Requests
create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  status public.join_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_join_requests_updated before update on public.join_requests
for each row execute function public.update_updated_at_column();

-- CMS Posts
create table public.cms_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text,
  body text,
  published_at timestamptz,
  author_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_cms_posts_updated before update on public.cms_posts
for each row execute function public.update_updated_at_column();

-- Bootstrap admins list (to auto-assign role at first registration)
create table public.bootstrap_admins (
  email text primary key
);

-- Seed communities
insert into public.communities (slug, name) values
  ('ml','Machine Learning'),
  ('is','Intelligent Systems'),
  ('webdev','Web Development'),
  ('gamesapps','Games & App Development'),
  ('cybersec','Cyber Security')
on conflict (slug) do nothing;

-- Seed sample events and posts
insert into public.events (title, summary, status, start_at, end_at, location)
values
  ('Weekly Standup', 'Community sync and updates', 'LIVE', now() - interval '15 minutes', now() + interval '30 minutes', 'Auditorium'),
  ('Hack Night', 'Open co-working and pair programming', 'UPCOMING', now() + interval '2 days', now() + interval '2 days 3 hours', 'Lab A'),
  ('Security 101', 'Basics of cyber hygiene', 'PAST', now() - interval '10 days', now() - interval '10 days 2 hours', 'Hall 3')
  on conflict do nothing;

insert into public.cms_posts (title, excerpt, body, published_at, author_name)
values
  ('Welcome to TechSociety', 'A new era of collaborative tech.', 'Longer body placeholder', now() - interval '1 day', 'PR Team'),
  ('Project Spotlight', 'Showcasing standout student projects.', 'Longer body placeholder', now() - interval '3 days', 'PR Team'),
  ('Event Recap', 'Highlights from last week''s meetup.', 'Longer body placeholder', now() - interval '7 days', 'PR Team')
  on conflict do nothing;

-- Insert the requested bootstrap admin email
insert into public.bootstrap_admins (email) values ('abishaioff@gmail.com') on conflict do nothing;

-- RLS
alter table public.communities enable row level security;
alter table public.profiles enable row level security;
alter table public.role_assignments enable row level security;
alter table public.events enable row level security;
alter table public.projects enable row level security;
alter table public.join_requests enable row level security;
alter table public.cms_posts enable row level security;
alter table public.bootstrap_admins enable row level security;

-- Roles helper
create or replace function public.has_role(_user_id uuid, _role public.app_role, _community_slug text default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.role_assignments r
    where r.user_id = _user_id
      and r.role = _role
      and (r.community_slug is not distinct from _community_slug)
  );
$$;

-- Policies
-- Communities: public readable
create policy "Communities are public" on public.communities for select using (true);

-- Events: public read, admin manage
create policy "Events are public" on public.events for select using (true);
create policy "Admins manage events" on public.events for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- CMS posts: public read, admin manage
create policy "Posts are public" on public.cms_posts for select using (true);
create policy "Admins manage posts" on public.cms_posts for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Profiles: self read/update, admin full
create policy "User can read own profile" on public.profiles for select using (id = auth.uid());
create policy "Admin can read profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "User can insert own profile" on public.profiles for insert with check (id = auth.uid() and user_id = auth.uid());
create policy "User can update own profile" on public.profiles for update using (id = auth.uid());
create policy "Admin can manage profiles" on public.profiles for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Role assignments: self read, admin manage
create policy "User can read own roles" on public.role_assignments for select using (user_id = auth.uid());
create policy "Admin can manage roles" on public.role_assignments for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Projects: public read, owner or admin manage
create policy "Projects are public" on public.projects for select using (true);
create policy "Auth can create project" on public.projects for insert to authenticated with check (owner_id = auth.uid());
create policy "Owner can update/delete" on public.projects for update using (owner_id = auth.uid());
create policy "Owner can delete" on public.projects for delete using (owner_id = auth.uid());
create policy "Admin manage projects" on public.projects for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Join requests: requester & project owner read; requester create; owner/admin update
create policy "Requester can read own" on public.join_requests for select using (requester_id = auth.uid());
create policy "Owner can read requests" on public.join_requests for select using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "Requester can create" on public.join_requests for insert with check (requester_id = auth.uid());
create policy "Owner can update status" on public.join_requests for update using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "Admin manage requests" on public.join_requests for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Bootstrap admins: allow read to authenticated to let client decide bootstrapping
create policy "Auth read bootstrap admins" on public.bootstrap_admins for select to authenticated using (true);
