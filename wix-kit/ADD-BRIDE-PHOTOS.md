# Bride photos (#SanjhShringarBride)

Brides' own photos live in a **Wix CMS collection called "Brides"**. It is separate from Wix Stores, so these photos never appear as products.

Where they show on the site:
- **Homepage**, in the **#SanjhShringarBride** row: up to 6 photos. Photos marked **Show on Homepage** go here first. If none are marked, the first 6 are used. Any empty slots keep showing product photos.
- **Our Story page**, in a new **"Our brides"** gallery with every photo. The gallery stays hidden until the collection has at least one photo.

## One-time setup (about 5 minutes)

1. Open your Wix dashboard and go to **CMS** (sometimes under *Content Manager*).
2. Click **+ Create Collection**, then **Start from scratch**.
3. Name it exactly **`Brides`**.
   - After creating it, open the collection's **Settings** and check its **Collection ID**. If the ID is not `Brides`, put the real ID in `site/assets/wix-config.js` as `bridesCollection: "..."`.
4. Add these fields. The **Title** field already exists; use it for the bride's name.

   | Field name | Field type | Required? | What it's for |
   |---|---|---|---|
   | Title | Text (already there) | Yes | Bride's name, e.g. `Aisha · Jaipur` |
   | Photo | Image | Yes | Her photo. Entries without a photo are skipped. |
   | Caption | Text | No | One short line, e.g. `Wore the Maroon Floral Lehenga for her pheras` |
   | Outfit Link | URL | No | Link to the outfit she wore, e.g. `product.html?p=maroon-floral-lehenga`. Adds a "Shop her look" link. |
   | Show on Homepage | Boolean | No | Tick to put her in the homepage row |
   | Sort Order | Number | No | 1, 2, 3… to choose the order. Blank entries go last, newest first. |

5. **Let visitors see it.** Open the collection's **Permissions** (*More actions → Permissions & privacy*) and set **"Who can view content"** to **Anyone**. Leave adding, updating and deleting set to **Admin** only.
   - If you skip this, the site can't read the photos and nothing appears.

## Adding a bride

1. In **CMS → Brides**, click **+ Add Item**.
2. Fill in **Title** and upload the **Photo**. Portrait photos work best; the site crops them to 4:5, keeping the top of the photo.
3. Optionally add a Caption and Outfit Link, tick Show on Homepage, and set a Sort Order.
4. Save. The site updates on the next page refresh. **You don't need to re-upload the site ZIP to add photos.**

To remove a bride, delete her item, or clear her Photo field to hide her.

## Before posting

Only post photos the bride has agreed to share. Keep a record of that permission, for example in her WhatsApp chat.

## For the outfit link

Copy the part after the site address from the product page, e.g. `product.html?p=maroon-floral-lehenga`. A full `https://…` address also works.
