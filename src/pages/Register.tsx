import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().min(2),
  degree: z.string().min(2),
  specialization: z.string().min(2),
  linkedin_url: z.string().url().optional().or(z.literal('')),
  github_url: z.string().url().optional().or(z.literal('')),
  phone: z.string().min(6),
  email: z.string().email(),
  password: z.string().min(6),
  community_slug: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

export default function Register() {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm<FormData>({ resolver: zodResolver(schema) });
  const { toast } = useToast();
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<{ slug: string; name: string }[]>([]);

  useEffect(() => {
    supabase.from('communities').select('slug,name').order('name').then(({ data }) => setCommunities(data ?? []));
  }, []);

  const onSubmit = async (values: FormData) => {
    const redirectUrl = `${window.location.origin}/`;
    const { data: signUp, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: values.name,
          degree: values.degree,
          specialization: values.specialization,
          phone: values.phone,
          linkedin_url: values.linkedin_url || '',
          github_url: values.github_url || '',
          community_slug: values.community_slug,
        },
      },
    });

    if (error || !signUp.user) {
      toast({ title: "Registration failed", description: error?.message ?? 'Unknown error' });
      return;
    }

    toast({
      title: "Registration submitted",
      description: "Please verify your email if prompted. Your profile will be created and sent for admin approval.",
    });
    navigate('/login');
  };

  return (
    <main className="max-w-[1200px] mx-auto px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Join TechSociety</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="degree">Degree</Label>
                <Input id="degree" {...register('degree')} />
                {errors.degree && <p className="text-sm text-destructive mt-1">{errors.degree.message}</p>}
              </div>
              <div>
                <Label htmlFor="specialization">Specialization</Label>
                <Input id="specialization" {...register('specialization')} />
                {errors.specialization && <p className="text-sm text-destructive mt-1">{errors.specialization.message}</p>}
              </div>
              <div>
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                <Input id="linkedin_url" placeholder="https://linkedin.com/in/you" {...register('linkedin_url')} />
                {errors.linkedin_url && <p className="text-sm text-destructive mt-1">{errors.linkedin_url.message}</p>}
              </div>
              <div>
                <Label htmlFor="github_url">GitHub URL</Label>
                <Input id="github_url" placeholder="https://github.com/you" {...register('github_url')} />
                {errors.github_url && <p className="text-sm text-destructive mt-1">{errors.github_url.message}</p>}
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register('phone')} />
                {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...register('password')} />
                {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
              </div>
              <div className="col-span-1 md:col-span-2">
                <Label>Community</Label>
                <Select onValueChange={(v) => setValue('community_slug', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a community" />
                  </SelectTrigger>
                  <SelectContent>
                    {communities.map(c => (
                      <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.community_slug && <p className="text-sm text-destructive mt-1">{errors.community_slug.message}</p>}
              </div>
              <div className="col-span-1 md:col-span-2 mt-2">
                <Button type="submit" disabled={isSubmitting} className="w-full">Create account</Button>
                <p className="text-sm text-muted-foreground mt-3">Already a member? <a className="story-link" href="/login">Sign in</a></p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
