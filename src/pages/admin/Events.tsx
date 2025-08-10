import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { format, isSameDay, parseISO, subDays } from "date-fns";
import { Users, Star, Lock, Unlock, Archive, ArchiveRestore, Trash2, Calendar as CalendarIcon } from "lucide-react";

interface EventRow {
  id: string;
  title: string;
  theme: string | null;
  summary: string | null;
  status: 'UPCOMING' | 'LIVE' | 'PAST';
  start_at: string | null;
  end_at: string | null;
  tba: boolean;
  venue_type: 'ONLINE' | 'IN_PERSON' | 'HYBRID' | null;
  community_slug: string | null;
  host: string | null;
  cover_image: string | null;
  is_featured: boolean;
  allow_rsvp: boolean;
  archived: boolean;
  created_at: string;
}

interface Profile { id: string; name: string | null }
interface Community { slug: string; name: string }

export default function AdminEvents() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: 'all', venue: 'all', community: 'all', sort: 'soonest' });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [stats, setStats] = useState({ upcoming: 0, recent: 0 });
  const [participantsOpen, setParticipantsOpen] = useState<{ open: boolean; eventId: string | null; title: string }>(() => ({ open: false, eventId: null, title: '' }));
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null; reason: string }>({ open: false, id: null, reason: '' });

  useEffect(() => {
    document.title = "Admin – Events | TechSociety";
    const m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute('content', 'Moderate events: feature, lock RSVPs, archive, delete, manage participants.');
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
      const [{ data: comms }, upcomingCount, recentCount] = await Promise.all([
        supabase.from('communities').select('slug,name').order('name'),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'UPCOMING'),
        supabase.from('events').select('id', { count: 'exact', head: true }).gte('created_at', subDays(new Date(), 30).toISOString()),
      ] as any);
      setCommunities(comms || []);
      setStats({ upcoming: upcomingCount.count || 0, recent: recentCount.count || 0 });
      await load();
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    let query = supabase.from('events').select('*');
    if (filters.status !== 'all') query = query.eq('status', filters.status as any);
    if (filters.venue !== 'all') query = query.eq('venue_type', filters.venue as any);
    if (filters.community !== 'all') query = query.eq('community_slug', filters.community);
    if (selectedDate) {
      // Filter by date (same day of start_at)
      const start = new Date(selectedDate);
      const end = new Date(selectedDate);
      end.setHours(23,59,59,999);
      query = query.gte('start_at', start.toISOString()).lte('start_at', end.toISOString());
    }
    if (filters.sort === 'soonest') query = query.order('start_at', { ascending: true, nullsFirst: true });
    if (filters.sort === 'recent') query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) { toast({ title: 'Failed to load events', description: error.message, variant: 'destructive' }); return; }

    let list = (data || []) as EventRow[];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(e => e.title.toLowerCase().includes(q) || (e.theme||'').toLowerCase().includes(q) || (e.host||'').toLowerCase().includes(q));
    }
    setEvents(list);
  };

  useEffect(() => { load(); }, [search, filters, selectedDate]);

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
        <h1 className="text-2xl font-semibold">Events Moderation</h1>
      </header>

      <section className="grid sm:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Upcoming</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.upcoming}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Recent (30 days)</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.recent}</CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border p-4 bg-card mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <Input placeholder="Search events, themes, hosts…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filters.status} onValueChange={(v) => setFilters(s => ({ ...s, status: v }))}>
            <SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="UPCOMING">Upcoming</SelectItem>
              <SelectItem value="LIVE">Live</SelectItem>
              <SelectItem value="PAST">Past</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.venue} onValueChange={(v) => setFilters(s => ({ ...s, venue: v }))}>
            <SelectTrigger><SelectValue placeholder="Venue"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Venues</SelectItem>
              <SelectItem value="ONLINE">Online</SelectItem>
              <SelectItem value="IN_PERSON">In Person</SelectItem>
              <SelectItem value="HYBRID">Hybrid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.community} onValueChange={(v) => setFilters(s => ({ ...s, community: v }))}>
            <SelectTrigger><SelectValue placeholder="Community"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All communities</SelectItem>
              {communities.map(c => (<SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filters.sort} onValueChange={(v) => setFilters(s => ({ ...s, sort: v }))}>
            <SelectTrigger><SelectValue placeholder="Sort"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="soonest">Soonest</SelectItem>
              <SelectItem value="recent">Recently created</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-6">
        <div>
          <Card>
            <CardHeader><CardTitle className="text-lg">Mini Calendar</CardTitle></CardHeader>
            <CardContent>
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md" />
              <div className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {selectedDate ? `Filtering by ${format(selectedDate, 'MMM d, yyyy')}` : 'No date filter'}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2 space-y-4">
          {events.length === 0 ? (
            <Card className="p-8 text-center">
              <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No events found</h3>
              <p className="text-muted-foreground">Adjust filters or clear the date filter.</p>
            </Card>
          ) : (
            events.map(ev => (
              <Card key={ev.id} className="overflow-hidden">
                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {ev.status === 'LIVE' ? (
                        <Badge variant="secondary">LIVE</Badge>
                      ) : (
                        <Badge variant="outline">{ev.tba ? 'TBA' : ev.status}</Badge>
                      )}
                      {ev.is_featured && (
                        <Badge className="gap-1"><Star className="h-3 w-3"/>Featured</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg leading-tight truncate">{ev.title}</h3>
                    <div className="text-sm text-muted-foreground truncate">{ev.theme || '—'}</div>
                    <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-3">
                      <span>{ev.start_at ? format(parseISO(ev.start_at), 'MMM d, h:mm a') : 'TBA'}</span>
                      {ev.venue_type && <span>{ev.venue_type}</span>}
                      {ev.community_slug && <span>• {ev.community_slug}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => featureEvent(ev.id, !ev.is_featured)}>{ev.is_featured ? <span className="flex items-center gap-1"><Star className="h-3 w-3"/>Unfeature</span> : <span className="flex items-center gap-1"><Star className="h-3 w-3"/>Feature</span>}</Button>
                    <Button variant="outline" size="sm" onClick={() => toggleRsvps(ev.id, !ev.allow_rsvp)}>{ev.allow_rsvp ? <span className="flex items-center gap-1"><Lock className="h-3 w-3"/>Lock RSVPs</span> : <span className="flex items-center gap-1"><Unlock className="h-3 w-3"/>Unlock RSVPs</span>}</Button>
                    <Button variant="outline" size="sm" onClick={() => archiveEvent(ev.id, !ev.archived)}>{ev.archived ? <span className="flex items-center gap-1"><ArchiveRestore className="h-3 w-3"/>Unarchive</span> : <span className="flex items-center gap-1"><Archive className="h-3 w-3"/>Archive</span>}</Button>
                    <Button variant="outline" size="sm" onClick={() => setParticipantsOpen({ open: true, eventId: ev.id, title: ev.title })}><Users className="h-3 w-3"/> Participants</Button>
                    <Button variant="destructive" size="sm" onClick={() => setDeleteDialog({ open: true, id: ev.id, reason: '' })}><Trash2 className="h-3 w-3"/> Delete</Button>
                    <Button variant="link" size="sm" asChild><a href={`/events/${ev.id}`} target="_blank" rel="noreferrer">Open</a></Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      <ParticipantsSheet state={participantsOpen} onClose={() => setParticipantsOpen({ open: false, eventId: null, title: '' })} />

      <Dialog open={deleteDialog.open} onOpenChange={(o) => setDeleteDialog(s => ({ ...s, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete event?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea id="reason" value={deleteDialog.reason} onChange={(e) => setDeleteDialog(s => ({ ...s, reason: e.target.value }))} placeholder="Optional moderator reason" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, id: null, reason: '' })}>Cancel</Button>
            <Button variant="destructive" onClick={async () => { if (!deleteDialog.id) return; const { error } = await supabase.from('events').delete().eq('id', deleteDialog.id); if (error) toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' }); else { toast({ title: 'Event deleted' }); setDeleteDialog({ open: false, id: null, reason: '' }); load(); } }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );

  async function featureEvent(id: string, value: boolean) {
    const { error } = await supabase.from('events').update({ is_featured: value }).eq('id', id);
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' }); else { toast({ title: value ? 'Featured' : 'Unfeatured' }); load(); }
  }

  async function toggleRsvps(id: string, allow: boolean) {
    const { error } = await supabase.from('events').update({ allow_rsvp: allow }).eq('id', id);
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' }); else { toast({ title: allow ? 'RSVPs unlocked' : 'RSVPs locked' }); load(); }
  }

  async function archiveEvent(id: string, value: boolean) {
    const { error } = await supabase.from('events').update({ archived: value }).eq('id', id);
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' }); else { toast({ title: value ? 'Archived' : 'Unarchived' }); load(); }
  }
}

function ParticipantsSheet({ state, onClose }: { state: { open: boolean; eventId: string | null; title: string }; onClose: () => void }) {
  const [current, setCurrent] = useState<Profile[]>([]);
  const [rsvps, setRsvps] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);

  useEffect(() => { if (state.open) { load(); } }, [state.open]);

  const load = async () => {
    if (!state.eventId) return;
    const [{ data: parts }, { data: rsvpRows }] = await Promise.all([
      supabase.from('event_participants').select('user_id').eq('event_id', state.eventId),
      supabase.from('event_rsvps').select('user_id').eq('event_id', state.eventId),
    ]);

    const ids = Array.from(new Set([...(parts||[]).map((p:any)=>p.user_id), ...(rsvpRows||[]).map((r:any)=>r.user_id)])).slice(0, 50);
    if (ids.length) {
      const { data: profiles } = await supabase.from('profiles').select('id,name').in('id', ids);
      const map = Object.fromEntries((profiles||[]).map((p:any)=>[p.id, { id: p.id, name: p.name }]));
      setCurrent((parts||[]).map((p:any)=>map[p.user_id]).filter(Boolean));
      setRsvps((rsvpRows||[]).map((r:any)=>map[r.user_id]).filter(Boolean));
    } else {
      setCurrent([]); setRsvps([]);
    }
  };

  useEffect(() => {
    const run = async () => {
      if (!query.trim()) { setResults([]); return; }
      const { data } = await supabase.from('profiles').select('id,name').ilike('name', `%${query}%`).eq('status','APPROVED').limit(10);
      setResults((data||[]) as any);
    };
    run();
  }, [query]);

  const addParticipant = async (userId: string) => {
    if (!state.eventId) return;
    const { error } = await supabase.from('event_participants').insert({ event_id: state.eventId, user_id: userId } as any);
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' }); else { toast({ title: 'Tagged as participant' }); setQuery(''); await load(); }
  };

  const removeParticipant = async (userId: string) => {
    if (!state.eventId) return;
    const { error } = await supabase.from('event_participants').delete().eq('event_id', state.eventId).eq('user_id', userId);
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' }); else { toast({ title: 'Removed' }); await load(); }
  };

  return (
    <Sheet open={state.open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle>Participants — {state.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-5">
          <div>
            <Label>Search members</Label>
            <Input placeholder="Type a name…" value={query} onChange={(e) => setQuery(e.target.value)} />
            {results.length > 0 && (
              <div className="mt-2 grid gap-2">
                {results.map(r => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border p-2">
                    <div className="text-sm">{r.name || r.id.slice(0,8)}</div>
                    <Button size="sm" onClick={() => addParticipant(r.id)}>Add</Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-medium mb-2">Current Participants</h3>
            {current.length === 0 ? (
              <div className="text-sm text-muted-foreground">No participants yet.</div>
            ) : (
              <div className="grid gap-2">
                {current.map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border p-2">
                    <div className="text-sm">{p.name || p.id.slice(0,8)}</div>
                    <Button variant="outline" size="sm" onClick={() => removeParticipant(p.id)}>Remove</Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-medium mb-2">RSVPs</h3>
            {rsvps.length === 0 ? (
              <div className="text-sm text-muted-foreground">No RSVPs yet.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {rsvps.map(p => (
                  <Badge key={p.id} variant="outline">{p.name || p.id.slice(0,8)}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
