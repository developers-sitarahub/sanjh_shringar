// Checks the clean-URL worker (server/entry.mjs) routes each address to the right page.
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const worker = (await import(pathToFileURL(resolve(here, "../../server/entry.mjs")).href)).default;
const title = (html) => (html.match(/<title>([^<]*)/) || [])[1] || "";
let failed = 0;
const check = async (path, status, titlePart, msg) => {
  const res = await worker.fetch(new Request("https://example.test" + path));
  const ok = res.status === status && title(await res.text()).includes(titlePart);
  console.log((ok ? "ok  - " : "FAIL: ") + msg);
  if (!ok) failed++;
};
await check("/shop", 200, "Shop", "/shop serves the shop page");
await check("/shop?c=under-3k", 200, "Shop", "query strings are kept on /shop");
await check("/shop/", 200, "Shop", "trailing slash is tolerated");
await check("/product?p=maroon-floral-lehenga", 200, "Product", "/product serves the product page");
await check("/about", 200, "Our Story", "/about serves Our Story");
await check("/contact", 200, "Contact", "/contact serves Contact");
await check("/policies", 200, "Shipping", "/policies serves Policies");
await check("/no-such-page", 404, "not found", "unknown addresses get a 404 page");
if (failed) process.exitCode = 1;
