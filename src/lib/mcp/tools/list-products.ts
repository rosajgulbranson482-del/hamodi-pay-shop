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
  name: "list_products",
  title: "List products",
  description:
    "List products from the Hamoudi Store catalog. Supports optional category filter, in-stock filter, and result limit.",
  inputSchema: {
    category: z
      .string()
      .optional()
      .describe("Optional product category slug or name (e.g. 'headphones', 'watches')."),
    in_stock_only: z
      .boolean()
      .optional()
      .describe("If true, return only products currently in stock."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum number of products to return (default 20, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, in_stock_only, limit }) => {
    const supabase = getClient();
    let q = supabase
      .from("products")
      .select("id, name, description, price, original_price, image, category, badge, in_stock, stock_count")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);

    if (category) q = q.ilike("category", category);
    if (in_stock_only) q = q.eq("in_stock", true);

    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { products: data ?? [] },
    };
  },
});
