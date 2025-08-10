import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Video, Users, Upload, X, Save, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface FormData {
  title: string;
  theme: string;
  summary: string;
  host: string;
  community_slug: string;
  venue_type: 'ONLINE' | 'IN_PERSON' | 'HYBRID';
  location: string;
  meeting_link: string;
  start_at: string;
  end_at: string;
  tba: boolean;
  capacity: string;
  allow_rsvp: boolean;
  is_featured: boolean;
}

interface Community {
  slug: string;
  name: string;
}

export default function EventCreate() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    title: "",
    theme: "",
    summary: "",
    host: "",
    community_slug: "",
    venue_type: "ONLINE",
    location: "",
    meeting_link: "",
    start_at: "",
    end_at: "",
    tba: false,
    capacity: "",
    allow_rsvp: true,
    is_featured: false,
  });

  useEffect(() => {
    checkUserAccess();
    fetchCommunities();
  }, []);

  const checkUserAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile || profile.status !== 'APPROVED') {
      toast({
        title: "Access Denied",
        description: "You need to be an approved member to create events.",
        variant: "destructive",
      });
      navigate('/events');
      return;
    }

    setUserProfile(profile);
    setFormData(prev => ({ 
      ...prev, 
      host: profile.name || "",
      community_slug: profile.community_slug || "",
    }));

    const { data: roles } = await supabase
      .from('role_assignments')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    setIsAdmin(!!roles && roles.length > 0);
  };

  const fetchCommunities = async () => {
    const { data } = await supabase
      .from('communities')
      .select('slug, name')
      .order('name');
    setCommunities(data || []);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setCoverImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setCoverPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeCoverImage = () => {
    setCoverImage(null);
    setCoverPreview(null);
  };

  const uploadCoverImage = async (): Promise<string | null> => {
    if (!coverImage) return null;

    const fileName = `${Date.now()}-${coverImage.name}`;
    const { error } = await supabase.storage
      .from('event-covers')
      .upload(fileName, coverImage);

    if (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload cover image.",
        variant: "destructive",
      });
      return null;
    }

    return fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter an event title.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.theme.trim()) {
      toast({
        title: "Theme required",
        description: "Please enter an event theme.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.tba && !formData.start_at) {
      toast({
        title: "Date required",
        description: "Please set a start date or mark as TBA.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Upload cover image
      const coverImagePath = await uploadCoverImage();

      // Prepare event data
      const eventData = {
        title: formData.title.trim(),
        theme: formData.theme.trim(),
        summary: formData.summary.trim() || null,
        host: formData.host.trim() || null,
        community_slug: formData.community_slug || null,
        venue_type: formData.venue_type,
        location: formData.venue_type !== 'ONLINE' ? formData.location.trim() || null : null,
        meeting_link: formData.venue_type !== 'IN_PERSON' ? formData.meeting_link.trim() || null : null,
        start_at: formData.tba ? null : formData.start_at || null,
        end_at: formData.tba ? null : formData.end_at || null,
        tba: formData.tba,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        allow_rsvp: formData.allow_rsvp,
        is_featured: formData.is_featured,
        cover_image: coverImagePath,
      };

      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Event created successfully!",
        description: "Your event has been published.",
      });

      navigate(`/events/${data.id}`);
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Failed to create event",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateEndTime = () => {
    if (!formData.start_at) return;
    
    const startDate = new Date(formData.start_at);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour
    
    setFormData(prev => ({
      ...prev,
      end_at: format(endDate, "yyyy-MM-dd'T'HH:mm"),
    }));
  };

  // isAdmin handled via separate state from role_assignments query.

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/events')}>
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Event</h1>
            <p className="text-muted-foreground">
              Share knowledge and bring the community together
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Introduction to Machine Learning"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theme">Theme *</Label>
                  <Input
                    id="theme"
                    placeholder="e.g., Workshop, Talk, Networking"
                    value={formData.theme}
                    onChange={(e) => setFormData(prev => ({ ...prev, theme: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary">Description</Label>
                  <Textarea
                    id="summary"
                    placeholder="Tell people what this event is about..."
                    value={formData.summary}
                    onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="host">Host</Label>
                  <Input
                    id="host"
                    placeholder="Who's hosting this event?"
                    value={formData.host}
                    onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="community">Community</Label>
                  <Select 
                    value={formData.community_slug} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, community_slug: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a community" />
                    </SelectTrigger>
                    <SelectContent>
                      {communities.map(community => (
                        <SelectItem key={community.slug} value={community.slug}>
                          {community.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Date & Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  When
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="tba"
                    checked={formData.tba}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, tba: checked }))}
                  />
                  <Label htmlFor="tba">Date TBA</Label>
                </div>

                {!formData.tba && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="start_at">Start Date & Time *</Label>
                      <Input
                        id="start_at"
                        type="datetime-local"
                        value={formData.start_at}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, start_at: e.target.value }));
                          if (e.target.value && !formData.end_at) {
                            // Auto-generate end time after a short delay
                            setTimeout(generateEndTime, 100);
                          }
                        }}
                        required={!formData.tba}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end_at">End Date & Time</Label>
                      <Input
                        id="end_at"
                        type="datetime-local"
                        value={formData.end_at}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_at: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave empty to default to +1 hour from start time
                      </p>
                    </div>
                  </>
                )}

                {formData.tba && (
                  <div className="p-4 bg-muted rounded-lg">
                    <Badge variant="outline">TBA</Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      Event will show "TBA" for date and time
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Where
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Venue Type</Label>
                  <Select 
                    value={formData.venue_type} 
                    onValueChange={(value: 'ONLINE' | 'IN_PERSON' | 'HYBRID') => 
                      setFormData(prev => ({ ...prev, venue_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONLINE">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          Online
                        </div>
                      </SelectItem>
                      <SelectItem value="IN_PERSON">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          In Person
                        </div>
                      </SelectItem>
                      <SelectItem value="HYBRID">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Hybrid
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.venue_type !== 'ONLINE' && (
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g., Main Auditorium, Building A"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>
                )}

                {formData.venue_type !== 'IN_PERSON' && (
                  <div className="space-y-2">
                    <Label htmlFor="meeting_link">Meeting Link</Label>
                    <Input
                      id="meeting_link"
                      placeholder="https://meet.google.com/..."
                      value={formData.meeting_link}
                      onChange={(e) => setFormData(prev => ({ ...prev, meeting_link: e.target.value }))}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cover Image & Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Cover & Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Cover Image</Label>
                  {coverPreview ? (
                    <div className="relative">
                      <img 
                        src={coverPreview} 
                        alt="Cover preview" 
                        className="w-full aspect-video object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={removeCoverImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Upload a 16:9 cover image
                      </p>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="cover-upload"
                      />
                      <Label 
                        htmlFor="cover-upload" 
                        className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
                      >
                        Choose Image
                      </Label>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    placeholder="Leave empty for unlimited"
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="allow_rsvp"
                      checked={formData.allow_rsvp}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_rsvp: checked }))}
                    />
                    <Label htmlFor="allow_rsvp">Allow RSVP/Attendance</Label>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_featured"
                        checked={formData.is_featured}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
                      />
                      <Label htmlFor="is_featured">Feature on Landing Page</Label>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/events')}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />}
              <Save className="h-4 w-4" />
              Create Event
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}