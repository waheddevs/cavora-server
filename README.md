# Cavora Server

Cavora Server is the REST/JSON backend for the Cavora React travel-booking application. All API
routes are served below `/cavora`; Swagger UI is available at `/cavora/docs`.

## Local setup

1. Install Node.js 20 or newer and Docker Desktop.
2. Copy `.env.example` to `.env` and replace the security placeholders.
3. Start the transaction-capable development database:

   ```powershell
   docker compose up -d
   ```

4. Install dependencies, seed the 28 stable frontend tours, and start the API:

   ```powershell
   npm install
   npm run seed
   npm run start:dev
   ```

The MongoDB URLs in `.env.example` use single-node replica sets because booking, capacity,
payment, and audit writes rely on transactions. A standalone MongoDB instance is not supported for
those workflows.

## Routing

- `src/router.ts` owns every REST API, including protected administrator APIs below
  `/cavora/admin`.
- `src/router.admin-view.ts` owns the server-rendered administrator pages below `/admin`.

## Verification

Run the repeatable checks before shipping:

```powershell
npm run typecheck
npm run build
npm run lint
npm run format
```

## Production container deployment

`compose.production.yml` runs Cavora as an isolated Compose project. MongoDB is available only on
the private `cavora_internal` network, while the API is reachable from the host at
`${API_BIND_HOST:-127.0.0.1}:${API_PUBLISHED_PORT:-3100}` and from the shared external Caddy
network as `cavora-api:3008`. Keep the default loopback binding when Caddy is configured. For a
temporary direct IP-and-port deployment, set `API_BIND_HOST=0.0.0.0` in `.env` and allow only the
selected published port through the host firewall.

Before starting it, create the external `edge` network if the host does not already provide one,
copy `.env.production.example` to `.env`, and replace every placeholder with production values.

```bash
docker compose -p cavora -f compose.production.yml config
docker compose -p cavora -f compose.production.yml up -d --build
docker compose -p cavora -f compose.production.yml ps
curl --fail http://127.0.0.1:3100/cavora/health
```

Seed the stable tour, blog, and FAQ records only after the API is healthy:

```bash
docker compose -p cavora -f compose.production.yml exec api node dist/seed.js
```

## Security and browser integration

- The React origin must equal `FRONTEND_ORIGIN` and send requests with credentials enabled.
- Authentication uses opaque cookies. Session tokens must never be copied into Redux, local
  storage, URLs, or response JSON.
- Authenticated mutations require the readable CSRF cookie value in the `x-csrf-token` header.
- Production startup rejects placeholder secrets, non-HTTPS browser/account URLs, and reused
  session/CSRF secrets.
- Stripe confirms payments only through verified webhooks; browser redirects are not payment
  confirmation.

The operational administrator interface is server-rendered from `src/views/admin` and consumes the
same protected REST APIs used by other trusted clients.
