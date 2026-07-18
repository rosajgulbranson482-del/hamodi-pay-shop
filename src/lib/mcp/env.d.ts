// MCP tool files are bundled into a Deno Edge Function where `process.env`
// is provided by Deno's Node compat. This ambient declaration keeps the
// Vite/TS project happy without pulling in @types/node.
declare const process: { env: Record<string, string | undefined> };
