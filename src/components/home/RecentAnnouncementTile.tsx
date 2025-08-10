import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface Post { id: string; title: string; excerpt: string | null; published_at: string | null }

export default function RecentAnnouncementTile() {
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('cms_posts')
        .select('id,title,excerpt,published_at')
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (mounted) {
        setPost(data || null);
        setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  return (
    <Card className="col-span-12 md:col-span-2 lg:col-span-5 rounded-2xl overflow-hidden p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground tracking-wider uppercase">Recent Announcement</div>
      </div>
      {loading ? (
        <Skeleton className="h-24 rounded-lg" />
      ) : !post ? (
        <div className="text-sm text-muted-foreground">No announcements yet.</div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-medium truncate">{post.title}</h4>
            {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.excerpt}</p>}
            {post.published_at && <div className="text-xs text-muted-foreground mt-2">{new Date(post.published_at).toLocaleDateString()}</div>}
          </div>
          <Button variant="secondary" size="sm" asChild>
            <a href={`/posts/${post.id}`} target="_blank" rel="noopener noreferrer">Read update</a>
          </Button>
        </div>
      )}
    </Card>
  );
}
