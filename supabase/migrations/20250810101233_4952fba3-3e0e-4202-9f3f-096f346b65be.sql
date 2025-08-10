-- Harden functions by setting search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_event_times()
RETURNS trigger
LANGUAGE plpgsql
IMMUTABLE -- function logic does not depend on db state, but raises on NEW values; IMMUTABLE is acceptable
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.start_at IS NOT NULL AND NEW.end_at IS NOT NULL AND NEW.end_at < NEW.start_at THEN
    RAISE EXCEPTION 'end_at must be after start_at';
  END IF;
  RETURN NEW;
END;
$$;