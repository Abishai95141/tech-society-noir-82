import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import LiveTicker from "@/components/home/LiveTicker";
import MosaicGrid from "@/components/home/MosaicGrid";
import StatsStrip from "@/components/home/StatsStrip";
import CommunitiesBand from "@/components/home/CommunitiesBand";

export default function Index() {
  const [showSpline, setShowSpline] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

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

  return (
    <main>
      {/* Hero with interactive Spline background */}
      <section
        className="relative overflow-hidden min-h-[90vh] md:min-h-[100vh] bg-secondary"
        onPointerDown={() => setHasInteracted(true)}
      >
        {/* Layer 1: Spline background + poster */}
        <div aria-label="Interactive 3D robot — drag to rotate" className="absolute inset-0 w-full h-full">
          {/* Poster image fallback to avoid CLS */}
          <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: "url('/placeholder.svg')" }} />
          {/* Spline embed (lazy) */}
          {showSpline && !reducedMotion && (
            <div className="absolute inset-0 origin-[50%_100%] scale-[1.08] translate-y-[28px] md:scale-[1.20] md:translate-y-[44px] xl:scale-[1.30] xl:translate-y-[60px]">
              <spline-viewer
                url="https://prod.spline.design/cHtCkE-h4TAM0pqI/scene.splinecode"
                style={{ width: '100%', height: '100%' }}
              ></spline-viewer>
            </div>
          )}
          {/* Subtle radial glow to seat the robot */}
          <div className="absolute inset-0 pointer-events-none [background:radial-gradient(40%_20%_at_50%_70%,rgba(0,0,0,0.06),transparent)]" />
        </div>

        {/* Layer 2: Content overlay */}
        <div className="relative z-10 max-w-[1200px] mx-auto px-6 h-full flex flex-col justify-center pointer-events-none translate-y-[8vh] md:translate-y-[12vh]">
          <h1 className="sr-only">TechSociety</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 items-end gap-2">
            <div className="xl:col-start-1">
              <span aria-hidden className="block font-extrabold tracking-tight leading-[0.9] text-foreground text-[clamp(64px,12vw,160px)]">
                Tech
              </span>
            </div>
            <div className="hidden xl:block" />
            <div className="xl:col-start-3 xl:text-right">
              <span aria-hidden className="block font-extrabold tracking-tight leading-[0.9] text-foreground text-[clamp(64px,12vw,160px)]">
                Society
              </span>
            </div>
          </div>


          <div className="mt-10 md:mt-12 pointer-events-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <Button asChild variant="secondary"><a href="/events">Explore Events</a></Button>
              <Button asChild variant="outline"><a href="/projects">See Projects</a></Button>
            </div>
          </div>

          <div className={`mt-8 flex justify-center transition-opacity duration-700 ${hasInteracted ? 'opacity-0' : 'opacity-100'}`}>
            <div className="pointer-events-none select-none px-3 py-1 rounded-full border bg-card/80 text-xs text-muted-foreground shadow-sm">
              Drag to explore
            </div>
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
