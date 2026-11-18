# BiteBridge Web

React front end for [BiteBridge API](https://github.com/rkparupudi/bitebridge-api): a food ordering platform with live order tracking.

**Stack:** React 18 · TypeScript · Vite · React Router · TanStack Query · Socket.IO client · Stripe Elements

## What's in it

| Who | Screens |
|---|---|
| Customer | Browse and search restaurants, menu with cart, checkout, payment, live order tracking, order history, cancel before the restaurant accepts |
| Restaurant owner | Create restaurants, open/close switch, **live order board** (new orders appear instantly), accept / prepare / ready / out / delivered / reject, menu editor (add, price change, availability, delete), 30-day sales |
| Admin | Every order across the platform (live, filter by status), suspend or reinstate restaurants |

## Run locally

You need the API running first (see the API repo's README). Then:

```bash
npm install
npm run dev
```

Open http://localhost:5173. In development, Vite proxies `/api` and the WebSocket to the API on `localhost:3000`, so there's no CORS setup.

On the sign-in page, local builds show one-click buttons for the seeded demo accounts (customer, owner, admin; password `password123`). Use two browser windows (or one normal and one incognito) to watch an order move between customer and restaurant in real time.

With `PAYMENTS_PROVIDER=fake` on the API, the payment step shows **Pay** and **Simulate a declined card** buttons, so you can test everything without a Stripe account. With real Stripe test keys, it shows Stripe's card form; use card `4242 4242 4242 4242`.

## How it's put together

- `src/api/client.ts`: one typed function per API endpoint; attaches the JWT; signs out on 401.
- `src/auth/AuthContext.tsx`: current user; restores the session from the stored token.
- `src/lib/realtime.ts`: one shared Socket.IO connection. Each `order.updated` event invalidates the matching TanStack Query caches, so every screen re-renders with fresh data; no polling. Uses the WebSocket transport only, so it works behind a load balancer without sticky sessions.
- `src/pages/customer/PaymentPanel.tsx`: Stripe Elements (card data goes straight to Stripe, never our servers), or the local simulator.
- Route guards in `App.tsx` are for user experience only; the API enforces every permission.

## Build for production

```bash
VITE_API_URL=https://api.yourdomain.com npm run build   # outputs static files to dist/
```

`dist/` is a static site. Deployment (S3 + CloudFront) is described in the API repo's `DEPLOYMENT.md`.
