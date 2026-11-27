# Deploying to Wix

The storefront is a static site in `site/`, built from `src/` by `tools/build.py`. The Wix CLI (`@wix/cli`, pinned in `package.json`) releases `site/` to the Wix Headless site named in `wix.config.json`:

| Setting | Value |
|---|---|
| `siteId` | `45cded4a-4522-4b27-ae1a-b0d43b4dc17a` (Sanjh Shringar Bridal Lehengas) |
| `appId` | `55821327-443f-4bf7-a684-860c1c89ced4` (the site's OAuth client, same as `site/assets/wix-config.js`) |
| `site.outputDirectory` | `./site` |

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
- The old manual route (`python tools/make_upload_zip.py`, then Edit Frontend → Update Site) still works as a fallback.
