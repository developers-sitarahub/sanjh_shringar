# Connect your uploaded site to Wix Stores

Your site is already set up to use Wix Stores. Once connected:
- **Products, prices, photos and sizes** load live from your **Wix dashboard**. Edit a product in Wix, refresh the site, and the change appears.
- **The bag** is Wix's real cart.
- **Secure checkout** opens **Wix's hosted checkout**, and orders arrive in **Wix → Orders**.

You need to do 5 things in Wix. Only step 3 gives you something to send me or paste in.

> Wix's dashboard layout changes from time to time. If a button is named differently, look for the closest match, or send me a screenshot.

---

## 1. Add Wix Stores to the site
1. Open your site's **dashboard** (the site you claimed after uploading).
2. Look for **Add Apps**, **App Market** or **Business Solutions** and add **Wix Stores**.

## 2. Import your 19 products
1. Go to **Store Products** (Catalog → Products), then **⋯ More Actions → Import**.
2. Upload `wix-kit/wix-stores-products-import-v3.csv` from this project.
   - Do this **while your Shopify store is still live**, because the photo links point to Shopify.
   - If photos fail to import, upload them onto each product in the dashboard.
3. Check that the products appear with prices, sale prices and sizes.
4. Make sure the **categories** exist and contain the right products. The site matches them by these names:
   **Bridal**, **Bridesmaids**, **Modest Edit**, **Lehengas**, **Drape Sarees**, **Indo Western**, **Designer Blouses**, **Under 3k**.
   - If you use different names, edit the list in `site/assets/wix-config.js`.
   - Categories can stay hidden in Wix; the site still finds them.
   - Optional: add products to **Homepage Hero**, **Homepage Wedding Edit**, **Homepage Bridal Circle** and **Homepage Lookbook** to hand-pick what the homepage shows. Empty or missing ones fall back to Bridal / Bridesmaids / all products, and empty CMS photos fall back to product photos.
5. In **Inventory**, set size **S** to out of stock for *Mustard Embroidered Lehenga* and *Blue Floral Corset Style Lehenga*.
6. If Wix added **sample products**, delete them from the product list.

## 3. Get your Client ID and allow your web address
1. Go to **Settings → Headless Settings** (sometimes under *Developer tools*). Open the **OAuth app** for this site.
2. **Copy the Client ID.** It's public, not a password, so it's fine to share with me.
3. In the same OAuth app, find **Allowed redirect domains** (or *Allowed domains / URLs*) and add:
   - your site's Wix address, e.g. `your-site.wix-site-host.com`
   - later, your own domain `sanjhshringar.com` and `www.sanjhshringar.com`

   Without this, checkout fails when it tries to return the shopper to your site.

## 4. Turn on payments
1. Go to **Settings → Accept Payments** and connect an Indian provider for UPI and cards (for example Razorpay or PayU, whichever Wix offers you).
2. Wix requires a **premium (Business/eCommerce) plan** to take real payments. Until then, checkout opens but tells shoppers the store can't accept payments yet.
3. Set **shipping rates** (Settings → Shipping & Delivery) and, if needed, **tax**.

## 5. Put the Client ID into the site and re-upload
1. Open `site/assets/wix-config.js` and paste the ID:
   ```js
   clientId: "paste-your-client-id-here",
   ```
   Or send me the ID and I'll do it.
2. Rebuild the upload file:
   ```
   python tools/make_upload_zip.py
   ```
   It should say **Wix Stores: CONNECTED**.
3. In the dashboard, open **Edit Frontend → Update Site** and drop in `wix-upload/sanjh-shringar-site.zip`.
   - A re-upload replaces **all** files, so always upload the full ZIP.

## Test it
1. Open the site. Products should now load from Wix. To confirm, change a price in the dashboard and refresh.
2. Add an item to the bag, then click **Secure checkout**. Wix's checkout page should open.
3. Place a test order (Wix has a test-payment mode) and check that it appears under **Orders**.

If anything fails, the site quietly falls back to its built-in catalogue, so shoppers never see a broken page. Press **F12 → Console** in your browser and send me any line starting with `[Sanjh Shringar]`.

---

### What works how

| Feature | Connected to Wix | Notes |
|---|---|---|
| Products, prices, photos, sizes, stock | ✅ Live from Wix Stores | Managed in the dashboard |
| Bag / cart | ✅ Wix cart | Persists across visits |
| Checkout, payments, order emails | ✅ Wix hosted checkout | Needs a premium plan and a payment method |
| Orders, shipping, refunds | ✅ Wix dashboard | |
| Wishlist | Saved in the shopper's browser | Wix has no visitor wishlist without member accounts |
| Newsletter form | Opens an email to you | Wix forms/contacts aren't available to a static upload |
| Styling-call form | Sends a WhatsApp message to you | Or set up Wix Bookings separately |
| Homepage photos, lookbook, story images | Fixed images in the site files | Change them by editing the HTML and re-uploading |
