import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Event { id: string; title: string; status: string; start_at: string | null; location: string | null; host: string | null; cover_image: string | null; tba: boolean }

export default function UpcomingEventsTile() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('events')
        .select('id,title,status,start_at,location,host,cover_image,tba')
        .in('status', ['UPCOMING','LIVE'])
        .order('start_at', { ascending: true })
        .limit(3);
      if (mounted) {
        setEvents(data || []);
        setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  return (
    <Card className="col-span-12 md:col-span-2 lg:col-span-5 rounded-2xl overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground tracking-wider uppercase">Upcoming Events</div>
        <Button variant="ghost" size="sm" asChild>
          <a href="/events" className="story-link">Open calendar</a>
        </Button>
      </div>
      <div className="px-4 pb-6">
        <AspectRatio ratio={16/9}>
          {loading ? (
            <Skeleton className="h-full w-full rounded-xl" />
          ) : events.length === 0 ? (
            <div className="h-full w-full rounded-xl border flex items-center justify-center text-sm text-muted-foreground">
              No upcoming events. <a href="/events" className="ml-2 story-link">View all</a>
            </div>
          ) : (
            <div className="relative h-full w-full overflow-hidden rounded-xl">
              {events[0]?.cover_image ? (
                <img src={events[0].cover_image!} alt={`${events[0].title} cover`} loading="lazy" className="h-full w-full object-cover filter grayscale" />
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
              <div className="absolute inset-0 bg-gradient-to-tr from-foreground/80 via-foreground/20 to-transparent" />
              <div className="absolute inset-0 p-6 text-primary-foreground flex flex-col justify-end">
                <ul className="space-y-2">
                  {events.map((ev) => (
                    <li key={ev.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold truncate">{ev.title}</h4>
                          <Badge variant={ev.status === 'LIVE' ? 'secondary' : 'outline'} className="text-[10px] uppercase tracking-wider">{ev.status}</Badge>
                        </div>
                        <div className="text-xs text-primary-foreground/90 mt-1 flex items-center gap-2">
                          <CalendarDays className="h-3 w-3" />
                          {ev.tba || !ev.start_at ? 'Date TBA' : new Date(ev.start_at).toLocaleString()}
                          <span className="mx-1">•</span>
                          {ev.location || 'Online'}
                        </div>
                      </div>
                      <Button asChild size="sm" variant="secondary">
                        <a href={`/events/${ev.id}`}>Details</a>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </AspectRatio>
      </div>
    </Card>
  );
}
