# muwahhid-web

React + TanStack Start (SSR) front end for muwahhid.net. The Laravel API lives in `../muwahhid-backend`.

## Scripts

- `npm run dev`: dev server on http://localhost:5173. `/api` and `/sanctum` are proxied to Laravel on :8000.
- `npm run build`: builds `dist/client` (static assets) and `dist/server/server.js` (SSR handler).
- `npm start`: serves the build with srvx. Set the port with `PORT=…`; the default is 3000, which clashes with a local Gotenberg.

## Environment (`.env.example`)

| Variable | Purpose |
|---|---|
| `VITE_SITE_URL` | Public origin. Every canonical, sitemap and feed URL is built from it. Any origin other than `https://muwahhid.net` is served with `robots.txt: Disallow: /`. |
| `VITE_API_URL` | Public API base that the browser calls (`https://api.muwahhid.net/api`). |
| `API_INTERNAL_URL` | Optional private API base for SSR, e.g. `http://127.0.0.1:8000/api`. |
| `VITE_INDEXNOW_KEY` | Optional. The build emits `/{key}.txt` from it. It must match `INDEXNOW_KEY` in the backend. |

`VITE_*` values are baked in at build time, so rebuild after you change them.

## Production (split domains)

- `muwahhid.net`: run `npm start` under systemd/PM2 behind Nginx (HTTPS, gzip/brotli).
  - Redirect `http→https` and `www→apex` at the edge as well. The app also 301s `www.` and trailing slashes.
- `api.muwahhid.net`: Laravel. Set these in its `.env`:
  - `SESSION_DOMAIN=.muwahhid.net`
  - `SANCTUM_STATEFUL_DOMAINS=muwahhid.net`
  - `FRONTEND_URL=https://muwahhid.net`
  - `CORS_ALLOWED_ORIGINS=https://muwahhid.net`
- SSR HTML for public pages is sent with `Cache-Control: s-maxage=300, stale-while-revalidate`, so a CDN may cache it. Reader, dars and account pages are `private`.

## SEO surface

- Every public page is server-rendered, with title, description, canonical, robots, Open Graph/Twitter tags and JSON-LD (`src/lib/seo.ts`). JSON-LD types:
  - WebSite + SearchAction, Organization
  - Book, ProfilePage/Person
  - CreativeWorkSeries, VideoObject/AudioObject
  - BreadcrumbList, ItemList
- OG images are 1200×630 JPEG cards rendered by the API: `/og/{book|author|series|dars}/{key}.jpg`.
- Crawl files:
  - `/robots.txt`
  - `/sitemap.xml`, an index of `/sitemaps/{static,books,authors,durus}.xml` and `/sitemaps/pages/{book}.xml`, with image and video extensions
  - `/rss.xml`, `/feeds/{books,durus}.xml`, `/authors/{slug}/rss.xml`, and `/feeds/podcast/{series}.xml` for audio series
  - `/manifest.webmanifest`, `/llms.txt`
- Old URLs return 301: `/durus/{id}` and `/durus/series/{slug}` go to `/durus/{series}/{number}` and `/durus/{series}`; `/books` and `/durus` go to `/library`.

After launch, submit `https://muwahhid.net/sitemap.xml` in Google Search Console and Bing Webmaster Tools.
