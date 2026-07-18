import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProducts from "./tools/list-products";
import searchProducts from "./tools/search-products";
import getProduct from "./tools/get-product";
import listCategories from "./tools/list-categories";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "hamoudi-store-mcp",
  title: "حمودي ستور — Product Catalog",
  version: "0.1.0",
  instructions:
    "Read-only tools for the Hamoudi Store product catalog (signed-in users only). Use `list_categories` to discover categories, `list_products` to browse, `search_products` to find items by keyword (Arabic or English), and `get_product` for full details of one product by UUID. Prices are in EGP.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProducts, searchProducts, getProduct, listCategories],
});
