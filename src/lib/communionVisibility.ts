import { useAuth } from "@/hooks/useAuth";

/**
 * The Door of Communion is temporarily hidden from everyone except admins.
 * Nothing is deleted — flip COMMUNION_HIDDEN to false to restore it
 * site-wide (navigation, routes, search results and sales copy all key off
 * this one switch).
 */
export const COMMUNION_HIDDEN = true;

/** True when the current visitor may see Door of Communion content. */
export function useCanSeeCommunion(): boolean {
  const { isAdmin } = useAuth();
  return !COMMUNION_HIDDEN || isAdmin;
}
