import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import LiveTicker from "@/components/home/LiveTicker";
import MosaicGrid from "@/components/home/MosaicGrid";
import StatsStrip from "@/components/home/StatsStrip";
import CommunitiesBand from "@/components/home/CommunitiesBand";

export default function Index() {
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

  return (
    <main>
      {/* Compact Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 pointer-events-none [background:radial-gradient(600px_200px_at_50%_-40px,rgba(0,0,0,0.08),transparent)]" />
        <div className="max-w-[1200px] mx-auto px-6 py-14 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-card text-sm text-muted-foreground mb-4">All grayscale. All grit.</div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">TechSociety</h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">A black–white tech community. Build together. Learn faster. Ship more.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button asChild><a href="#mosaic">Explore Events</a></Button>
            <Button asChild variant="secondary"><a href="/projects">See Projects</a></Button>
            <Button asChild variant="outline"><a href="/register">Join</a></Button>
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
