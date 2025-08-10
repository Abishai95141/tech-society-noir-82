import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Github, Folder } from "lucide-react";

export type ProjectCardData = {
  id: string;
  title: string;
  status: string;
  community_slug: string | null;
  summary: string | null;
  tech_stack: string[] | null;
  looking_for: string | null;
  updated_at: string;
  github_url: string | null;
  drive_url: string | null;
  owner_name: string | null;
};

const statusLabel: Record<string, string> = {
  INCUBATION: "Incubation",
  PRODUCTION: "Production",
  STARTUP: "Startup",
  RESEARCH: "Research",
};

export function ProjectCard({ p }: { p: ProjectCardData }) {
  const tech = p.tech_stack ?? [];
  const overflow = tech.length > 6 ? tech.length - 6 : 0;
  const initials = (p.owner_name ?? "?").slice(0, 2).toUpperCase();
  return (
    <article className="rounded-2xl border bg-card text-card-foreground shadow-sm hover:shadow transition-shadow duration-150 focus-within:ring-2 ring-ring">
      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg leading-tight line-clamp-1">{p.title}</h3>
          <Badge variant="outline" className="rounded-full">
            {statusLabel[p.status] ?? p.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {p.community_slug && (
            <Badge variant="secondary" className="rounded-full">
              {p.community_slug}
            </Badge>
          )}
          {p.looking_for && (
            <Badge variant="outline" className="rounded-full">Looking for teammates</Badge>
          )}
        </div>
        {p.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2">{p.summary}</p>
        )}
        {tech.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {tech.slice(0, 6).map((t) => (
              <span key={t} className="text-xs rounded-full border px-2 py-1 bg-background">{t}</span>
            ))}
            {overflow > 0 && (
              <span className="text-xs rounded-full border px-2 py-1 bg-background">+{overflow}</span>
            )}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">{initials}</AvatarFallback></Avatar>
            <span className="line-clamp-1" title={p.owner_name ?? undefined}>{p.owner_name ?? "Unknown"}</span>
          </div>
          <div className="flex items-center gap-1">
            {p.github_url && (
              <a href={p.github_url} target="_blank" rel="noreferrer" className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted")}
                 aria-label="Open GitHub">
                <Github className="h-4 w-4" />
              </a>
            )}
            {p.drive_url && (
              <a href={p.drive_url} target="_blank" rel="noreferrer" className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted")}
                 aria-label="Open Drive">
                <Folder className="h-4 w-4" />
              </a>
            )}
            <Button asChild size="sm" className="ml-1">
              <Link to={`/projects/${p.id}`}>View</Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
