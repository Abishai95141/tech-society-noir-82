import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function StatsStrip() {
  const [members, setMembers] = useState<number | null>(null);
  const [projects, setProjects] = useState<number | null>(null);
  const [events, setEvents] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [mc, pc, ec] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true })
      ]);
      if (active) {
        setMembers(mc.count ?? 0);
        setProjects(pc.count ?? 0);
        setEvents(ec.count ?? 0);
      }
    })();
    return () => { active = false };
  }, []);

  return (
    <section aria-label="By the numbers" className="border-t">
      <div className="max-w-[1200px] mx-auto px-6 py-10 grid grid-cols-3 gap-6 text-center">
        {[{label:'Members', value: members}, {label:'Projects', value: projects}, {label:'Events', value: events}].map(s => (
          <div key={s.label}>
            <div className="text-3xl font-extrabold tracking-tight">{s.value ?? '—'}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
