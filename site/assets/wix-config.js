/* ==========================================================================
   WIX CONNECTION SETTINGS
   Paste your Wix Headless OAuth "Client ID" below (it is public, not a secret).
   Wix dashboard → Settings → Headless Settings → OAuth apps → copy Client ID.
   Leave it empty to run the site on the built-in demo catalogue.
   ========================================================================== */
window.SS_WIX = {
  clientId: "55821327-443f-4bf7-a684-860c1c89ced4",

  /* ID of the Wix CMS collection with the homepage text and photos
     (Title = key, Text, Image, Link). Shown in the CMS as "Homepage Content". */
  contentCollection: "Import1",

  /* ID of the Wix CMS collection with your brides' photos (not products).
     Shown on the homepage (#SanjhShringarBride row) and the Our Story page. */
  bridesCollection: "Brides",

  /* Map the site's collections to your Wix Stores category names
     (matching ignores case, spaces and symbols). */
  categories: {
    "indo-western": ["Indo Western", "Indo-Western"],
    "party":        ["Cocktail And Reception", "Reception", "Cocktail", "Party Wear"],
    "festive":      ["Sangeet", "Haldi And Mehendi", "Festive"],
    "bridal":       ["Bridal", "Wedding Collection"],
    "bridesmaids":  ["Bridesmaids"],
    "modest":       ["Modest Edit"],
    "lehengas":     ["Lehengas"],
    "sarees":       ["Drape Sarees", "Sarees"],
    "blouses":      ["Designer Blouses", "Blouses"],
    "under-3k":     ["Under 3k", "Under ₹3k", "Lehengas Under 3k"]
  }
};
