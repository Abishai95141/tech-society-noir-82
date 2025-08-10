import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { useApproval } from "@/hooks/use-approval";
import { ProjectCard, type ProjectCardData } from "@/components/projects/ProjectCard";
import { toast } from "@/hooks/use-toast";

const VALID_STATUSES = ["INCUBATION","PRODUCTION","STARTUP","RESEARCH"] as const;

type Community = { slug: string; name: string };

type Status = typeof VALID_STATUSES[number];

export default function Projects() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "ALL">("ALL");
  const [community, setCommunity] = useState<string>("ALL");
  const [lookingOnly, setLookingOnly] = useState(false);
  const [sort, setSort] = useState<"updated"|"az">("updated");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ProjectCardData[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const debounced = useDebounce(search, 350);
  const { approved } = useApproval();
  const [communities, setCommunities] = useState<Community[]>([]);

  useEffect(() => {
    document.title = "Projects – TechSociety";
    const m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute('content', 'Explore TechSociety projects: browse, filter, and start new projects.');
  }, []);

  useEffect(() => {
    supabase.from('communities').select('slug,name').limit(5).then(({ data, error }) => {
      if (error) return;
      setCommunities(data ?? []);
    });
  }, []);

  const load = async () => {
    setLoading(true);
    const rangeTo = page * pageSize - 1;
    let query = supabase
      .from('projects')
      .select('id,title,summary,status,community_slug,updated_at,github_url,drive_url,tech_stack,looking_for')
      .order(sort === 'updated' ? 'updated_at' : 'title', { ascending: sort === 'az' })
      .range(0, rangeTo);

    if (status !== 'ALL') query = query.eq('status', status);
    if (community !== 'ALL') query = query.eq('community_slug', community);
    if (lookingOnly) query = query.not('looking_for', 'is', null);
    if (debounced.trim()) {
      const q = `%${debounced.trim()}%`;
      query = query.or(`title.ilike.${q},summary.ilike.${q}`);
    }

    const { data, error } = await query;
    if (error) {
      toast({ title: 'Error loading projects', description: error.message });
      setLoading(false);
      return;
    }

    const mapped: ProjectCardData[] = (data ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      community_slug: r.community_slug,
      summary: r.summary,
      tech_stack: r.tech_stack,
      looking_for: r.looking_for,
      updated_at: r.updated_at,
      github_url: r.github_url,
      drive_url: r.drive_url,
      owner_name: r.owner?.name ?? null,
    }));

    // client-side refine search over tech_stack
    const final = debounced.trim()
      ? mapped.filter(p => (p.tech_stack ?? []).some(t => t.toLowerCase().includes(debounced.trim().toLowerCase())) || p.title.toLowerCase().includes(debounced.trim().toLowerCase()))
      : mapped;

    setItems(final);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, status, community, lookingOnly, sort, page]);

  const empty = !loading && items.length === 0;

  return (
    <main className="max-w-[1200px] mx-auto px-6 py-10">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Projects</h1>
        {approved && (
          <Button asChild>
            <Link to="/projects/create">Start New Project</Link>
          </Button>
        )}
      </header>

      <section className="rounded-2xl border p-4 md:p-5 bg-card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="col-span-1">
            <Input placeholder="Search by title or tech…" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
          </div>
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={(v) => { setPage(1); setStatus(v as Status | "ALL"); }}>
              <SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {VALID_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={community} onValueChange={(v) => { setPage(1); setCommunity(v); }}>
              <SelectTrigger><SelectValue placeholder="Community"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All communities</SelectItem>
                {communities.map(c => (
                  <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="looking" checked={lookingOnly} onCheckedChange={(v) => { setPage(1); setLookingOnly(!!v); }} />
            <Label htmlFor="looking">Looking for teammates</Label>
          </div>
          <div>
            <Select value={sort} onValueChange={(v: any) => setSort(v)}>
              <SelectTrigger><SelectValue placeholder="Sort"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Recently updated</SelectItem>
                <SelectItem value="az">A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="mt-6">
        {loading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border p-5 bg-card">
                <Skeleton className="h-5 w-3/5 mb-3"/>
                <Skeleton className="h-4 w-2/5 mb-4"/>
                <Skeleton className="h-4 w-full mb-2"/>
                <Skeleton className="h-4 w-4/5 mb-2"/>
                <Skeleton className="h-4 w-3/5"/>
              </div>
            ))}
          </div>
        ) : empty ? (
          <div className="rounded-2xl border p-10 text-center bg-card">
            <h2 className="text-xl font-semibold mb-2">No projects found</h2>
            <p className="text-muted-foreground mb-4">Try adjusting filters or start a new project.</p>
            {approved && (
              <Button asChild>
                <Link to="/projects/create">Start New Project</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((p) => (
                <ProjectCard key={p.id} p={p} />
              ))}
            </div>
            <div className="flex justify-center mt-6">
              <Button variant="outline" onClick={() => setPage((n) => n + 1)}>Load more</Button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
