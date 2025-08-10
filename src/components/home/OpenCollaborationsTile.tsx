import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface Project { id: string; title: string; status: string; looking_for: string | null; tech_stack: string[] }

export default function OpenCollaborationsTile() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('projects')
        .select('id,title,status,looking_for,tech_stack')
        .order('updated_at', { ascending: false })
        .limit(3);
      if (mounted) {
        setProjects(data || []);
        setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  return (
    <Card className="col-span-12 md:col-span-2 lg:col-span-7 rounded-2xl overflow-hidden p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground tracking-wider uppercase">Open Collaborations</div>
        <Button variant="ghost" size="sm" asChild>
          <a href="/projects" className="story-link">Find a team</a>
        </Button>
      </div>
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-sm text-muted-foreground">No open collaborations right now.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map(p => (
            <a key={p.id} href={`/projects/${p.id}`} className="rounded-lg border p-3 hover-scale group">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium truncate">{p.title}</h4>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{p.status}</Badge>
              </div>
              {p.looking_for && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.looking_for}</p>}
              {p.tech_stack?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.tech_stack.slice(0,4).map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                </div>
              )}
              <div className="mt-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">Open →</div>
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
