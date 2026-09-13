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
  /** True until the signed-in member's role/profile flags have been read. */
  rolesLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  mustChangePassword: false,
  isAdmin: false,
  rolesLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [flagsLoaded, setFlagsLoaded] = useState(false);

  const checkAdminRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

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
    // The auth state must settle exactly once, as soon as we know whether a
    // session exists. Profile and role lookups run in the background so a slow
    // or failed network call can never leave the app stuck on a loading screen
    // (which previously caused redirect loops on cold launches of the
    // installed home-screen app).
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      setLoading(false);
    };

    const loadProfileFlags = (userId: string) => {
      setFlagsLoaded(false);
      void Promise.all([
        checkMustChangePassword(userId),
        checkAdminRole(userId),
      ]).finally(() => setFlagsLoaded(true));
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        settle();

        if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
          // Defer Supabase calls out of the auth callback
          setTimeout(() => loadProfileFlags(session.user.id), 0);
        }

        if (event === "SIGNED_OUT") {
          setMustChangePassword(false);
          setIsAdmin(false);
          setFlagsLoaded(true);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      settle();
      if (session?.user) loadProfileFlags(session.user.id);
      else setFlagsLoaded(true);
    }).catch(settle);

    // Last-resort guard: never leave the app in a permanent loading state.
    const timeout = setTimeout(() => {
      settle();
      setFlagsLoaded(true);
    }, 8000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const handlePasswordChanged = () => {
    setMustChangePassword(false);
  };

  return (
    <AuthContext.Provider value={{
        user,
        session,
        loading,
        mustChangePassword,
        isAdmin,
        rolesLoading: loading || (!!user && !flagsLoaded),
      }}>
      {children}
      <ForcePasswordChange 
        open={mustChangePassword && !!user} 
        onPasswordChanged={handlePasswordChanged} 
      />
    </AuthContext.Provider>
  );
};
