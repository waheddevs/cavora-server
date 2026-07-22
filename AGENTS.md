# AGENTS.md

This file is the source of truth for the Cavora backend architecture. `BACKEND.md` supplies the
travel-booking product requirements, data fields, API contract, security rules, and delivery scope.
This file defines how those requirements must be implemented in this repository.

## 1. Project and migration rule

Cavora is a REST/JSON backend for a separate React travel-booking frontend. Its domains are
members, tours, departures and availability, wishlists, bookings, payments, blog content, contact
messages, newsletter subscriptions, and administration.

The repository originally contained restaurant, menu-product, and food-ordering code. That domain
is obsolete. Do not restore restaurant members, products, food orders, EJS views, the restaurant
admin panel, or its routes.

Use `BACKEND.md` for Cavora behavior and data, but preserve the folder architecture and coding
patterns defined below. In particular, do not reorganize features into `src/modules`, do not add a
repository layer, and do not distribute routes across feature routers.

## 2. Required technology stack

| Concern | Choice |
| --- | --- |
| Language | TypeScript in strict mode |
| Runtime | Node.js |
| HTTP framework | Express 4 |
| API | REST/JSON under `/cavora` |
| Database | MongoDB |
| ODM | Mongoose |
| Validation | Zod |
| Authentication | Opaque server-side sessions stored as token hashes in MongoDB |
| Passwords | Argon2id |
| Payments | Stripe Payment Element, PaymentIntents, and verified webhooks |
| Logging | Pino and `pino-http` with request IDs |
| Security | Helmet, strict CORS, CSRF protection, and rate limits |
| Documentation | OpenAPI and Swagger UI |
| Testing | Vitest and Supertest |
| Local infrastructure | Docker Compose for MongoDB |

Do not use PostgreSQL, Prisma, Mongoose-independent repositories, EJS, restaurant sessions, or a
JWT stored in an `accessToken` cookie.

## 3. Mandatory folder structure

```text
src/
├── server.ts
├── app.ts
├── router.ts
├── controllers/
│   ├── system.controller.ts
│   ├── home.controller.ts
│   ├── member.controller.ts
│   ├── tour.controller.ts
│   ├── wishlist.controller.ts
│   ├── booking.controller.ts
│   ├── payment.controller.ts
│   ├── blog.controller.ts
│   ├── engagement.controller.ts
│   └── admin.controller.ts
├── models/
│   ├── System.service.ts
│   ├── Home.service.ts
│   ├── Member.service.ts
│   ├── Tour.service.ts
│   ├── Wishlist.service.ts
│   ├── Booking.service.ts
│   ├── Payment.service.ts
│   ├── Blog.service.ts
│   ├── Engagement.service.ts
│   └── Admin.service.ts
├── schema/
│   ├── Member.model.ts
│   ├── Session.model.ts
│   ├── PasswordResetToken.model.ts
│   ├── EmailVerificationToken.model.ts
│   ├── Tour.model.ts
│   ├── TourImage.model.ts
│   ├── TourDeparture.model.ts
│   ├── Wishlist.model.ts
│   ├── Booking.model.ts
│   ├── Payment.model.ts
│   ├── BlogPost.model.ts
│   ├── BlogComment.model.ts
│   ├── ContactMessage.model.ts
│   ├── NewsletterSubscription.model.ts
│   └── AuditLog.model.ts
├── libs/
│   ├── enums/
│   │   ├── member.enum.ts
│   │   ├── tour.enum.ts
│   │   ├── booking.enum.ts
│   │   ├── payment.enum.ts
│   │   ├── blog.enum.ts
│   │   └── engagement.enum.ts
│   ├── types/
│   │   ├── system.ts
│   │   ├── member.ts
│   │   ├── tour.ts
│   │   ├── wishlist.ts
│   │   ├── booking.ts
│   │   ├── payment.ts
│   │   ├── blog.ts
│   │   └── engagement.ts
│   └── validators/
├── common/
│   ├── errors/
│   ├── middleware/
│   ├── security/
│   └── types/
└── config/
    ├── env.ts
    └── logger.ts

test/
├── integration/
├── helpers/
└── setup.ts
```

Create files only when their section is implemented. The tree above defines their final ownership;
empty placeholder controllers, models, or schemas are not useful.

## 4. Request flow and layer ownership

```text
router.ts → middleware → controller → models/*.service.ts → schema/*.model.ts → MongoDB
```

### `router.ts`

`src/router.ts` is the single location where every application API is declared. It contains only
Express method, path, middleware order, and controller references. It must not contain inline route
callbacks, database queries, calculations, or other business logic.

Keep routes ordered under these comments:

```ts
/* SYSTEM */
/* HOME */
/* AUTHENTICATION */
/* MEMBERS */
/* TOURS & AVAILABILITY */
/* WISHLISTS */
/* BOOKINGS */
/* PAYMENTS */
/* BLOG */
/* ENGAGEMENT */
/* ADMINISTRATION */
```

Do not create feature routers or `router-admin.ts`. Administrative REST APIs belong in the same
router under `/* ADMINISTRATION */` and use authorization middleware.

### `controllers/`

Create one controller file for each API section. Controllers are thin HTTP adapters. They read
already validated request values, call one public service method, choose the HTTP status, and shape
the response.

Every controller action must:

1. Use an explicit `try/catch`.
2. Log the action name on entry.
3. Log `ERROR on <action>` in the catch block.
4. Forward errors to the centralized error middleware.
5. Contain no Mongoose query or business rule.

```ts
const tourService = new TourService();

const tourController = {
  async getTours(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getTours');
      const result = await tourService.getTours(req.validated.query as TourInquiry);
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on getTours');
      next(err);
    }
  },
};
```

Instantiate one service per controller module, not one service per request. Do not use untyped
`const controller: any = {}` objects.

### `models/`

Files in `models/` are service classes and own all business logic and Mongoose operations. Public
methods map one-to-one to use cases such as `register`, `login`, `getTours`, `createBookingHold`, or
`submitComment`.

Services own:

- Business rules and authorization decisions.
- Mongoose reads, writes, aggregations, and sessions/transactions.
- Pricing, capacity, hold expiration, and state transitions.
- Orchestration across multiple Mongoose models and external adapters.
- Conversion from documents to safe return values.

Services throw typed `AppError` instances for expected failures. They never send Express responses,
depend on `Request` or `Response`, or throw raw strings.

### `schema/`

Every persisted collection has one `schema/<Domain>.model.ts` file. A schema file contains only:

- Mongoose schema definitions.
- Defaults, required fields, enum constraints, and timestamps.
- References and schema-level validation.
- Unique, compound, TTL, and query-supporting indexes.
- The exported Mongoose model.

Do not place controller or business logic in schema files. Reuse enums from `libs/enums`. Set
`timestamps: true` for domain records unless a documented exception exists.

### `libs/types/`

Each domain has a type file containing its database-facing entity types and use-case input types.
Use predictable names where applicable:

- `<Entity>`
- `<Entity>Input`
- `<Entity>UpdateInput`
- `<Entity>Inquiry`
- Explicit service result types when an API response is aggregated.

Avoid `any`. Use `unknown` at trust boundaries and narrow it.

### `libs/enums/`

Each domain enum lives in its own enum file and is reused by schemas, types, services, validation,
and API documentation. Do not duplicate status strings across layers.

### `libs/validators/`

Zod schemas for request params, query strings, bodies, environment-independent reusable values,
and response contracts live here. Validation middleware runs before controllers. A controller must
not pass raw `req.body`, `req.params`, or `req.query` to a service.

## 5. Application startup and middleware

`server.ts` loads validated environment configuration, connects Mongoose using `MONGO_URL`, and
starts Express only after MongoDB connects successfully. It also closes both the HTTP server and
Mongoose connection during graceful shutdown.

Use this middleware order:

1. Trust proxy.
2. Request ID.
3. Pino HTTP logger.
4. Helmet.
5. Strict credentialed CORS allowlist.
6. Cookie parser.
7. Stripe raw-body webhook handling where needed.
8. JSON parser.
9. Global and endpoint-specific rate limiting.
10. CSRF protection for cookie-authenticated state-changing requests.
11. `/cavora` router.
12. Not-found middleware.
13. Centralized error middleware.

Static files, EJS views, and an SSR admin panel are not part of Cavora.

## 6. Error response convention

Known operational errors use `AppError`. The final error middleware converts every failure to:

```json
{
  "status": 422,
  "code": "VALIDATION_ERROR",
  "message": "The request contains invalid fields.",
  "fieldErrors": {
    "body.email": "Email is already registered."
  },
  "requestId": "request-uuid"
}
```

`fieldErrors` is optional. Never expose stack traces, Mongoose internals, passwords, session
tokens, token hashes, complete Stripe objects, or card data.

Controllers always keep their required `try/catch`; centralized error handling does not replace
that convention.

## 7. Authentication and security

- Use a cryptographically random opaque session token in an `HttpOnly` cookie.
- Use `Secure` in production and configure `SameSite` intentionally.
- Store only a hash of the session token in the `sessions` collection.
- Never store authentication tokens in Redux, localStorage, or response JSON.
- Hash passwords with Argon2id.
- Revoke the server-side session and clear the cookie on logout.
- Email-verification and password-reset tokens are random, hashed, expiring, and one-time.
- Add CSRF protection to cookie-authenticated state-changing browser requests.
- Use strict credentialed CORS for the configured frontend origin only.
- Apply focused rate limits to login, registration, password reset, comments, contact, and
  newsletter APIs.
- Enforce resource ownership in services and administrator roles in middleware/services.
- Record important account, booking, payment, and admin actions in audit logs.

## 8. Required MongoDB collections

Translate the data design in `BACKEND.md` into Mongoose schemas and MongoDB collections:

- `members`
- `sessions`
- `password_reset_tokens`
- `email_verification_tokens`
- `tours`
- `tour_images`
- `tour_departures`
- `wishlists`
- `bookings`
- `payments`
- `blog_posts`
- `blog_comments`
- `contact_messages`
- `newsletter_subscriptions`
- `audit_logs`

Preserve the existing frontend integer tour IDs. Other internal records may use MongoDB ObjectIds;
public booking references and provider references remain explicit fields.

Use compound unique indexes for constraints such as `(memberId, tourId)` wishlists. Use TTL indexes
only when automatic deletion matches the domain; do not automatically delete records whose expired
state is needed for audits or capacity release.

Money is stored as integer minor units plus an ISO currency code. Timestamps are UTC. Departure
dates must not be shifted by local time-zone assumptions.

## 9. Required API contract

All routes use `/cavora` through the single `router.ts`.

### System and home

- `GET /health`
- `GET /docs`
- `GET /openapi.json`
- `GET /home`

### Tours and availability

- `GET /tours`
- `GET /tours/:id`
- `GET /tours/:id/related`
- `GET /tours/:id/availability`

### Authentication

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/verify-email`

### Member account and wishlist

- `GET /users/me`
- `PATCH /users/me`
- `GET /users/me/bookings`
- `GET /users/me/wishlist`
- `PUT /users/me/wishlist/:tourId`
- `DELETE /users/me/wishlist/:tourId`

These routes use `member.controller.ts` and `Member.service.ts`; the public paths remain compatible
with `BACKEND.md`.

### Bookings

- `POST /booking-holds`
- `GET /bookings/:id`
- `POST /bookings/:id/cancel`

### Payments

- `POST /payments/intents`
- `POST /payments/webhooks/stripe`

### Blog

- `GET /posts`
- `GET /posts/:slug`
- `GET /posts/:id/comments`
- `POST /posts/:id/comments`

### Engagement

- `POST /contact-messages`
- `POST /newsletter-subscriptions`
- `DELETE /newsletter-subscriptions/:token`

Administrative REST endpoints manage tours/images, departures/capacity, homepage selections, blog
moderation, contacts, subscribers, bookings, payments, and refunds. Place all of them under the
administration router comment and protect them with admin authorization.

Do not add legacy aliases such as `/member/signup`, `/product/all`, `/order/create`, or `/admin`
EJS routes.

## 10. Tour listing and response conventions

Tour lists implement the query, destination, type, price, duration, rating, sort, page, and limit
contract from `BACKEND.md`. Mongoose list operations normally use aggregation stages in this order:

```text
$match → $sort → $skip → $limit
```

Use `(page - 1) * limit` for pagination and return:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 9,
    "total": 28,
    "totalPages": 4
  }
}
```

Public homepage, tour, FAQ, and blog responses may use ETags and appropriate `Cache-Control`.
Never publicly cache account, wishlist, booking, session, or payment responses.

## 11. Booking and payment invariants

- Never trust a price, fee, total, capacity, or availability value supplied by the frontend.
- Load authoritative tour/departure data and calculate totals in `Booking.service.ts`.
- Implement the two-percent service fee as a server-side rule.
- Create short-lived booking holds and reserve seats atomically.
- Use MongoDB sessions/transactions for booking, capacity, payment, and audit multi-write
  invariants. Production MongoDB must support transactions.
- Make hold expiration and reservation release idempotent.
- Reject invalid booking state transitions.
- Associate PaymentIntents only with owned, unexpired pending bookings.
- Verify Stripe webhook signatures against the exact raw body.
- Browser redirects never confirm bookings; verified webhooks do.
- Make PaymentIntent and webhook processing idempotent.
- Card number, expiry, and CVV never reach Cavora code or logs.

## 12. Testing and API completion

Every created API must be checked before its section is handed off:

1. Zod validation tests for valid, malformed, unknown, and boundary values.
2. Service tests for business rules, authorization, calculations, and state transitions.
3. Mongoose integration tests for schemas, indexes, queries, and transactions.
4. Supertest tests for method, path, status, response shape, cookies, authentication, and ownership.
5. OpenAPI checks confirming that the implemented route is documented.

An endpoint is not complete because it compiles. Check its success path and important failure paths.
Use an isolated test database and never run destructive test cleanup against development or
production data.

Before handing off a section, run:

- TypeScript typecheck and build.
- ESLint.
- Prettier check.
- Relevant unit, integration, and Supertest API tests.
- A route/controller/service/schema/type consistency review.
- A search for accidental restaurant-domain remnants.

## 13. Naming and code style

- Functions, methods, and variables: `camelCase`.
- Classes and TypeScript types: `PascalCase`.
- Folders and controller/type/enum files: `kebab-case`.
- Existing service/schema filenames follow the established `Member.service.ts` and
  `Member.model.ts` pattern.
- Avoid `any`; use explicit types.
- Keep shared configuration small and keep business logic in services.
- Do not swallow errors.
- Do not log secrets or sensitive traveler/payment data.
- Normalize uploaded paths with `.replace(/\\/g, '/')` if local upload support is introduced.

Prettier uses semicolons, single quotes, trailing commas, a 100-column print width, two-space
indentation, and parentheses around arrow parameters.

## 14. Environment variables

Maintain `.env.example` with safe placeholders. Never commit the real `.env`.

Current/future categories include:

- Runtime: `NODE_ENV`, `PORT`, `SERVER_HOST`, `TRUST_PROXY`, `LOG_LEVEL`.
- Browser: `FRONTEND_ORIGIN`.
- Database: `MONGO_URL` and a separate `MONGO_TEST_URL`.
- Sessions/security: cookie name, session lifetime, token pepper, and CSRF secret.
- Stripe: secret key and webhook secret.
- Email: provider settings and public verification/reset URLs.

Validate all environment values during startup. Production must reject placeholder secrets and
unsafe cookie/CORS settings.

## 15. Delivery order and permission checkpoints

Obtain user permission before each section and report verification before requesting the next:

1. Architecture blueprint and repository audit.
2. Cavora foundation, restaurant cleanup, MongoDB startup, and corrected folder architecture.
3. Mongoose schemas, enums, types, indexes, and seed framework for the Cavora data model.
4. System docs, homepage, tours, related tours, filtering, and availability APIs.
5. Members, registration/login/logout, sessions, verification/reset, profiles, and wishlists.
6. Departures, pricing, booking holds, expiration, booking history, and cancellation.
7. Stripe PaymentIntents, verified webhooks, confirmation, idempotency, and refund foundations.
8. Blog, comments, contact, newsletter, and administrative REST APIs.
9. Full security, OpenAPI, caching, audit, end-to-end, and restaurant-removal verification.

Each permission request must state the files/systems affected, APIs delivered, external
prerequisites, and verification to be run.

## 16. Definition of done

Cavora is complete when:

- Every route is declared and sectioned in the single `router.ts`.
- Every HTTP action exists in the correct controller with the required `try/catch` pattern.
- Every business rule and Mongoose query exists in the appropriate `models/*.service.ts` file.
- Every collection is defined in `schema/` and uses shared types/enums.
- All Cavora APIs work under `/cavora`.
- Authentication, pricing, capacity, booking, and payment rules are enforced server-side.
- OpenAPI describes the working implementation.
- The 28 existing frontend tours can be seeded with stable IDs once their source data is available.
- Automated tests cover every API and important failure/authorization paths.
- Build, typecheck, lint, formatting, tests, environment docs, and operational instructions pass.
- No restaurant-domain code, routes, packages, views, or assets remain.
