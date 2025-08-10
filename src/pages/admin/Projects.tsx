import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { format } from "date-fns";
import { MoreHorizontal } from "lucide-react";

interface ProjectRow {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  community_slug: string | null;
  looking_for: string | null;
  featured: boolean;
  flagged: boolean;
  flagged_note: string | null;
  archived: boolean;
  updated_at: string;
  owner_id: string;
}

interface OwnerProfile { id: string; name: string | null; }
interface Community { slug: string; name: string }

export default function AdminProjects() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [owners, setOwners] = useState<Record<string, OwnerProfile>>({});
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const [filters, setFilters] = useState({ status: "ALL", community: "ALL", looking: "ALL", featured: "ALL", flagged: "ALL" });
  const [sort, setSort] = useState<"recent" | "az">("recent");
  const [loading, setLoading] = useState(true);
  const [noteDialog, setNoteDialog] = useState<{ open: boolean; id: string | null; note: string }>({ open: false, id: null, note: "" });
  const [quick, setQuick] = useState<ProjectRow | null>(null);
  const [tab, setTab] = useState<"all" | "attention">("all");

  useEffect(() => {
    document.title = "Admin – Projects | TechSociety";
    const m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute('content', 'Moderate projects: feature, flag, archive, delete.');
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      const { data: roles } = await supabase.from('role_assignments').select('role').eq('user_id', uid).eq('role', 'admin');
      const admin = !!roles && roles.length > 0;
      setIsAdmin(admin);
      if (!admin) return;
      const { data: comms } = await supabase.from('communities').select('slug,name').order('name');
      setCommunities(comms || []);
      await load();
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from('projects')
      .select('id,title,summary,status,community_slug,looking_for,featured,flagged,flagged_note,archived,updated_at,owner_id')
      .order(sort === 'recent' ? 'updated_at' : 'title', { ascending: sort !== 'recent' });

    if (filters.status !== 'ALL') query = query.eq('status', filters.status as any);
    if (filters.community !== 'ALL') query = query.eq('community_slug', filters.community);
    if (filters.looking !== 'ALL') {
      if (filters.looking === 'YES') query = query.not('looking_for', 'is', null); else query = query.is('looking_for', null);
    }
    if (filters.featured !== 'ALL') query = query.eq('featured', filters.featured === 'YES');
    if (filters.flagged !== 'ALL') query = query.eq('flagged', filters.flagged === 'YES');

    const { data, error } = await query;
    if (error) {
      toast({ title: 'Failed to load projects', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    let list = (data || []) as ProjectRow[];

    if (tab === 'attention') {
      list = list.filter(r => r.flagged);
    }

    if (debounced.trim()) {
      const q = debounced.trim().toLowerCase();
      list = list.filter(r => r.title.toLowerCase().includes(q) || (r.summary || '').toLowerCase().includes(q));
    }

    setRows(list);

    const ownerIds = Array.from(new Set(list.map(r => r.owner_id))).filter(Boolean);
    if (ownerIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id,name').in('id', ownerIds);
      const map: Record<string, OwnerProfile> = {};
      (profs || []).forEach((p: any) => { map[p.id] = { id: p.id, name: p.name }; });
      setOwners(map);
    } else {
      setOwners({});
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, filters, sort, tab]);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const allChecked = rows.length > 0 && rows.every(r => selectedIds.has(r.id));
  const anyChecked = selectedIds.size > 0 && !allChecked;

  const setAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(rows.map(r => r.id)) : new Set());
  };

  const bulkUpdate = async (updates: Partial<Pick<ProjectRow,'featured'|'archived'|'flagged'|'flagged_note'>>) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('projects').update(updates).in('id', ids);
    if (error) {
      toast({ title: 'Bulk update failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Updated', description: `${ids.length} project(s) updated.` });
      await load();
      setSelectedIds(new Set());
    }
  };

  const deleteRows = async (ids: string[]) => {
    const { error } = await supabase.from('projects').delete().in('id', ids);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Deleted', description: `${ids.length} project(s) removed.` }); await load(); setSelectedIds(new Set()); }
  };

  const featureToggle = async (row: ProjectRow, value: boolean) => {
    const { error } = await supabase.from('projects').update({ featured: value }).eq('id', row.id);
    if (error) toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
    else { toast({ title: value ? 'Featured' : 'Unfeatured' }); await load(); }
  };

  const flagToggle = async (row: ProjectRow, value: boolean, note?: string) => {
    const payload: any = { flagged: value };
    if (typeof note !== 'undefined') payload.flagged_note = note || null;
    const { error } = await supabase.from('projects').update(payload).eq('id', row.id);
    if (error) toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
    else { toast({ title: value ? 'Flagged' : 'Unflagged' }); await load(); }
  };

  const archiveToggle = async (row: ProjectRow, value: boolean) => {
    const { error } = await supabase.from('projects').update({ archived: value }).eq('id', row.id);
    if (error) toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
    else { toast({ title: value ? 'Archived' : 'Unarchived' }); await load(); }
  };

  if (!isAdmin) {
    return (
      <main className="max-w-[1200px] mx-auto px-6 py-16">
        <Card>
          <CardHeader><CardTitle>Forbidden</CardTitle></CardHeader>
          <CardContent>You must be an Admin to view this page.</CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="max-w-[1200px] mx-auto px-6 py-16">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects Moderation</h1>
      </header>

      <section className="mb-4 flex items-center gap-2 text-sm">
        <Button variant={tab === 'all' ? 'default' : 'outline'} onClick={() => setTab('all')}>All</Button>
        <Button variant={tab === 'attention' ? 'default' : 'outline'} onClick={() => setTab('attention')}>Needs Attention</Button>
      </section>

      <section className="rounded-2xl border p-4 bg-card mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Input placeholder="Search title/abstract" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={filters.status} onValueChange={(v) => setFilters(s => ({ ...s, status: v }))}>
            <SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="INCUBATION">Incubation</SelectItem>
              <SelectItem value="PRODUCTION">Production</SelectItem>
              <SelectItem value="STARTUP">Startup</SelectItem>
              <SelectItem value="RESEARCH">Research</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.community} onValueChange={(v) => setFilters(s => ({ ...s, community: v }))}>
            <SelectTrigger><SelectValue placeholder="Community"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All communities</SelectItem>
              {communities.map(c => (<SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filters.looking} onValueChange={(v) => setFilters(s => ({ ...s, looking: v }))}>
            <SelectTrigger><SelectValue placeholder="Looking"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Looking?</SelectItem>
              <SelectItem value="YES">Yes</SelectItem>
              <SelectItem value="NO">No</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.featured} onValueChange={(v) => setFilters(s => ({ ...s, featured: v }))}>
            <SelectTrigger><SelectValue placeholder="Featured"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Featured</SelectItem>
              <SelectItem value="YES">Yes</SelectItem>
              <SelectItem value="NO">No</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Select value={filters.flagged} onValueChange={(v) => setFilters(s => ({ ...s, flagged: v }))}>
              <SelectTrigger><SelectValue placeholder="Flagged"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Flagged</SelectItem>
                <SelectItem value="YES">Yes</SelectItem>
                <SelectItem value="NO">No</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v: any) => setSort(v)}>
              <SelectTrigger><SelectValue placeholder="Sort"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently updated</SelectItem>
                <SelectItem value="az">A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-3">
            <Checkbox checked={allChecked} onCheckedChange={(v) => setAll(!!v)} aria-checked={allChecked ? 'true' : anyChecked ? 'mixed' : 'false'} />
            <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => bulkUpdate({ featured: true })} disabled={selectedIds.size === 0}>Feature</Button>
            <Button variant="outline" size="sm" onClick={() => bulkUpdate({ featured: false })} disabled={selectedIds.size === 0}>Unfeature</Button>
            <Button variant="outline" size="sm" onClick={() => bulkUpdate({ archived: true })} disabled={selectedIds.size === 0}>Archive</Button>
            <Button variant="outline" size="sm" onClick={() => bulkUpdate({ archived: false })} disabled={selectedIds.size === 0}>Unarchive</Button>
            <Button variant="destructive" size="sm" onClick={() => deleteRows(Array.from(selectedIds))} disabled={selectedIds.size === 0}>Delete</Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Community</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Looking?</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead>Flagged</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} onClick={() => setQuick(r)} className="cursor-pointer">
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={(v) => toggleSelect(r.id, !!v)} />
                </TableCell>
                <TableCell>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-sm text-muted-foreground line-clamp-2">{r.summary || '—'}</div>
                </TableCell>
                <TableCell className="text-sm">{owners[r.owner_id]?.name || '—'}</TableCell>
                <TableCell className="text-sm">{r.community_slug || '—'}</TableCell>
                <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                <TableCell>{r.looking_for ? <Badge variant="secondary">Yes</Badge> : <span className="text-muted-foreground">No</span>}</TableCell>
                <TableCell>{r.featured ? <Badge>Featured</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  {r.flagged ? (
                    <Badge variant="destructive">Flagged</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">{format(new Date(r.updated_at), 'MMM d, yyyy')}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Actions"><MoreHorizontal className="h-4 w-4"/></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => featureToggle(r, !r.featured)}>{r.featured ? 'Unfeature' : 'Feature'}</DropdownMenuItem>
                      {r.flagged ? (
                        <DropdownMenuItem onClick={() => flagToggle(r, false)}>Unflag</DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => setNoteDialog({ open: true, id: r.id, note: r.flagged_note || '' })}>Flag…</DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => archiveToggle(r, !r.archived)}>{r.archived ? 'Unarchive' : 'Archive'}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => deleteRows([r.id])} className="text-destructive">Delete…</DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={`/projects/${r.id}`} target="_blank" rel="noreferrer">Open (public)</a>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No results</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <Sheet open={!!quick} onOpenChange={(o) => !o && setQuick(null)}>
        <SheetContent className="sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>{quick?.title}</SheetTitle>
          </SheetHeader>
          {quick && (
            <div className="mt-4 space-y-3 text-sm">
              <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{quick.status}</Badge></div>
              <div><span className="text-muted-foreground">Community:</span> {quick.community_slug || '—'}</div>
              <div><span className="text-muted-foreground">Owner:</span> {owners[quick.owner_id]?.name || '—'}</div>
              <div className="pt-2 border-t"><span className="text-muted-foreground">Abstract:</span><p className="mt-1">{quick.summary || '—'}</p></div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => featureToggle(quick, !quick.featured)}>{quick.featured ? 'Unfeature' : 'Feature'}</Button>
                <Button size="sm" variant="outline" onClick={() => archiveToggle(quick, !quick.archived)}>{quick.archived ? 'Unarchive' : 'Archive'}</Button>
                {quick.flagged ? (
                  <Button size="sm" variant="outline" onClick={() => flagToggle(quick, false)}>Unflag</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setNoteDialog({ open: true, id: quick.id, note: quick.flagged_note || '' })}>Flag…</Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => deleteRows([quick.id])}>Delete</Button>
              </div>
              <div className="pt-2">
                <Button variant="link" asChild><a href={`/projects/${quick.id}`} target="_blank" rel="noreferrer">Open public page</a></Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={noteDialog.open} onOpenChange={(o) => setNoteDialog(s => ({ ...s, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add moderator note</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="note">Reason</Label>
            <Textarea id="note" value={noteDialog.note} onChange={(e) => setNoteDialog(s => ({ ...s, note: e.target.value }))} placeholder="Short reason for flagging" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog({ open: false, id: null, note: '' })}>Cancel</Button>
            <Button onClick={async () => {
              if (!noteDialog.id) return;
              await flagToggle(rows.find(r => r.id === noteDialog.id)!, true, noteDialog.note);
              setNoteDialog({ open: false, id: null, note: '' });
            }}>Flag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
