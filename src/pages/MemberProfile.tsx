
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Github, Linkedin, Edit, ExternalLink, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { acceptBuddyRequest, cancelOutgoingRequest, getRelationWith, removeBuddy, sendBuddyRequest } from "@/lib/buddies";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";

interface Profile { 
  id: string; 
  name: string | null; 
  degree: string | null; 
  specialization: string | null; 
  community_slug: string | null; 
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

export default function MemberProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [me, setMe] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [relation, setRelation] = useState<any | null>(null);

  useEffect(() => {
    document.title = `${profile?.name || 'Member'} • TechSociety`;
  }, [profile?.name]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    
    const fetchData = async () => {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id,name,degree,specialization,community_slug,linkedin_url,github_url,role')
        .eq('id', userId)
        .maybeSingle();
      setProfile(profileData as any);

      // Fetch projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id,title,status,looking_for,tech_stack')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
        .limit(6);
      setProjects(projectsData || []);

      // Fetch events
      const { data: eventsData } = await supabase
        .from('events')
        .select('id,title,status,start_at,venue_type,location,tba')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(6);
      setEvents(eventsData || []);
    };

    fetchData();
  }, [userId]);

  useEffect(() => {
    if (!me || !userId) return;
    getRelationWith(me, userId).then(setRelation);
  }, [me, userId]);

  const isSelf = me === userId;

  const doAction = async () => {
    if (!userId || isSelf) return;
    if (!relation) {
      const { error } = await sendBuddyRequest(userId);
      return error ? toast({ title: 'Request failed', description: error.message }) : (toast({ title: 'Request sent' }), getRelationWith(me!, userId).then(setRelation));
    }
    if (relation.status === 'PENDING') {
      if (relation.requester_id === me) {
        const { error } = await cancelOutgoingRequest(userId);
        return error ? toast({ title: 'Cancel failed', description: error.message }) : (toast({ title: 'Request canceled' }), getRelationWith(me!, userId).then(setRelation));
      } else if (relation.recipient_id === me) {
        const { error } = await acceptBuddyRequest(relation.id);
        return error ? toast({ title: 'Accept failed', description: error.message }) : (toast({ title: 'You are now buddies' }), getRelationWith(me!, userId).then(setRelation));
      }
    }
    if (relation.status === 'ACCEPTED') {
      const { error } = await removeBuddy(userId);
      return error ? toast({ title: 'Remove failed', description: error.message }) : (toast({ title: 'Buddy removed' }), getRelationWith(me!, userId).then(setRelation));
    }
    if (relation.status === 'REJECTED') {
      const { error } = await sendBuddyRequest(userId);
      return error ? toast({ title: 'Request failed', description: error.message }) : (toast({ title: 'Request sent' }), getRelationWith(me!, userId).then(setRelation));
    }
  };

  const label = useMemo(() => {
    if (isSelf) return "This is you";
    if (!relation) return "Request Tech Buddy";
    if (relation.status === 'PENDING') return relation.requester_id === me ? "Cancel Request" : "Accept / Reject";
    if (relation.status === 'ACCEPTED') return "Remove Buddy";
    if (relation.status === 'REJECTED') return "Request Tech Buddy";
    return "Request Tech Buddy";
  }, [relation, isSelf, me]);

  const formatEventTime = (startAt: string | null, tba: boolean) => {
    if (tba || !startAt) return "TBA";
    return format(parseISO(startAt), 'MMM d, yyyy');
  };

  const ProjectCard = ({ project }: { project: Project }) => (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium">{project.title}</h4>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{project.status}</Badge>
          {project.looking_for && (
            <Badge variant="outline" className="text-xs border-primary text-primary">
              Looking
            </Badge>
          )}
        </div>
      </div>
      {project.tech_stack.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {project.tech_stack.slice(0, 3).map(tech => (
            <Badge key={tech} variant="outline" className="text-xs">{tech}</Badge>
          ))}
          {project.tech_stack.length > 3 && (
            <Badge variant="outline" className="text-xs">+{project.tech_stack.length - 3}</Badge>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${project.id}`)}>
          <ExternalLink className="h-3 w-3 mr-1" />
          View
        </Button>
        {isSelf && (
          <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${project.id}/edit`)}>
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
        )}
      </div>
    </div>
  );

  const EventCard = ({ event }: { event: Event }) => (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium">{event.title}</h4>
        <Badge variant="secondary" className="text-xs capitalize">{event.status}</Badge>
      </div>
      <div className="text-sm text-muted-foreground mb-2">
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
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/events/${event.id}`)}>
          <ExternalLink className="h-3 w-3 mr-1" />
          View
        </Button>
        {isSelf && (
          <Button variant="ghost" size="sm" onClick={() => navigate(`/events/${event.id}/edit`)}>
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <main className="max-w-[1200px] mx-auto px-6 py-10">
      <h1 className="sr-only">Member Profile</h1>
      
      {/* Header */}
      <Card className="rounded-2xl mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-xl font-semibold">
                {(profile?.name || 'M').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold mb-2">{profile?.name || 'Member'}</h1>
              <p className="text-muted-foreground mb-3">{profile?.specialization || '—'}</p>
              <div className="flex items-center gap-2 mb-4">
                {profile?.community_slug && (
                  <Badge variant="secondary">{profile.community_slug}</Badge>
                )}
                {profile?.role && profile.role !== 'member' && (
                  <Badge variant="outline" className="capitalize">{profile.role.replace('_', ' ')}</Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm">
                {profile?.linkedin_url && (
                  <a className="inline-flex items-center gap-1 hover:underline" href={profile.linkedin_url} target="_blank" rel="noreferrer">
                    <Linkedin className="h-4 w-4"/>LinkedIn
                  </a>
                )}
                {profile?.github_url && (
                  <a className="inline-flex items-center gap-1 hover:underline" href={profile.github_url} target="_blank" rel="noreferrer">
                    <Github className="h-4 w-4"/>GitHub
                  </a>
                )}
              </div>
            </div>
            {!isSelf && (
              <Button onClick={doAction}>{label}</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs defaultValue="projects" className="w-full">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="events">Hosted Events</TabsTrigger>
        </TabsList>
        
        <TabsContent value="projects" className="mt-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {projects.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {projects.map(project => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No projects yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="events" className="mt-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Hosted Events</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {events.map(event => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No events hosted yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
