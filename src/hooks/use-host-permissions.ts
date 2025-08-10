
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useHostPermissions() {
  const [canHost, setCanHost] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) {
          setCanHost(false);
          setLoading(false);
          return;
        }

        // Check role_assignments table first
        const { data: roleAssignments, error: roleError } = await supabase
          .from('role_assignments')
          .select('role')
          .eq('user_id', user.user.id)
          .in('role', ['secretary', 'joint_secretary', 'admin']);

        if (roleError) {
          console.error('Error checking role assignments:', roleError);
        }

        // If user has hosting role in role_assignments, they can host
        if (roleAssignments && roleAssignments.length > 0) {
          setCanHost(true);
          setLoading(false);
          return;
        }

        // Fallback: check profiles table role column
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.user.id)
          .single();

        if (profileError) {
          console.error('Error checking profile role:', profileError);
          setCanHost(false);
        } else {
          const hostRoles = ['secretary', 'joint_secretary', 'admin'];
          const userRole = profile?.role || 'member';
          setCanHost(hostRoles.includes(userRole));
        }
      } catch (error) {
        console.error('Error checking host permissions:', error);
        setCanHost(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, []);

  return { canHost, loading };
}
