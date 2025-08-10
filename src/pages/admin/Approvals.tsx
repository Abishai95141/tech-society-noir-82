import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Row {
  id: string;
  name: string | null;
  email: string | null;
  degree: string | null;
  specialization: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  community_slug: string | null;
  created_at: string;
}

export default function AdminApprovals() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      const { data: roles } = await supabase.from('role_assignments').select('role').eq('user_id', uid).eq('role','admin');
      const admin = !!roles && roles.length > 0;
      setIsAdmin(admin);
      if (admin) refresh();
    });
  }, []);

  const refresh = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id,name,degree,specialization,linkedin_url,github_url,community_slug,created_at')
      .eq('status','PENDING');
    const pending = (data as any[]) ?? [];
    setRows(pending as any);
  };

  const setStatus = async (id: string, status: 'APPROVED'|'REJECTED') => {
    const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
    if (error) return toast({ title: 'Action failed', description: error.message });
    toast({ title: status === 'APPROVED' ? 'User approved' : 'User rejected' });
    refresh();
  };

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
      <h1 className="text-2xl font-semibold mb-6">Approvals</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Community</TableHead>
                <TableHead>Degree / Specialization</TableHead>
                <TableHead>Links</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.name ?? '—'}</TableCell>
                  <TableCell>{r.community_slug ?? '—'}</TableCell>
                  <TableCell>{r.degree ?? '—'}{r.specialization ? ` / ${r.specialization}` : ''}</TableCell>
                  <TableCell>
                    <div className="flex gap-3 text-sm">
                      {r.linkedin_url && <a className="story-link" href={r.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a>}
                      {r.github_url && <a className="story-link" href={r.github_url} target="_blank" rel="noreferrer">GitHub</a>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => setStatus(r.id, 'APPROVED')}>Approve</Button>
                      <Button size="sm" variant="secondary" onClick={() => setStatus(r.id, 'REJECTED')}>Reject</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">No pending users.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
