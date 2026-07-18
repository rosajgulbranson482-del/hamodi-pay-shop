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
  name: "get_product",
  title: "Get product details",
  description: "Fetch full details (including gallery images) for a single product by its UUID.",
  inputSchema: {
    product_id: z.string().uuid().describe("The product's UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ product_id }) => {
    const supabase = getClient();
    const [{ data: product, error: pErr }, { data: images }] = await Promise.all([
      supabase.from("products").select("*").eq("id", product_id).maybeSingle(),
      supabase.from("product_images").select("image_url, display_order").eq("product_id", product_id).order("display_order"),
    ]);

    if (pErr) return { content: [{ type: "text", text: `Error: ${pErr.message}` }], isError: true };
    if (!product) return { content: [{ type: "text", text: "Product not found" }], isError: true };

    const result = { ...product, gallery: images ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: { product: result },
    };
  },
});
