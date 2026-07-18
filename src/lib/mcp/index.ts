import { defineMcp } from "@lovable.dev/mcp-js";
import listProducts from "./tools/list-products";
import searchProducts from "./tools/search-products";
import getProduct from "./tools/get-product";
import listCategories from "./tools/list-categories";

export default defineMcp({
  name: "hamoudi-store-mcp",
  title: "حمودي ستور — Product Catalog",
  version: "0.1.0",
  instructions:
    "Public, read-only tools for the Hamoudi Store product catalog. Use `list_categories` to discover categories, `list_products` to browse, `search_products` to find items by keyword (Arabic or English), and `get_product` for full details of one product by UUID. Prices are in EGP. Store info: WhatsApp/Vodafone Cash 01025529130. Delivery across Egypt with Cash-on-Delivery or Vodafone Cash.",
  tools: [listProducts, searchProducts, getProduct, listCategories],
});
