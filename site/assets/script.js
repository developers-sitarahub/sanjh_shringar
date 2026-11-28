/* ==========================================================================
   SANJH SHRINGAR — storefront (vanilla JS, no dependencies)
   Data source:
     • Wix Stores (live)   when assets/wix-config.js has a clientId
     • built-in catalogue  (assets/products.js) otherwise, or if Wix is unreachable
   Cart:
     • Wix eCom cart + Wix hosted checkout when connected
     • browser-only demo cart + "Order on WhatsApp" otherwise
   ========================================================================== */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var COLS = window.SS_COLLECTIONS || {};
  var WA_NUMBER = "91XXXXXXXXXX";               // ← your WhatsApp number (country code, no +)
  var WA = "https://wa.me/" + WA_NUMBER;
  var EMAIL = "sanjhshringar.shopify@gmail.com";
  var W = window.SSWix && window.SSWix.enabled ? window.SSWix : null;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var inr = function (n) { return "₹" + Math.round(Number(n)).toLocaleString("en-IN"); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var slugify = function (s) { return String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); };
  var params = new URLSearchParams(location.search);

  /* ---------- Storage (safe) ---------- */
  function load(key, fallback) { try { var v = JSON.parse(localStorage.getItem(key)); return v || fallback; } catch (e) { return fallback; } }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* unavailable */ } }

  /* ---------- Toast ---------- */
  var toast = $("#toast"), toastTimer;
  function showToast(msg) {
    if (!toast) return;
    $("[data-toast-text]", toast).textContent = msg;
    toast.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-show"); }, 2800);
  }

  /* ---------- Header ---------- */
  var header = $(".header");
  function onScroll() { if (header) header.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  function setHdr() { if (header) document.documentElement.style.setProperty("--hdr", header.offsetHeight + "px"); }
  setHdr();
  window.addEventListener("resize", setHdr);
  var cParam = params.get("c");
  var navKey = cParam === "under-3k" ? "under-3k"
    : (document.body.classList.contains("shop-page") ? "collection"
    : (document.body.classList.contains("about-page") ? "about"
    : (document.body.classList.contains("contact-page") ? "contact" : "")));
  $$("[data-nav]").forEach(function (a) { if (a.getAttribute("data-nav") === navKey) a.setAttribute("aria-current", "page"); });

  /* ---------- Overlays ---------- */
  var lastFocus = null;
  function openLayer(el) {
    if (!el) return;
    lastFocus = document.activeElement;
    el.classList.add("is-open"); el.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    var f = el.querySelector("input, button, a");
    if (f) setTimeout(function () { f.focus(); }, 50);
  }
  function closeLayer(el) {
    if (!el || !el.classList.contains("is-open")) return;
    el.classList.remove("is-open"); el.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function bind(openSel, closeSel, el) {
    $$(openSel).forEach(function (b) { b.addEventListener("click", function () { openLayer(el); }); });
    $$(closeSel).forEach(function (b) { b.addEventListener("click", function () { closeLayer(el); }); });
  }
  var drawer = $("#drawer"), cartEl = $("#cart"), searchEl = $("#search"), filtersEl = $("#filters");
  bind("[data-open-drawer]", "[data-close-drawer]", drawer);
  bind("[data-open-cart]", "[data-close-cart]", cartEl);
  bind("[data-open-search]", "[data-close-search]", searchEl);
  bind("[data-open-filters]", "[data-close-filters]", filtersEl);
  $$("#drawer a").forEach(function (a) { a.addEventListener("click", function () { closeLayer(drawer); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") [drawer, cartEl, searchEl, filtersEl].forEach(closeLayer); });

  // Product rails
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-rail]");
    if (!b) return;
    var rail = document.getElementById(b.getAttribute("data-rail"));
    var w = rail.firstElementChild ? rail.firstElementChild.getBoundingClientRect().width + 20 : 300;
    rail.scrollBy({ left: w * +b.getAttribute("data-dir") * 2, behavior: reduceMotion ? "auto" : "smooth" });
  });
  // Disable rail arrows at either end
  $$(".rail[id]").forEach(function (rail) {
    var btns = $$('[data-rail="' + rail.id + '"]');
    if (!btns.length) return;
    function sync() {
      var max = rail.scrollWidth - rail.clientWidth - 2;
      btns.forEach(function (b) {
        b.disabled = +b.getAttribute("data-dir") < 0 ? rail.scrollLeft <= 2 : rail.scrollLeft >= max;
      });
    }
    rail.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    new MutationObserver(sync).observe(rail, { childList: true });
    sync();
  });

  function setShopMeta(meta) {
    if (!meta) return;
    $("[data-shop-title]").textContent = meta.title;
    $("[data-shop-eyebrow]").textContent = meta.eyebrow;
    $("[data-shop-intro]").textContent = meta.intro;
    $("[data-shop-crumb]").textContent = meta.title;
    document.title = meta.title + " | Sanjh Shringar";
  }

  /* ---------- Loading skeletons ---------- */
  function skeletons(n) { var s = ""; for (var i = 0; i < n; i++) s += '<div class="card card--skel" aria-hidden="true"><div class="card__media"></div><span></span><span></span></div>'; return s; }
  $$("[data-grid]").forEach(function (g) { g.innerHTML = skeletons(+g.getAttribute("data-limit") || 4); });
  if ($("[data-shop-grid]")) {
    $("[data-shop-grid]").innerHTML = skeletons(6);
    var initCol = params.get("c") || "all";
    var initMeta = initCol === "wishlist" ? { title: "Your Wishlist", eyebrow: "Saved with love", intro: "The pieces you've fallen for." } : (COLS[initCol] || COLS.all);
    setShopMeta(initMeta);
    var initTabs = ["all", "bridal", "bridesmaids", "modest", "lehengas", "sarees", "indo-western", "blouses"];
    $("[data-shop-tabs]").innerHTML = initTabs.map(function (t) {
      return '<a role="tab" href="shop.html' + (t === "all" ? "" : "?c=" + t) + '" aria-selected="' + (t === initCol) + '">' + COLS[t].title.replace("Lehengas Under ₹3k", "Under ₹3k").replace("All Collections", "All") + "</a>";
    }).join("");
    var priceGroup = $("[data-filter-price]");
    if (priceGroup && initCol === "under-3k") {
      var u3k = $("input[name=price][value='0-3000']", priceGroup);
      if (u3k) u3k.checked = true;
    }
  }

  /* ==========================================================================
     DATA
     ========================================================================== */
  var LOCAL = (window.SS_PRODUCTS || []).map(function (p) {
    return Object.assign({}, p, { images: p.images || [] });
  });

  var source = W
    ? W.loadCatalog().then(function (list) {
        if (!list.length) throw new Error("No products in Wix Stores yet");
        return list;
      }).catch(function (e) {
        console.warn("[Sanjh Shringar] Wix catalogue unavailable, using built-in data:", e.message);
        W = null; return LOCAL;
      })
    : Promise.resolve(LOCAL);

  // Homepage/site text and photos from the Wix CMS (empty object = keep built-in defaults)
  var contentP = W && W.loadContent
    ? W.loadContent((window.SS_WIX || {}).contentCollection).catch(function (e) {
        console.warn("[Sanjh Shringar] Wix site content unavailable, using built-in text:", e.message);
        return {};
      })
    : Promise.resolve({});

  // Brides' photos from the Wix CMS (a gallery collection, not products)
  var bridesP = W && W.loadBrides
    ? W.loadBrides((window.SS_WIX || {}).bridesCollection).catch(function (e) {
        console.warn("[Sanjh Shringar] Bride gallery unavailable:", e.message);
        return [];
      })
    : Promise.resolve([]);

  Promise.all([source, contentP]).then(function (r) { boot(r[0], r[1]); });
  Promise.all([source, contentP, bridesP]).then(function (r) { applySiteContent(r[0], r[1]); applyBrides(r[2], r[0], r[1]); });

  // "<section>.count" in Homepage Content: how many items a homepage section shows
  function countFor(el, C) {
    var sec = el.closest("[data-cms-section]");
    var row = sec && C && C[sec.getAttribute("data-cms-section") + ".count"];
    var n = row ? parseInt(row.text, 10) : NaN;
    return n > 0 ? Math.min(n, 24) : (+el.getAttribute("data-limit") || 4);
  }

  /* ==========================================================================
     WIX-MANAGED CONTENT  (see the note at the top of src/pages/index.html)
     ========================================================================== */
  function inCat(p, name) {
    var want = slugify(name);
    return (p.catNames || []).some(function (n) { return slugify(n) === want; });
  }
  function findProduct(P, h) {
    var hs = slugify(h);
    return P.filter(function (p) { return p.h === h || p.h === hs; })[0]
      || P.filter(function (p) { return p.h.indexOf(hs) === 0 || hs.indexOf(p.h) === 0 || slugify(p.name) === hs; })[0] || null;
  }
  function md(s) { return esc(s).replace(/\*([^*]+)\*/g, "<em>$1</em>").replace(/\s*\|\s*/g, "<br>"); }
  var pdpUrl = function (p) { return "product.html?p=" + encodeURIComponent(p.h); };

  function applySiteContent(P, C) {
    C = C || {};
    var get = function (k, f) { return C[k] && C[k][f] ? C[k][f] : ""; };

    // Section order ("<name>.order" = 1, 2, 3 ...); sections without a number keep their place
    var secs = $$("main > [data-cms-section]");
    if (secs.length > 1 && secs.some(function (s) { return get(s.getAttribute("data-cms-section") + ".order", "text"); })) {
      var parent = secs[0].parentNode, anchor = secs[secs.length - 1].nextSibling;
      secs.map(function (s, i) {
        var o = parseFloat(get(s.getAttribute("data-cms-section") + ".order", "text"));
        return { el: s, k: isNaN(o) ? i + 1 : o, i: i };
      }).sort(function (a, b) { return a.k - b.k || a.i - b.i; })
        .forEach(function (x) { parent.insertBefore(x.el, anchor); });
    }

    // Show / hide whole sections ("<name>.show" = yes / no)
    $$("[data-cms-section]").forEach(function (s) {
      var v = get(s.getAttribute("data-cms-section") + ".show", "text").trim().toLowerCase();
      if (/^(no|hide|hidden|off|false|0)$/.test(v)) s.hidden = true;
      else if (/^(yes|show|on|true|1)$/.test(v) && !s.hasAttribute("data-empty")) s.hidden = false;
    });
    $$("[data-cms]").forEach(function (el) { var t = get(el.getAttribute("data-cms"), "text"); if (t) el.innerHTML = md(t); });
    $$("[data-cms-href]").forEach(function (el) { var l = get(el.getAttribute("data-cms-href"), "link"); if (l) el.setAttribute("href", l); });
    $$("[data-cms-img]").forEach(function (el) { var i = get(el.getAttribute("data-cms-img"), "image"); if (i) { el.src = i; el.hidden = false; } });

    // Photos come only from Wix: a CMS photo if set, otherwise a product photo from the matching
    // Wix Stores collection (never repeated on the page). Nothing is typed into the site.
    var used = {};
    function inColl(p, c) { return !c || c === "all" || (p.cols || []).indexOf(c) > -1 || (c === "under-3k" && p.price <= 3000); }
    function pick(c) {
      var list = P.filter(function (p) { return inColl(p, c); });
      for (var k = 0; k < 4; k++) for (var j = 0; j < list.length; j++) {
        var u = list[j].images && list[j].images[k];
        if (u && !used[u]) { used[u] = 1; return { p: list[j], src: u }; }
      }
      return null;
    }
    $$("[data-cms-img]").forEach(function (el) { if (!el.hidden && el.src) used[el.src] = 1; });

    // Hero dress: the "Homepage Hero" category, else the first piece in its collection (Bridal)
    var hero = $("[data-home-hero]");
    if (hero) {
      var hp = P.filter(function (p) { return inCat(p, hero.getAttribute("data-home-hero")); })[0]
        || P.filter(function (p) { return inColl(p, hero.getAttribute("data-home-fallback")) && p.images[0]; })[0];
      if (hp) {
        var hImg = $("[data-hero-img]", hero);
        if (hImg && !get("hero.image", "image") && hp.images[0]) { hImg.src = hp.images[0]; hImg.alt = hp.name; hImg.hidden = false; used[hp.images[0]] = 1; }
        var tagEl = $("[data-hero-link]", hero);
        if (tagEl) { tagEl.setAttribute("href", pdpUrl(hp)); tagEl.hidden = false; }
        var n = $("[data-hero-name]", hero); if (n) n.textContent = hp.name;
        var pr = $("[data-hero-price]", hero); if (pr) { pr.textContent = inr(hp.price); pr.removeAttribute("data-price-of"); }
      }
    }

    // Shop banner: the image set on that collection's Wix Stores category (a CMS shop.banner photo wins)
    var shopBanner = $("[data-shop-banner]");
    if (shopBanner && !get("shop.banner", "image") && W && W.collectionImage) {
      var bCol = params.get("c") || "all";
      W.collectionImage(bCol).then(function (src) {
        var f = src ? null : P.filter(function (p) { return inColl(p, bCol) && p.images[0]; })[0];
        if (src || f) { shopBanner.src = src || f.images[0]; shopBanner.hidden = false; }
      });
    }

    // Empty CMS photo slots: a photo from the slot's Wix collection
    $$("[data-cms-img][data-img-fallback]").forEach(function (el) {
      if (!el.hidden) return;
      var f = pick(el.getAttribute("data-img-fallback"));
      if (f) { el.src = f.src; el.alt = el.alt || f.p.name; el.hidden = false; }
    });

    // Product lists: their "Homepage …" category, else their collection; the section hides only if both are empty
    $$("[data-home-list]").forEach(function (box) {
      var list = P.filter(function (p) { return inCat(p, box.getAttribute("data-home-list")); });
      if (!list.length) list = P.filter(function (p) { return inColl(p, box.getAttribute("data-home-fallback")); });
      list = list.slice(0, countFor(box, C));
      if (!list.length) { hideSection(box); return; }
      var tpl = box.getAttribute("data-tpl");
      box.innerHTML = list.map(function (p, i) {
        var delay = ' data-delay="' + (i % 3) * 80 + '"';
        if (tpl === "lookbook") {
          var src = p.images[1] || p.images[0] || "";
          return '<a href="' + pdpUrl(p) + '" class="lookbook__item' + (i === 0 ? " lookbook__item--tall" : "") + ' reveal"' + delay + '>' +
            '<div class="media"><img src="' + esc(src) + '" alt="' + esc(p.name) + '" loading="lazy"></div>' +
            '<span class="lookbook__tag">' + esc(p.name) + " · " + inr(p.price) + "</span></a>";
        }
        return '<a href="' + pdpUrl(p) + '" class="reveal"' + delay + '><div class="media arch"><img src="' + esc(p.images[0] || "") +
          '" alt="' + esc(p.name) + '" loading="lazy"></div><span>' + esc(p.name.split(" ")[0]) + "</span></a>";
      }).join("");
    });

    // Live prices for products named in the page
    $$("[data-price-of]").forEach(function (el) {
      var p = findProduct(P, el.getAttribute("data-price-of"));
      if (p) {
        el.textContent = inr(p.price);
        var a = el.closest("a[href^='product.html']"); if (a && p.wix) a.setAttribute("href", pdpUrl(p));
      }
    });

    hideEmptyContent();
    observeReveals();
  }

  // Nothing is filled in on the site's side: text, buttons, links and photos Wix leaves empty are hidden.
  function hideSection(el) { var s = el.closest("section"); if (s) { s.hidden = true; s.setAttribute("data-empty", ""); } }
  function hideEmptyContent() {
    $$("[data-cms]").forEach(function (el) {
      if (el.textContent.trim()) return;
      el.hidden = true;
      var wrap = el.closest(".btn, .x-link");
      if (wrap && !wrap.textContent.trim()) wrap.hidden = true;
    });
    $$("[data-cms-href]").forEach(function (a) {
      if (a.getAttribute("href") !== "#") return;
      if ($("img", a)) a.removeAttribute("href"); else a.hidden = true;
    });
  }

  /* ==========================================================================
     BRIDE GALLERY  (homepage #SanjhShringarBride row + Our Story gallery)
     ========================================================================== */
  // Only links into this site (a page, or a full address on this site's domain)
  function safeLink(u) {
    u = String(u || "").trim();
    if (/^(\/(?!\/)|[a-z0-9-]+\.html)/i.test(u)) return u;
    try { var x = new URL(u); if (x.origin === location.origin) return x.pathname.replace(/^\//, "") + x.search + x.hash; } catch (e) { /* not a URL */ }
    return "";
  }
  // Where "Shop her look" goes: the picked Wix product, else an on-site Outfit Link
  function lookLink(b, P) {
    var p = b.productId && (P || []).filter(function (x) { return x.id === b.productId; })[0];
    return p ? { href: pdpUrl(p), name: p.name } : { href: safeLink(b.link), name: "" };
  }
  function fitBrideRow() {
    var row = $("[data-brides-row]");
    if (!row) return;
    var shown = $$("a", row).filter(function (a) { var im = $("img", a); return im && !im.hidden && im.getAttribute("src"); });
    $$("a", row).forEach(function (a) { a.hidden = shown.indexOf(a) < 0; });
    if (!shown.length) { hideSection(row); return; }
    row.style.setProperty("--n", shown.length);
    row.classList.toggle("insta--few", shown.length < 6);
  }
  function applyBrides(B, P, C) {
    applyReviews(B || [], P, C);
    if (!B || !B.length) { fitBrideRow(); return; }
    // Homepage row: brides marked "Show on Homepage" (or all, if none are marked) take the first slots
    var row = $("[data-brides-row]");
    if (row) {
      var picks = B.filter(function (b) { return b.home; });
      if (!picks.length) picks = B;
      var max = countFor(row, C);
      $$("a", row).forEach(function (a, i) {
        if (i >= max) { var x = $("img", a); if (x) { x.hidden = true; x.removeAttribute("src"); } return; }
        var b = picks[i]; if (!b) return;
        var im = $("img", a); if (!im) return;
        im.src = b.thumb; im.alt = b.name ? b.name + ", a Sanjh Shringar bride" : "A Sanjh Shringar bride"; im.hidden = false;
        a.setAttribute("href", lookLink(b, P).href || "about.html#brides");
        a.setAttribute("aria-label", b.name ? "See " + b.name + "'s look" : "See our brides");
        var cap = $(".insta__cap", a) || a.appendChild(document.createElement("span"));
        cap.className = "insta__cap"; cap.textContent = b.name || "";
      });
    }
    fitBrideRow();
    // Our Story page: the full gallery
    var gal = $("[data-brides-gallery]");
    if (gal) {
      gal.innerHTML = B.map(function (b, i) {
        var look = lookLink(b, P), link = look.href;
        return '<figure class="bride reveal" data-delay="' + (i % 3) * 80 + '">' +
          '<div class="bride__img media"><img src="' + esc(b.photo) + '" alt="' + esc(b.name ? b.name + ", a Sanjh Shringar bride" : "A Sanjh Shringar bride") + '" loading="lazy"></div>' +
          '<figcaption>' + (b.name ? '<strong class="bride__name">' + esc(b.name) + "</strong>" : "") +
            (b.caption ? '<span class="bride__cap">' + esc(b.caption) + "</span>" : "") +
            (b.review ? '<span class="bride__review">“' + esc(b.review) + "”</span>" : "") +
            (link ? '<a class="x-link" href="' + esc(link) + '">' + (look.name ? "Shop the " + esc(look.name) : "Shop her look") + ' <svg class="icon"><use href="#i-arrow"/></svg></a>' : "") +
          "</figcaption></figure>";
      }).join("");
      var sec = gal.closest("[data-brides-section]"); if (sec) sec.hidden = false;
      observeReveals();
    }
  }

  /* Reviews: Brides entries with "Her review" filled in fill the homepage quote section
     (one at a time, changing every 7 seconds). Without any, the quote.* rows are used
     only when quote.show = yes. quote.show = no always hides it. */
  function stars(n) {
    var one = '<svg class="icon icon--fill"><use href="#i-star"/></svg>', s = "";
    for (var i = 0; i < n; i++) s += one;
    return s;
  }
  function applyReviews(B, P, C) {
    var sec = $("[data-cms-section='quote']");
    if (!sec) return;
    var show = String((C && C["quote.show"] && C["quote.show"].text) || "").trim().toLowerCase();
    var R = B.filter(function (b) { return b.review; });
    if (!R.length || /^(no|hide|hidden|off|false|0)$/.test(show)) return;
    R = R.slice(0, C && C["quote.count"] ? countFor(sec, C) : 6);
    var im = $("[data-cms-img='quote.image']", sec), bq = $("blockquote", sec), cap = $("figcaption", sec), st = $(".stars", sec);
    var i = 0;
    function put(b) {
      if (im) { im.src = b.photo; im.alt = b.name ? b.name + ", a Sanjh Shringar bride" : "A Sanjh Shringar bride"; im.hidden = false; }
      if (bq) { bq.textContent = "“" + b.review.replace(/^["“]|["”]$/g, "") + "”"; bq.hidden = false; }
      var look = lookLink(b, P);
      if (cap) { cap.textContent = [b.name, look.name].filter(Boolean).join(" · "); cap.hidden = !cap.textContent; }
      if (st) { st.innerHTML = stars(b.rating || 5); st.hidden = !b.rating; st.setAttribute("aria-label", (b.rating || 5) + " out of 5 stars"); }
    }
    put(R[0]);
    sec.hidden = false; sec.removeAttribute("data-empty");
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (R.length > 1 && !reduce) setInterval(function () {
      i = (i + 1) % R.length;
      sec.classList.add("is-swapping");
      setTimeout(function () { put(R[i]); sec.classList.remove("is-swapping"); }, 350);
    }, 7000);
  }

  /* ==========================================================================
     BOOT (runs once products are known)
     ========================================================================== */
  function boot(P, C) {
    var LIVE = !!W;
    var wish = load("ss_wish", []);

    function byHandle(h) {
      if (!h) return null;
      var hs = slugify(h);
      return P.filter(function (p) { return p.h === h; })[0]
        || P.filter(function (p) { return slugify(p.name) === hs || p.h === hs; })[0]
        || P.filter(function (p) { return p.h.indexOf(hs) === 0 || hs.indexOf(p.h) === 0 || slugify(p.name).indexOf(hs) === 0; })[0]
        || null;
    }
    function inCol(p, c) {
      if (c === "under-3k") return p.price <= 3000;
      return !c || c === "all" || p.cols.indexOf(c) > -1;
    }
    function hasChoices(p) { return LIVE ? (p.options || []).length > 0 : (p.sizes || []).length > 0; }

    /* ---------- Cards ---------- */
    function card(p) {
      var wished = wish.indexOf(p.h) > -1;
      var off = p.was ? Math.round((1 - p.price / p.was) * 100) : 0;
      var tag = p.was ? '<span class="tag tag--sale">' + off + "% off</span>" : (p.tag ? '<span class="tag tag--gold">' + esc(p.tag) + "</span>" : "");
      var main = p.images[0] ? '<img class="card__img" src="' + esc(p.images[0]) + '" alt="' + esc(p.name) + '" loading="lazy">' : "";
      var hover = p.images[1] ? '<img class="card__img2" src="' + esc(p.images[1]) + '" alt="" loading="lazy">' : "";
      var quickLabel = LIVE && hasChoices(p) ? "Choose size" : "Quick add";
      return '<article class="card">' +
        '<div class="card__media">' + main + hover +
          '<div class="card__tags">' + tag + "</div>" +
          '<button class="card__wish" data-wish="' + esc(p.h) + '" aria-label="Save ' + esc(p.name) + ' to wishlist" aria-pressed="' + wished + '"><svg class="icon"><use href="#i-heart"/></svg></button>' +
          '<button class="btn btn--primary card__quick" data-quick="' + esc(p.h) + '">' + quickLabel + "</button>" +
        "</div>" +
        '<div class="card__body">' +
          '<h3 class="card__name"><a href="product.html?p=' + encodeURIComponent(p.h) + '">' + esc(p.name) + "</a></h3>" +
          '<p class="card__meta">' + esc(p.occasion || "") + "</p>" +
          '<p class="price">' + inr(p.price) + (p.was ? " <s>" + inr(p.was) + '</s> <span class="save">Save ' + inr(p.was - p.price) + "</span>" : "") + "</p>" +
        "</div></article>";
    }

    $$("[data-grid]").forEach(function (g) {
      var c = g.getAttribute("data-collection"), n = countFor(g, C);
      var cat = g.getAttribute("data-category");
      var list = cat ? P.filter(function (p) { return inCat(p, cat); }) : [];
      if (!list.length) list = P.filter(function (p) { return inCol(p, c); });
      if (!list.length) { g.innerHTML = ""; hideSection(g); return; }
      g.innerHTML = list.slice(0, n).map(card).join("");
    });

    /* ---------- Wishlist (saved in this browser) ---------- */
    function updateWishUI() {
      var b = $("[data-wish-count]");
      if (b) { b.textContent = wish.length; b.hidden = wish.length === 0; }
      $$("[data-wish]").forEach(function (btn) { btn.setAttribute("aria-pressed", String(wish.indexOf(btn.getAttribute("data-wish")) > -1)); });
      var pw = $("[data-pdp-wish]");
      if (pw) pw.setAttribute("aria-pressed", String(wish.indexOf(pw.getAttribute("data-h")) > -1));
    }
    function toggleWish(h) {
      var i = wish.indexOf(h), p = byHandle(h);
      if (i > -1) { wish.splice(i, 1); showToast("Removed from your wishlist"); }
      else { wish.push(h); showToast((p ? p.name : "Item") + " saved to your wishlist"); }
      save("ss_wish", wish); updateWishUI();
      if (shopGrid && col === "wishlist") renderShop();
    }

    /* ======================================================================
       CART — one interface, two engines
       ====================================================================== */
    var local = load("ss_cart", []);
    var Cart = LIVE ? {
      view: function () { return W.getCart(); },
      add: function (p, sel, qty) { return W.addToCart(p.id, sel.variantId, qty); },
      qty: function (lineId, q) { return W.updateLine(lineId, q); },
      remove: function (lineId) { return W.removeLine(lineId); },
      checkout: function () { return W.checkout(); }
    } : {
      view: function () {
        var lines = local.map(function (i) {
          var p = byHandle(i.h); if (!p) return null;
          return { lineId: i.k, name: p.name, qty: i.q, total: p.price * i.q, desc: "Size: " + i.s + (i.x ? " · " + i.x : ""), image: p.images[0], slug: p.h };
        }).filter(Boolean);
        return Promise.resolve({ lines: lines, count: lines.reduce(function (s, l) { return s + l.qty; }, 0), subtotal: lines.reduce(function (s, l) { return s + l.total; }, 0) });
      },
      add: function (p, sel, qty) {
        var key = p.h + "|" + sel.label + "|" + (sel.extras || "");
        var line = local.filter(function (i) { return i.k === key; })[0];
        if (line) line.q += qty; else local.push({ k: key, h: p.h, s: sel.label, q: qty, x: sel.extras || "" });
        save("ss_cart", local); return this.view();
      },
      qty: function (lineId, q) {
        local = local.map(function (i) { if (i.k === lineId) i.q = q; return i; }).filter(function (i) { return i.q > 0; });
        save("ss_cart", local); return this.view();
      },
      remove: function (lineId) { local = local.filter(function (i) { return i.k !== lineId; }); save("ss_cart", local); return this.view(); },
      checkout: function () { return Promise.reject(new Error("demo")); }
    };

    var cartState = { lines: [], count: 0, subtotal: 0 }, busy = false;
    function setBusy(on) { busy = on; var b = $("[data-cart-body]"); if (b) b.classList.toggle("is-busy", on); }

    function renderCart(c) {
      cartState = c || cartState;
      var n = cartState.count, badge = $("[data-bag-count]");
      if (badge) { badge.textContent = n; badge.hidden = n === 0; }
      var body = $("[data-cart-body]"), foot = $("[data-cart-foot]");
      if (!body) return;
      if (!cartState.lines.length) {
        body.innerHTML = '<div class="cart__empty"><svg class="icon icon--lg"><use href="#i-bag"/></svg><p class="h3">Your bag is empty</p><p>Let’s find something beautiful for your celebration.</p><a class="btn btn--primary" href="shop.html?c=bridal">Shop bridal</a><a class="link-arrow" href="shop.html?c=bridesmaids">Or browse bridesmaids <svg class="icon"><use href="#i-arrow"/></svg></a></div>';
        foot.innerHTML = ""; return;
      }
      body.innerHTML = cartState.lines.map(function (l) {
        var lp = !l.slug && l.productId ? P.filter(function (x) { return x.id === l.productId; })[0] : null;
        var slug = l.slug || (lp && lp.h);
        var href = slug ? "product.html?p=" + encodeURIComponent(slug) : "#";
        return '<div class="cart__item"><a href="' + href + '">' + (l.image ? '<img src="' + esc(l.image) + '" alt="">' : "") + '</a><div class="cart__info">' +
          '<a class="cart__name" href="' + href + '">' + esc(l.name) + "</a>" +
          (l.desc ? '<span class="cart__meta">' + esc(l.desc) + "</span>" : "") +
          '<div class="cart__row"><div class="qty qty--sm"><button data-cq="' + esc(l.lineId) + '" data-q="' + (l.qty - 1) + '" aria-label="Decrease"><svg class="icon"><use href="#i-minus"/></svg></button><span>' + l.qty + '</span><button data-cq="' + esc(l.lineId) + '" data-q="' + (l.qty + 1) + '" aria-label="Increase"><svg class="icon"><use href="#i-plus"/></svg></button></div>' +
          "<strong>" + inr(l.total) + "</strong></div>" +
          '<button class="cart__remove" data-cr="' + esc(l.lineId) + '"><svg class="icon"><use href="#i-trash"/></svg> Remove</button></div></div>';
      }).join("");
      var waText = "Hi Sanjh Shringar, I'd like to order: " + cartState.lines.map(function (l) { return l.name + (l.desc ? " (" + l.desc + ")" : "") + " x" + l.qty; }).join(", ");
      foot.innerHTML =
        '<div class="cart__total"><span>Subtotal</span><strong>' + inr(cartState.subtotal) + "</strong></div>" +
        '<p class="cart__note">' + (LIVE ? "Shipping and taxes are calculated at checkout." : "Taxes included.") + " Custom sizing is free and confirmed with your stylist after you order.</p>" +
        (LIVE ? '<button class="btn btn--primary btn--block" data-checkout><svg class="icon"><use href="#i-shield"/></svg> Secure checkout</button>' : "") +
        '<a class="btn ' + (LIVE ? "btn--outline" : "btn--wa") + ' btn--block" href="' + WA + "?text=" + encodeURIComponent(waText) + '"><svg class="icon"><use href="#i-chat"/></svg> Order on WhatsApp</a>';
    }
    function refreshCart() { return Cart.view().then(renderCart).catch(function () { renderCart(); }); }

    function addToBag(p, sel, qty) {
      if (busy) return Promise.resolve();
      setBusy(true);
      return Cart.add(p, sel, qty || 1).then(function (c) {
        renderCart(c);
        showToast(p.name + (sel.label ? " (" + sel.label + ")" : "") + " added to your bag");
      }).catch(function (e) {
        showToast(e && e.message && e.message !== "demo" ? e.message : "Couldn't add to bag. Please try again.");
        throw e;
      }).finally(function () { setBusy(false); });
    }

    function quickAdd(h) {
      var p = byHandle(h); if (!p) return;
      if (LIVE && hasChoices(p)) { location.href = "product.html?p=" + encodeURIComponent(p.h); return; }
      var size = (p.sizes || []).filter(function (s) { return (p.soldOut || []).indexOf(s) < 0; })[0] || "One size";
      var variantId = LIVE && p.variants && p.variants[0] ? p.variants[0].id : undefined;
      addToBag(p, { label: size, variantId: variantId }).then(function () { openLayer(cartEl); }, function () {});
    }

    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-cq],[data-cr],[data-checkout],[data-wish],[data-quick]");
      if (!t) return;
      if (t.hasAttribute("data-wish")) { e.preventDefault(); toggleWish(t.getAttribute("data-wish")); return; }
      if (t.hasAttribute("data-quick")) { e.preventDefault(); quickAdd(t.getAttribute("data-quick")); return; }
      if (busy) return;
      if (t.hasAttribute("data-checkout")) {
        t.disabled = true; t.innerHTML = "Opening secure checkout…";
        Cart.checkout().catch(function (err) {
          showToast(err.message || "Checkout is unavailable. Please order on WhatsApp.");
          renderCart();
        });
        return;
      }
      setBusy(true);
      var op = t.hasAttribute("data-cr") ? Cart.remove(t.getAttribute("data-cr")) : Cart.qty(t.getAttribute("data-cq"), +t.getAttribute("data-q"));
      op.then(renderCart).catch(function () { showToast("Couldn't update your bag. Please try again."); })
        .finally(function () { setBusy(false); });
    });

    /* ---------- Search ---------- */
    var sInput = $("#search-input"), sResults = $("[data-search-results]");
    function runSearch(q) {
      q = q.trim().toLowerCase();
      if (!q) { sResults.innerHTML = '<p class="search__hint">Try "lehenga", "blue" or "modest".</p>'; return; }
      var hits = P.filter(function (p) {
        return (p.name + " " + (p.occasion || "") + " " + p.cols.join(" ") + " " + (p.catNames || []).join(" ") + " " + (p.desc || "")).toLowerCase().indexOf(q) > -1;
      });
      sResults.innerHTML = hits.length
        ? '<p class="search__hint">' + hits.length + " result" + (hits.length > 1 ? "s" : "") + '</p><div class="search__grid">' + hits.slice(0, 8).map(function (p) {
            return '<a class="search__hit" href="product.html?p=' + encodeURIComponent(p.h) + '">' + (p.images[0] ? '<img src="' + esc(p.images[0]) + '" alt="" loading="lazy">' : "") + "<span>" + esc(p.name) + "</span><strong>" + inr(p.price) + "</strong></a>";
          }).join("") + "</div>"
        : '<p class="search__hint">No matches for "' + esc(q) + '". Message us and we\'ll help you find it.</p>';
    }
    if (sInput) {
      sInput.addEventListener("input", function () { runSearch(sInput.value); });
      $$("[data-q]").forEach(function (b) { b.addEventListener("click", function () { sInput.value = b.getAttribute("data-q"); runSearch(sInput.value); sInput.focus(); }); });
      runSearch("");
    }

    /* ---------- Shop page ---------- */
    var shopGrid = $("[data-shop-grid]");
    var col = params.get("c") || "all";
    var state = { sizes: [], price: col === "under-3k" ? "0-3000" : "all", sale: false, sort: "featured" };
    function renderShop() {
      if (!shopGrid) return;
      var list = col === "wishlist" ? P.filter(function (p) { return wish.indexOf(p.h) > -1; })
        : (col === "under-3k" ? P : P.filter(function (p) { return inCol(p, col); }));
      if (state.sizes.length) list = list.filter(function (p) { return state.sizes.some(function (s) { return (p.sizes || []).indexOf(s) > -1 && (p.soldOut || []).indexOf(s) < 0; }); });
      if (state.price !== "all") { var r = state.price.split("-"); list = list.filter(function (p) { return p.price >= +r[0] && (r[1] === "3000" ? p.price <= 3000 : p.price < +r[1]); }); }
      if (state.sale) list = list.filter(function (p) { return p.was; });
      var s = state.sort;
      list = list.slice().sort(function (a, b) {
        if (s === "price-asc") return a.price - b.price;
        if (s === "price-desc") return b.price - a.price;
        if (s === "discount") return ((b.was || b.price) - b.price) - ((a.was || a.price) - a.price);
        if (s === "name") return a.name.localeCompare(b.name);
        return 0;
      });
      shopGrid.innerHTML = list.map(card).join("");
      $("[data-shop-count]").textContent = list.length + (list.length === 1 ? " piece" : " pieces");
      $("[data-shop-empty]").hidden = list.length > 0;
      if (col === "under-3k") {
        var priceMetas = {
          "0-3000": COLS["under-3k"],
          "all": COLS.all,
          "3000-10000": { title: "₹3,000 – ₹10,000", eyebrow: "Shop by price", intro: "Curated pieces between ₹3,000 and ₹10,000." },
          "10000-999999": { title: "₹10,000 & above", eyebrow: "Shop by price", intro: "Bridal & couture pieces ₹10,000 and above." }
        };
        setShopMeta(priceMetas[state.price] || COLS.all);
        var isU3k = state.price === "0-3000";
        var allTab = $("[data-shop-tabs] a");
        if (allTab) allTab.setAttribute("aria-selected", String(state.price === "all"));
        $$("[data-nav]").forEach(function (a) {
          var k = a.getAttribute("data-nav");
          if (k === "under-3k" || k === "collection") {
            if ((isU3k && k === "under-3k") || (!isU3k && k === "collection")) a.setAttribute("aria-current", "page");
            else a.removeAttribute("aria-current");
          }
        });
      }
      if (col === "wishlist" && !list.length) {
        $("[data-empty-title]").textContent = "Your wishlist is waiting";
        $("[data-empty-text]").textContent = "Tap the heart on any outfit to save it here.";
      }
      updateWishUI();
    }
    if (shopGrid) {
      var allSizes = [];
      P.forEach(function (p) { (p.sizes || []).forEach(function (s) { if (!/custom/i.test(s) && allSizes.indexOf(s) < 0) allSizes.push(s); }); });
      var order = ["XS", "S", "M", "L", "XL", "XXL"];
      allSizes.sort(function (a, b) { return order.indexOf(a.toUpperCase()) - order.indexOf(b.toUpperCase()); });
      $("[data-filter-sizes]").innerHTML = allSizes.map(function (s) {
        return '<label class="chip"><input type="checkbox" name="fsize" value="' + esc(s) + '"><span>' + esc(s) + "</span></label>";
      }).join("");
      $$("input[name=fsize]").forEach(function (i) { i.addEventListener("change", function () { state.sizes = $$("input[name=fsize]:checked").map(function (x) { return x.value; }); renderShop(); }); });
      $$("input[name=price]").forEach(function (i) { i.addEventListener("change", function () { state.price = i.value; renderShop(); }); });
      $("input[name=sale]").addEventListener("change", function (e) { state.sale = e.target.checked; renderShop(); });
      $("[data-shop-sort]").addEventListener("change", function (e) { state.sort = e.target.value; renderShop(); });
      $("[data-clear-filters]").addEventListener("click", function () {
        var defPrice = col === "under-3k" ? "0-3000" : "all";
        state = { sizes: [], price: defPrice, sale: false, sort: state.sort };
        $$("input[name=fsize], input[name=sale]").forEach(function (i) { i.checked = false; });
        $("input[name=price][value='" + defPrice + "']").checked = true;
        renderShop();
      });
      renderShop();
    }

    /* ---------- Product page ---------- */
    function isAvailable(p) {
      if (!p) return false;
      if (p.inStock === false || p.quantity === 0) return false;
      if (p.variants && p.variants.length && !p.variants.some(function (v) { return v.inStock; })) return false;
      if (p.sizes && p.sizes.length && p.sizes.every(function (s) { return (p.soldOut || []).indexOf(s) > -1; })) return false;
      return true;
    }

    if ($("[data-pdp-name]")) {
      var slug = params.get("p");
      var base = slug ? byHandle(slug) : P[0];
      var pdpP = LIVE && (base || slug)
        ? W.loadProduct(base ? base.h : slug).then(function (full) {
            if (!full) return base || null;
            return base ? Object.assign({}, base, full, { cols: base.cols.length ? base.cols : full.cols }) : full;
          }).catch(function () { return base || null; })
        : Promise.resolve(base || null);
      pdpP.then(renderPdp);
    }

    function renderPdp(p) {
      var skel = $("[data-pdp-skel]");
      var wrap = $("[data-pdp-wrap]");
      var empty = $("[data-pdp-empty]");
      var stickyWrap = $("[data-sticky-wrap]");
      var relWrap = $("[data-related-wrap]");
      if (skel) skel.hidden = true;

      if (!p || !isAvailable(p)) {
        if (wrap) wrap.hidden = true;
        if (stickyWrap) stickyWrap.hidden = true;
        if (empty) {
          empty.hidden = false;
          var outOfStock = !!p;
          $("[data-pdp-crumb]").textContent = outOfStock ? p.name : "Not found";
          $("[data-pdp-empty-title]").textContent = outOfStock ? "Currently out of stock" : "Product not found";
          $("[data-pdp-empty-text]").textContent = outOfStock
            ? p.name + " is currently sold out. Browse similar pieces or ask a stylist about restock & custom orders."
            : "We couldn't find that piece. Browse the collection or message our stylists for help.";
          var waBtn = $("[data-pdp-empty-wa]");
          if (waBtn) waBtn.href = WA + "?text=" + encodeURIComponent(outOfStock ? "Hi Sanjh Shringar, is " + p.name + " available for a custom order?" : "Hi Sanjh Shringar, I'm looking for an outfit.");
          document.title = (outOfStock ? p.name : "Product not found") + " | Sanjh Shringar";
        }
        var avail = P.filter(isAvailable).slice(0, 4);
        if (relWrap) relWrap.hidden = !avail.length;
        if (avail.length && $("[data-related]")) $("[data-related]").innerHTML = avail.map(card).join("");
        return;
      }

      if (empty) empty.hidden = true;
      if (wrap) wrap.hidden = false;
      if (stickyWrap) stickyWrap.hidden = false;
      document.title = p.name + " | Sanjh Shringar";
      var colKey = p.cols[0] || "all";
      $("[data-pdp-col]").textContent = (COLS[colKey] || COLS.all).title;
      $("[data-pdp-col]").href = "shop.html" + (colKey === "all" ? "" : "?c=" + colKey);
      $("[data-pdp-crumb]").textContent = p.name;
      $("[data-pdp-occasion]").textContent = p.occasion || "";
      $("[data-pdp-name]").textContent = p.name;
      $("[data-pdp-desc]").textContent = p.desc || "";
      $("[data-pdp-details]").innerHTML = (p.details || []).map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("") || "<li>Made to your measurements</li>";
      $("[data-pdp-tags]").innerHTML = p.tag && !p.was ? '<span class="tag tag--gold">' + esc(p.tag) + "</span>" : "";

      function showPrice(price, was) {
        var off = was ? Math.round((1 - price / was) * 100) : 0;
        $("[data-pdp-price]").innerHTML = "<strong>" + inr(price) + "</strong>" + (was ? "<s>" + inr(was) + '</s><span class="tag tag--sale">' + off + "% off</span>" : "") + "<small>" + (LIVE ? "Shipping calculated at checkout" : "Inclusive of all taxes") + " · Free custom sizing</small>";
        $("[data-pdp-emi]").innerHTML = price >= 3000 ? "Or pay in 3 easy instalments of <strong>" + inr(Math.ceil(price / 3)) + "</strong> with UPI / card EMI" : "Add sleeves or a custom fit, free.";
        $("[data-sticky-price]").textContent = inr(price);
      }
      showPrice(p.price, p.was);

      // Gallery
      var cur = 0, imgs = p.images.length ? p.images : [""];
      var mainImg = $("[data-pdp-main]");
      function show(i) {
        cur = (i + imgs.length) % imgs.length;
        mainImg.src = imgs[cur]; mainImg.alt = p.name + ", image " + (cur + 1) + " of " + imgs.length;
        $$(".gallery__thumb").forEach(function (t, k) { t.setAttribute("aria-current", String(k === cur)); });
      }
      $("[data-pdp-thumbs]").innerHTML = imgs.map(function (src, i) { return '<button class="gallery__thumb" data-i="' + i + '" aria-label="Show image ' + (i + 1) + '"><img src="' + esc(src) + '" alt=""></button>'; }).join("");
      if (imgs.length < 2) $$(".gallery__nav, .gallery__thumbs").forEach(function (el) { el.hidden = true; });
      $$(".gallery__thumb").forEach(function (t) { t.addEventListener("click", function () { show(+t.getAttribute("data-i")); }); });
      $$("[data-gal]").forEach(function (b) { b.addEventListener("click", function () { show(cur + +b.getAttribute("data-gal")); }); });
      var sx = null;
      mainImg.parentNode.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
      mainImg.parentNode.addEventListener("touchend", function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1)); sx = null; });
      show(0);

      // Options → chips (generic: works for Wix options and the local catalogue)
      var opts = LIVE ? (p.options || []) : [
        { id: "size", name: "Size", choices: (p.sizes || []).map(function (s) { return { id: s, name: s, inStock: (p.soldOut || []).indexOf(s) < 0 }; }).concat([{ id: "Custom", name: "Custom (free)", inStock: true }]) }
      ].concat(p.colors ? [{ id: "color", name: "Colour", choices: p.colors.map(function (c) { return { id: c, name: c, inStock: true }; }) }] : []);
      var sel = {};
      $("[data-pdp-colors-wrap]").hidden = true;
      $("[data-pdp-sizes]").innerHTML = opts.map(function (o) {
        return '<div class="opt-group" data-opt="' + esc(o.id) + '">' + '<p class="opt-group__name">' + esc(o.name) + "</p>" +
          '<div class="chips">' + o.choices.map(function (c) {
            var out = !c.inStock;
            return '<label class="chip' + (out ? " chip--out" : "") + (/custom/i.test(c.name) || c.name.length > 4 ? " chip--wide" : "") + '"><input type="radio" name="opt-' + esc(o.id) + '" value="' + esc(c.id) + '" data-name="' + esc(c.name) + '"' + (out ? " disabled" : "") + "><span>" + esc(c.name) + (out ? '<span class="sr-only"> (sold out)</span>' : "") + "</span></label>";
          }).join("") + "</div></div>";
      }).join("");
      if (!opts.length) $(".opt").hidden = true;
      var customBox = $("#custom-box");
      if (LIVE) $$("#custom-box .chip").forEach(function (el) { el.hidden = true; });

      function variantFor() {
        if (!LIVE) return null;
        if (!opts.length) return (p.variants || [])[0] || null;
        if (opts.some(function (o) { return !sel[o.id]; })) return null;
        return (p.variants || []).filter(function (v) { return opts.every(function (o) { return v.choiceIds[o.id] === sel[o.id]; }); })[0] || null;
      }
      $$("[data-pdp-sizes] input").forEach(function (r) {
        r.addEventListener("change", function () {
          var oid = r.name.slice(4);
          sel[oid] = r.value;
          $("[data-size-error]").textContent = "";
          customBox.classList.toggle("is-open", $$("[data-pdp-sizes] input:checked").some(function (x) { return /custom/i.test(x.getAttribute("data-name")); }));
          var v = variantFor();
          if (v) { showPrice(v.price, p.was && v.price < p.was ? p.was : null); if (!v.inStock) $("[data-size-error]").textContent = "This combination is sold out. Try another, or ask a stylist."; }
        });
      });

      function addPdp() {
        var missing = opts.filter(function (o) { return !sel[o.id]; })[0];
        if (missing) {
          $("[data-size-error]").textContent = "Please choose a " + missing.name.toLowerCase() + (/size/i.test(missing.name) ? ", or pick Custom for a perfect fit." : ".");
          $("[data-pdp-sizes]").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
          return;
        }
        var labels = $$("[data-pdp-sizes] input:checked").map(function (x) { return x.getAttribute("data-name"); });
        var extras = [];
        if (!LIVE && $("input[name=sleeves]").checked && /custom/i.test(labels.join())) extras.push("Sleeves");
        if (!LIVE && $("input[name=lining]").checked && /custom/i.test(labels.join())) extras.push("Lining");
        var v = variantFor();
        if (LIVE && opts.length && !v) { $("[data-size-error]").textContent = "That combination isn't available."; return; }
        if (v && !v.inStock) { $("[data-size-error]").textContent = "This combination is sold out."; return; }
        addToBag(p, { label: labels.join(" / "), variantId: v ? v.id : undefined, extras: extras.join(", ") }, Math.max(1, +$("#qty").value || 1))
          .then(function () { openLayer(cartEl); }, function () {});
      }
      $("[data-pdp-add]").addEventListener("click", addPdp);
      $("[data-sticky-add]").addEventListener("click", addPdp);
      var pw = $("[data-pdp-wish]"); pw.setAttribute("data-h", p.h);
      pw.addEventListener("click", function () { toggleWish(p.h); });

      $("[data-pdp-wa]").href = WA + "?text=" + encodeURIComponent("Hi Sanjh Shringar, I'm interested in the " + p.name + " (" + inr(p.price) + ").");
      $("[data-pdp-video]").href = WA + "?text=" + encodeURIComponent("Hi, I'd like a video call to see the " + p.name + ".");
      $("[data-sticky-img]").src = imgs[0];
      $("[data-sticky-name]").textContent = p.name;

      var related = P.filter(function (x) { return isAvailable(x) && x.h !== p.h && x.cols.some(function (c) { return p.cols.indexOf(c) > -1; }); });
      if (related.length < 4) related = related.concat(P.filter(function (x) { return isAvailable(x) && x.h !== p.h && related.indexOf(x) < 0; }));
      if (relWrap) relWrap.hidden = !related.length;
      $("[data-related]").innerHTML = related.slice(0, 4).map(card).join("");
      updateWishUI();

      $$("[data-qty]").forEach(function (b) {
        b.addEventListener("click", function () {
          var input = $("#qty");
          input.value = Math.max(1, Math.min(20, (parseInt(input.value, 10) || 1) + parseInt(b.getAttribute("data-qty"), 10)));
        });
      });
      var sizeModal = $("#size-guide");
      $$("[data-open-size]").forEach(function (b) { b.addEventListener("click", function () { if (sizeModal.showModal) sizeModal.showModal(); }); });
      $$("[data-close-size]").forEach(function (b) { b.addEventListener("click", function () { sizeModal.close(); }); });
      var sticky = $(".sticky-atc"), mainAtc = $("#main-atc");
      if (sticky && "IntersectionObserver" in window) {
        new IntersectionObserver(function (en) { sticky.classList.toggle("is-show", !en[0].isIntersecting && en[0].boundingClientRect.top < 0); }).observe(mainAtc);
      }
    }

    refreshCart();
    updateWishUI();
    observeReveals();
  }

  /* ==========================================================================
     STATIC FEATURES (no product data needed)
     ========================================================================== */

  // Wedding-date checker — lead times are placeholders; set to your real timings.
  var PRODUCTION_DAYS = 21, SHIPPING_DAYS = 7, BUFFER_DAYS = 7;
  var dateForm = $("#date-check");
  if (dateForm) {
    var dateInput = $("input[type=date]", dateForm);
    var today = new Date(); today.setHours(0, 0, 0, 0);
    dateInput.min = today.toISOString().slice(0, 10);
    dateForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var out = $(".date-check__out", dateForm);
      if (!dateInput.value) { out.className = "date-check__out is-warn"; out.textContent = "Please pick your function date first."; return; }
      var wedding = new Date(dateInput.value + "T00:00:00");
      var ready = new Date(today); ready.setDate(ready.getDate() + PRODUCTION_DAYS + SHIPPING_DAYS);
      var days = Math.round((wedding - ready) / 86400000);
      var fmt = ready.toLocaleDateString("en-IN", { day: "numeric", month: "long" });
      if (days >= BUFFER_DAYS) { out.className = "date-check__out is-ok"; out.textContent = "Lovely, you're on time. It can reach you by " + fmt + "."; }
      else if (days >= 0) { out.className = "date-check__out is-warn"; out.textContent = "It's close, but possible. Message us on WhatsApp."; }
      else { out.className = "date-check__out is-warn"; out.textContent = "That's very soon. Message us and we'll check ready pieces."; }
    });
  }

  // Newsletter → email to the store (a static site can't write to Wix contacts directly)
  var join = $("#join-form");
  if (join) {
    join.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = $("input[type=email]", join), msg = $(".form-msg", join);
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
      input.setAttribute("aria-invalid", String(!ok));
      if (!ok) { msg.className = "form-msg is-error"; msg.textContent = "Please enter a valid email, for example name@example.com"; return; }
      msg.className = "form-msg is-ok"; msg.textContent = "Thank you! Opening your email app to confirm…";
      location.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent("Join the Sanjh Circle") + "&body=" + encodeURIComponent("Please add me to the Sanjh Circle: " + input.value.trim());
      join.reset();
    });
  }

  // Styling-call booking → WhatsApp message with all details
  var book = $("#book-form");
  if (book) {
    book.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      $$("[required]", book).forEach(function (f) {
        var err = f.parentNode.querySelector(".f__err");
        var bad = !f.value.trim() || (f.type === "tel" && f.value.replace(/\D/g, "").length < 10);
        f.setAttribute("aria-invalid", String(bad));
        if (err) err.textContent = bad ? (f.type === "tel" ? "Please enter a valid 10-digit number." : "This field is required.") : "";
        if (bad && ok) { f.focus(); ok = false; }
      });
      var msg = $(".form-msg", book);
      if (!ok) { msg.className = "form-msg form-msg--dark is-error"; msg.textContent = "Please fix the highlighted fields."; return; }
      var d = new FormData(book);
      var text = "Hi Sanjh Shringar! I'd like to book a free styling call.\nName: " + d.get("name") + "\nPhone: " + d.get("phone") +
        (d.get("date") ? "\nFunction date: " + d.get("date") : "") + "\nShopping for: " + d.get("for") + (d.get("note") ? "\nNotes: " + d.get("note") : "");
      msg.className = "form-msg form-msg--dark is-ok"; msg.textContent = "Opening WhatsApp to send your request…";
      window.open(WA + "?text=" + encodeURIComponent(text), "_blank", "noopener");
      book.reset();
    });
  }

  // Reveal on scroll
  function observeReveals() {
    var reveals = $$(".reveal:not(.is-in)");
    if (!reduceMotion && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
      reveals.forEach(function (el) { el.style.transitionDelay = (el.dataset.delay || 0) + "ms"; io.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add("is-in"); });
    }
  }
  observeReveals();
})();
