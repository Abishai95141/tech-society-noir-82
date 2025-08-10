import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, Bell } from "lucide-react";
import BuddiesDrawer from "@/components/buddies/BuddiesDrawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      setEmail(data.session?.user?.email ?? null);
      if (uid) {
        const { data: roles } = await supabase
          .from('role_assignments')
          .select('role')
          .eq('user_id', uid)
          .eq('role', 'admin');
        setIsAdmin(!!roles && roles.length > 0);
        const { count } = await supabase
          .from('tech_buddies')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', uid)
          .eq('status', 'PENDING');
        setPendingCount(count ?? 0);
      } else {
        setIsAdmin(false);
        setPendingCount(0);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
      const uid = session?.user?.id;
      if (uid) {
        supabase
          .from('role_assignments')
          .select('role')
          .eq('user_id', uid)
          .eq('role','admin')
          .then(({ data }) => setIsAdmin(!!data && data.length > 0));
        supabase
          .from('tech_buddies')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', uid)
          .eq('status','PENDING')
          .then(({ count }) => setPendingCount(count ?? 0));
      } else {
        setIsAdmin(false);
        setPendingCount(0);
      }
    });

    load();
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `${isActive ? "text-foreground" : "text-muted-foreground"} hover:text-foreground transition-colors`;

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
      <nav className="max-w-[1200px] mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-extrabold tracking-tight text-lg">
            TechSociety
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <NavLink to="/events" className={linkCls}>Events</NavLink>
            <NavLink to="/projects" className={linkCls}>Projects</NavLink>
            <NavLink to="/members" className={linkCls}>Members</NavLink>
            {isAdmin && <NavLink to="/admin" className={linkCls}>Admin</NavLink>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!email ? (
            <div className="flex items-center gap-2">
              <Button asChild variant="secondary">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Join TechSociety</Link>
              </Button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="relative inline-flex items-center justify-center h-9 w-9 rounded-md border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Open Tech Buddies notifications"
              >
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center text-[10px] h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground shadow">
                    {pendingCount}
                  </span>
                )}
                <Bell className="h-5 w-5" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-48">
                  <DropdownMenuItem onClick={() => navigate("/me")}>Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>Dashboard</DropdownMenuItem>
                  {isAdmin && <DropdownMenuItem onClick={() => navigate("/admin")}>Admin</DropdownMenuItem>}
                  <DropdownMenuItem onClick={signOut} className="text-destructive"><LogOut className="h-4 w-4 mr-2"/>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <BuddiesDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
            </>
          )}
          <button className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md border hover:bg-muted" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>
    </header>
  );
}
