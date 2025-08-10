import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Github, Folder, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useApproval } from "@/hooks/use-approval";

const statusLabel: Record<string, string> = {
  IDEATION: "Ideation",
  INCUBATION: "Incubation",
  DEVELOPING: "Developing",
  PRODUCTION: "Production",
  STARTUP: "Startup",
  RESEARCH: "Research",
};

type Project = {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  community_slug: string | null;
  owner_id: string;
  tech_stack: string[] | null;
  looking_for: string | null;
  created_at: string;
  updated_at: string;
  github_url: string | null;
  drive_url: string | null;
  owner: { name: string | null } | null;
};

type Member = { user_id: string; role: string; profile?: { name: string | null } };

type JoinRequest = { id: string; requester_id: string; message: string; status: string; created_at: string; requester?: { name: string | null } };

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { approved, userId } = useApproval();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [updating, setUpdating] = useState(false);
  const isOwner = useMemo(() => !!project && userId === project.owner_id, [project, userId]);
  const isLooking = !!project?.looking_for;

  useEffect(() => {
    document.title = `${project?.title ?? 'Project'} – TechSociety`;
    const m = document.querySelector('meta[name="description"]');
    if (m && project?.summary) m.setAttribute('content', project.summary);
  }, [project?.title, project?.summary]);

  const load = async () => {
    setLoading(true);
    const { data: p, error } = await supabase
      .from('projects')
      .select('id,title,summary,status,community_slug,owner_id,tech_stack,looking_for,created_at,updated_at,github_url,drive_url')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      toast({ title: 'Failed to load project', description: error.message });
      setLoading(false);
      return;
    }
    setProject(p as any);

    // load members with a join to profiles
    const { data: mem } = await supabase
      .from('project_members')
      .select('user_id,role')
      .eq('project_id', id!);

    const memberList = mem ?? [];
    if (memberList.length) {
      const ids = memberList.map((m) => m.user_id);
      const { data: profs } = await supabase.from('profiles').select('id,name').in('id', ids);
      const joined: Member[] = memberList.map((m) => ({
        ...m,
        profile: profs?.find((p) => p.id === m.user_id) ?? { name: null },
      }));
      setMembers(joined);
    } else {
      setMembers([]);
    }

    // Load join requests if owner
    if (isOwner) {
      const { data: reqs } = await supabase
        .from('join_requests')
        .select('id,requester_id,message,status,created_at')
        .eq('project_id', id!)
        .order('created_at', { ascending: false });
      if (reqs?.length) {
        const ids = reqs.map((r) => r.requester_id);
        const { data: profs } = await supabase.from('profiles').select('id,name').in('id', ids);
        setRequests(reqs.map((r) => ({ ...r, requester: profs?.find((p) => p.id === r.requester_id) })) as any);
      } else {
        setRequests([]);
      }
    } else {
      setRequests([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isOwner]);

  const requestJoin = async () => {
    if (!approved) {
      toast({ title: 'Pending approval', description: 'Your account must be approved to send requests.' });
      return;
    }
    if (!message.trim()) {
      toast({ title: 'Please include a short message' });
      return;
    }
    const { error } = await supabase.from('join_requests').insert({ project_id: id, requester_id: userId, message });
    if (error) {
      toast({ title: 'Failed to send request', description: error.message });
      return;
    }
    toast({ title: 'Request sent' });
    setMessage("");
  };

  const updateStatus = async (newStatus: string) => {
    if (!isOwner) return;
    setUpdating(true);
    const { error } = await supabase.from('projects').update({ status: newStatus as any }).eq('id', id!);
    setUpdating(false);
    if (error) return toast({ title: 'Failed to update status', description: error.message });
    toast({ title: 'Status updated' });
    load();
  };

  const toggleLookingOff = async () => {
    if (!isOwner) return;
    setUpdating(true);
    const { error } = await supabase.from('projects').update({ looking_for: null }).eq('id', id!);
    setUpdating(false);
    if (error) return toast({ title: 'Failed to update', description: error.message });
    toast({ title: 'Updated' });
    load();
  };

  const enableLooking = async () => {
    if (!isOwner) return;
    if (!message.trim()) {
      toast({ title: 'Please add expected qualifications' });
      return;
    }
    setUpdating(true);
    const { error } = await supabase.from('projects').update({ looking_for: message.trim() }).eq('id', id!);
    setUpdating(false);
    if (error) return toast({ title: 'Failed to update', description: error.message });
    toast({ title: 'Updated' });
    setMessage("");
    load();
  };

  const acceptReq = async (reqId: string) => {
    const { error } = await supabase.from('join_requests').update({ status: 'APPROVED' }).eq('id', reqId);
    if (error) return toast({ title: 'Error', description: error.message });
    // add to members
    const req = requests.find(r => r.id === reqId);
    if (req) await supabase.from('project_members').insert({ project_id: id, user_id: req.requester_id, role: 'member' });
    toast({ title: 'Accepted' });
    load();
  };

  const rejectReq = async (reqId: string) => {
    const { error } = await supabase.from('join_requests').update({ status: 'REJECTED' }).eq('id', reqId);
    if (error) return toast({ title: 'Error', description: error.message });
    toast({ title: 'Rejected' });
    load();
  };

  if (loading || !project) {
    return (
      <main className="max-w-[1000px] mx-auto px-6 py-10">
        <div className="rounded-2xl border p-8 bg-card">
          Loading…
        </div>
      </main>
    );
  }

  const initials = (project.owner?.name ?? '?').slice(0,2).toUpperCase();

  return (
    <main className="max-w-[1100px] mx-auto px-6 py-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">{project.title}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full">{statusLabel[project.status] ?? project.status}</Badge>
            {project.community_slug && <Badge variant="secondary" className="rounded-full">{project.community_slug}</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {project.github_url && <a className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted" href={project.github_url} target="_blank" rel="noreferrer" aria-label="Open GitHub"><Github className="h-4 w-4"/></a>}
          {project.drive_url && <a className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted" href={project.drive_url} target="_blank" rel="noreferrer" aria-label="Open Drive"><Folder className="h-4 w-4"/></a>}
          <Button asChild variant="outline"><Link to="/projects">Back</Link></Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 flex flex-col gap-5">
          <section className="rounded-2xl border p-5 bg-card">
            <div className="flex items-center gap-2 mb-3">
              <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{initials}</AvatarFallback></Avatar>
              <span className="text-sm text-muted-foreground">Lead • {project.owner?.name ?? 'Unknown'}</span>
            </div>
            {project.summary && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.summary}</p>}
            <div className="text-xs text-muted-foreground mt-3">Created {new Date(project.created_at).toLocaleString()} • Updated {new Date(project.updated_at).toLocaleString()}</div>
          </section>

          {project.tech_stack && project.tech_stack.length > 0 && (
            <section className="rounded-2xl border p-5 bg-card">
              <h2 className="font-medium mb-3">Tech stack</h2>
              <div className="flex flex-wrap gap-2">
                {project.tech_stack.map((t) => (
                  <span key={t} className="text-xs rounded-full border px-2 py-1 bg-background">{t}</span>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border p-5 bg-card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Team & Requests</h2>
              {isOwner && (
                <div className="flex items-center gap-2">
                  <Select defaultValue={project.status} onValueChange={(v) => updateStatus(v as any)}>
                    <SelectTrigger className="h-8"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      {Object.keys(statusLabel).map(s => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No members yet.</p>
              ) : (
                members.map((m) => (
                  <div key={m.user_id} className="flex items-center justify-between rounded-xl border p-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{(m.profile?.name ?? '?').slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                      <div className="text-sm">{m.profile?.name ?? 'Unknown'}</div>
                    </div>
                    <Badge variant="outline" className="rounded-full">{m.role}</Badge>
                  </div>
                ))
              )}
            </div>

            {isLooking && !isOwner && approved && (
              <div className="mt-4 rounded-xl border p-4">
                <Label className="mb-2 block">Request to join</Label>
                <Textarea rows={3} placeholder="Tell the lead why you'd be a great fit" value={message} onChange={(e) => setMessage(e.target.value)} />
                <div className="mt-2 flex justify-end">
                  <Button onClick={requestJoin}><Send className="h-4 w-4 mr-2"/>Send request</Button>
                </div>
              </div>
            )}

            {isOwner && requests.length > 0 && (
              <div className="mt-5">
                <h3 className="font-medium mb-2">Join Requests</h3>
                <div className="space-y-3">
                  {requests.map((r) => (
                    <div key={r.id} className="rounded-xl border p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="font-medium">{r.requester?.name ?? 'Unknown'}</span>
                          <span className="text-muted-foreground"> • {new Date(r.created_at).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="secondary" onClick={() => acceptReq(r.id)}>Accept</Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">Reject</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reject this request?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. The requester will not be added to the team.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => rejectReq(r.id)}>Reject</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{r.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border p-5 bg-card">
            <h2 className="font-medium mb-2">Notes / Updates</h2>
            <p className="text-sm text-muted-foreground">Coming soon.</p>
          </section>
        </div>

        <aside className="lg:col-span-1 flex flex-col gap-5">
          {isOwner ? (
            <section className="rounded-2xl border p-5 bg-card">
              <h2 className="font-medium mb-3">Looking for teammates</h2>
              {isLooking ? (
                <AlertDialog>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">{project.looking_for}</div>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">Turn off</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Stop looking for teammates?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will hide the request-to-join option for others.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={toggleLookingOff}>Turn off</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <div>
                  <Label className="mb-2 block">Expected qualifications</Label>
                  <Textarea rows={3} placeholder="What skills or experience are you looking for?" value={message} onChange={(e) => setMessage(e.target.value)} />
                  <div className="mt-2 flex justify-end">
                    <Button onClick={enableLooking}>Enable</Button>
                  </div>
                </div>
              )}
            </section>
          ) : (
            isLooking && (
              <section className="rounded-2xl border p-5 bg-card">
                <h2 className="font-medium mb-2">Looking for teammates</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.looking_for}</p>
              </section>
            )
          )}

          <section className="rounded-2xl border p-5 bg-card">
            <h2 className="font-medium">Activity</h2>
            <p className="text-sm text-muted-foreground mt-2">Last updated {new Date(project.updated_at).toLocaleString()}</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
