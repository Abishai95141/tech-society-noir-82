-- First, check if the events table already exists and update it if needed
-- Add any missing columns and update the schema

-- Create RSVP/attendance table
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'GOING' CHECK (status IN ('GOING', 'MAYBE', 'NOT_GOING')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- Create policies for event_rsvps
CREATE POLICY "Approved users can RSVP" 
ON public.event_rsvps 
FOR INSERT 
WITH CHECK (is_approved(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can view RSVPs for events" 
ON public.event_rsvps 
FOR SELECT 
USING (is_approved(auth.uid()));

CREATE POLICY "Users can update their own RSVP" 
ON public.event_rsvps 
FOR UPDATE 
USING (is_approved(auth.uid()) AND user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own RSVP" 
ON public.event_rsvps 
FOR DELETE 
USING (is_approved(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Event owners and admins can manage RSVPs" 
ON public.event_rsvps 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_rsvps.event_id AND e.created_by = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_rsvps.event_id AND e.created_by = auth.uid()
  )
);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_event_rsvps_updated_at
BEFORE UPDATE ON public.event_rsvps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key constraints
ALTER TABLE public.event_rsvps 
ADD CONSTRAINT fk_event_rsvps_event 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Update storage policies for event covers
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-covers', 'event-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for event cover uploads
CREATE POLICY "Event covers are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'event-covers');

CREATE POLICY "Approved users can upload event covers" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'event-covers' AND is_approved(auth.uid()));

CREATE POLICY "Users can update their own event covers" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'event-covers' AND 
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.events e 
      WHERE e.cover_image = name AND e.created_by = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete their own event covers" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'event-covers' AND 
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.events e 
      WHERE e.cover_image = name AND e.created_by = auth.uid()
    )
  )
);