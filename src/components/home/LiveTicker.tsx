import { useEffect, useMemo, useState } from "react";
import { Dot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LiveEvent { id: string; title: string }

export default function LiveTicker() {
  const [events, setEvents] = useState<LiveEvent[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id,title")
        .eq("status", "LIVE")
        .order("start_at", { ascending: true })
        .limit(3);
      if (active) setEvents(data || []);
    })();
    return () => { active = false };
  }, []);

  if (!events || events.length === 0) return null;

  return (
    <div aria-live="polite" className="border-t border-b bg-card/50">
      <div className="max-w-[1200px] mx-auto px-6 py-2 text-sm flex items-center gap-3">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Dot className="h-4 w-4 animate-pulse" /> Live now
        </span>
        <div className="overflow-hidden">
          <div className="animate-slide-in-right whitespace-nowrap">
            {events.map((e, i) => (
              <a key={e.id} href={`/events/${e.id}`} className="story-link text-foreground/90 mr-6">
                {e.title}
                {i < events.length - 1 && <span className="mx-3 text-muted-foreground">•</span>}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
