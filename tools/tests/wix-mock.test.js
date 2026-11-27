// Node test: run site/assets/wix.js against mocked Wix REST responses.
const fs = require("fs"), path = require("path");
const calls = [];
const store = {};
global.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
global.document = { createElement: () => { let t = ""; return { set innerHTML(v) { t = String(v).replace(/<[^>]+>/g, ""); }, get textContent() { return t; } }; } };
global.location = { origin: "https://sanjh.wix-site-host.com", href: "" };
global.window = { SS_WIX: { clientId: "test-client", categories: { bridal: ["Bridal"], "under-3k": ["Under 3k"] } } };
let cart = null;
const product = {
  id: "p1", slug: "maroon-floral-lehenga", name: "Maroon Floral Lehenga", visible: true,
  media: { main: { image: "wix:image://v1/abc~mv2.jpg/x.jpg#originWidth=800" }, itemsInfo: { items: [{ image: { url: "https://static.wixstatic.com/media/def~mv2.jpg" } }] } },
  actualPriceRange: { minValue: { amount: "14665" }, maxValue: { amount: "14665" } },
  variantSummary: { minPriceVariant: { price: { actualPrice: { amount: "14665" }, compareAtPrice: { amount: "16665" } } } },
  plainDescription: "<p>Wine-maroon florals.</p>",
  infoSections: [{ title: "Care", plainDescription: "<p>Dry clean only</p>" }],
  directCategoriesInfo: { categories: [{ id: "c1" }] },
  options: [{ id: "o1", name: "Size", choicesSettings: { choices: [{ choiceId: "s", name: "S", inStock: false }, { choiceId: "m", name: "M" }] } }],
  variantsInfo: { variants: [
    { id: "v-s", choices: [{ optionChoiceIds: { optionId: "o1", choiceId: "s" } }], price: { actualPrice: { amount: "14665" } }, inventoryStatus: { inStock: false } },
    { id: "v-m", choices: [{ optionChoiceIds: { optionId: "o1", choiceId: "m" } }], price: { actualPrice: { amount: "14665" } }, inventoryStatus: { inStock: true } } ] },
  ribbon: { name: "Sale" }
};
global.fetch = async (url, opts = {}) => {
  const u = new URL(url); const body = opts.body ? JSON.parse(opts.body) : null;
  calls.push(`${opts.method || "GET"} ${u.pathname}`);
  const ok = (j, status = 200) => ({ ok: status < 400, status, json: async () => j });
  if (u.pathname === "/oauth2/token") return ok({ access_token: "tok", refresh_token: "ref", expires_in: 14400 });
  if (opts.headers && opts.headers.Authorization !== "tok") throw new Error("missing raw token header");
  if (u.pathname === "/categories/v1/categories/query" && !body.returnNonVisibleCategories) throw new Error("hidden categories not requested");
  if (u.pathname === "/categories/v1/categories/query") return ok({ categories: [{ id: "c1", name: "Bridal" }] });
  if (u.pathname === "/stores/v3/products/search") return ok({ products: [product], pagingMetadata: { hasNext: false } });
  if (u.pathname.startsWith("/stores/v3/products/slug/")) return ok({ product });
  if (u.pathname === "/ecom/v2/carts/current" && (opts.method === "GET")) return cart ? ok({ cart }) : ok({}, 404);
  if (u.pathname === "/ecom/v2/carts/current/add-line-items") {
    const ref = body.catalogItems[0].catalogReference;
    if (ref.appId !== "215238eb-22a5-4c36-9e7b-e7c08025e04e") throw new Error("wrong appId");
    // Shape returned by the live Wix eCom Cart V2 API (2026): name + source.catalogReference
    cart = { id: "cart1", lineItems: [{ id: "L1", name: { original: "Maroon Floral Lehenga" }, quantityInfo: { confirmedQuantity: body.catalogItems[0].quantity },
      pricing: { unitPrice: { amount: "14665" }, totalPrice: { amount: String(14665 * body.catalogItems[0].quantity) } },
      attributes: { image: "wix:image://v1/abc~mv2.jpg/x.jpg", descriptionLines: [{ name: { original: "Size" }, plainText: { original: "M" } }] },
      source: { catalogReference: ref }, status: "IN_STOCK" }] };
    return ok({ cart });
  }
  if (u.pathname === "/ecom/v2/carts/current/update-line-items") {
    if (!body.lineItems[0].lineItemId || !body.lineItems[0].quantity.newQuantity) throw new Error("bad update body");
    const q = body.lineItems[0].quantity.newQuantity; cart.lineItems[0].quantityInfo.confirmedQuantity = q; cart.lineItems[0].pricing.totalPrice.amount = String(14665 * q);
    return ok({ cart });
  }
  if (u.pathname === "/wix-data/v2/items/query" && body.dataCollectionId === "Brides") return ok({ dataItems: [
    { data: { title: "Riya", photo: "wix:image://v1/r1~mv2.jpg/r.jpg", caption: "Maroon Floral", sortOrder: 2, _createdDate: { $date: "2026-01-01T00:00:00Z" } } },
    { data: { title: "Aisha", photo: "wix:image://v1/a1~mv2.jpg/a.jpg", showOnHomepage: true, outfitLink: { url: "product.html?p=x" }, sortOrder: 1 } },
    { data: { title: "No photo yet" } },
    { data: { title: "Meera", photo: "wix:image://v1/m1~mv2.jpg/m.jpg", _createdDate: { $date: "2026-05-01T00:00:00Z" } } }
  ] });
  if (u.pathname === "/headless/v1/redirect-session") {
    if (body.ecomCheckout.checkoutId !== "cart1") throw new Error("bad checkout id");
    return ok({ redirectSession: { fullUrl: "https://checkout.wix.com/xyz" } });
  }
  return ok({ message: "not mocked " + u.pathname }, 404);
};
global.URL = URL;
eval(fs.readFileSync(path.join(__dirname, "../../site/assets/wix.js"), "utf8"));
const W = window.SSWix;
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exitCode = 1; } else console.log("ok  -", m); };
(async () => {
  assert(W.enabled, "connector enabled with clientId");
  const list = await W.loadCatalog();
  const p = list[0];
  assert(list.length === 1 && p.h === "maroon-floral-lehenga", "catalog loads products with slug");
  assert(p.price === 14665 && p.was === 16665, "price and compare-at price mapped");
  assert(p.images.length === 2 && p.images[0].includes("static.wixstatic.com/media/abc~mv2.jpg/v1/fill"), "media URLs built");
  assert(p.cols.includes("bridal") && p.occasion === "Bridal", "Wix category mapped to site collection");
  assert(p.sizes.join() === "S,M" && p.soldOut.join() === "S", "sizes and sold-out sizes mapped");
  assert(p.variants.length === 2 && p.variants[1].choiceIds.o1 === "m", "variants carry option→choice ids");
  assert(p.desc === "Wine-maroon florals." && p.details[0] === "Care: Dry clean only", "description and info sections mapped");
  const brides = await W.loadBrides("Brides");
  assert(brides.map(b => b.name).join() === "Aisha,Riya,Meera", "brides sorted by Sort Order, unsorted last; photo-less skipped");
  assert(brides[0].home === true && brides[1].home === false && brides[0].link === "product.html?p=x", "bride homepage flag and outfit link read");
  assert(brides[1].photo.includes("static.wixstatic.com/media/r1~mv2.jpg") && brides[1].caption === "Maroon Floral", "bride photo URL and caption built");
  assert((await W.loadBrides("")).length === 0, "no bride collection configured -> empty gallery");
  let c = await W.getCart();
  assert(c.lines.length === 0, "empty cart when Wix returns 404");
  c = await W.addToCart("p1", "v-m", 2);
  assert(c.count === 2 && c.subtotal === 29330 && c.lines[0].desc === "Size: M", "add to cart with variant");
  assert(c.lines[0].name === "Maroon Floral Lehenga" && c.lines[0].productId === "p1", "cart line name and product id read from current Wix format");
  c = await W.updateLine("L1", 3);
  assert(c.count === 3, "update line quantity");
  await W.checkout();
  assert(location.href === "https://checkout.wix.com/xyz", "checkout redirects to Wix hosted checkout");
  assert(calls.filter(x => x.endsWith("/oauth2/token")).length === 1, "visitor token minted once and reused");
})().catch(e => { console.error("FAIL:", e.message); process.exitCode = 1; });
