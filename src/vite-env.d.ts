/// <reference types="vite/client" />

// The MCP entry and its tool files are bundled by @lovable.dev/mcp-js and run
// inside a Supabase Edge Function (Deno) at runtime, where `process.env` is
// available. Declare it so the Vite/TS project — which does not ship
// @types/node — still typechecks these server-only files.
declare const process: { env: Record<string, string | undefined> };
