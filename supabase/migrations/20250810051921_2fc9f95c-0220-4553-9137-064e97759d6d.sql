-- Auto-create profile and bootstrap admin on user signup
-- 1) Create or replace trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert a default profile using user metadata
  INSERT INTO public.profiles (
    id, user_id, name, degree, specialization, phone,
    linkedin_url, github_url, community_slug, status, must_change_password
  ) VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'degree', NULL),
    COALESCE(NEW.raw_user_meta_data->>'specialization', NULL),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    NULLIF(NEW.raw_user_meta_data->>'linkedin_url',''),
    NULLIF(NEW.raw_user_meta_data->>'github_url',''),
    COALESCE(NEW.raw_user_meta_data->>'community_slug', NULL),
    'PENDING'::user_status,
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;

  -- If the email is in bootstrap_admins, grant admin role and approve immediately
  IF EXISTS (SELECT 1 FROM public.bootstrap_admins b WHERE b.email = NEW.email) THEN
    INSERT INTO public.role_assignments (user_id, role, community_slug)
    VALUES (NEW.id, 'admin'::app_role, NULL)
    ON CONFLICT DO NOTHING;

    UPDATE public.profiles
    SET must_change_password = TRUE,
        status = 'APPROVED'::user_status
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3) Ensure provided admin email is bootstrapped
INSERT INTO public.bootstrap_admins (email)
SELECT 'abishaioff@gmail.com'
WHERE NOT EXISTS (
  SELECT 1 FROM public.bootstrap_admins WHERE email = 'abishaioff@gmail.com'
);
