import { useState, useEffect, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import RequireApproval from "@/components/auth/RequireApproval";
import { Link, useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/use-debounce";
import { Plus, Search, Filter, Calendar as CalendarIcon, MapPin, Video, Users, Dot, ExternalLink } from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { toast } from "@/hooks/use-toast";

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


interface Profile {
  name: string | null;
  status: string;
}
interface Community {
  slug: string;
  name: string;
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
    default: return <CalendarIcon className="h-4 w-4" />;
  }
};

const EventCard = ({ event }: { event: Event }) => {
  const navigate = useNavigate();
  
  const formatEventTime = (startAt: string | null, endAt: string | null, tba: boolean) => {
    if (tba) return "TBA";
    if (!startAt) return "TBA";
    
    const start = parseISO(startAt);
    const end = endAt ? parseISO(endAt) : null;
    
    if (end && !isSameDay(start, end)) {
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, h:mm a')}`;
    }
    
    return end 
      ? `${format(start, 'MMM d, h:mm a')} - ${format(end, 'h:mm a')}`
      : format(start, 'MMM d, h:mm a');
  };

  const generateCalendarFile = () => {
    if (!event || !event.start_at) return;

    const startDate = parseISO(event.start_at);
    const endDate = event.end_at ? parseISO(event.end_at) : new Date(startDate.getTime() + 60 * 60 * 1000);

    const formatDate = (date: Date) =>
      date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

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
      `URL:${window.location.origin}/events/${event.id}`,
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

  return (
    <Card className="hover-scale cursor-pointer" onClick={() => navigate(`/events/${event.id}`)}>
      {event.cover_image && (
        <div className="aspect-video w-full overflow-hidden rounded-t-xl">
          <img 
            src={`${supabase.storage.from('event-covers').getPublicUrl(event.cover_image).data.publicUrl}`}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">{event.title}</CardTitle>
          <div className="flex gap-1">
            {event.status === 'LIVE' ? (
              <LiveBadge />
            ) : (
              <Badge variant="outline" className="text-xs">
                {event.tba ? 'TBA' : event.status}
              </Badge>
            )}
          </div>
        </div>
        {event.theme && (
          <Badge variant="secondary" className="w-fit text-xs">
            {event.theme}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {event.summary || "No description available"}
        </p>
        
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-3 w-3" />
            {formatEventTime(event.start_at, event.end_at, event.tba)}
          </div>
          
          <div className="flex items-center gap-2">
            <VenueIcon type={event.venue_type} />
            {event.location || event.meeting_link ? (
              <span className="truncate">
                {event.venue_type === 'ONLINE' ? 'Online Event' : event.location}
              </span>
            ) : (
              'Venue TBA'
            )}
          </div>
          
          {event.host && (
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3" />
              <span className="truncate">Hosted by {event.host}</span>
            </div>
          )}
        </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={(e) => {
              e.stopPropagation();
              navigate(`/events/${event.id}`);
            }}>
              View Details
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={(e) => {
                e.stopPropagation();
                generateCalendarFile();
              }}>
                Add to Calendar
              </Button>
              <Button variant="ghost" size="sm" onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(`${window.location.origin}/events/${event.id}`);
                toast({ title: "Link copied to clipboard" });
              }} aria-label="Copy link">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
      </CardContent>
    </Card>
  );
};

function EventsContent() {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [venueFilter, setVenueFilter] = useState<string>("all");
  const [communityFilter, setCommunityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("soonest");
  const [communities, setCommunities] = useState<Community[]>([]);
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    fetchEvents();
    checkUserStatus();
    fetchCommunities();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('start_at', { ascending: true });
    
    setEvents(data || []);
  };

  const checkUserStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('name, status')
        .eq('id', user.id)
        .single();
      setProfile(data);
    }
  };

  const fetchCommunities = async () => {
    const { data } = await supabase
      .from('communities')
      .select('slug, name')
      .order('name');
    setCommunities(data || []);
  };

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    
    let filtered = events.filter(event => {
      // Search filter
      const searchMatch = !debouncedSearch || 
        event.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        event.theme?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        event.host?.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      // Status filter
      const statusMatch = statusFilter === "all" || event.status === statusFilter;
      
      // Venue filter
      const venueMatch = venueFilter === "all" || event.venue_type === venueFilter;

      // Community filter
      const communityMatch = communityFilter === "all" || event.community_slug === communityFilter;
      
      return searchMatch && statusMatch && venueMatch && communityMatch;
    });

    // Sort
    if (sortBy === "soonest") {
      filtered.sort((a, b) => {
        if (!a.start_at && !b.start_at) return 0;
        if (!a.start_at) return 1;
        if (!b.start_at) return -1;
        return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
      });
    } else if (sortBy === "recent") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return filtered;
  }, [events, debouncedSearch, statusFilter, venueFilter, communityFilter, sortBy]);

  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDate || !events) return [];
    
    return events.filter(event => {
      if (!event.start_at) return false;
      return isSameDay(parseISO(event.start_at), selectedDate);
    });
  }, [events, selectedDate]);

  const eventDates = useMemo(() => {
    if (!events) return [];
    return events
      .filter(e => e.start_at)
      .map(e => parseISO(e.start_at!));
  }, [events]);

  const isApproved = profile?.status === 'APPROVED';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Events</h1>
            <p className="text-muted-foreground">
              Discover and join community events
            </p>
          </div>
          
          {isApproved && (
            <Button asChild>
              <Link to="/events/create">
                <Plus className="h-4 w-4" />
                Create Event
              </Link>
            </Button>
          )}
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 p-4 bg-card rounded-xl border">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events, themes, hosts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="UPCOMING">Upcoming</SelectItem>
                <SelectItem value="LIVE">Live</SelectItem>
                <SelectItem value="PAST">Past</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={venueFilter} onValueChange={setVenueFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Venues</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
                <SelectItem value="IN_PERSON">In Person</SelectItem>
                <SelectItem value="HYBRID">Hybrid</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="soonest">Soonest</SelectItem>
                <SelectItem value="recent">Recently Added</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Event Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    hasEvent: eventDates,
                  }}
                  modifiersClassNames={{
                    hasEvent: "bg-primary/10 font-semibold",
                  }}
                  className="rounded-md"
                />
                
                {/* Selected Date Events */}
                {selectedDate && (
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full mt-4"
                        disabled={eventsForSelectedDate.length === 0}
                      >
                        <CalendarIcon className="h-4 w-4" />
                        {eventsForSelectedDate.length} event{eventsForSelectedDate.length !== 1 ? 's' : ''} on {format(selectedDate, 'MMM d')}
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-96">
                      <SheetHeader>
                        <SheetTitle>
                          Events on {format(selectedDate, 'MMMM d, yyyy')}
                        </SheetTitle>
                      </SheetHeader>
                      <div className="mt-6 space-y-3">
                        {eventsForSelectedDate.map(event => (
                          <Card key={event.id} className="cursor-pointer hover-scale">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="font-medium text-sm">{event.title}</h3>
                                {event.status === 'LIVE' && <LiveBadge />}
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">
                                {event.start_at && format(parseISO(event.start_at), 'h:mm a')}
                                {event.end_at && ` - ${format(parseISO(event.end_at), 'h:mm a')}`}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <VenueIcon type={event.venue_type} />
                                {event.location || 'Online Event'}
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full mt-3"
                                asChild
                              >
                                <Link to={`/events/${event.id}`}>View Details</Link>
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </SheetContent>
                  </Sheet>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Events List */}
          <div className="lg:col-span-2">
            <div className="grid gap-6">
              {events === null ? (
                // Loading skeletons
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-xl" />
                ))
              ) : filteredEvents.length === 0 ? (
                // Empty state
                <Card className="p-8 text-center">
                  <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No events found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your filters or search query
                  </p>
                  {isApproved && (
                    <Button asChild>
                      <Link to="/events/create">Create First Event</Link>
                    </Button>
                  )}
                </Card>
              ) : (
                // Events grid
                <div className="grid sm:grid-cols-2 gap-6">
                  {filteredEvents.map(event => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Events() {
  return (
    <EventsContent />
  );
}