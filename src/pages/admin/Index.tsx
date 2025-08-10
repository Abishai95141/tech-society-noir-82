import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
export default function AdminIndex() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<{ pending: number; projects: number; events: number }>({ pending: 0, projects: 0, events: 0 });
  const [projects, setProjects] = useState<Array<{ id: string; title: string; status: string; community_slug: string | null; created_at: string; owner_id: string }>>([]);
  const [ownerProfiles, setOwnerProfiles] = useState<Record<string, { id: string; name: string | null; phone: string | null; linkedin_url: string | null; github_url: string | null; degree: string | null; specialization: string | null; community_slug: string | null; user_id: string }>>({});
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<{ id: string; name: string | null; phone: string | null; linkedin_url: string | null; github_url: string | null; degree: string | null; specialization: string | null; community_slug: string | null; user_id: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      const { data: roles } = await supabase.from('role_assignments').select('role').eq('user_id', uid).eq('role','admin');
      const admin = !!roles && roles.length > 0;
      setIsAdmin(admin);
      if (admin) {
        const [{ count: pending }, { count: projectsCount }, { count: events }] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status','PENDING'),
          supabase.from('projects').select('*', { count: 'exact', head: true }),
          supabase.from('events').select('*', { count: 'exact', head: true }),
        ]);
        setStats({ pending: pending ?? 0, projects: projectsCount ?? 0, events: events ?? 0 });

        const { data: projectsData } = await supabase
          .from('projects')
          .select('id,title,status,community_slug,created_at,owner_id')
          .order('created_at', { ascending: false });

        setProjects(projectsData ?? []);

        const ownerIds = Array.from(new Set((projectsData ?? []).map(p => p.owner_id).filter(Boolean)));
        if (ownerIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id,name,phone,linkedin_url,github_url,degree,specialization,community_slug,user_id')
            .in('id', ownerIds);

          const map: Record<string, any> = {};
          (profilesData ?? []).forEach(p => { map[p.id] = p; });
          setOwnerProfiles(map);
        } else {
          setOwnerProfiles({});
        }
      }
    });
  }, []);

  if (!isAdmin) {
    return (
      <main className="max-w-[1200px] mx-auto px-6 py-16">
        <Card>
          <CardHeader><CardTitle>Forbidden</CardTitle></CardHeader>
          <CardContent>You must be an Admin to view this page.</CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="max-w-[1200px] mx-auto px-6 py-16">
      <h1 className="text-2xl font-semibold mb-6">Admin</h1>
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card><CardHeader><CardTitle>Pending approvals</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{stats.pending}</CardContent></Card>
        <Card><CardHeader><CardTitle>Projects</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{stats.projects}</CardContent></Card>
        <Card><CardHeader><CardTitle>Events</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{stats.events}</CardContent></Card>
      </div>
      <div className="flex flex-wrap gap-3 mb-8">
        <Button onClick={() => navigate('/admin/approvals')}>Manage Approvals</Button>
        <Button variant="secondary" onClick={() => navigate('/admin/roles')}>Manage Roles</Button>
        <Button variant="outline" onClick={() => navigate('/admin/projects')}>Manage Projects</Button>
        <Button variant="outline" onClick={() => navigate('/admin/events')}>Manage Events</Button>
      </div>

      <section aria-labelledby="all-projects-heading" className="space-y-4">
        <h2 id="all-projects-heading" className="text-xl font-semibold">All Projects</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Community</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => {
                  const owner = ownerProfiles[p.owner_id];
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell>{p.status}</TableCell>
                      <TableCell>
                        {owner ? (
                          <Button variant="link" onClick={() => { setSelectedProfile(owner); setProfileOpen(true); }}>
                            {owner.name || 'View Owner'}
                          </Button>
                        ) : (
                          <span>Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>{p.community_slug ?? '-'}</TableCell>
                      <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  );
                })}
                {projects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">No projects found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedProfile?.name || 'Member Profile'}</DialogTitle>
            <DialogDescription>Project owner details</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div><span className="font-medium">Community:</span> {selectedProfile?.community_slug ?? '-'}</div>
            <div><span className="font-medium">Degree:</span> {selectedProfile?.degree ?? '-'}</div>
            <div><span className="font-medium">Specialization:</span> {selectedProfile?.specialization ?? '-'}</div>
            <div><span className="font-medium">Phone:</span> {selectedProfile?.phone ?? '-'}</div>
            <div><span className="font-medium">Email:</span> Not available</div>
            <div className="flex gap-4">
              {selectedProfile?.linkedin_url ? (
                <a href={selectedProfile.linkedin_url} target="_blank" rel="noreferrer" className="underline">LinkedIn</a>
              ) : <span className="text-muted-foreground">LinkedIn: -</span>}
              {selectedProfile?.github_url ? (
                <a href={selectedProfile.github_url} target="_blank" rel="noreferrer" className="underline">GitHub</a>
              ) : <span className="text-muted-foreground">GitHub: -</span>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );

}
