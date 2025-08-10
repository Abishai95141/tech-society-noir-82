import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const COMMUNITIES = [
  { slug: 'ml', name: 'Machine Learning' },
  { slug: 'is', name: 'Intelligent Systems' },
  { slug: 'webdev', name: 'Web Development' },
  { slug: 'gamesapps', name: 'Games & Apps' },
  { slug: 'cybersec', name: 'Cyber Security' }
];

export default function CommunitiesBand() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      const results = await Promise.all(
        COMMUNITIES.map(c => supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('community_slug', c.slug))
      );
      if (active) {
        const map: Record<string, number> = {};
        results.forEach((r, i) => { map[COMMUNITIES[i].slug] = r.count ?? 0 });
        setCounts(map);
      }
    })();
    return () => { active = false };
  }, []);

  return (
    <section className="border-t">
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="text-2xl font-semibold tracking-tight mb-6">Communities</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {COMMUNITIES.map(c => (
            <a key={c.slug} href="/members" className="group">
              <Card className="rounded-2xl p-4 hover-scale">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{c.name}</div>
                  <Badge variant="outline">{counts[c.slug] ?? 0}</Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">See directory →</div>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
