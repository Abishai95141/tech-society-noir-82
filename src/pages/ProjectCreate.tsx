
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useApproval } from "@/hooks/use-approval";
import { toast } from "@/hooks/use-toast";

const VALID_STATUSES = ["INCUBATION","PRODUCTION","STARTUP","RESEARCH"] as const;

const schema = z.object({
  title: z.string().min(3, "Title is required"),
  summary: z.string().min(20, "Please provide a short abstract"),
  status: z.enum(VALID_STATUSES),
  community_slug: z.string().min(1, "Select a community"),
  tech_stack: z.string().optional(), // comma or enter separated (we'll split)
  looking: z.boolean().default(false),
  qualifications: z.string().optional(),
  github_url: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  drive_url: z.string().url().optional().or(z.literal("").transform(() => undefined)),
});

type FormValues = z.infer<typeof schema>;

type Community = { slug: string; name: string };

export default function ProjectCreate() {
  const navigate = useNavigate();
  const { approved, hasSession } = useApproval();
  const [communities, setCommunities] = useState<Community[]>([]);

  useEffect(() => {
    document.title = "Start New Project – TechSociety";
    const m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute('content', 'Create a new project on TechSociety.');
  }, []);

  useEffect(() => {
    supabase.from('communities').select('slug,name').then(({ data }) => setCommunities(data ?? []));
  }, []);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: "INCUBATION", looking: false },
  });

  const looking = watch('looking');

  const onSubmit = async (data: FormValues) => {
    const session = await supabase.auth.getSession();
    const uid = session.data.session?.user?.id;
    if (!uid) {
      toast({ title: 'Please sign in' });
      return;
    }
    if (!approved) {
      toast({ title: 'Pending approval', description: 'Your account must be approved to create projects.' });
      return;
    }

    const tech = (data.tech_stack ?? '')
      .split(/[\n,]/)
      .map(s => s.trim())
      .filter(Boolean);

    const { data: inserted, error } = await supabase
      .from('projects')
      .insert({
        title: data.title,
        summary: data.summary,
        status: data.status,
        community_slug: data.community_slug,
        tech_stack: tech,
        github_url: data.github_url,
        drive_url: data.drive_url,
        owner_id: uid,
        looking_for: data.looking ? (data.qualifications || 'Open to collaborators') : null,
      })
      .select('id')
      .single();

    if (error) {
      toast({ title: 'Failed to create', description: error.message });
      return;
    }

    // Add owner as a member/lead
    await supabase.from('project_members').insert({ project_id: inserted.id, user_id: uid, role: 'owner' });

    toast({ title: 'Project created' });
    navigate(`/projects/${inserted.id}`);
  };

  if (!hasSession) {
    return (
      <main className="max-w-[1200px] mx-auto px-6 py-10">
        <div className="rounded-2xl border p-8 bg-card text-center">
          <p className="text-muted-foreground">Please sign in to create a project.</p>
          <div className="mt-4"><Button asChild><Link to="/login">Sign in</Link></Button></div>
        </div>
      </main>
    );
  }

  if (!approved) {
    return (
      <main className="max-w-[1200px] mx-auto px-6 py-10">
        <div className="rounded-2xl border p-8 bg-card text-center">
          <h1 className="text-xl font-semibold mb-2">Awaiting Approval</h1>
          <p className="text-muted-foreground">Your account is pending approval. You can browse projects while you wait.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[900px] mx-auto px-6 py-10">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Start New Project</h1>
        <Button variant="outline" asChild><Link to="/projects">Cancel</Link></Button>
      </header>

      <form className="grid grid-cols-1 md:grid-cols-2 gap-5" onSubmit={handleSubmit(onSubmit)}>
        <div className="md:col-span-2 rounded-2xl border p-5 bg-card">
          <Label>Project title</Label>
          <Input {...register('title')} placeholder="e.g., Open Source Campus Map"/>
          {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
        </div>

        <div className="md:col-span-2 rounded-2xl border p-5 bg-card">
          <Label>Abstract</Label>
          <Textarea rows={4} {...register('summary')} placeholder="2–4 lines describing the project scope and goals."/>
          {errors.summary && <p className="text-sm text-destructive mt-1">{errors.summary.message}</p>}
        </div>

        <div className="rounded-2xl border p-5 bg-card">
          <Label>Status</Label>
          <Select defaultValue="INCUBATION" onValueChange={(v) => setValue('status', v as any)}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>
              {VALID_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s.charAt(0)+s.slice(1).toLowerCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-2xl border p-5 bg-card">
          <Label>Community</Label>
          <Select onValueChange={(v) => setValue('community_slug', v)}>
            <SelectTrigger><SelectValue placeholder="Select community"/></SelectTrigger>
            <SelectContent>
              {communities.map(c => (
                <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.community_slug && <p className="text-sm text-destructive mt-1">{errors.community_slug.message}</p>}
        </div>

        <div className="md:col-span-2 rounded-2xl border p-5 bg-card">
          <Label>Tech stack (comma or Enter to add)</Label>
          <Textarea rows={2} {...register('tech_stack')} placeholder="react, supabase, tailwind, vite"/>
        </div>

        <div className="rounded-2xl border p-5 bg-card flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="looking">Looking for teammates?</Label>
            <p className="text-sm text-muted-foreground">Enable to specify expected qualifications.</p>
          </div>
          <Switch id="looking" checked={looking} onCheckedChange={(v) => setValue('looking', !!v)} />
        </div>

        {looking && (
          <div className="md:col-span-2 rounded-2xl border p-5 bg-card">
            <Label>Expected teammate qualifications</Label>
            <Textarea rows={3} {...register('qualifications')} placeholder="What skills or experience are you looking for?"/>
          </div>
        )}

        <div className="rounded-2xl border p-5 bg-card">
          <Label>GitHub link (optional)</Label>
          <Input placeholder="https://github.com/org/repo" {...register('github_url')} />
        </div>

        <div className="rounded-2xl border p-5 bg-card">
          <Label>Drive link (optional)</Label>
          <Input placeholder="https://drive.google.com/..." {...register('drive_url')} />
        </div>

        <div className="md:col-span-2 sticky bottom-4 z-10 flex items-center justify-end gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create'}</Button>
        </div>
      </form>
    </main>
  );
}
