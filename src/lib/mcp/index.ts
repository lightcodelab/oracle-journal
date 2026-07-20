import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoami from "./tools/whoami";
import listJournalEntries from "./tools/list-journal-entries";
import createQuickCapture from "./tools/create-quick-capture";
import listSavedReadings from "./tools/list-saved-readings";
import listHealingProtocols from "./tools/list-healing-protocols";

// Build the Supabase OAuth issuer from the project ref so the value survives
// publish and stays import-safe (Vite inlines this as a literal at build time).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "temple-of-sustainment-mcp",
  title: "Temple of Sustainment",
  version: "0.1.0",
  instructions:
    "Tools for AreekeerA® Temple of Sustainment members. Read the signed-in member's profile, Digital Journal entries, saved oracle readings, and AreekeerA healing protocols, and quickly capture new journal notes. All tools run as the signed-in user under the app's row-level security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoami, listJournalEntries, createQuickCapture, listSavedReadings, listHealingProtocols],
});