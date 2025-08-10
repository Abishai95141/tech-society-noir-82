import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Calendar, MapPin, Video, Users, Clock,
  ExternalLink, Download, Edit, Share, Star, Dot, Copy
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface Event {
  id: string;
  title: string;
  summary: string | null;
  theme: string | null;
  host: string | null;
  community_slug: string | null;
  venue_type: 'ONLINE' | 'IN_PERSON' | 'HYBRID' | null;
  location: string | null;
  meeting_link: string | null;
  start_at: string | null;
  end_at: string | null;
  tba: boolean;
  status: 'UPCOMING' | 'LIVE' | 'PAST';
  cover_image: string | null;
  capacity: number | null;
  is_featured: boolean;
  allow_rsvp: boolean;
  created_by: string;
  created_at: string;
}

const LiveBadge = () => (
  <Badge variant="secondary" className="gap-1">
    <Dot className="h-3 w-3 animate-pulse text-primary" />
    LIVE
  </Badge>
);

const VenueIcon = ({ type }: { type: Event['venue_type'] }) => {
  switch (type) {
    case 'ONLINE': return <Video className="h-4 w-4" />;
    case 'IN_PERSON': return <MapPin className="h-4 w-4" />;
    case 'HYBRID': return <Users className="h-4 w-4" />;
    default: return <Calendar className="h-4 w-4" />;
  }
};

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isGoing, setIsGoing] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [attendees, setAttendees] = useState<{ id: string; name: string | null }[]>([]);

  useEffect(() => {
    if (id) {
      fetchEvent();
    }
  }, [id]);

  const fetchEvent = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast({
        title: "Event not found",
        variant: "destructive",
      });
      navigate('/events');
      return;
    }

    setEvent(data);
    setIsLoading(false);
  };

  const shareEvent = async () => {
    const url = `${window.location.origin}/events/${event?.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.title,
          text: event?.summary || 'Check out this event!',
          url,
        });
      } catch (error) {
        navigator.clipboard.writeText(url);
        toast({ title: "Link copied to clipboard" });
      }
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copied to clipboard" });
    }
  };

  const generateCalendarFile = () => {
    if (!event || !event.start_at) return;

    const startDate = parseISO(event.start_at);
    const endDate = event.end_at ? parseISO(event.end_at) : new Date(startDate.getTime() + 60 * 60 * 1000);

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TechSociety//Event//EN',
      'BEGIN:VEVENT',
      `UID:${event.id}@techsociety.com`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.summary || ''}`,
      `LOCATION:${event.location || event.meeting_link || 'TBA'}`,
      `URL:${window.location.href}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const [rsvpLoading, setRsvpLoading] = useState(false);

  const refreshRsvp = async () => {
    if (!event) return;
    const { count, data } = await supabase
      .from('event_rsvps')
      .select('user_id', { count: 'exact' })
      .eq('event_id', event.id);

    setAttendeeCount(count || 0);

    const ids = Array.from(new Set((data || []).map(r => r.user_id))).slice(0, 8);
    if (ids.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, status')
        .in('id', ids)
        .eq('status', 'APPROVED');
      setAttendees((profiles || []).map((p: any) => ({ id: p.id, name: p.name })));
    } else {
      setAttendees([]);
    }

    if (userId) {
      const { data: mine } = await supabase
        .from('event_rsvps')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', userId)
        .maybeSingle();
      setIsGoing(!!mine);
    } else {
      setIsGoing(false);
    }
  };

  const toggleRsvp = async () => {
    if (!event) return;
    if (!userId) {
      navigate('/login');
      return;
    }
    setRsvpLoading(true);
    try {
      if (isGoing) {
        const { error } = await supabase
          .from('event_rsvps')
          .delete()
          .eq('event_id', event.id)
          .eq('user_id', userId);
        if (error) throw error;
        toast({ title: "RSVP cancelled" });
      } else {
        const { error } = await supabase
          .from('event_rsvps')
          .insert([{ event_id: event.id, user_id: userId }]);
        if (error) throw error;
        toast({ title: "RSVP confirmed" });
      }
      await refreshRsvp();
    } catch (e: any) {
      toast({ title: "Unable to update RSVP", description: e?.message ?? 'Try again', variant: "destructive" });
    } finally {
      setRsvpLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (event?.id && event.allow_rsvp) {
      refreshRsvp();
    }
  }, [event?.id, event?.allow_rsvp, userId]);


  const formatEventTime = (startAt: string | null, endAt: string | null, tba: boolean) => {
    if (tba) return "TBA";
    if (!startAt) return "TBA";
    
    const start = parseISO(startAt);
    const end = endAt ? parseISO(endAt) : null;
    
    return end 
      ? `${format(start, 'EEEE, MMMM d, yyyy')} • ${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`
      : format(start, 'EEEE, MMMM d, yyyy • h:mm a');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-64 w-full mb-8" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-32" />
              <Skeleton className="h-48" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-40" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Event not found</h2>
          <p className="text-muted-foreground mb-4">
            This event may have been deleted or moved.
          </p>
          <Button asChild>
            <Link to="/events">Browse Events</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative">
        {event.cover_image && (
          <div className="h-80 overflow-hidden">
            <img 
              src={`${supabase.storage.from('event-covers').getPublicUrl(event.cover_image).data.publicUrl}`}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
          </div>
        )}
        
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate('/events')}>
              <ArrowLeft className="h-4 w-4" />
              Back to Events
            </Button>
            
            <div className="flex gap-2 ml-auto">
              {event.allow_rsvp && (
                <Button size="sm" onClick={toggleRsvp} disabled={rsvpLoading}>
                  {isGoing ? 'Attending' : 'RSVP'}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={shareEvent}>
                <Share className="h-4 w-4" />
                Share
              </Button>
              
              {!event.tba && event.start_at && (
                <Button variant="outline" size="sm" onClick={generateCalendarFile}>
                  <Download className="h-4 w-4" />
                  Add to Calendar
                </Button>
              )}
            </div>
          </div>

          {/* Event Title & Meta */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight mb-2">{event.title}</h1>
                <div className="flex items-center gap-2 mb-3">
                  {event.status === 'LIVE' ? (
                    <LiveBadge />
                  ) : (
                    <Badge variant="outline">
                      {event.tba ? 'TBA' : event.status}
                    </Badge>
                  )}
                  
                  {event.theme && (
                    <Badge variant="secondary">{event.theme}</Badge>
                  )}
                  
                  {event.is_featured && (
                    <Badge variant="default" className="gap-1">
                      <Star className="h-3 w-3" />
                      Featured
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Info */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatEventTime(event.start_at, event.end_at, event.tba)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <VenueIcon type={event.venue_type} />
                <span>
                  {event.venue_type === 'ONLINE' 
                    ? 'Online Event' 
                    : event.location || 'Venue TBA'}
                </span>
              </div>
              
              {event.host && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Hosted by {event.host}</span>
                </div>
              )}
              
              {event.capacity && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Capacity: {event.capacity} people</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 pb-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>About This Event</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {event.summary || "No description provided."}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Meeting Link */}
            {event.meeting_link && event.venue_type !== 'IN_PERSON' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Join Online
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <a href={event.meeting_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Join Meeting
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Attendees */}
            {event.allow_rsvp && (
              <Card>
                <CardHeader>
                  <CardTitle>Attendees</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Going</span>
                    <Badge variant="outline">{attendeeCount}</Badge>
                  </div>
                  <div className="flex -space-x-2">
                    {attendees.map(a => (
                      <Avatar key={a.id} className="h-8 w-8 border">
                        <AvatarFallback>{(a.name || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    ))}
                    {attendeeCount > attendees.length && (
                      <div className="h-8 w-8 rounded-full border bg-muted text-xs flex items-center justify-center">
                        +{attendeeCount - attendees.length}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Event Details */}
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {event.community_slug && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Community</span>
                    <Badge variant="outline">{event.community_slug}</Badge>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{format(parseISO(event.created_at), 'MMM d, yyyy')}</span>
                </div>
                
                {event.capacity && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capacity</span>
                    <span>{event.capacity} people</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Event Type</span>
                  <span className="flex items-center gap-1">
                    <VenueIcon type={event.venue_type} />
                    {event.venue_type || 'TBA'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}