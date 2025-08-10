import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BuddiesDrawer from "@/components/buddies/BuddiesDrawer";
import { Github, Linkedin, Pencil, Edit, ExternalLink, Calendar, Share } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useHostPermissions } from "@/hooks/use-host-permissions";
import { format, parseISO } from "date-fns";

interface Profile { 
  id: string; 
  name: string | null; 
  degree: string | null; 
  specialization: string | null; 
  community_slug: string | null; 
  phone: string | null; 
  linkedin_url: string | null; 
  github_url: string | null;
  role?: string;
}

interface Project { 
  id: string; 
  title: string; 
  status: string; 
  looking_for: string | null;
  tech_stack: string[];
}

interface Event {
  id: string;
  title: string;
  status: string;
  start_at: string | null;
  venue_type: string | null;
  location: string | null;
  tba: boolean;
}

export default function Me() {
  const [me, setMe] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [openEdit, setOpenEdit] = useState(false);
  const [openBuddies, setOpenBuddies] = useState(false);
  const { canHost } = useHostPermissions();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "My Profile • TechSociety";
    supabase.auth.getUser().then(({ data }) => {
      setMe(data.user?.id ?? null);
      setEmail(data.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    if (!me) return;
    (async () => {
      // Fetch profile
      const { data: p } = await supabase
        .from('profiles')
        .select('id,name,degree,specialization,community_slug,phone,linkedin_url,github_url,role')
        .eq('id', me)
        .maybeSingle();
      setProfile(p as any);

      // Fetch projects
      const { data: pr } = await supabase
        .from('projects')
        .select('id,title,status,looking_for,tech_stack')
        .eq('owner_id', me)
        .order('created_at', { ascending: false });
      setProjects(pr || []);

      // Fetch events
      const { data: events } = await supabase
        .from('events')
        .select('id,title,status,start_at,venue_type,location,tba')
        .eq('created_by', me)
        .order('start_at', { ascending: false });

      const upcoming = (events || []).filter(e => e.status === 'UPCOMING' || e.status === 'LIVE');
      const past = (events || []).filter(e => e.status === 'PAST');
      setUpcomingEvents(upcoming);
      setPastEvents(past);
    })();
  }, [me]);

  const form = useForm<Profile>({ defaultValues: profile || {} as any });
  useEffect(() => { if (profile) form.reset(profile); }, [profile]);

  const stats = useMemo(() => ({ 
    projects: projects.length, 
    events: upcomingEvents.length + pastEvents.length, 
    buddies: 0 
  }), [projects.length, upcomingEvents.length, pastEvents.length]);

  const formatEventTime = (startAt: string | null, tba: boolean) => {
    if (tba || !startAt) return "TBA";
    return format(parseISO(startAt), 'MMM d, yyyy');
  };

  const ProjectCard = ({ project }: { project: Project }) => (
    <div className="flex items-start justify-between group">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">{project.title}</span>
          <Badge variant="secondary" className="text-xs">{project.status}</Badge>
          {project.looking_for && (
            <Badge variant="outline" className="text-xs border-primary text-primary">
              Looking
            </Badge>
          )}
        </div>
        {project.tech_stack.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {project.tech_stack.slice(0, 3).map(tech => (
              <Badge key={tech} variant="outline" className="text-xs">{tech}</Badge>
            ))}
            {project.tech_stack.length > 3 && (
              <Badge variant="outline" className="text-xs">+{project.tech_stack.length - 3}</Badge>
            )}
          </div>
        )}
        <div className="text-xs text-muted-foreground">{project.looking_for || '—'}</div>
      </div>
      <Button 
        variant="ghost" 
        size="sm"
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => navigate(`/projects/${project.id}/edit`)}
      >
        <Edit className="h-4 w-4" />
      </Button>
    </div>
  );

  const EventCard = ({ event }: { event: Event }) => (
    <div className="flex items-start justify-between group">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">{event.title}</span>
          <Badge variant="secondary" className="text-xs capitalize">{event.status}</Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            <span>{formatEventTime(event.start_at, event.tba)}</span>
          </div>
          {event.venue_type && (
            <div className="mt-1">
              {event.venue_type === 'ONLINE' ? 'Online Event' : event.location || 'Venue TBA'}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => {/* Add to calendar logic */}}
        >
          <Calendar className="h-3 w-3" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => {/* Share logic */}}
        >
          <Share className="h-3 w-3" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => navigate(`/events/${event.id}/edit`)}
        >
          <Edit className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <main className="max-w-[1200px] mx-auto px-6 py-10">
      <h1 className="sr-only">My Profile</h1>
      <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-6">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span>{profile?.name || 'Your Name'}</span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setOpenEdit(true)}>
                  <Pencil className="h-4 w-4 mr-2"/>Edit Profile
                </Button>
                <Button onClick={() => setOpenBuddies(true)}>Tech Buddies</Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {profile?.community_slug && <Badge variant="secondary">{profile.community_slug}</Badge>}
              {profile?.role && profile.role !== 'member' && (
                <Badge variant="outline" className="capitalize">{profile.role.replace('_', ' ')}</Badge>
              )}
              <span>{[profile?.degree, profile?.specialization].filter(Boolean).join(' · ') || 'Add your details'}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              {profile?.linkedin_url && <a className="inline-flex items-center gap-1 hover:underline" href={profile.linkedin_url} target="_blank" rel="noreferrer"><Linkedin className="h-4 w-4"/>LinkedIn</a>}
              {profile?.github_url && <a className="inline-flex items-center gap-1 hover:underline" href={profile.github_url} target="_blank" rel="noreferrer"><Github className="h-4 w-4"/>GitHub</a>}
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div><span className="font-semibold">Projects</span> <Badge variant="secondary">{stats.projects}</Badge></div>
              <div><span className="font-semibold">Events</span> <Badge variant="secondary">{stats.events}</Badge></div>
              <div><span className="font-semibold">Tech Buddies</span> <Badge variant="secondary">{stats.buddies}</Badge></div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader><CardTitle>About & Contact</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Email: <span className="text-muted-foreground">{email}</span></div>
            <div>Phone: <span className="text-muted-foreground">{profile?.phone || '—'}</span></div>
            <div className="rounded-lg border p-3 text-muted-foreground">No bio yet. Add a short bio in Edit Profile.</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader><CardTitle>Ongoing Projects</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} />
            ))}
            {projects.length === 0 && <div className="text-sm text-muted-foreground">No projects yet.</div>}
            <Separator className="my-2" />
            <Button variant="secondary" onClick={() => navigate('/projects/create')}>Create Project</Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Events</CardTitle>
              {canHost && (
                <Button size="sm" onClick={() => navigate('/events/create')}>
                  Create Event
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!canHost && (
              <div className="mb-4 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
                Hosting is restricted to Secretaries. Contact an admin to request hosting permissions.
              </div>
            )}
            <Tabs defaultValue="upcoming">
              <TabsList>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past</TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming" className="space-y-3">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map(event => (
                    <EventCard key={event.id} event={event} />
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No upcoming events.</div>
                )}
              </TabsContent>
              <TabsContent value="past" className="space-y-3">
                {pastEvents.length > 0 ? (
                  pastEvents.map(event => (
                    <EventCard key={event.id} event={event} />
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No past events.</div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(async (vals) => {
              const { error } = await supabase.from('profiles').update({
                name: vals.name, degree: vals.degree, specialization: vals.specialization, phone: vals.phone, linkedin_url: vals.linkedin_url, github_url: vals.github_url, community_slug: vals.community_slug,
              }).eq('id', me!);
              if (error) return toast({ title: 'Update failed', description: error.message });
              toast({ title: 'Profile updated' });
              setOpenEdit(false);
              const { data: p } = await supabase.from('profiles').select('id,name,degree,specialization,community_slug,phone,linkedin_url,github_url').eq('id', me!).maybeSingle();
              setProfile(p as any);
            })}>
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="degree" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Degree</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="specialization" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialization</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="community_slug" render={({ field }) => (
                <FormItem>
                  <FormLabel>Community</FormLabel>
                  <FormControl><Input placeholder="e.g., Web Dev" {...field} /></FormControl>
                </FormItem>
              )} />
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="linkedin_url" render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn URL</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="github_url" render={({ field }) => (
                  <FormItem>
                    <FormLabel>GitHub URL</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <div className="flex justify-end"><Button type="submit">Save</Button></div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <BuddiesDrawer open={openBuddies} onOpenChange={setOpenBuddies} />
    </main>
  );
}
