import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

interface Project { id: string; title: string; status: string; summary: string | null; tech_stack: string[]; owner_id: string }

export default function FeaturedProjectsCarousel() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [ownerProfiles, setOwnerProfiles] = useState<Record<string, { id: string; name: string | null; community_slug: string | null; specialization: string | null }>>({});
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data: featured } = await supabase
        .from('projects')
        .select('id,title,status,summary,tech_stack,owner_id,archived,featured')
        .eq('featured', true)
        .eq('archived', false)
        .order('updated_at', { ascending: false })
        .limit(6);

      if (!mounted) return;

      const items = (featured || []) as any[];
      setProjects(items as any);

      const ownerIds = Array.from(new Set(items.map((p) => p.owner_id).filter(Boolean)));
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id,name,community_slug,specialization')
          .in('id', ownerIds);

        const map: Record<string, any> = {};
        (profiles || []).forEach((p) => { map[p.id] = p; });
        if (mounted) setOwnerProfiles(map);
      } else {
        setOwnerProfiles({});
      }

      setLoading(false);
    };
    load();
    return () => { mounted = false };
  }, []);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    setCount(api.scrollSnapList().length);
    api.on('select', onSelect);
    api.on('reInit', () => setCount(api.scrollSnapList().length));
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  return (
    <Card className="col-span-12 md:col-span-2 lg:col-span-7 rounded-2xl overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none" aria-hidden />
      <div className="p-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground tracking-wider uppercase">Featured Projects</div>
        <Button variant="ghost" size="sm" asChild>
          <a href="/projects" className="story-link">See all</a>
        </Button>
      </div>
      {loading ? (
        <div className="px-4 pb-4">
          <Skeleton className="h-56 rounded-xl" />
        </div>
      ) : projects.length === 0 ? (
        <div className="px-4 pb-6 text-sm text-muted-foreground">No projects to show yet. <a className="story-link" href="/projects">Explore projects</a></div>
      ) : (
        <div className="px-4 pb-6">
          <Carousel className="w-full" setApi={setApi}>
            <CarouselContent>
              {projects.map((p) => (
                <CarouselItem key={p.id} className="md:basis-1/2">
                  <AspectRatio ratio={16/9}>
                    <a href={`/projects/${p.id}`} className="group relative block h-full w-full overflow-hidden rounded-xl">
                      <div className="h-full w-full bg-muted" />
                      <div className="absolute inset-0 bg-gradient-to-tr from-foreground/80 via-foreground/20 to-transparent" />
                      <div className="absolute inset-0 p-6 flex flex-col justify-end text-primary-foreground">
                        <div className="mb-2">
                          <Badge variant="secondary" className="uppercase tracking-wider text-[10px]">{p.status}</Badge>
                        </div>
                        <h3 className="text-xl font-semibold leading-tight">{p.title}</h3>
                        {p.summary && <p className="mt-1 line-clamp-2 text-sm text-primary-foreground/90">{p.summary}</p>}
                        {p.tech_stack?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {p.tech_stack.slice(0, 5).map(t => (
                              <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>
                              {(ownerProfiles[p.owner_id]?.name || p.title).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-xs text-primary-foreground/90">
                            {ownerProfiles[p.owner_id]?.name || 'Owner'}
                          </div>
                        </div>
                        <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="secondary">View project</Button>
                        </div>
                      </div>
                    </a>
                  </AspectRatio>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-6" />
            <CarouselNext className="right-6" />
            </Carousel>
            <div className="mt-3 flex items-center justify-center gap-1">
              {Array.from({ length: count }).map((_, i) => (
                <button
                  key={i}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => api?.scrollTo(i)}
                  className={`h-1.5 w-4 rounded-full transition-colors ${i === current ? 'bg-foreground' : 'bg-muted'}`}
                />
              ))}
            </div>
        </div>
      )}
    </Card>
  );
}
