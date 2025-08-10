import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useApproval() {
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      setHasSession(!!uid);
      setUserId(uid);
      if (!uid) {
        if (mounted) {
          setApproved(false);
          setLoading(false);
        }
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', uid)
        .maybeSingle();
      if (mounted) {
        setApproved(profile?.status === 'APPROVED');
        setLoading(false);
      }
    };
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setHasSession(!!uid);
      setUserId(uid);
      if (!uid) {
        setApproved(false);
      } else {
        supabase
          .from('profiles')
          .select('status')
          .eq('id', uid)
          .maybeSingle()
          .then(({ data }) => setApproved(data?.status === 'APPROVED'));
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { approved, loading, hasSession, userId };
}
