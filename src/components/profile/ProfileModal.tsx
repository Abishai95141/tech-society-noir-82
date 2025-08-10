import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Github, Linkedin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { acceptBuddyRequest, cancelOutgoingRequest, getRelationWith, removeBuddy, sendBuddyRequest } from "@/lib/buddies";
import { supabase } from "@/integrations/supabase/client";

export interface ProfileSummary {
  id: string;
  name: string | null;
  degree: string | null;
  specialization: string | null;
  community_slug: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
}

export function ProfileModal({ open, onOpenChange, profile }: { open: boolean; onOpenChange: (o: boolean) => void; profile: ProfileSummary }) {
  const [relation, setRelation] = useState<any | null>(null);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!open || !me) return;
    getRelationWith(me, profile.id).then(setRelation);
  }, [open, me, profile.id]);

  const isSelf = me === profile.id;

  const action = useMemo(() => {
    if (isSelf) return { label: "This is you", action: null as any };
    if (!relation) return { label: "Request Tech Buddy", action: async () => {
      const { error } = await sendBuddyRequest(profile.id);
      if (error) return toast({ title: "Request failed", description: error.message });
      toast({ title: "Request sent" });
      setRelation(await getRelationWith(me!, profile.id));
    }};
    if (relation.status === 'PENDING') {
      if (relation.requester_id === me) return { label: "Cancel Request", action: async () => {
        const { error } = await cancelOutgoingRequest(profile.id);
        if (error) return toast({ title: "Cancel failed", description: error.message });
        toast({ title: "Request canceled" });
        setRelation(await getRelationWith(me!, profile.id));
      }};
      if (relation.recipient_id === me) return { label: "Accept / Reject", action: async () => {
        const { error } = await acceptBuddyRequest(relation.id);
        if (error) return toast({ title: "Accept failed", description: error.message });
        toast({ title: "You are now buddies" });
        setRelation(await getRelationWith(me!, profile.id));
      }};
    }
    if (relation.status === 'ACCEPTED') return { label: "Remove Buddy", action: async () => {
      const { error } = await removeBuddy(profile.id);
      if (error) return toast({ title: "Remove failed", description: error.message });
      toast({ title: "Buddy removed" });
      setRelation(await getRelationWith(me!, profile.id));
    }};
    if (relation.status === 'REJECTED') return { label: "Request Tech Buddy", action: async () => {
      const { error } = await sendBuddyRequest(profile.id);
      if (error) return toast({ title: "Request failed", description: error.message });
      toast({ title: "Request sent" });
      setRelation(await getRelationWith(me!, profile.id));
    }};
    return { label: "Request Tech Buddy", action: async () => {
      const { error } = await sendBuddyRequest(profile.id);
      if (error) return toast({ title: "Request failed", description: error.message });
      toast({ title: "Request sent" });
      setRelation(await getRelationWith(me!, profile.id));
    }};
  }, [relation, me, profile.id, isSelf]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{profile.name ?? 'Member'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {profile.community_slug && <Badge variant="secondary">{profile.community_slug}</Badge>}
            <span>{[profile.degree, profile.specialization].filter(Boolean).join(' · ')}</span>
          </div>
          <div className="flex items-center gap-3">
            {profile.linkedin_url && (
              <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="hover:underline inline-flex items-center gap-1 text-sm">
                <Linkedin className="h-4 w-4"/> LinkedIn
              </a>
            )}
            {profile.github_url && (
              <a href={profile.github_url} target="_blank" rel="noreferrer" className="hover:underline inline-flex items-center gap-1 text-sm">
                <Github className="h-4 w-4"/> GitHub
              </a>
            )}
          </div>
          {!isSelf && (
            <Button onClick={() => action.action?.()} disabled={!action.action}>{action.label}</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
