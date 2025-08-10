import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface Post { id: string; title: string; excerpt: string | null }

export default function LearningResourcesTile() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('cms_posts')
        .select('id,title,excerpt')
        .order('published_at', { ascending: false })
        .limit(3);
      const rows = data || [];
      if (mounted) {
        setPosts(rows);
        setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  return (
    <Card className="col-span-12 md:col-span-1 lg:col-span-6 rounded-2xl overflow-hidden p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground tracking-wider uppercase">Learning Resources</div>
        <Button variant="ghost" size="sm" asChild>
          <a href="/events" target="_blank" rel="noopener noreferrer" className="story-link">Explore resources</a>
        </Button>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-10 rounded-md" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-sm text-muted-foreground">No resources available.</div>
      ) : (
        <ul className="space-y-2">
          {posts.map(p => (
            <li key={p.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-medium truncate">{p.title}</h4>
                {p.excerpt && <p className="text-sm text-muted-foreground truncate">{p.excerpt}</p>}
              </div>
              <Button size="sm" variant="secondary" asChild>
                <a href={`/posts/${p.id}`} target="_blank" rel="noopener noreferrer">Open</a>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
