
-- Update the can_host_events function to check role_assignments table instead of profiles.role
CREATE OR REPLACE FUNCTION public.can_host_events(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.role_assignments ra
    WHERE ra.user_id = _user_id 
    AND ra.role IN ('secretary', 'joint_secretary', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id 
    AND p.role IN ('secretary', 'joint_secretary', 'admin')
  );
$function$
