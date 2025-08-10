import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { countAcceptedBuddies } from "@/lib/buddies";

interface Spotlight { id: string; name: string | null; specialization: string | null; community_slug: string | null }

export default function MemberSpotlightsTile() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<(Spotlight & { projectCount: number; eventCount: number; buddyCount: number })[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data: rows } = await (supabase as any)
        .from('profiles')
        .select('id,name,specialization,community_slug')
        .order('created_at', { ascending: false })
        .limit(3);
      const base = rows || [];

      const withMetrics = await Promise.all((base).map(async (m) => {
        const [{ count: pc }, { count: ec }, bc] = await Promise.all([
          (supabase as any).from('projects').select('*', { count: 'exact', head: true }).eq('owner_id', m.id),
          (supabase as any).from('events').select('*', { count: 'exact', head: true }).eq('created_by', m.id),
          countAcceptedBuddies(m.id)
        ]);
        return { ...m, projectCount: pc || 0, eventCount: ec || 0, buddyCount: typeof bc === 'number' ? bc : 0 };
      }));

      if (mounted) {
        setMembers(withMetrics);
        setLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, []);

  return (
    <Card className="col-span-12 md:col-span-1 lg:col-span-6 rounded-2xl overflow-hidden p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground tracking-wider uppercase">Member Spotlights</div>
      </div>
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1,2].map(i => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="text-sm text-muted-foreground">No spotlights yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {members.map(m => (
            <a key={m.id} href={`/profile/${m.id}`} className="group rounded-xl border overflow-hidden hover-scale p-4 relative">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="text-sm font-medium">{(m.name||'M').charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold truncate">{m.name || 'Member'}</h4>
                    {m.community_slug && <Badge variant="secondary">{m.community_slug}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{m.specialization || '—'}</p>
                  <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                    <span><strong>{m.projectCount}</strong> Projects</span>
                    <span>·</span>
                    <span><strong>{m.eventCount}</strong> Events</span>
                    <span>·</span>
                    <span><strong>{m.buddyCount}</strong> Buddies</span>
                  </div>
                </div>
              </div>
              <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity text-xs">Open →</div>
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
