import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({ password: z.string().min(6) });

type FormData = z.infer<typeof schema>;

export default function ChangePassword() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (values: FormData) => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      toast({ title: 'Update failed', description: error.message });
      setLoading(false);
      return;
    }
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (uid) {
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', uid);
    }
    toast({ title: 'Password updated' });
    navigate('/dashboard');
  };

  return (
    <main className="max-w-[1200px] mx-auto px-6 py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="password">New password</Label>
                <Input id="password" type="password" {...register('password')} />
                {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
              </div>
              <Button type="submit" disabled={isSubmitting || loading} className="w-full">Update</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
