-- Fix linter: set immutable search_path on functions
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- has_role already sets search_path; re-create to be explicit
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