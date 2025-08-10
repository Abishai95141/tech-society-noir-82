
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Github, Linkedin, Mail, Phone, Edit, ExternalLink, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

interface MemberQuickViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    name: string | null;
    specialization: string | null;
    community_slug: string | null;
    role?: string;
    linkedin_url?: string | null;
    github_url?: string | null;
    phone?: string | null;
    projectCount: number;
    eventCount: number;
    buddyCount: number;
  };
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

export function MemberQuickView({ open, onOpenChange, member }: MemberQuickViewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!open || !member.id) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch projects
        const { data: projectsData } = await supabase
          .from('projects')
          .select('id, title, status, looking_for, tech_stack')
          .eq('owner_id', member.id)
          .order('created_at', { ascending: false })
          .limit(3);

        // Fetch events
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, title, status, start_at, venue_type, location, tba')
          .eq('created_by', member.id)
          .order('created_at', { ascending: false })
          .limit(3);

        // Fetch user email if viewing own profile
        if (currentUserId === member.id) {
          const { data: userData } = await supabase.auth.getUser();
          setUserEmail(userData.user?.email ?? null);
        }

        setProjects(projectsData || []);
        setEvents(eventsData || []);
      } catch (error) {
        console.error('Error fetching member data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, member.id, currentUserId]);

  const formatEventTime = (startAt: string | null, tba: boolean) => {
    if (tba || !startAt) return "TBA";
    return format(parseISO(startAt), 'MMM d, yyyy');
  };

  const isOwnProfile = currentUserId === member.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Member Profile</DialogTitle>
        </DialogHeader>
        
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg font-semibold">
              {(member.name || 'M').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-1">{member.name || 'Member'}</h2>
            <p className="text-muted-foreground mb-2">{member.specialization || '—'}</p>
            <div className="flex items-center gap-2 mb-3">
              {member.community_slug && (
                <Badge variant="secondary">{member.community_slug}</Badge>
              )}
              {member.role && member.role !== 'member' && (
                <Badge variant="outline" className="capitalize">{member.role.replace('_', ' ')}</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span><strong>{member.projectCount}</strong> Projects</span>
              <span><strong>{member.eventCount}</strong> Events</span>
              <span><strong>{member.buddyCount}</strong> Buddies</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="space-y-4">
              {/* Bio placeholder */}
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                No bio available yet.
              </div>
              
              {/* Social Links */}
              <div className="flex items-center gap-3">
                {member.linkedin_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="h-4 w-4 mr-2" />
                      LinkedIn
                    </a>
                  </Button>
                )}
                {member.github_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={member.github_url} target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4 mr-2" />
                      GitHub
                    </a>
                  </Button>
                )}
              </div>
              
              {/* Contact Info */}
              <div className="space-y-2 text-sm">
                {userEmail && isOwnProfile && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{userEmail}</span>
                  </div>
                )}
                {member.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{member.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="projects" className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-lg border p-4 animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : projects.length > 0 ? (
              projects.map(project => (
                <div key={project.id} className="rounded-lg border p-4">
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
                    {isOwnProfile && (
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${project.id}/edit`)}>
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No projects yet.
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="events" className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-lg border p-4 animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : events.length > 0 ? (
              events.map(event => (
                <div key={event.id} className="rounded-lg border p-4">
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
                    {isOwnProfile && (
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/events/${event.id}/edit`)}>
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No events hosted yet.
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Separator />
        
        {/* Footer Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate(`/profile/${member.id}`)}>
            Open Full Profile
          </Button>
          {!isOwnProfile && (
            <ProfileModal 
              open={false} 
              onOpenChange={() => {}} 
              profile={member as any}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
