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

- `src/router.ts` owns system, home, authentication, member, tour, booking, payment, blog, and
  engagement APIs.
- `src/router.admin.ts` owns administrator APIs and is mounted at `/cavora/admin`.

## Verification

Run the repeatable checks before shipping:

```powershell
npm run typecheck
npm run build
npm run lint
npm run format
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

`src/views` is reserved for a possible future administrator interface and is not registered,
rendered, or served by the current REST application.
