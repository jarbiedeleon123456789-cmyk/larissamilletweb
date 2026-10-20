# Marrows Web (Vue 3)

Public site, staff sign in and staff dashboard for Marrows. Vue 3 (loaded from the jsDelivr CDN, no build tools needed) talking to the Marrows API.

Flow: **Sign in > Dish list > Add / Edit / Delete > Sign out**, plus the public menu and a reservation form.

- `#/` public site (menu loads from `GET /api/menu`, reservation form posts to `/api/reservations`)
- `#/lounge` interactive floor plan; lounge requests use the existing `POST /api/reservations` endpoint, with the selected table and service style included in the note. This API does not provide lounge availability or package booking, so staff must confirm requests.
- `#/sommelier` local palate-based dish suggestions using the menu when available. Profiles are not saved and wine/cellar pairings are not provided by the existing API. Ingredient filters only hide dishes whose descriptions mention those terms; confirm allergies with staff.
- `#/staff` sign in, then the dashboard (Dishes and Reservations tabs)
- The browser only talks to the API. It never connects to the database.
- Tokens are kept in `localStorage`; an expired access token is refreshed automatically.
- The public menu includes Filipino favorites with example prices and marks roasted bone marrow as the bestseller. Dish and hero photos are from Wikimedia Commons and are credited on the page; verify prices and availability before serving.

## Configure

Edit `config.js`:

```js
apiUrl: "https://your-api.onrender.com"   // no trailing slash
```

Also edit the address, phone, email and opening hours there.

## Deploy to Render (static site)

1. Push this folder to its own GitHub repository.
2. Render: New > Static Site (or Blueprint with `render.yaml`).
3. Build command `sh build.sh`, publish directory `dist`.
4. Environment variable `API_URL` = your API URL, no trailing slash. The build writes it into `dist/config.js`.
5. After the site is live, set `CORS_ORIGIN` on the API service to this site's URL and redeploy the API.

## Run locally

Any static server works, for example `python3 -m http.server 5500` in this folder, then open http://localhost:5500.
Set `CORS_ORIGIN=http://localhost:5500` on the API.
