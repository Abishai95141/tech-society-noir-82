import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PendingApproval from "@/pages/PendingApproval";

export default function RequireApproval({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(!!session);
      if (!session) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      const uid = session.user.id;
      // Defer Supabase calls outside the callback tick
      setTimeout(async () => {
        const { data: roles } = await supabase
          .from('role_assignments')
          .select('role')
          .eq('user_id', uid)
          .eq('role', 'admin');
        const isAdmin = !!roles && roles.length > 0;

        const { data: profile } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', uid)
          .maybeSingle();

        setAllowed(isAdmin || profile?.status === 'APPROVED');
        setLoading(false);
      }, 0);
    });

    // Prime with current session
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      if (!data.session) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      const uid = data.session.user!.id;
      (async () => {
        const { data: roles } = await supabase
          .from('role_assignments')
          .select('role')
          .eq('user_id', uid)
          .eq('role', 'admin');
        const isAdmin = !!roles && roles.length > 0;

        const { data: profile } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', uid)
          .maybeSingle();

        setAllowed(isAdmin || profile?.status === 'APPROVED');
        setLoading(false);
      })();
    });

    return () => sub.data.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <main className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="text-muted-foreground">Checking access…</div>
      </main>
    );
  }

  if (!hasSession) return <Navigate to="/login" replace />;
  if (!allowed) return <PendingApproval />;

  return <>{children}</>;
}
