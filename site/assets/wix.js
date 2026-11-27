/* ==========================================================================
   SANJH SHRINGAR — Wix Headless connector (no SDK, no build step)
   Talks to Wix Stores (Catalog V3), eCommerce Cart V2 and hosted Checkout
   over REST with a visitor token. Exposes window.SSWix.
   Docs: dev.wix.com/docs/go-headless  ·  Stores Catalog V3  ·  eCom Cart V2
   ========================================================================== */
(function () {
  "use strict";
  var CFG = window.SS_WIX || {};
  var CLIENT_ID = (CFG.clientId || "").trim();
  var API = "https://www.wixapis.com";
  var STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e"; // Wix Stores catalog app id
  var TOKEN_KEY = "wix-visitor-" + CLIENT_ID;

  if (!CLIENT_ID) { window.SSWix = { enabled: false }; return; }

  /* ---------- Visitor token (persisted so the cart survives reloads) ---------- */
  var mem = null, pending = null;
  function loadTok() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(TOKEN_KEY)); } catch (e) { mem = null; }
    return mem;
  }
  function saveTok(t) { mem = t; try { localStorage.setItem(TOKEN_KEY, JSON.stringify(t)); } catch (e) { /* private mode */ } }
  function mint(body) {
    return fetch(API + "/oauth2/token", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ clientId: CLIENT_ID }, body))
    }).then(function (r) {
      if (!r.ok) throw new Error("Wix auth failed (" + r.status + ")");
      return r.json();
    }).then(function (d) {
      return { accessToken: d.access_token, refreshToken: d.refresh_token, expiresAt: Date.now() + d.expires_in * 1000 };
    });
  }
  function token() {
    var t = loadTok();
    if (t && t.expiresAt - 60000 > Date.now()) return Promise.resolve(t.accessToken);
    if (!pending) {
      var p = t && t.refreshToken
        ? mint({ grantType: "refresh_token", refreshToken: t.refreshToken }).catch(function () { return mint({ grantType: "anonymous" }); })
        : mint({ grantType: "anonymous" });
      pending = p.then(function (fresh) { saveTok(fresh); pending = null; return fresh.accessToken; },
                       function (e) { pending = null; throw e; });
    }
    return pending;
  }

  /* ---------- Request helper ---------- */
  function req(path, opts) {
    opts = opts || {};
    var url = new URL(path, API);
    if (opts.query) Object.keys(opts.query).forEach(function (k) {
      [].concat(opts.query[k]).forEach(function (v) { url.searchParams.append(k, v); });
    });
    return token().then(function (tok) {
      return fetch(url.toString(), {
        method: opts.method || "POST",
        headers: { Authorization: tok, "Content-Type": "application/json" }, // raw token, no "Bearer"
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
      });
    }).then(function (r) {
      if (r.status === 204) return null;
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) {
          var err = new Error((j && j.message) || ("Wix request failed (" + r.status + ")"));
          err.status = r.status;
          err.code = j && j.details && j.details.applicationError && j.details.applicationError.code;
          throw err;
        }
        return j;
      });
    });
  }

  /* ---------- Media ---------- */
  var STATIC = "https://static.wixstatic.com/media";
  function rawMedia(v) {
    if (!v) return "";
    if (typeof v === "string") return v;
    if (v.image && typeof v.image === "object") return rawMedia(v.image);
    return v.image || v.url || v.id || "";
  }
  function fileId(v) {
    if (v.indexOf("wix:image://") === 0) return v.slice("wix:image://v1/".length).split(/[\/#]/)[0];
    if (/^[\w-]+~mv2\.[a-z0-9]+$/i.test(v)) return v;
    var m = v.match(/^https:\/\/static\.wixstatic\.com\/media\/([^\/?#]+)/);
    return m ? m[1] : "";
  }
  function img(v, w, h) {
    var raw = rawMedia(v); if (!raw) return "";
    var f = fileId(raw);
    return f ? STATIC + "/" + f + "/v1/fill/w_" + (w || 800) + ",h_" + (h || 1000) + ",al_t,q_85/" + f : raw;
  }

  /* ---------- Catalog (V3) ---------- */
  var LIST_FIELDS = ["CURRENCY", "MEDIA_ITEMS_INFO", "MIN_PRICE_VARIANT", "DISCOUNT_INFO"];
  var FULL_FIELDS = LIST_FIELDS.concat(["PLAIN_DESCRIPTION", "VARIANT_OPTION_CHOICE_NAMES", "INFO_SECTION",
    "INFO_SECTION_PLAIN_DESCRIPTION", "DIRECT_CATEGORIES_INFO"]);
  var norm = function (s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); };
  var strip = function (html) { var d = document.createElement("div"); d.innerHTML = html || ""; return (d.textContent || "").trim(); };
  var num = function (m) { var n = Number(m && (m.amount)); return isNaN(n) ? 0 : n; };

  function selling(price) {
    if (!price) return { cur: null, orig: null };
    if (price.priceAfterDiscount !== undefined) return { cur: price.priceAfterDiscount, orig: price.actualPrice };
    return { cur: price.actualPrice, orig: price.compareAtPrice };
  }

  function searchAll(fields, filter) {
    var out = [];
    function page(cursor) {
      var search = cursor ? { cursorPaging: { limit: 100, cursor: cursor } }
        : { cursorPaging: { limit: 100 }, filter: filter || { visible: true } };
      return req("/stores/v3/products/search", { body: { fields: fields, search: search } }).then(function (r) {
        out = out.concat(r.products || []);
        var next = r.pagingMetadata && r.pagingMetadata.cursors && r.pagingMetadata.cursors.next;
        return next && r.pagingMetadata.hasNext !== false ? page(next) : out;
      });
    }
    return page(null);
  }

  var catsP = null;
  function fetchCategories() {
    if (catsP) return catsP;
    return (catsP = req("/categories/v1/categories/query", {
      // Hidden categories (Wix hides store categories by default) must still resolve to names.
      body: { treeReference: { appNamespace: "@wix/stores" }, query: { cursorPaging: { limit: 100 } }, returnNonVisibleCategories: true }
    }).then(function (r) { return r.categories || []; }).catch(function () { catsP = null; return []; }));
  }

  // Image set on the Wix Stores category behind a site collection (e.g. "bridal" -> "Bridal")
  function collectionImage(key) {
    var names = key === "all" ? ["All Products"] : ((CFG.categories || {})[key] || []);
    var wanted = names.map(norm);
    return fetchCategories().then(function (cats) {
      var c = cats.filter(function (x) { return x.image && wanted.indexOf(norm(x.name)) > -1; })[0];
      return c ? img(c.image, 1920, 800) : "";
    });
  }

  function colKeysFor(catNames) {
    var map = CFG.categories || {}, keys = [];
    Object.keys(map).forEach(function (k) {
      var wanted = map[k].map(norm);
      if (catNames.some(function (n) { return wanted.indexOf(norm(n)) > -1; })) keys.push(k);
    });
    return keys;
  }

  function toProduct(raw, catNameById) {
    var media = [];
    var seen = {};
    [raw.media && raw.media.main].concat(((raw.media && raw.media.itemsInfo && raw.media.itemsInfo.items) || []).map(function (i) { return i.image || i; }))
      .forEach(function (m) { var u = img(m, 900, 1200); if (u && !seen[u]) { seen[u] = 1; media.push(u); } });

    var minV = raw.variantSummary && raw.variantSummary.minPriceVariant;
    var sp = selling(minV && minV.price);
    var price = sp.cur ? num(sp.cur) : num(raw.actualPriceRange && raw.actualPriceRange.minValue);
    var origM = sp.orig || (raw.compareAtPriceRange && raw.compareAtPriceRange.minValue);
    var was = origM && num(origM) > price ? num(origM) : null;

    // Options & variants
    var options = (raw.options || []).map(function (o) {
      return {
        id: o._id || o.id || o.name, name: o.name,
        choices: ((o.choicesSettings && o.choicesSettings.choices) || []).filter(function (c) { return c.visible !== false; })
          .map(function (c) { return { id: c.choiceId, name: c.name, inStock: c.inStock !== false }; })
      };
    });
    var variants = ((raw.variantsInfo && raw.variantsInfo.variants) || []).filter(function (v) { return v.visible !== false; }).map(function (v) {
      var ids = {};
      (v.choices || []).forEach(function (c) { if (c.optionChoiceIds) ids[c.optionChoiceIds.optionId] = c.optionChoiceIds.choiceId; });
      var vp = selling(v.price);
      return { id: v._id || v.id, choiceIds: ids, price: vp.cur ? num(vp.cur) : price, inStock: !(v.inventoryStatus && v.inventoryStatus.inStock === false) };
    });

    var cats = ((raw.directCategoriesInfo && raw.directCategoriesInfo.categories) || [])
      .map(function (c) { return catNameById[c.id] || ""; }).filter(Boolean);
    var info = (raw.infoSections || []).map(function (s) { return { title: s.title, text: strip(s.plainDescription) }; })
      .filter(function (s) { return s.text; });
    var sizeOpt = options.filter(function (o) { return /size/i.test(o.name); })[0];
    var ribbon = raw.ribbon && raw.ribbon.name;

    return {
      wix: true, id: raw._id || raw.id, h: raw.slug, name: raw.name, price: price, was: was,
      images: media.length ? media : [], imgs: media.length,
      cols: colKeysFor(cats), catNames: cats,
      occasion: cats.filter(function (c) { return !/^(all|under)/i.test(c); }).slice(0, 2).join(" · ") || "Made to measure",
      tag: ribbon || null,
      desc: strip(raw.plainDescription),
      details: info.length ? info.map(function (s) { return s.title + ": " + s.text; }) : [],
      options: options, variants: variants,
      sizes: sizeOpt ? sizeOpt.choices.map(function (c) { return c.name; }) : [],
      soldOut: sizeOpt ? sizeOpt.choices.filter(function (c) { return !c.inStock; }).map(function (c) { return c.name; }) : [],
      inStock: variants.length ? variants.some(function (v) { return v.inStock; }) : !(raw.stock && (raw.stock.inStock === false || raw.stock.quantity === 0)),
      swatch: "#6E1B2B", currency: raw.currency
    };
  }

  function loadCatalog() {
    return fetchCategories().then(function (cats) {
      var byId = {}; cats.forEach(function (c) { byId[c._id || c.id] = c.name; });
      return searchAll(FULL_FIELDS).catch(function () {
        // Some field sets are not accepted on search: fall back to list fields + per-category lookups.
        return searchAll(LIST_FIELDS).then(function (list) {
          return Promise.all(cats.map(function (c) {
            return searchAll(["CURRENCY"], { $and: [{ visible: true }, { "allCategoriesInfo.categories": { $matchItems: [{ id: c._id || c.id }] } }] })
              .then(function (ps) { return { id: c._id || c.id, ps: ps }; }).catch(function () { return { id: c._id || c.id, ps: [] }; });
          })).then(function (groups) {
            var catsOf = {};
            groups.forEach(function (g) { g.ps.forEach(function (p) { var pid = p._id || p.id; (catsOf[pid] = catsOf[pid] || []).push({ id: g.id }); }); });
            list.forEach(function (p) { p.directCategoriesInfo = { categories: catsOf[p._id || p.id] || [] }; });
            return list;
          });
        });
      }).then(function (raws) { return raws.map(function (r) { return toProduct(r, byId); }); });
    });
  }

  // Full product (variants/options) by slug, used by the product page
  function loadProduct(slug) {
    return Promise.all([fetchCategories(), req("/stores/v3/products/slug/" + encodeURIComponent(slug), { method: "GET", query: { fields: FULL_FIELDS } })])
      .then(function (res) {
        var byId = {}; res[0].forEach(function (c) { byId[c._id || c.id] = c.name; });
        return res[1] && res[1].product ? toProduct(res[1].product, byId) : null;
      }).catch(function (e) { if (e.status === 404) return null; throw e; });
  }

  /* ---------- Site content (Wix CMS) ----------
     Collection rows: Title = key (e.g. "hero.title"), Text, Image, Link.
     Returns { key: { text, image, link } }. Field keys are matched loosely so
     "text"/"Text"/"value" all work. The collection must allow "Anyone" to read. */
  function loadContent(collectionId) {
    if (!collectionId) return Promise.resolve({});
    return req("/wix-data/v2/items/query", { body: { dataCollectionId: collectionId, query: { paging: { limit: 500 } } } })
      .then(function (r) {
        var out = {};
        ((r && r.dataItems) || []).forEach(function (it) {
          var d = it.data || {}, f = {};
          Object.keys(d).forEach(function (k) { f[norm(k)] = d[k]; });
          var key = String(f.title || f.key || "").trim();
          if (!key) return;
          var link = f.link || f.url || "";
          if (link && typeof link === "object") link = link.url || link.href || "";
          out[key] = { text: f.text != null ? String(f.text) : (f.value != null ? String(f.value) : ""), image: img(f.image, 1600, 2000), link: String(link || "") };
        });
        return out;
      });
  }

  /* ---------- Bride gallery (CMS collection of customer photos, not products) ----------
     Fields: Title (bride's name), Photo (image), Caption, Outfit Link, Show on Homepage, Sort Order. */
  function loadBrides(collectionId) {
    if (!collectionId) return Promise.resolve([]);
    return req("/wix-data/v2/items/query", { body: { dataCollectionId: collectionId, query: { paging: { limit: 200 } } } })
      .then(function (r) {
        var dateOf = function (v) { return Date.parse((v && (v.$date || v)) || "") || 0; };
        return ((r && r.dataItems) || []).map(function (it) {
          var d = it.data || {}, f = {};
          Object.keys(d).forEach(function (k) { f[norm(k)] = d[k]; });
          var link = f.outfitlink || f.outfit || f.link || "";
          if (link && typeof link === "object") link = link.url || link.href || "";
          var home = f.showonhomepage != null ? f.showonhomepage : (f.homepage != null ? f.homepage : f.featured);
          var order = Number(f.sortorder != null ? f.sortorder : f.order);
          return {
            name: String(f.title || f.name || "").trim(),
            caption: String(f.caption || f.text || "").trim(),
            photo: img(f.photo || f.image, 1000, 1250),
            thumb: img(f.photo || f.image, 600, 600),
            link: String(link || ""),
            home: home === true || /^(yes|true|1)$/i.test(String(home || "")),
            order: isNaN(order) || f.sortorder === "" ? Infinity : order,
            date: dateOf(f.createddate || it.createdDate)
          };
        }).filter(function (b) { return b.photo; })
          .sort(function (a, b) { return a.order - b.order || b.date - a.date; });
      });
  }

  /* ---------- Cart (eCom Cart V2) ---------- */
  var CART = "/ecom/v2/carts/current";
  function money(m) { if (!m) return 0; var n = Number(m.convertedAmount != null ? m.convertedAmount : m.amount); return isNaN(n) ? 0 : n; }
  function toCart(raw) {
    if (!raw) return { id: "", lines: [], count: 0, subtotal: 0 };
    var txt = function (v) { return v && typeof v === "object" ? (v.translated || v.original || "") : (v || ""); };
    var lines = (raw.lineItems || []).map(function (li) {
      var a = li.attributes || {};
      var pr = li.pricing || {};
      var qty = (li.quantityInfo && li.quantityInfo.confirmedQuantity) || li.quantity || 1;
      var unit = money(pr.unitPrice || li.price);
      var total = pr.totalPrice ? money(pr.totalPrice) : unit * qty;
      var desc = ((a.descriptionLines || li.descriptionLines) || []).map(function (d) {
        var n = txt(d.name), v = txt(d.plainText) || txt(d.colorInfo) || txt(d.value);
        return n && v ? n + ": " + v : v;
      }).filter(Boolean).join(" · ");
      var url = a.url || li.url;
      return {
        lineId: li._id || li.id, name: txt(li.productName) || txt(li.name) || "Item", qty: qty, unit: unit, total: total, desc: desc,
        image: img(a.image || li.image, 200, 260),
        slug: url && (url.relativePath || (typeof url === "string" ? url : "")) ? String(url.relativePath || url).split("/").pop() : "",
        productId: (li.catalogReference || (li.source && li.source.catalogReference) || {}).catalogItemId,
        ok: !li.status || li.status === "IN_STOCK"
      };
    });
    var sub = raw.subtotal ? money(raw.subtotal) : lines.reduce(function (s, l) { return s + l.total; }, 0);
    return { id: raw._id || raw.id, lines: lines, count: lines.reduce(function (s, l) { return s + l.qty; }, 0), subtotal: sub };
  }
  function getCart() {
    return req(CART, { method: "GET" }).then(function (r) { return toCart(r && r.cart); })
      .catch(function (e) { if (e.status === 404) return toCart(null); throw e; });
  }
  function addToCart(productId, variantId, qty) {
    var ref = { catalogItemId: productId, appId: STORES_APP_ID };
    if (variantId) ref.options = { variantId: variantId };
    return req(CART + "/add-line-items", { body: { catalogItems: [{ quantity: qty || 1, catalogReference: ref }] } })
      .then(function (r) {
        // A refused add still returns 200 — check the line actually landed.
        var c = toCart(r && r.cart);
        var line = c.lines.filter(function (l) { return l.productId === productId; })[0];
        if (!line || !line.ok) throw new Error("Sorry, this size is out of stock right now.");
        return c;
      });
  }
  function updateLine(lineId, qty) {
    if (qty < 1) return removeLine(lineId);
    return req(CART + "/update-line-items", { body: { lineItems: [{ lineItemId: lineId, quantity: { newQuantity: qty } }] } })
      .then(function (r) { return toCart(r && r.cart); });
  }
  function removeLine(lineId) {
    return req(CART + "/remove-line-items", { body: { lineItemIds: [lineId] } }).then(function (r) { return toCart(r && r.cart); });
  }
  function checkout() {
    return getCart().then(function (cart) {
      if (!cart.id || !cart.lines.length) throw new Error("Your bag is empty.");
      var origin = location.origin;
      var body = { ecomCheckout: { checkoutId: cart.id }, callbacks: { postFlowUrl: origin + "/", thankYouPageUrl: origin + "/" } };
      // Wix documents two paths for the redirect-session API; try the headless one, then the documented REST path.
      return req("/headless/v1/redirect-session", { body: body })
        .catch(function () { return req("/redirect-session/v1/redirect-session", { body: body }); })
        .then(function (r) {
          var url = r && r.redirectSession && r.redirectSession.fullUrl;
          if (!url) throw new Error("Checkout is not available right now.");
          location.href = url;
        });
    });
  }

  window.SSWix = {
    enabled: true, img: img,
    loadCatalog: loadCatalog, loadProduct: loadProduct, loadContent: loadContent, loadBrides: loadBrides, collectionImage: collectionImage,
    getCart: getCart, addToCart: addToCart, updateLine: updateLine, removeLine: removeLine, checkout: checkout
  };
})();
