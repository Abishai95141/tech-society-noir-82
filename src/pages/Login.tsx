import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const { toast } = useToast();
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = useState(false);

  const onSubmit = async (values: FormData) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      toast({ title: "Sign in failed", description: error.message });
      return;
    }

    const user = data.user;
    if (!user) return;

    // Fetch profile
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

    if (profile?.status !== 'APPROVED') {
      toast({ title: "Pending approval", description: "Your account is awaiting admin approval." });
      await supabase.auth.signOut();
      return;
    }

    if (profile?.must_change_password) {
      setRedirecting(true);
      navigate('/account/change-password');
      return;
    }

    navigate('/dashboard');
  };

  return (
    <main className="max-w-[1200px] mx-auto px-6 py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <Button type="submit" disabled={isSubmitting || redirecting} className="w-full">Sign in</Button>
            </form>
            <p className="text-sm text-muted-foreground mt-4">No account? <a className="story-link" href="/register">Register</a></p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
