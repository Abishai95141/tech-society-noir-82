import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import LiveTicker from "@/components/home/LiveTicker";
import MosaicGrid from "@/components/home/MosaicGrid";
import StatsStrip from "@/components/home/StatsStrip";
import CommunitiesBand from "@/components/home/CommunitiesBand";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const [showSpline, setShowSpline] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [projectsCount, setProjectsCount] = useState<number | null>(null);
  const [eventsCount, setEventsCount] = useState<number | null>(null);
  const [membersCount, setMembersCount] = useState<number | null>(null);

  useEffect(() => {
    document.title = "TechSociety – Grayscale Tech Community";
    const meta = document.querySelector('meta[name="description"]');
    const content = "TechSociety: a black–white tech community. Build together. Learn faster. Ship more.";
    if (meta) meta.setAttribute('content', content);
    else {
      const m = document.createElement('meta');
      m.setAttribute('name','description');
      m.setAttribute('content', content);
      document.head.appendChild(m);
    }
    const linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      const l = document.createElement('link');
      l.setAttribute('rel','canonical');
      l.setAttribute('href', window.location.origin + '/');
      document.head.appendChild(l);
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(media.matches);
    onChange();
    media.addEventListener?.('change', onChange);
    requestAnimationFrame(() => {
      if (!media.matches) setShowSpline(true);
    });
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    if (!showSpline || reducedMotion) return;
    if ((window as any).customElements?.get?.('spline-viewer')) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@splinetool/viewer@1.10.44/build/spline-viewer.js';
    document.head.appendChild(script);
  }, [showSpline, reducedMotion]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [pc, ec, mc] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('archived', false),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('archived', false),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'APPROVED')
      ]);
      if (!active) return;
      setProjectsCount(pc.count ?? 0);
      setEventsCount(ec.count ?? 0);
      // Members count may be restricted by RLS when not authenticated
      setMembersCount(mc.error ? null : (mc.count ?? 0));
    })();
    return () => { active = false };
  }, []);

  return (
    <main>
      {/* Hero with interactive Spline background */}
      <section
        className="relative overflow-hidden min-h-[90vh] md:h-[100vh] bg-background"
        onPointerDown={() => setHasInteracted(true)}
      >
        {/* Layer 1: Spline background + poster */}
        <div aria-label="Interactive 3D robot — drag to rotate" className="absolute inset-0 w-full h-full">
          {/* Poster image fallback to avoid CLS */}
          <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: "url('/placeholder.svg')" }} />
          {/* Spline embed (lazy) */}
          {showSpline && !reducedMotion && (
            <div className="absolute inset-0 origin-[50%_100%] scale-[1.06] translate-y-[6px] md:scale-[1.12] md:translate-y-[10px] xl:scale-[1.18] xl:translate-y-[16px]">
              <spline-viewer
                url="https://prod.spline.design/cHtCkE-h4TAM0pqI/scene.splinecode"
                style={{ width: '100%', height: '100%' }}
              ></spline-viewer>
            </div>
          )}
          {/* Subtle radial glow to seat the robot */}
          <div className="absolute inset-0 pointer-events-none [background:radial-gradient(40%_20%_at_50%_70%,rgba(0,0,0,0.1),transparent)]" />
        </div>

        {/* Layer 2: Content overlay */}
        <div className="relative z-10 max-w-[1200px] mx-auto px-6 h-full flex items-center pointer-events-none">
          <h1 className="sr-only">TechSociety</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {/* Left rail — CTAs */}
            <aside className="md:col-span-1 flex flex-col items-start gap-3 pointer-events-auto md:pl-[12%]">
              <Button asChild><a href="/register">Join TechSociety</a></Button>
              <Button asChild variant="outline"><a href="/events">Explore Events</a></Button>
              <Button asChild variant="outline"><a href="/projects">See Projects</a></Button>
              <div className={`mt-1 transition-opacity duration-700 ${hasInteracted ? 'opacity-0' : 'opacity-100'}`}>
                <div className="pointer-events-none select-none px-2.5 py-1 rounded-full border bg-card/80 text-[11px] text-muted-foreground shadow-sm">Drag to explore</div>
              </div>
            </aside>

            {/* Center — Split title over robot */}
            <section className="md:col-span-1 flex flex-col justify-end">
              <div className="grid grid-cols-2 items-end">
                <span aria-hidden className="block font-extrabold tracking-tight leading-[0.9] text-foreground text-[clamp(64px,12vw,160px)] -tracking-[0.02em]">Tech</span>
                <span aria-hidden className="block font-extrabold tracking-tight leading-[0.9] text-foreground text-[clamp(64px,12vw,160px)] -tracking-[0.02em] text-right">Society</span>
              </div>
            </section>

            {/* Right rail — Copy + Live Counters */}
            <aside className="md:col-span-1 flex flex-col items-end justify-end text-right gap-6">
              <div className="space-y-1">
                <p className="text-xl font-semibold text-foreground">Build Together.</p>
                <p className="text-xl font-semibold text-foreground">Learn Faster.</p>
                <p className="text-xl font-semibold text-foreground">Ship More.</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {[{label:'Projects', value: projectsCount}, {label:'Events', value: eventsCount}, {label:'Members', value: membersCount}].map(s => (
                  <div key={s.label} className="px-3 py-2 rounded-full border bg-card/80">
                    <div className="text-2xl font-extrabold leading-none">{s.value ?? '—'}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Live now ticker */}
      <LiveTicker />

      {/* Mosaic */}
      <div id="mosaic">
        <MosaicGrid />
      </div>

      {/* Stats */}
      <StatsStrip />

      {/* Communities */}
      <CommunitiesBand />
    </main>
  );
}
