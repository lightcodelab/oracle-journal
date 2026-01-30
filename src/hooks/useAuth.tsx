import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import ForcePasswordChange from "@/components/ForcePasswordChange";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  mustChangePassword: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  mustChangePassword: false,
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    setIsAdmin(!error && !!data);
  };

  const checkMustChangePassword = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("must_change_password")
      .eq("id", userId)
      .single();

    if (!error && data?.must_change_password) {
      setMustChangePassword(true);
    } else {
      setMustChangePassword(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Check must_change_password flag and admin role when user signs in
        if (session?.user && event === "SIGNED_IN") {
          setTimeout(() => {
            checkMustChangePassword(session.user.id);
            checkAdminRole(session.user.id);
          }, 0);
        }

        if (event === "SIGNED_OUT") {
          setMustChangePassword(false);
          setIsAdmin(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        checkMustChangePassword(session.user.id);
        checkAdminRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handlePasswordChanged = () => {
    setMustChangePassword(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, mustChangePassword, isAdmin }}>
      {children}
      <ForcePasswordChange 
        open={mustChangePassword && !!user} 
        onPasswordChanged={handlePasswordChanged} 
      />
    </AuthContext.Provider>
  );
};
