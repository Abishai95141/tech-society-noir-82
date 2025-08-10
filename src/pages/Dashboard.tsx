import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!email) {
    return (
      <main className="max-w-[1200px] mx-auto px-6 py-16">
        <Card>
          <CardHeader><CardTitle>Please sign in</CardTitle></CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')}>Go to Login</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="max-w-[1200px] mx-auto px-6 py-16">
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="text-muted-foreground mt-2">Signed in as {email}</p>
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle>Start a Project</CardTitle></CardHeader><CardContent>Coming soon</CardContent></Card>
        <Card><CardHeader><CardTitle>Find Teammates</CardTitle></CardHeader><CardContent>Coming soon</CardContent></Card>
        <Card><CardHeader><CardTitle>View Community Work</CardTitle></CardHeader><CardContent>Coming soon</CardContent></Card>
      </div>
    </main>
  );
}
