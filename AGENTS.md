# AGENTS.md

This file is the reusable blueprint for this project's backend skeleton. It documents the stack,
architecture, conventions, and patterns so an agent (or a new project) can reproduce the same
structure from scratch. Copy this file into a new repo and tell the agent to "build the backend
skeleton as described in AGENTS.md."

## 1. What this project is

"Burak" is a restaurant / food-ordering backend that serves **two different frontends from one
Express app**:

- An **Admin panel** for the restaurant owner — server-rendered (BSSR) with EJS templates,
  authenticated via server-side sessions.
- A **Customer-facing SPA** (React, separate repo) — a pure REST/JSON API, authenticated via a
  JWT stored in a cookie.

Domain: members (users + restaurant owner), products (menu items), orders, order items, and
product view-tracking.

## 2. Tech stack

| Concern       | Choice                                                                   |
| ------------- | ------------------------------------------------------------------------ |
| Language      | TypeScript (strict mode), compiled with `tsc`, run via `ts-node`         |
| Runtime       | Node.js                                                                  |
| Web framework | Express 4                                                                |
| Database      | MongoDB via Mongoose 6                                                   |
| Admin views   | EJS (server-rendered HTML, plain CSS/JS in `src/public`)                 |
| Admin auth    | `express-session` + `connect-mongodb-session` (sessions stored in Mongo) |
| SPA/API auth  | `jsonwebtoken` (JWT) set as a plain (non-httpOnly) cookie `accessToken`  |
| Passwords     | `bcryptjs`                                                               |
| File uploads  | `multer` (disk storage) + `uuid` for random filenames                    |
| Logging       | `morgan` (custom format, see `libs/config.ts`)                           |
| Env config    | `dotenv`, single `.env` file, never committed                            |
| Dev tooling   | `nodemon` for reload, `tsconfig-paths`, `prettier` for formatting        |

### Scripts (`package.json`)

```
start        ts-node src/server.ts          # run once, no reload
start:dev    nodemon --exec ts-node src/server.ts   # dev with reload
build        tsc                             # compile to dist/
```

### tsconfig highlights

`strict: true`, `target: ES2020`, `module`/`moduleResolution: Node16`, `rootDir: src`,
`outDir: dist`, `esModuleInterop: true`.

### Prettier

`semi: true`, `singleQuote: true`, `trailingComma: all`, `printWidth: 100`, `tabWidth: 2`,
`arrowParens: always`.

## 3. Folder structure

```
src/
  server.ts              # entrypoint: dotenv, DNS override, mongoose.connect, app.listen
  app.ts                  # express app wiring: static, body parsers, session, view engine, routers
  router.ts               # public/SPA REST API routes  ("/", consumed by React)
  router-admin.ts          # admin BSSR routes           ("/admin", EJS)

  controllers/            # one file per domain, thin — parses req, calls service, shapes res
    member.controller.ts
    product.controller.ts
    order.controller.ts
    restaurant.controller.ts   # admin-only flows (login/signup/session, product/user admin views)

  models/                 # "service" layer — all business logic + Mongoose queries live here
    Member.service.ts
    Product.service.ts
    Order.service.ts
    View.service.ts
    Auth.service.ts        # JWT sign/verify only

  schema/                 # Mongoose schemas + model export, one per collection
    Member.model.ts
    Product.model.ts
    Order.model.ts
    OrderItem.model.ts
    View.model.ts

  libs/
    config.ts              # small shared constants + helpers (AUTH_TIMER, shapeIntoMongooseObjectId)
    Errors.ts               # custom Errors class + HttpCode / Message enums (single source of truth)
    enums/                  # one enum file per domain (member, product, order, view)
    types/                  # one file per domain: Entity, EntityInput, EntityUpdateInput, Inquiry
    utlis/uploader.ts        # multer factory: makeUploader(folder) -> multer instance

  views/                  # EJS templates for the admin BSSR app
    includes/header.ejs, footer.ejs
    home.ejs, login.ejs, signup.ejs, products.ejs, users.ejs

  public/                 # static assets served at "/" (css/js/img for the EJS views)
```

## 4. Request flow / layering

```
router(-admin).ts  →  controller  →  service (models/*.service.ts)  →  schema (Mongoose model)
```

- **Routers** only wire `method + path + middleware chain + controller fn`. No logic.
- **Controllers** are thin: read `req.body` / `req.params` / `req.query` into a typed Input/Inquiry
  object, call exactly one service method, `res.status(...).json(...)` (SPA) or `res.render(...)`
  (admin). Every controller method wraps its body in `try/catch`, logs the action name on entry
  (`console.log('methodName')`), and on error either rethrows `Errors` with its own `code`/`message`
  or falls back to `Errors.standard`.
- **Services** (in `models/`, one class per domain, instantiated once per controller file) hold all
  business rules and all Mongoose calls. They throw `Errors` (never raw strings) when a lookup/write
  fails. Public methods map 1:1 to a use case (`signup`, `login`, `getMemberDetail`, `updateMember`,
  ...); admin/SSR-only methods are grouped under a `/* SSR */` comment, SPA ones under `/* SPA */`.
- **Schemas** (`schema/*.model.ts`) define the Mongoose `Schema` + `mongoose.model(...)` export only
  — enums come from `libs/enums`, `{ timestamps: true }` is always set, unique/composite indexes are
  declared at the bottom of the file when needed.

## 5. Auth model (two systems, side by side)

- **SPA/API (`router.ts`)**: JWT-based.
  - `AuthService.createToken(member)` signs a JWT (`SECRET_TOKEN`, expires in `AUTH_TIMER` hours).
  - Login/signup controllers set it via `res.cookie('accessToken', token, { maxAge, httpOnly: false })`.
  - `memberController.verifyAuth` middleware: reads the cookie, verifies it, throws
    `HttpCode.UNAUTHORIZED` if missing/invalid, sets `req.member`.
  - `memberController.retrieveAuth`: same but _optional_ — never blocks the request, used on public
    routes that behave differently when a member happens to be logged in (e.g. product view count).
- **Admin (`router-admin.ts`)**: session-based.
  - `express-session` backed by `connect-mongodb-session` (collection `sessions`).
  - `restaurantController.processLogin/processSignup` store the member on `req.session.member`.
  - `restaurantController.verifyRestaurant` middleware: checks
    `req.session.member.memberType === MemberType.RESTAURANT`, else redirects with an inline
    `<script>alert(...)</script>` response (this project's pattern for showing an SSR error toast).
  - `app.ts` also exposes `req.session.member` to every EJS view via `res.locals.member`.

## 6. Error handling pattern

Single source of truth in `libs/Errors.ts`:

- `HttpCode` enum — every status code used in the app.
- `Message` enum — every user-facing error string.
- `Errors extends Error` — carries `{ code, message }`; `Errors.standard` is the generic 500 fallback.

Convention in every controller catch block:

```try{

} catch (err) {
  console.log('ERROR on <action>: ', err);
  if (err instanceof Errors) res.status(err.code).json(err);
  else res.status(Errors.standard.code).json(Errors.standard);
}
```

Services never swallow errors silently — they either return the Mongoose result or throw a typed
`Errors` with the specific `HttpCode`/`Message` for that failure.

## 7. Data/type conventions

Per domain (`member`, `product`, `order`, `view`), `libs/types/<domain>.ts` defines:

- `<Entity>` — the shape returned from the DB (mirrors the schema, includes `_id`, timestamps).
- `<Entity>Input` — payload for create.
- `<Entity>UpdateInput` — payload for update (all optional except `_id`).
- `<Entity>Inquiry` — query/pagination/filter shape for list endpoints (`page`, `limit`, `order`, filters).

`libs/enums/<domain>.enum.ts` holds every enum for that domain (status, type, collection, etc.),
reused by both the Mongoose schema (`enum: SomeEnum`) and the TS types.

`libs/config.ts` holds tiny cross-cutting helpers/constants (e.g. `shapeIntoMongooseObjectId`,
`AUTH_TIMER`, `MORGAN_FORMAT`) — keep this file small, don't dump business logic here.

## 8. Conventions / style rules

Naming (documented at the bottom of `src/train.ts` in this repo):

- functions, methods, variables → **camelCase** (`goHome`)
- classes → **PascalCase** (`MemberService`)
- folders, files → **kebab-case**
- CSS class names → **snake_case**

Other repo-wide habits worth keeping:

- Domain-prefixed field names (`memberNick`, `productPrice`, `orderStatus`) instead of generic
  `name`/`price`/`status` — keeps aggregation `$lookup`/`$match` unambiguous across collections.
- Pagination in list endpoints via aggregation: `$match → $sort → $skip → $limit`, with
  `(page - 1) * limit` skip math.
- Uploaded file paths are normalized with `.replace(/\\/g, '/')` before saving (Windows path fix).
- One service instance per controller module (`const productService = new ProductService();`),
  not per-request.
- `console.log` at the start of every controller action naming the action — cheap request tracing
  without a logging library.

## 9. Environment variables (`.env`, never committed)

```
MONGO_URL=<mongodb connection string>
PORT=<port number>
SESSION_SECRET=<random secret for express-session>
SECRET_TOKEN=<random secret for jwt signing>
```

## 10. How to bootstrap a new project from this skeleton

1. `npm init`, add the dependency set from section 2.
2. Copy `tsconfig.json`, `.prettierrc.json`, `.gitignore`, `.hintrc` as-is.
3. Recreate `src/server.ts` (dotenv + mongoose.connect + app.listen) and `src/app.ts`
   (static → body parsers → cookie-parser → morgan → session → view engine → routers, in that order).
4. For each new domain: add `schema/<Domain>.model.ts`, `libs/enums/<domain>.enum.ts`,
   `libs/types/<domain>.ts`, `models/<Domain>.service.ts`, `controllers/<domain>.controller.ts`,
   then wire routes in `router.ts` (SPA) and/or `router-admin.ts` (admin).
5. Reuse `libs/Errors.ts` as-is; extend `HttpCode`/`Message` enums rather than throwing raw errors.
6. Decide up front whether the new project needs the dual BSSR+SPA split, or just the JWT/REST half
   (`router.ts` + `verifyAuth`) — most greenfield API-only backends only need that half.
