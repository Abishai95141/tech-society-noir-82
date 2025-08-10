import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { acceptBuddyRequest, removeBuddy, rejectBuddyRequest } from "@/lib/buddies";
import { supabase } from "@/integrations/supabase/client";

interface BuddyListItem { id: string; requester_id: string; recipient_id: string; status: string; profile: { id: string; name: string | null; specialization: string | null; community_slug: string | null; }; }

export default function BuddiesDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void; }) {
  const [me, setMe] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [accepted, setAccepted] = useState<BuddyListItem[]>([]);
  const [incoming, setIncoming] = useState<BuddyListItem[]>([]);
  const [outgoing, setOutgoing] = useState<BuddyListItem[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const load = async () => {
    if (!me) return;
    const common = `id,name,specialization,community_slug`;
    const { data: A } = await supabase
      .from('tech_buddies')
      .select(`id, requester_id, recipient_id, status, other:recipient_id(${common}), self:requester_id(${common})`)
      .eq('status','ACCEPTED')
      .or(`requester_id.eq.${me},recipient_id.eq.${me})` as any);

    const { data: I } = await supabase
      .from('tech_buddies')
      .select(`id, requester_id, recipient_id, status, other:requester_id(${common})`)
      .eq('status','PENDING')
      .eq('recipient_id', me);

    const { data: O } = await supabase
      .from('tech_buddies')
      .select(`id, requester_id, recipient_id, status, other:recipient_id(${common})`)
      .eq('status','PENDING')
      .eq('requester_id', me);

    const mapAccepted = (A||[]).map((r: any) => ({
      id: r.id,
      requester_id: r.requester_id,
      recipient_id: r.recipient_id,
      status: r.status,
      profile: (r.requester_id === me ? r.other : r.self)
    }));

    setAccepted(mapAccepted);
    setIncoming((I||[]).map((r: any) => ({ id: r.id, requester_id: r.requester_id, recipient_id: r.recipient_id, status: r.status, profile: r.other })));
    setOutgoing((O||[]).map((r: any) => ({ id: r.id, requester_id: r.requester_id, recipient_id: r.recipient_id, status: r.status, profile: r.other })));
  };

  useEffect(() => { if (open) load(); }, [open, me]);

  const filtered = (list: BuddyListItem[]) => list.filter(i => {
    const q = search.toLowerCase();
    return (
      (i.profile.name || '').toLowerCase().includes(q) ||
      (i.profile.specialization || '').toLowerCase().includes(q) ||
      (i.profile.community_slug || '').toLowerCase().includes(q)
    );
  });

  const Section = ({ title, items, actions }: { title: string; items: BuddyListItem[]; actions: (i: BuddyListItem) => JSX.Element }) => (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((i) => (
          <Card key={i.id} className="rounded-2xl">
            <CardContent className="py-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{i.profile.name || 'Member'}</div>
                <div className="text-xs text-muted-foreground">{i.profile.specialization || '—'}</div>
                {i.profile.community_slug && <Badge variant="secondary" className="mt-1">{i.profile.community_slug}</Badge>}
              </div>
              <div className="flex items-center gap-2">{actions(i)}</div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-muted-foreground">No items.</div>
        )}
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 w-full sm:max-w-sm">
        <SheetHeader className="pb-2">
          <SheetTitle>Tech Buddies</SheetTitle>
          <div className="px-6 pb-4">
            <Input placeholder="Search buddies" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </SheetHeader>
        <div className="px-6 pb-8 space-y-8">
          <Section title={`Accepted (${accepted.length})`} items={filtered(accepted)} actions={(i) => (
            <>
              <Button variant="secondary" asChild>
                <a href={`/profile/${i.profile.id}`}>Open Profile</a>
              </Button>
              <Button variant="destructive" onClick={async () => { const { error } = await removeBuddy(i.profile.id); if (error) toast({ title: 'Failed', description: error.message }); else { toast({ title: 'Removed' }); load(); } }}>Remove</Button>
            </>
          )} />

          <Section title={`Incoming Requests (${incoming.length})`} items={filtered(incoming)} actions={(i) => (
            <>
              <Button onClick={async () => { const { error } = await acceptBuddyRequest(i.id); if (error) toast({ title: 'Failed', description: error.message }); else { toast({ title: 'Accepted' }); load(); } }}>Accept</Button>
              <Button variant="secondary" onClick={async () => { const { error } = await rejectBuddyRequest(i.id); if (error) toast({ title: 'Failed', description: error.message }); else { toast({ title: 'Rejected' }); load(); } }}>Reject</Button>
            </>
          )} />

          <Section title={`Outgoing Requests (${outgoing.length})`} items={filtered(outgoing)} actions={(i) => (
            <>
              <Button variant="secondary" asChild>
                <a href={`/profile/${i.profile.id}`}>Open Profile</a>
              </Button>
              <Button variant="destructive" onClick={async () => { const { error } = await supabase.from('tech_buddies').delete().eq('id', i.id); if (error) toast({ title: 'Failed', description: error.message }); else { toast({ title: 'Canceled' }); load(); } }}>Cancel</Button>
            </>
          )} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
