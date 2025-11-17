import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Users, Calendar, ImageIcon, IndianRupee, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-soft">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <Heart className="h-6 w-6 text-primary" />
          <span className="bg-gradient-warm bg-clip-text text-transparent">SVCHS Alumni</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-6">
          <Link to="/directory" className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
            <Users className="h-4 w-4" />
            Directory
          </Link>
          <Link to="/events" className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
            <Calendar className="h-4 w-4" />
            Events
          </Link>
          <Link to="/gallery" className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
            <ImageIcon className="h-4 w-4" />
            Gallery
          </Link>
          <Link to="/donate" className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
            <IndianRupee className="h-4 w-4" />
            Donate
          </Link>
          {isAdmin && (
            <Link to="/admin" className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/profile">
                <Button variant="ghost" size="sm">My Profile</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="default" size="sm" className="shadow-warm">
                Join Us
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
