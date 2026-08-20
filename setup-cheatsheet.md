# Setup Cheatsheet — Monorepo + Express + Prisma 7 + Supabase

From empty folder to a migrated database. Written against **Prisma 7.9** and the Supabase dashboard as of August 2026.

⚠️ **Prisma 7 broke the old pattern.** Almost every tutorial you'll find shows `url = env("DATABASE_URL")` inside `schema.prisma`. That is Prisma 6 and earlier. In 7 the URL lives in `prisma.config.ts`. If you're following a video and it disagrees with this file, check `npx prisma -v` first.

---

## 1. Monorepo skeleton

```bash
mkdir blog && cd blog
git init
```

That's the whole monorepo — a folder with a `.git` in it. No tooling required.

```bash
mkdir api && cd api && npm init -y
```

Result:

```
blog/
├── .git/
├── .gitignore        ← root only
└── api/              package.json, node_modules/, prisma/, .env
```

The two frontends (`reader/` and `admin/`) become sibling folders later, each scaffolded with `npm create vite@latest`. Nothing about the API setup changes when they arrive.

**One `package.json` per app** — required, because each is independently runnable and independently deployed. A root one is optional and only a launcher.

**One `.env` per app** — each process reads from its own working directory.

### Root `.gitignore` — write this *before* the first commit

```gitignore
# dependencies
**/node_modules/

# env files
**/.env
**/.env.local
**/.env.*.local
!**/.env.example

# prisma generated client
**/generated/

# build output
**/dist/
**/build/

# misc
.DS_Store
**/*.log
```

`**/` means "at any depth" — one line covers every app you add later without editing this file again. The `!` line re-includes the template and must come *after* the rule it undoes.

⚠️ **`.gitignore` only affects untracked files.** Commit a `.env` once and git tracks it forever; adding it to `.gitignore` later does nothing. If it happens: `git rm --cached api/.env`, then **rotate the secrets** — they're in your history permanently.

Verify before committing:

```bash
git status --ignored     # .env files should be under "Ignored"
```

---

## 2. API dependencies

```bash
cd api

# runtime
npm i express cors dotenv bcryptjs jsonwebtoken passport passport-jwt
npm i @prisma/client @prisma/adapter-pg pg

# dev
npm i -D prisma nodemon
```

| Package | Job |
|---|---|
| `express` | the server |
| `cors` | lets your frontends' JS read responses |
| `dotenv` | loads `.env` into `process.env` |
| `bcryptjs` | hashes passwords |
| `jsonwebtoken` | signs tokens at login |
| `passport` + `passport-jwt` | verifies tokens on protected routes |
| `@prisma/client` | the query runtime |
| `pg` + `@prisma/adapter-pg` | Postgres driver + Prisma 7's required adapter |
| `prisma` | the CLI (dev-only — you don't migrate from app code) |

**Not installing:** `express-session`, `prisma-session-store`, any view engine. Those belong to the stateful-session world. This API is stateless.

Add scripts to `api/package.json`:

```json
"scripts": {
  "dev": "nodemon app.js",
  "start": "node app.js"
}
```

`start` matters at deploy — Render runs `npm start` by default.

---

## 3. Supabase — the GUI steps

### 3.1 Create the project

Dashboard → **New project**. Set a **database password** when prompted — this is *not* your Supabase account password, and it's shown once.

💡 **Use letters and digits only.** A `@`, `#`, `?`, or `/` in the password breaks the connection URI parser (`@` is the delimiter between credentials and host). The resulting error points nowhere useful. If you already have a special-character password, either reset it or URL-encode: `@` → `%40`, `#` → `%23`, `?` → `%3F`.

Lost the password? Project Settings → Database → **Reset database password**.

### 3.2 Security settings — turn all three off

When prompted about the Data API:

| Setting | Set to | Why |
|---|---|---|
| Enable Data API | **Off** | It auto-generates REST endpoints for browsers to hit the DB directly. Your Express API *is* that layer. An unused internet-facing door is one you'll never check. |
| Automatically expose new tables | **Off** | Supabase itself recommends this. Otherwise a table you add later is public without you deciding. |
| Enable automatic RLS | **Off** | RLS is the security model for exposed tables. No Data API, nothing to protect. |

⚠️ If you ever turn the Data API **on**, turn automatic RLS on with it. An exposed table without RLS is readable by anyone holding your anon key — which ships in every frontend bundle.

### 3.3 Get the connection string

Click **Connect** at the top of the project page. You get several strings. Take the **Session pooler**:

```
postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Two tells you have the right one: host ends in **`pooler.supabase.com`**, and the username is **`postgres.<ref>`** (project ref appended), not plain `postgres`.

Replace `[YOUR-PASSWORD]` — brackets included.

### 3.4 The three connection modes

| Mode | Port | Host | Use for |
|---|---|---|---|
| **Direct** | 5432 | `db.<ref>.supabase.co` | ⚠️ **IPv6-only** — usually unreachable from a laptop |
| **Session pooler** | 5432 | `...pooler.supabase.com` | ✅ **Start here.** Migrations + queries |
| **Transaction pooler** | 6543 | `...pooler.supabase.com` | Deployed app, many concurrent requests |

🔥 **The error that costs an hour:**

```
Error: P1001: Can't reach database server at `db.<ref>.supabase.co:5432`
```

That's the direct connection, and it's IPv6-only. Most home ISPs have no IPv6 route, so the host is genuinely unreachable and nothing about your config is wrong. **Switch to the session pooler.**

💡 **Why session vs transaction mode:** the transaction pooler hands your connection back after every single query, so many requests share few connections — great for a deployed app, but it breaks prepared statements (hence `?pgbouncer=true`) and can't run migrations. Session mode holds the connection for your whole session, so it behaves like a real one. Use session mode until deploy day.

---

## 4. Prisma 7 setup

### 4.1 Init

```bash
npx prisma init --datasource-provider postgresql
```

Creates `prisma/schema.prisma`, `.env`, and — new in 7 — **`prisma.config.ts` at the project root** (next to `package.json`, not inside `prisma/`).

### 4.2 `.env`

```
DATABASE_URL="postgresql://postgres.<ref>:password@aws-0-<region>.pooler.supabase.com:5432/postgres"
JWT_SECRET="paste-a-real-secret-here"
```

Generate a real secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**One URL is enough.** `directUrl` was **removed in Prisma 7** — there's only one `url` field now. Ignore any tutorial telling you to set both.

Also commit an `.env.example` with the same keys and dummy values. It's documentation for future-you on a new machine.

### 4.3 `schema.prisma` — no URL in here

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

Keep whatever `prisma init` generated for the generator block. Both `prisma-client` and `prisma-client-js` work in v7; what matters is that the `output` path and your `require` in `prisma/client.js` agree. With `output = "../generated/prisma"`, the import is `require('../generated/prisma')` — **not** `@prisma/client`.

🔥 **The error:**

```
P1012: The datasource property `url` is no longer supported in schema files.
```

You put `url` in `schema.prisma`. Delete it — it belongs in the config file now.

### 4.4 `prisma.config.ts` — where the URL lives

Open the generated file and make sure it has a `datasource` key:

```js
import 'dotenv/config'
import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: { path: path.join('prisma', 'migrations') },
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
```

⚠️ **Edit what `init` generated — don't overwrite it.** The config format has changed more than once and your version's scaffold is by definition right for your version. Add the `datasource` key to what's there.

⚠️ **`import 'dotenv/config'` on line 1 is mandatory.** Prisma 7 stopped auto-loading `.env`. Without it, `process.env.DATABASE_URL` is `undefined` and the error won't point anywhere near the cause.

💡 Using `process.env.X` rather than the `env()` helper is deliberate — it's plain JS and works regardless of what your version exports from `prisma/config`.

### 4.5 Migrate

```bash
npx prisma validate           # checks config resolves, without touching the DB
npx prisma migrate dev --name init
npx prisma generate           # builds the client into your `output` folder
npx prisma studio
```

`validate` first is worth the two seconds — it catches a broken URL instantly instead of failing mid-migration.

Success looks like:

```
Applying migration `20260814142845_init`
Your database is now in sync with your schema.
```

⚠️ **`generate` is the step people miss.** `migrate dev` runs it for you, so everything seems fine — until you `require` the client and get `MODULE_NOT_FOUND`, because `generated/` was never built (or is stale). Run `generate` explicitly whenever:

- you just cloned the repo (`generated/` is gitignored — it isn't in the clone)
- you edited `schema.prisma` without migrating
- you get `MODULE_NOT_FOUND` pointing at your generated path
- you're deploying — it belongs in your build command

Confirm it worked before writing any query:

```bash
ls generated/prisma
```

---

## 5. Runtime client (Prisma 7 needs an adapter)

Creating a client **requires a driver adapter** in Prisma 7 — `new PrismaClient()` with no arguments no longer works.

```js
// api/prisma/client.js
const { PrismaClient } = require('../generated/prisma')
const { PrismaPg } = require('@prisma/adapter-pg')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

module.exports = prisma
```

💡 The import path follows your generator's `output`. Check what's actually in `generated/prisma/` — depending on version you may need `../generated/prisma/client.js`, and if the folder is ESM you'll need `import` syntax plus `"type": "module"` in `package.json`.

You don't need this file until your first controller. Migrating doesn't touch it.

---

## 6. App structure

### 6.1 Folder layout

```
api/
├── app.js                  entry point — wiring only, no logic
├── prisma/
│   ├── schema.prisma
│   ├── client.js           the singleton every controller requires
│   └── migrations/
├── generated/prisma/       gitignored — built by `prisma generate`
├── routers/                one file per resource
│   ├── authRouter.js
│   ├── postRouter.js
│   └── commentRouter.js
├── controllers/            the actual logic
├── middleware/
│   └── auth.js             verifyToken / requireAuth / requireAdmin
├── prisma.config.ts
├── .env
└── package.json
```

**One kind of thing per file.** Routers export routers, middleware exports middleware. Don't export `verifyToken` from a router — the import gets awkward (`const { router: authRouter } = ...`), every other router ends up depending on the auth router, and you invite circular imports the moment two routers need each other.

### 6.2 `app.js` — order is mandatory

```js
// ---------- 1. Requires ----------
require("dotenv").config();          // FIRST — before anything reads process.env
const express = require("express");
const cors = require("cors");
const app = express();

// ---------- 2. Body parsing ----------
app.use(express.json());             // before routes, or req.body is undefined

// ---------- 3. CORS ----------
const allowedOrigins = process.env.CORS_ORIGINS?.split(",") || ["http://localhost:5173"];
app.use(cors({ origin: allowedOrigins }));       // env-driven — see note below

// ---------- 4. Passport config ----------
require("./config/passport");        // side-effect require — registers the strategy

// ---------- 5. Routes ----------
app.use("/api/auth", require("./routers/authRouter"));
app.use("/api/posts", require("./routers/postRouter"));

// ---------- 6. 404 + error handler ----------
app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

// ---------- 7. Start ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
```

**Why the order is not negotiable:**

| Position | Consequence of getting it wrong |
|---|---|
| `dotenv` first | Anything reading `process.env` above it sees `undefined` |
| `express.json()` before routes | `req.body` is `undefined`, destructuring throws |
| `cors` before routes | Headers never get attached; browser blocks the response |
| Error handler **last** | Registered before the routes, it never runs |

⚠️ The error handler is identified by its **four** parameters — `(err, req, res, next)`. Drop `next` and Express treats it as a normal middleware and never passes errors to it. The unused parameter is load-bearing.

⚠️ `app.js` should contain **no logic**. If you're writing an `if` in there, it belongs in a controller.

### 6.2b CORS — the browser-only gatekeeper

CORS is the one that blindsides you: the API works perfectly in Bruno/curl, then the browser shows a blank page and a console error like *"No 'Access-Control-Allow-Origin' header is present."*

Why: the **same-origin policy** is a *browser* rule. JavaScript on `http://localhost:5173` (your React app) may not read a response from `http://localhost:3000` (your API) unless the API sends a header saying that origin is allowed. Bruno and curl aren't browsers, so they ignore this entirely — which is exactly why "works in Bruno, blank in browser" always means CORS.

**Key split to internalize:** CORS is *enforced by the browser* but *granted by the server*. The fix is always on the API, never the frontend.

**Robust setup — drive it from an env var**, so the code is identical in every environment and only the variable changes:

```js
const cors = require("cors");
const allowedOrigins = process.env.CORS_ORIGINS?.split(",") || ["http://localhost:5173"];
app.use(cors({ origin: allowedOrigins }));   // BEFORE the routes
```

`.env`:
```
CORS_ORIGINS=http://localhost:5173
```

At deploy, set the host's env var to the deployed frontend URL (comma-separate for multiple):
```
CORS_ORIGINS=http://localhost:5173,https://yourblog.netlify.app
```

Rules that save time:
- **Exact match** — protocol + host + port, **no trailing slash**. `http://localhost:5173/` (slash) and `localhost:5173` (no protocol) both silently fail.
- **Check the real Vite port** — it uses 5174+ if 5173 was taken. Match what the frontend terminal prints.
- **Never `origin: true` or `*`** — that allows every site on the internet to call a token-issuing API. The env-driven allow-list is the robust choice: flexible across environments, still an explicit list.
- 🔥 **The deploy-day trap:** works locally, breaks in production with a CORS error, because the deployed frontend URL isn't in the allow-list. Set `CORS_ORIGINS` on the host. This is the single most-forgotten deploy step.


### 6.3 Router mount paths are cumulative

Express **strips the matched prefix** before handing the request to the router. So paths inside a router are always relative to where it's mounted:

```js
// app.js
app.use("/api/auth", authRouter);      // strips /api/auth

// routers/authRouter.js
router.post("/signup", ...)            // → POST /api/auth/signup   ✅
router.post("/api/signup", ...)        // → POST /api/auth/api/signup   ❌
```

💡 To see it directly, drop this inside any router:

```js
router.use((req, res, next) => {
  console.log("router sees:", req.url, "| original:", req.originalUrl);
  next();
});
```

`req.url` is the stripped remainder; `req.originalUrl` is always the full path.

🔥 **`TypeError: argument handler must be a function`** at an `app.use` line means the second argument is `undefined`. Three causes, in order of likelihood:

1. Missing `module.exports = router` at the bottom of the router file
2. Export/import mismatch — `module.exports = router` imported as `const { router } = require(...)`, or the reverse
3. A handler inside the router is undefined — a controller you referenced but never exported, or a name typo (`authController.singup`)

### 6.4 Nested routers need `mergeParams`

If a comment router is mounted under a post router, `req.params.postId` is `undefined` inside it unless you opt in:

```js
const router = require("express").Router({ mergeParams: true });
```

The failure is silent. Simplest for a small API: skip the nesting and put comment routes in the post router with full relative paths (`router.get("/:postId/comments", ...)`).

### 6.5 Controller shape

```js
const prisma = require("../prisma/client");

exports.getPost = async (req, res, next) => {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { id: Number(req.params.postId) },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err) {
    next(err);
  }
};
```

**`exports.name =` rather than `module.exports = { ... }`** — you add functions over time, and a bottom-of-file export list you forget to update fails as `undefined is not a function` at the *router*, nowhere near the file you edited. Never mix the two styles in one file: `module.exports = {...}` replaces the whole object and silently wipes earlier `exports.x` assignments.

**`next` in the signature is required** if your catch calls `next(err)`. Writing `async (req, res)` and then `next(err)` throws `next is not defined` — and it happens inside a catch block, so the real error is swallowed.

**`Number(req.params.x)`** — URL params are always strings, Prisma wants Int, and the resulting error names neither.

### 6.6 Never leak the password hash

Every query returning a user needs one of:

```js
omit:   { password: true }                      // everything except — preferred
select: { id: true, email: true, role: true }   // explicit allow-list
```

⚠️ `select: { password: false }` is **not valid** — `select` is an allow-list of what you want, not a way to exclude. `omit` is the exclusion tool.

### 6.7 Never spread `req.body` into Prisma

```js
data: { ...req.body }                              // ❌ mass assignment
data: { email, password: hash }                    // ✅ explicit fields
```

Spreading lets anyone POST `{"email":..., "password":..., "role":"admin"}` and promote themselves. Build the object field by field, always.

### 6.8 Status codes

`res.json(x)` sends 200. You only call `.status()` when it isn't 200.

| Code | Meaning | Where |
|---|---|---|
| 200 | OK | GET, PUT — the default |
| 201 | Created | POST that made something |
| 204 | No Content | DELETE — success, empty body |
| 400 | Bad Request | Validation failed |
| 401 | Unauthorized | No/bad token → *who are you?* |
| 403 | Forbidden | Valid token, not allowed → *I know you, and no* |
| 404 | Not Found | ID doesn't exist |
| 409 | Conflict | Duplicate email (Prisma `P2002`) |
| 500 | Server Error | Your error handler |

Full list: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status

⚠️ **401 vs 403 are not interchangeable.** Getting them right is what lets the frontend decide between "send them to login" and "show not-allowed". Conflate them and your admin app bounces people to a login screen they're already past.

---

## 7. JWT auth flow

Two routes and one middleware. The server stores **nothing** — that's what stateless means, and it's why you can't revoke a token.

```
POST /login → verify password → jwt.sign → send token          (once)
POST /posts → verifyToken middleware → jwt.verify → req.user    (every protected request)
```

### 7.1 Signup — create the account

```js
router.post("/signup", async (req, res, next) => {
  try {
    const { email, password, name } = req.body;      // pull ONLY the fields you allow
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hash, name },          // build explicitly, field by field
      omit: { password: true },                        // never return the hash
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === "P2002") {                        // Prisma unique-constraint violation
      return res.status(409).json({ error: "Email already registered" });
    }
    next(err);
  }
});
```

🔥 **Adding a field is a TWO-place change — schema *and* controller.** Adding `name String?` to the schema and migrating creates the *column*, but the column stays `null` until the controller actually writes to it. The frontend can send `name` all day; if `data: { ... }` doesn't include it, it's silently dropped. This is the mass-assignment discipline paying off in reverse: because you build `data` explicitly (never `...req.body`), a new field only saves when you deliberately add it.

⚠️ **Never spread `req.body`** into `create` — a client could POST `{ email, password, role: "admin" }` and self-promote. Destructure the exact fields you allow (`email, password, name`) — `role` is not among them, so it takes the schema default.

⚠️ **Duplicate email** → Prisma throws `P2002` (unique constraint). Catch it and return **409 Conflict** with a clear message, not a generic 500.

💡 **Signup ≠ login.** Creating the account doesn't issue a token. The frontend flow is usually signup → redirect to login. (If you want auto-login, sign a token here too and return it — but keeping them separate is simpler.)

### 7.2 Login — issue the token

```js
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "invalid credentials" });

    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
  } catch (err) {
    next(err);
  }
});
```

- **Same generic message** for "no such user" and "wrong password" — don't reveal which emails exist.
- **`{ sub: user.id }` only** — the payload is base64, not encrypted. Anyone can read it. Never put the password or anything that goes stale.
- **Synchronous `jwt.sign`** (no callback) reads cleaner inside an async handler — it returns the token directly.
- **`expiresIn: "1h"`**, not `"30s"`. Thirty seconds is a tutorial value; your token dies between logging in and testing and you'll think auth is broken.

### 7.3 verifyToken — check the token, load the user

```js
// middleware/auth.js
const jwt = require("jsonwebtoken");
const prisma = require("../prisma/client");

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "no token" });

  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      omit: { password: true },
    });
    if (!user) return res.status(401).json({ error: "invalid token" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "invalid token" });
  }
}

module.exports = { verifyToken };
```

Three parts: **verify** the signature (throws if forged or expired), **extract** `decoded.sub`, **look up** the user and attach as `req.user`. Then `next()`.

⚠️ **`next()` must be called**, or the request hangs forever — no response, no error, just a spinning client.
⚠️ **Guard `if (!user)`** — a valid token whose user was deleted returns `null`, and every downstream `req.user.id` throws.
⚠️ **`omit: { password: true }`** — this object rides on every authenticated request; never let the hash onto it.
⚠️ **Middleware in its own file**, not exported from a router — avoids the awkward import and circular-dependency traps.

### 7.4 The security model, in one line

A JWT doesn't *hide* the payload — anyone can decode it. It **proves nobody altered it**: the signature is `HMAC(payload, YOUR_SECRET)`, so forging `{"sub": 99}` needs your secret, which only the server has.

The real weakness isn't forgery, it's **theft** — a token is a *bearer* credential, so whoever holds an unexpired one is you, and you can't revoke it. Defenses: short expiry, HTTPS, and (later) refresh tokens for revocation. `JWT_SECRET` signs *and* verifies, so leaking it opens everything — `.env` only, never git, never the token.

### 7.5 Debugging a 401

Log `err.name` in the catch — it names the cause:

| `err.name` / message | Cause |
|---|---|
| `TokenExpiredError` | Token aged out. Re-login (and check you're not on `30s`) |
| `JsonWebTokenError: invalid signature` | Sign and verify used different secrets |
| `JsonWebTokenError: jwt malformed` | Header wasn't `Bearer <token>` — the split gave garbage |
| Response is `"no token"` not `"invalid token"` | Header never arrived — client isn't attaching it |

The `JWT_SECRET` vs `JWT_SECRET_KEY` mismatch is the sneakiest: both sides read `undefined`, signing succeeds, verifying fails. Grep for both spellings.

---

## 8. REST reference

**Resources are nouns, methods are verbs.** The URL says *what*, the method says *what to do*. Never `/getPosts` — that's `GET /posts`.

### 8.1 Methods

| Method | Does | On | Body |
|---|---|---|---|
| GET | read | collection or item | no |
| POST | create | collection | yes |
| PUT | replace | item | yes |
| PATCH | partial update | item | yes |
| DELETE | remove | item | no |

### 8.2 Path vs query

**Path = which resource.** Plural nouns, hierarchy for ownership:

```
/posts               the collection
/posts/3             one post
/posts/3/comments    comments of post 3
/comments/8          one comment (flat — id is globally unique)
```

**Query = how to shape a collection** — filter, sort, paginate. Never to address a specific item, never to grant access:

```
/posts?published=true
/posts?sort=addedAt&order=desc
/posts?page=2&limit=10
```

The line: changes *which thing* → path segment. Changes *how the list is filtered/ordered* → query param.

### 8.3 This project's route table

```
GET    /api/posts                 list published (optional ?author= filter)
POST   /api/posts                 create            [auth]
GET    /api/posts/:id             one post (404 if draft)   [auth]
PATCH  /api/posts/:id             publish/unpublish [auth + owner/admin]
PUT    /api/posts/:id             update            [auth + owner/admin]
DELETE /api/posts/:id             delete            [auth + owner/admin]
GET    /api/comments              list (?postid= filter)
POST   /api/comments/:postid      add a comment     [public — anonymous]
GET    /api/comments/:id          one comment
PUT    /api/comments/:id          edit              [auth + admin]
DELETE /api/comments/:id          delete            [auth + admin]
POST   /api/auth/signup           create account
POST   /api/auth/login            get a token
```

Comments here are **flat**, not nested under posts — one `commentRouter` mounted once at `/api/comments`, no `mergeParams`. The post id is a path param on create (`/:postid`) and a query filter on list (`?postid=`). Flat-with-filter is fully REST — arguably more orthodox than deep nesting, and it's what keeps the router to a single mount and a single file.

⚠️ **Comment creation is public — no `verifyToken`.** Anonymous readers comment with a name in the body. That means validation is the *only* gatekeeper (there's no auth wall), and moderation is entirely admin-side (`requireAdmin` on edit/delete). If create had `verifyToken`, anonymous readers would get 401 — test the route with **no token** to confirm it's actually open.

### 8.4 Resource route shape

```js
// GET /api/posts/:id
router.get("/:id", async (req, res, next) => {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { id: Number(req.params.id) },   // params are ALWAYS strings
    });
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err) {
    next(err);
  }
});
```

```js
// POST /api/posts — protected
router.post("/", verifyToken, async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const post = await prisma.blogPost.create({
      data: { title, content, ownerId: req.user.id },   // match your schema's FK name
    });
    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
});
```

### 8.5 Reading query params

```js
// GET /api/posts?published=true
const { published } = req.query;
const posts = await prisma.blogPost.findMany({
  where: published === "true" ? { published: true } : {},
});
```

⚠️ **Query values are strings.** `?published=true` → the string `"true"`, not a boolean. `?limit=10` → `"10"`; wrap in `Number()`.

🔥 **Never let a query param gate access.** `?includeUnpublished=true` is attacker-controlled — anyone can type it. Draft visibility is decided by `req.user` server-side, never by a param. Query params are for filtering *among things you're allowed to see*.

### 8.6 The three Express bites

1. `req.params` / `req.query` are always **strings** — `Number(req.params.id)`. (But **not** `req.user.id` — that came from Prisma, it's already an Int.)
2. A missing record is **`null`, not an error** — check it and return 404, or the next line crashes on `null`.
3. `next(err)` in **every** catch — an empty catch swallows the error and hangs the request.

---

## 9. Authorization patterns

Authentication asks *who are you* (`verifyToken` → `req.user`). Authorization asks *are you allowed*. Every mutating route needs both. These are the patterns from the post controller.

### 9.1 The trust boundary — the rule everything rests on

| Source | Trust? |
|---|---|
| `req.user` (set by `verifyToken` from a **verified** token) | ✅ signature-backed, cannot be forged without the secret |
| `req.params`, `req.query`, `req.body` | ❌ fully attacker-controlled |

Every authorization check must compare a **trusted** value against the stored record. Never trust an id, role, or owner that arrived in the URL or body.

🔥 **A client can hand-edit their token's payload** to `{"sub": 99}` — but the signature then fails `jwt.verify`, so it never reaches the controller. They **cannot** forge `req.user`. They **can** put anything in `req.params.id` and `req.body` — which is what the checks below defend.

### 9.2 Role check — can be middleware

"Is this an admin?" needs nothing but `req.user`, so it composes as middleware:

```js
// middleware/auth.js
function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "forbidden" });
  next();
}
```

```js
router.delete("/comments/:id", verifyToken, requireAdmin, deleteComment);
```

⚠️ Order matters — `verifyToken` **before** `requireAdmin`, or `req.user` is undefined.

### 9.3 Ownership check — cannot be middleware

"Is this *your* post?" needs the record loaded first, so it lives in the controller after the fetch:

```js
const post = await prisma.blogPost.findUnique({ where: { id: Number(req.params.id) } });
if (!post) return res.status(404).json({ error: "Post not found" });

// owner OR admin — the common real-world rule
if (post.ownerId !== req.user.id && req.user.role !== "admin") {
  return res.status(403).json({ error: "forbidden" });
}
```

🔥 **Ownership is always `record.ownerId` vs `req.user.id` — two *different* field names.** If you write `post.id !== req.user.id` you're comparing a post id to a user id: unrelated numbers, passes by coincidence. An ownership check whose two sides have the same field name is a bug.

### 9.4 401 vs 403 — not interchangeable

- **401** — no/invalid token. *I don't know who you are.* → frontend sends them to login.
- **403** — valid token, not permitted. *I know you, and no.* → frontend shows "not allowed."

A logged-in user editing someone else's post is **403**, never 401. Conflating them makes the admin app bounce authenticated users to a login screen they're already past.

### 9.5 Public reads must filter, not authorize

A public route has **no `req.user`** — reading it there crashes. Its job isn't "are you allowed" but "is this row public":

```js
// GET /posts/:id — public, no verifyToken
const post = await prisma.blogPost.findUnique({ where: { id: Number(req.params.id) } });
if (!post) return res.status(404).json({ error: "Post not found" });
if (!post.published) return res.status(404).json({ error: "Post not found" });  // draft → 404
res.json(post);
```

🔥 **The draft-leak trap.** Filtering the *list* (`findMany({ where: { published: true } })`) but not the *detail* route means a stranger reads any draft by guessing `/posts/7`. The filter must be on **both** reads. A draft returns 404 (not 403) so its existence isn't even revealed.

⚠️ **Never put an ownership/role check on a public route.** `req.user` doesn't exist there — it throws for every anonymous visitor. Public = filter by a column; protected = check `req.user`.

⚠️ **A route meant to be public must not carry `verifyToken`.** It's an easy mistake to leave it on — and you won't catch it in testing if you're always logged in while testing. Anonymous comment creation, public post lists, single-post reads: test each one with **no token** to confirm it isn't secretly returning 401. "It worked when I tested it" often means "I was authenticated when I tested it."

### 9.6 Mass assignment — allow-list writes

Never spread `req.body` into an update. Build the write object from an explicit allow-list:

```js
const allowed = ["title", "content"];
const data = {};
for (const key of allowed) {
  if (req.body[key] !== undefined) data[key] = req.body[key];
}
await prisma.blogPost.update({ where: { id: Number(req.params.id) }, data });
```

Without this, a client sends `{"ownerId": 99, "published": true, ...}` and reassigns or publishes at will. The allow-list is what stopped `req.body`'s untrusted fields from reaching the database.

### 9.7 The shared prelude

Update, delete, and publish all open with the same fetch → 404 → ownership block. Duplicated across three routes it's tolerable; at a fourth, extract a helper that loads the post, runs the checks, and attaches `req.post`. It can't be pure middleware — the ownership check needs the loaded record — but a helper called at the top of each controller removes the repetition.

---

## 10. Git rules for a Prisma project

| Path | Commit? | Why |
|---|---|---|
| `prisma/schema.prisma` | ✅ | Source of truth |
| `prisma/migrations/` | ✅ | The database's changelog — replayed on deploy |
| `prisma.config.ts` | ✅ | References env vars, holds no secrets |
| `.env` | ❌ **Never** | Contains the password |
| `.env.example` | ✅ | Documentation |
| `generated/` | ❌ | Derived — regenerated by `prisma generate` |

---

## 11. Schema patterns worth remembering

```prisma
model BlogPost {
  id        Int      @id @default(autoincrement())
  title     String
  content   String                          // → Postgres `text`, unbounded
  published Boolean  @default(false)
  addedAt   DateTime @default(now())
  updatedAt DateTime @updatedAt
  ownerId   Int
  owner     User     @relation(fields: [ownerId], references: [id])
  comments  Comment[]                       // virtual — NOT a column
}
```

**The one-to-many rule:** the "many" side holds the foreign key. `Comment` has `blogPostId`; `BlogPost` has no comments column. The `Comment[]` array is a Prisma query convenience built from the FK on the other table. Verify this in Studio — the absence of a `comments` column is the lesson.

**`@db.VarChar(n)` is optional on Postgres** and usually not worth it. Postgres stores `text` and `varchar(n)` identically, same performance — the length is only a constraint check. (This is *not* true of MySQL, which is where the "always specify a length" habit comes from.) Skip it unless the limit is real domain logic.

**Adding a column to a populated table:** give it `@default(...)` rather than making it `?`. A default keeps the column NOT NULL so your code only ever sees real values; `?` leaves you handling a meaningless `null` forever. Use `?` only when absence is genuinely meaningful (e.g. an optional `name String?` — no sensible default, legitimately absent).

🔥 **A new field is two changes, not one.** `migrate dev` creates the *column*; the *controller* still has to write to it. Because you build Prisma `data: {}` objects explicitly (never `...req.body`), a freshly-added column stays `null` until you add the field to the relevant `create`/`update` calls. Schema + controller, every time — the migration alone does nothing for the data.

🔥 **Renaming a column is the expensive operation.** Prisma diffs schema against database and can't distinguish a rename from drop-plus-add — so it generates `DROP COLUMN` + `ADD COLUMN` and **the data is lost**. Before you have data, rename freely. After:

```bash
npx prisma migrate dev --name rename_x --create-only
```

Then hand-edit `migration.sql` to a real `ALTER TABLE ... RENAME COLUMN ...`, then apply with `npx prisma migrate dev`.

💡 `@map("owner_id")` decouples the Prisma field name from the column name entirely — camelCase in JS, snake_case in the DB, renames on the JS side never touch the database.

🔥 **`onDelete` on relations — decide it before you delete anything.** With no rule, Postgres defaults to `Restrict`: deleting a post that has comments **throws a foreign-key violation** (surfaces as a 500). Usually you want the comments to go with the post:

```prisma
model Comment {
  blogPost   BlogPost @relation(fields: [blogPostId], references: [id], onDelete: Cascade)
  blogPostId Int
}
```

Test it: post → comment → delete the post. A 500 means the cascade rule is missing. Change the schema and `migrate dev`.

---

## 12. Seed an admin by hand

Before signup exists, you need an account to test protected routes with. In Prisma Studio, add a User row with role `admin`. The password field needs a **bcrypt hash**, not plaintext:

```bash
node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"
```

Paste the output.

---

## 13. Testing with Bruno

Bruno stores everything as plain `.bru` files — point the collection at `blog/api/bruno/` and it version-controls with your API. The goal: **log in once**, and every protected request reuses the token automatically.

### 11.1 One-time setup

1. **Environment** — top-right dropdown → Configure → add env `local` with two vars: `baseUrl` = `http://localhost:3000`, and `token` = (blank; the script fills it). Select `local` so it's active.

2. **Login request** — `POST {{baseUrl}}/api/auth/login`, Body → JSON with email + password. This request sends **no** auth — it's how you *get* the token.

3. **Capture script** — on the login request, Script tab → Post Response:

   ```js
   bru.setEnvVar("token", res.body.token);
   ```

   Runs after every send, reads `token` out of the response, stores it. Match the path to your response shape — `res.json({ token })` → `res.body.token`.

4. **Collection Bearer** — right-click the *collection* → Settings → Auth → Bearer, token `{{token}}`. Every request inherits this.

5. **Protected requests** — leave their Auth tab on **Inherit** (the default). They pick up the collection's Bearer automatically. Don't set it per-request.

### 11.2 The loop

Send login once → the script stores the token → send any protected request → it auto-attaches `Authorization: Bearer <token>`. On expiry you get 401; re-send login once and everything works again, because the script overwrote the variable.

This is persistent login over a pure API — no frontend. The token *is* the session; Bruno's env var is just where the "client" holds it.

### 11.3 curl equivalent

```bash
# log in once, capture the token
TOKEN=$(curl -s -X POST localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"me@test.com","password":"secret123"}' | jq -r .token)

# reuse it — no re-login until it expires
curl localhost:3000/api/posts -H "Authorization: Bearer $TOKEN"
curl -X POST localhost:3000/api/posts -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"title":"Hi","content":"..."}'
```

The `$TOKEN` shell variable does exactly what Bruno's env var does — holds one token across many authenticated requests.

⚠️ Don't commit a Bruno environment file containing a real password — same `.env` discipline.

---

## 14. Error lookup

| Error | Cause |
|---|---|
| `P1001: Can't reach database server at db.<ref>.supabase.co` | Direct connection is IPv6-only. Use the session pooler |
| `P1012: datasource property url is no longer supported` | Prisma 7 — move the URL to `prisma.config.ts` |
| `datasource property is required in your Prisma config file` | Config file has no `datasource` key |
| `process.env.DATABASE_URL` is undefined | Missing `import 'dotenv/config'` in the config file |
| Connection fails with a valid-looking URL | Special characters in the password — URL-encode or reset |
| `Cannot use import statement outside a module` | Add `"type": "module"` to `package.json` |
| `ERR_INVALID_PACKAGE_CONFIG` | Trailing comma in `package.json`. Legal in JS, illegal in JSON |
| `TypeError: argument handler must be a function` | `module.exports = router` missing, or export/import shape mismatch |
| CORS error in browser, fine in Postman/Bruno | Origin not in the allow-list. Set `CORS_ORIGINS`; Bruno/curl don't enforce CORS |
| `req.body` is undefined | Missing `app.use(express.json())`, or it's registered after the routes |
| `next is not defined` | Handler signature is `(req, res)` but the catch calls `next(err)` |
| `bcrypt is not a function` | It's `bcrypt.hash(pw, 10)`, not `bcrypt(pw, 10)` |
| Errors return HTML, `response.json()` throws | Error handler missing, or missing its 4th `next` param |
| `jwt.sign` throws on the secret | Env var name mismatch — `JWT_SECRET` vs `JWT_SECRET_KEY` |
| `MODULE_NOT_FOUND` on the generated client | Run `npx prisma generate`. Then `ls generated/prisma` to confirm the real export path |
| `Cannot find module '@prisma/adapter-pg'` | `npm i @prisma/adapter-pg pg` |
| Foreign key violation on delete | No `onDelete` rule on the relation — decide cascade vs restrict |
| Prisma expects Int, got String | `req.params` are always strings. Wrap in `Number()` |

---

## 15. The whole thing, condensed

```bash
mkdir blog && cd blog && git init
# write root .gitignore FIRST

mkdir api && cd api && npm init -y
npm i express cors dotenv bcryptjs jsonwebtoken passport passport-jwt \
      @prisma/client @prisma/adapter-pg pg
npm i -D prisma nodemon

npx prisma init --datasource-provider postgresql
# → .env:              DATABASE_URL = session pooler string (port 5432)
# → schema.prisma:     provider only, NO url
# → prisma.config.ts:  add datasource: { url: process.env.DATABASE_URL }
#                      confirm import 'dotenv/config' on line 1

# write your models

npx prisma validate
npx prisma migrate dev --name init
npx prisma generate
ls generated/prisma          # confirm the client exists + note the real import path
npx prisma studio
```
