declare const process: { env: Record<string, string | undefined> };
import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function getClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export default defineTool({
  name: "search_products",
  title: "Search products",
  description:
    "Search the Hamoudi Store product catalog by keyword. Matches product name, description, or category (case-insensitive).",
  inputSchema: {
    query: z.string().trim().min(1).describe("Search keyword (Arabic or English)."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const supabase = getClient();
    const like = `%${query}%`;
    const { data, error } = await supabase
      .from("products")
      .select("id, name, description, price, original_price, image, category, badge, in_stock, stock_count")
      .or(`name.ilike.${like},description.ilike.${like},category.ilike.${like}`)
      .limit(limit ?? 20);

    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { query, results: data ?? [] },
    };
  },
});
