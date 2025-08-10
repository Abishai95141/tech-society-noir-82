import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function PendingApproval() {
  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <main className="max-w-[1200px] mx-auto px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Awaiting Admin Approval</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Your registration was received and is pending review by an administrator. You’ll be notified once approved.
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={signOut}>Sign out</Button>
            <Button asChild variant="secondary">
              <a href="/login">Back to Sign in</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
