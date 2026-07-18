declare const process: { env: Record<string, string | undefined> };
import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";

function getClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export default defineTool({
  name: "list_categories",
  title: "List categories",
  description: "List all distinct product categories available in the Hamoudi Store catalog with product counts.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("products")
      .select("category")
      .not("category", "is", null);

    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const c = (row as { category: string }).category;
      if (c) counts[c] = (counts[c] ?? 0) + 1;
    }
    const categories = Object.entries(counts)
      .map(([name, count]) => ({ name, product_count: count }))
      .sort((a, b) => b.product_count - a.product_count);

    return {
      content: [{ type: "text", text: JSON.stringify(categories, null, 2) }],
      structuredContent: { categories },
    };
  },
});
