import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export default function AdminRoles() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string | null }[]>([]);
  const [communities, setCommunities] = useState<{ slug: string; name: string }[]>([]);
  const [form, setForm] = useState<{ user_id: string | null; role: string | null; community_slug: string | null }>({ user_id: null, role: null, community_slug: null });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      const { data: roles } = await supabase.from('role_assignments').select('role').eq('user_id', uid).eq('role','admin');
      const admin = !!roles && roles.length > 0;
      setIsAdmin(admin);
      if (admin) {
        const [{ data: profs }, { data: comms }] = await Promise.all([
          supabase.from('profiles').select('id,name').eq('status','APPROVED').limit(100),
          supabase.from('communities').select('slug,name'),
        ]);
        setUsers(profs ?? []);
        setCommunities(comms ?? []);
      }
    });
  }, []);

  const assign = async () => {
    if (!form.user_id || !form.role) return;
    const { error } = await supabase
      .from('role_assignments')
      .insert({ user_id: form.user_id, role: form.role as any, community_slug: form.community_slug });
    if (error) {
      toast({ title: "Assignment failed", description: error.message });
    } else {
      toast({ title: "Role assigned" });
    }
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
      <h1 className="text-2xl font-semibold mb-6">Roles</h1>
      <Card>
        <CardContent className="grid md:grid-cols-3 gap-4 p-6">
          <div>
            <Label>User</Label>
            <Select onValueChange={(v) => setForm(f => ({ ...f, user_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
              <SelectContent>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name ?? u.id.slice(0,8)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Role</Label>
            <Select onValueChange={(v) => setForm(f => ({ ...f, role: v }))}>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                {['admin','coordinator','assistant_coordinator','secretary','joint_secretary','member'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Community (optional)</Label>
            <Select onValueChange={(v) => setForm(f => ({ ...f, community_slug: v === "__none__" ? null : v }))}>
              <SelectTrigger><SelectValue placeholder="Select community" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None (global)</SelectItem>
                {communities.map(c => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Button onClick={assign}>Assign role</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
