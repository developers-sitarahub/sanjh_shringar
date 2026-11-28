# Deploying to Wix

The storefront is a static site in `site/`, built from `src/` by `tools/build.py`. The Wix CLI (`@wix/cli`, pinned in `package.json`) releases `site/` to the Wix Headless site named in `wix.config.json`:

| Setting | Value |
|---|---|
| `siteId` | `45cded4a-4522-4b27-ae1a-b0d43b4dc17a` (Sanjh Shringar Bridal Lehengas) |
| `appId` | `55821327-443f-4bf7-a684-860c1c89ced4` (the site's OAuth client, same as `site/assets/wix-config.js`) |
| `site.outputDirectory` | `client: ./site` (pages and assets), `server: ./server` (clean-URL worker) |

## Automatic: push to GitHub

Every push to `main` runs `.github/workflows/deploy-wix.yml`. The workflow:

1. Builds the pages.
2. Runs the connector tests. A failing test stops the deploy.
3. Logs in with `WIX_API_KEY`.
4. Runs `wix release`.

You can also run it by hand from GitHub: **Actions → Deploy to Wix → Run workflow**.

### One-time setup

1. **Create a Wix API key.**
   1. Go to Wix: profile menu → **Account Settings → API Keys** (or https://manage.wix.com/account/api-keys).
   2. Click **Generate API Key** and name it `GitHub deploy`.
   3. Give it access to the **Sanjh Shringar** site, with permissions to manage the site and its code/deployments. If unsure, choose **All site permissions** for that one site only.
   4. Copy the key. It's shown once. Treat it like a password.
2. **Add the key to GitHub.** In the repository, go to **Settings → Secrets and variables → Actions → New repository secret**. Name it `WIX_API_KEY` and paste the key.
3. Push to `main`. The deploy appears under the **Actions** tab, and the log ends with the site URL.

Never commit the API key. Only the secret holds it.

## Manual: from this computer

```bash
npm install              # once
npx wix login            # once; approve in the browser
npm run preview          # build + private preview URL (live site unchanged)
npm run release          # build + test + publish to the live site
```

## Notes

- A release replaces the whole frontend, so `site/` must contain every file. The build does this.
- The site's content (products, photos, text, brides) comes from Wix at page load. Editing it in the Wix dashboard needs no deploy.
- **Clean addresses** (`/shop?c=bridal`, `/product?p=…`, `/about`): `tools/build.py` also generates `server/entry.mjs`, a small worker that Wix runs for any address without a file. It serves the right page and shows a 404 page for unknown addresses. Old `.html` links still work. Links typed into the Wix CMS as `shop.html?c=…` are cleaned in the browser automatically.
- **Local preview:** `npm run serve`, then open http://127.0.0.1:8090 (same clean addresses as the live site).
- **Don't use the old ZIP upload** (Edit Frontend → Update Site) any more. It can't include the worker, so `/shop` and the other clean addresses would show "Page wasn't found".
