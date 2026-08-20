# Blog API — A Learning Path

## How to use this guide

Each step has three parts:

- **Why** — what this step is actually teaching you. Read this even if you skip everything else.
- **Do** — the task.
- **Code policy** — one of:
  - 🚫 **No code given.** You already know this, or the struggle *is* the lesson. Reference to your own past work where relevant.
  - ✍️ **Type by hand.** Snippet provided, but retype it. The muscle memory and the small typos you fix are the point.
  - 📋 **Copy-paste OK.** Boilerplate. Nothing is learned by typing it. Copy it and move on.

There are **🛑 Checkpoints** — stop and answer them out loud before continuing. If you can't, go back.

---

## What you're already bringing

From your past projects, you already have working versions of these. **Open those repos and steal from them.** Recycling your own code is a real skill, not cheating:

| You have | From | Reuse for |
|---|---|---|
| Passport `LocalStrategy` + `bcrypt.compare` | Members-only clubhouse | Login route |
| Signup with hashed passwords | Clubhouse / upload-folder | User creation |
| Prisma schema, migrations, `PrismaClient` | upload-folder | All models |
| express-validator on POST routes | Clubhouse | Comment + post validation |
| `jwt.sign` / `jwt.verify`, Bearer header parsing | Your JWT cheatsheet (Aug 13) | Token issuing |
| Render + Supabase deploy | Previous projects | Deployment |

**What is genuinely new in this project** — and where you should slow down:

1. An API that returns **JSON instead of rendering views**. Everything downstream of that changes.
2. **Stateless auth** (JWT) replacing your session-based auth. This is a real conceptual shift, not a library swap.
3. **CORS** — a problem that literally cannot exist until frontend and backend live on different origins.
4. **Two clients** consuming one backend, with different permissions.

---

# Phase 0 — Setup

## Step 0.1 — Decide repo structure

**Why:** This is a real architectural decision you'll face again. Monorepo = one commit history, easy to keep in sync, slightly more awkward to deploy. Separate repos = clean histories, each deploys independently, but you juggle three tabs.

**Do:** For your situation (learning, deploying to Render, want to show it in a portfolio), use **three separate repos**. Render deploys per-repo, and the deploy config will be simpler. Name them `blog-api`, `blog-reader`, `blog-admin`.

**Code policy:** 🚫 No code given.

---

# Phase 1 — Design the data (no code yet)

## Step 1.1 — Model the domain on paper

**Why:** This is the single most valuable step in the project and the one everyone rushes. Every bad decision here costs you three refactors later. Prisma makes changing schemas easy; it does not make changing your *mental model* easy.

**Do:** Before touching a keyboard, write out on paper the answer to each question. Don't look for "the right answer" — decide, and be able to justify it.

**Posts**
- What fields? (Think: title, body/content, timestamps, published flag, author.)
- How do you represent published vs unpublished? A boolean `published`? A nullable `publishedAt` datetime? An enum status (`DRAFT | PUBLISHED | ARCHIVED`)?
  - 💡 Consider: a nullable `publishedAt` gives you both facts (is it published, and when) in one field. A boolean gives you one. What would you need if you later wanted scheduled publishing?
- Does a post need a `slug` for pretty URLs, or is `/posts/3` fine for now?

**Comments**
- Does a comment need a title? (The assignment asks this deliberately — the answer is almost certainly no. Why did they ask?)
- Who wrote it? Two options: a required `User` relation (commenters must have accounts) or a plain `authorName` string (anonymous commenting). Which one matches the project you actually want to build?
  - 💡 The simpler path is a string name/email on the comment with no user account. The more instructive path is real user accounts, because then you get to write ownership checks ("you can only delete *your own* comment"). Pick based on how much you want to learn about authorization.
- Are comments nested (replies to replies)? **Say no.** Self-referential trees are a rabbit hole that will eat this project.

**Users**
- Minimum viable: `id`, `email` (or `username`), `password` (hashed), `role` or `isAuthor` boolean.
- 💡 Even if there is only ever one author — you — keep a role field. The alternative is hardcoding your own user ID into route guards, which is the kind of thing that feels fine for two days and shameful forever after.

🛑 **Checkpoint:** Draw the three boxes and the arrows between them. Which side of each arrow holds the foreign key? If you can't answer "does the Post hold the comment IDs, or does each Comment hold the post ID," stop and think it through — this is the one-to-many rule and it never changes.

**Code policy:** 🚫 No code given. Deliberately. Design work with a schema handed to you is not design work.

---

## Step 1.2 — Design the API surface

**Why:** REST is a convention, and the value of a convention is that other people (and future you) can guess your endpoints without reading your code. Designing the route table before writing controllers means you write *to a plan* rather than accreting routes.

**Do:** Fill in this table yourself before coding. I've left the method column blank for you.

```
______  /posts                      list posts
______  /posts/:postId              one post
______  /posts                      create a post
______  /posts/:postId              update a post
______  /posts/:postId              delete a post
______  /posts/:postId/comments     list comments on a post
______  /posts/:postId/comments     add a comment
______  /comments/:commentId        delete a comment
______  /auth/signup                create account
______  /auth/login                 exchange credentials for a JWT
```

Then for each row, write next to it: **public, or requires a token?** And if it requires a token: *any* logged-in user, or an author only?

💡 Two things worth noticing while you do this:
- Comments are **nested under posts for creation and listing** (you always need to know which post), but **flat for delete** (a comment ID is globally unique — you don't need the post). Both patterns are correct REST; knowing why is the lesson.
- There is no `PUT /posts/:id/publish` in that list. Publishing is just a `PUT`/`PATCH` that changes one field. Resist inventing verb-endpoints — that's the most common way people drift out of REST.

🛑 **Checkpoint:** Which route in that table is the trickiest for permissions, and why? (Hint: `GET /posts` returns different things depending on who's asking.)

**Code policy:** 🚫 No code given.

---

# Phase 2 — The API skeleton

## Step 2.1 — Express app, API-flavoured

**Why:** Your previous Express apps rendered EJS. This one never renders anything. That sounds like a small difference and isn't — it changes your body parsing, your error handling, your status codes, and how you debug.

**Do:** `npm init`, install `express`, `@prisma/client`, `dotenv`, and dev-install `prisma` and `nodemon`. Set up `app.js` with your usual router mounting.

The one thing to change from muscle memory:

✍️ **Type by hand:**
```js
app.use(express.json());          // parses JSON request bodies — the API default
app.use(express.urlencoded({ extended: true }));  // keep for form-encoded clients
```

You previously reached for `urlencoded` because HTML forms send that. Your clients now send `Content-Type: application/json` via `fetch`. Without `express.json()`, `req.body` is `undefined` and you will lose twenty minutes to it. (Everyone does. Now you won't.)

**Do not** install or configure: `express-session`, `prisma-session-store`, a view engine, `connect-flash`. If your instinct reaches for them, that instinct is from the session-based world you're leaving.

🛑 **Checkpoint:** Why does an API-only backend not need `express-session`? Answer in terms of where state lives.

**Code policy:** ✍️ Type by hand (the two lines above). Everything else 🚫 — recycle from upload-folder.

---

## Step 2.2 — Prisma schema and first migration

**Why:** Translating your paper model into schema syntax is where vague design decisions become concrete and where you discover the ones you fudged.

**Do:** Write `schema.prisma` from your Step 1.1 notes. Run `npx prisma migrate dev --name init`. Open `npx prisma studio` and confirm the tables look like your drawing.

Two syntax reminders, since these are the bits people look up every time:

📋 **Copy-paste OK** (as a *pattern* to adapt, not a schema to use):
```prisma
model Post {
  id        Int       @id @default(autoincrement())
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  author    User      @relation(fields: [authorId], references: [id])
  authorId  Int
  comments  Comment[]
}
```

The rest — your actual fields, your published representation, your Comment and User models — 🚫 write yourself.

💡 `@updatedAt` is free and you will want it. `onDelete: Cascade` on the comment→post relation is worth reading about *now*: what should happen to 40 comments when you delete their post? Prisma's default will throw an error rather than guess.

🛑 **Checkpoint:** Run a migration, then add a field, then migrate again. Look in `prisma/migrations/`. What is actually in those files, and why does the folder matter for deployment?

**Code policy:** 📋 Pattern only.

---

## Step 2.3 — Routes and controllers, unprotected first

**Why:** Build the boring version that works before adding auth. If you add authentication at the same time as CRUD, every bug is ambiguous — is the route broken, or is the token wrong? Separating them halves your debugging.

**Do:** Implement every route from your Step 1.2 table with **no auth at all**. Anyone can do anything. Controllers in `controllers/`, routers in `routes/`, exactly like your past projects.

Three things that differ from your rendering apps — worth internalising:

1. **You return status codes deliberately.** `201` for created, `204` for deleted-with-no-body, `404` when a post ID doesn't exist, `400` for validation failures. In an EJS app you got away with always sending 200 and rendering an error message. An API's status code *is* the error message.
2. **Never send the password field.** Use Prisma's `select` or `omit` on any query returning a user. Get this habit now, before you have a frontend leaking it.
3. **A missing record is `null`, not an exception.** `findUnique` returns `null` for a bad ID. If you don't check, you'll send `null` with a 200 and confuse your own frontend later.

✍️ **Type by hand** — the shape every controller should have:
```js
exports.getPost = async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: Number(req.params.postId) },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err) {
    next(err);
  }
};
```

Note `Number(req.params.postId)` — URL params are always strings, Prisma wants an Int, and the resulting error message is unhelpfully vague. This bites everyone once.

**Code policy:** ✍️ One controller shape given. The other ~9 controllers 🚫 — write them yourself. If you can write one you can write all of them, and the repetition is where fluency comes from.

---

## Step 2.4 — A JSON error handler

**Why:** Pure boilerplate, but the *concept* matters: in an API, an unhandled error must still produce valid JSON. If your error handler renders an HTML error page, your frontend's `response.json()` will throw a confusing parse error and you'll debug the wrong side.

📋 **Copy-paste OK:**
```js
// Last middleware in app.js, after all routes.
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});
```

⚠️ In production, don't leak `err.message` for 500s — it can expose database internals. Send a generic string and log the real one.

**Code policy:** 📋 Copy-paste OK.

---

## Step 2.5 — Test it with Postman before going further

**Why:** You now have a working API and no way to see it. Learning to trust your API through a client — rather than through a browser rendering a page — is the shift this whole project is teaching.

**Do:** Create a Postman collection with a request per endpoint. POST a user, POST a post, GET it back, PUT it, DELETE it. Set a `{{baseUrl}}` collection variable now (`http://localhost:3000`) — when you deploy, you flip one variable and re-test everything against production.

🛑 **Checkpoint:** Can you create a post, add two comments to it, fetch the post with its comments included, and delete it — entirely from Postman? If yes, your CRUD is done. Commit.

**Code policy:** 🚫 No code.

---

# Phase 3 — Authentication (the new part)

## Step 3.1 — Understand what changed before writing anything

**Why:** You know session auth cold. JWT is not a drop-in replacement — it's a different model, and the differences are exactly what the tricky parts of this project come from.

Read this table and make sure each row lands:

| | Session (what you built before) | JWT (what you're building now) |
|---|---|---|
| Where is the truth? | Server — a row in your session table | The token itself, held by the client |
| What does the client hold? | An opaque session ID in a cookie | The whole signed payload |
| Server storage | Required | None |
| Log out | Delete the server row — instant | **You can't.** The token stays valid until it expires |
| Revoke a compromised login | Delete the row | Not possible without adding a blocklist |
| Works across origins | Painful (cross-site cookies) | Easy (a header is just a header) |

That last row is *why* this project uses JWT. Your frontends are on different domains from your API, and cross-site cookies are genuinely miserable.

The "you can't log out" row is the one to sit with. Logging out means the *client* throws the token away. The server still honours that token if anyone else has a copy. This is the fundamental tradeoff you're accepting in exchange for statelessness, and it's why short expiry times matter.

🛑 **Checkpoint:** If you set `expiresIn: '30d'` and your token leaks, what are your options? Now you understand why real systems use short access tokens plus refresh tokens.

**Code policy:** 🚫 Reading step.

---

## Step 3.2 — Signup and login

**Why:** You've done this. The only new part is the last line of the login controller.

**Do:** Recycle from your clubhouse project:
- Signup: validate → `bcrypt.hash` → `prisma.user.create` → return the user **without the password**.
- Login: find user by email → `bcrypt.compare` → same generic failure message for "no such user" and "wrong password" (you already know why).

Then, instead of `req.login()` and a redirect, sign a token and send it as JSON. Your JWT cheatsheet from Aug 13 has the exact `jwt.sign` call. Two corrections to the tutorial version you followed:

- Put **only the user id** in the payload — not the whole user object. The payload is base64, not encrypted; anyone can read it. Never put the password hash, and don't put anything that goes stale.
- **Always set `expiresIn`.** The tutorial omitted it. `'1h'` is a reasonable learning default.

🛑 **Checkpoint:** Log in via Postman, paste the token into jwt.io, and read your own payload. Confirm there's nothing in there you'd mind a stranger seeing.

**Code policy:** 🚫 No code — recycle from clubhouse + your own cheatsheet.

---

## Step 3.3 — Verify tokens with Passport's JWT strategy

**Why:** Your cheatsheet has a hand-rolled `verifyToken` middleware that splits the Bearer header manually. That works and was worth writing once. Passport's JWT strategy does the same job but handles the header parsing, gives you `req.user` (a populated user object, not a raw payload) with the same ergonomics you're used to from `LocalStrategy`, and lets you protect a route with one middleware call.

The wiring is fiddly and non-obvious, so here it is — but retype it, because you need to recognise every piece later when it silently fails.

**Do:** `npm i passport passport-jwt`

✍️ **Type by hand:**
```js
// config/passport.js
const passport = require("passport");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const prisma = require("../prisma/client");

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    },
    async (payload, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, role: true },  // never select password
        });
        if (!user) return done(null, false);
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);
```

Then in `app.js`: `require("./config/passport")` — for the side effect only, no variable. Forget it and you get `Unknown authentication strategy "jwt"`. You've hit this exact error before with `local`.

And to protect a route:

✍️ **Type by hand:**
```js
const requireAuth = passport.authenticate("jwt", { session: false });

router.post("/posts", requireAuth, postController.createPost);
```

Three things to notice, each of which will otherwise cost you time:

1. **`{ session: false }` is mandatory.** Without it Passport tries to serialize the user into a session that doesn't exist. This is the single most common passport-jwt mistake.
2. **No `serializeUser` / `deserializeUser`.** Those exist to move a user id in and out of a session. There's no session. The strategy callback *is* your deserialize step — it runs on every request and does the lookup.
3. **`payload.sub`** assumes you signed `{ sub: user.id }`. If you signed `{ id: user.id }`, use `payload.id`. Make these match. A mismatch fails silently as a 401 with no explanation, which is maddening.

🛑 **Checkpoint:** Hit a protected route with no token (expect 401), with a garbage token (401), and with a valid token (200). Then wait for a token to expire and try again. Knowing what each failure *looks like* is what lets you diagnose the frontend later.

**Code policy:** ✍️ Type by hand. This is boilerplate you'd normally copy, but the three gotchas above are only learnable by having typed the thing they're about.

---

## Step 3.4 — Authorization: beyond "is there a token"

**Why:** Authentication asks *who are you*. Authorization asks *are you allowed*. Every real app needs both, and conflating them is a classic security hole. A valid token proves someone is logged in — it says nothing about whether they may delete *this* post.

**Do:** Write two more middlewares yourself:

- `requireAuthor` — runs after `requireAuth`, checks `req.user.role` and 403s otherwise. Use it on all post-writing routes.
- An ownership check for comment deletion — the commenter may delete their own; an author may delete any. This one can't be a pure middleware, because it needs to load the comment first. Where does it belong — middleware or controller? Decide and justify.

💡 **401 vs 403** — these are not interchangeable. 401 means *I don't know who you are* (no/invalid token). 403 means *I know exactly who you are and you still can't*. Getting these right makes your frontend's job much easier: 401 → send them to login; 403 → show "not allowed."

**Code policy:** 🚫 No code. You have all the pieces — this is composition, and it's a good test of whether Step 3.3 actually landed.

---

## Step 3.5 — The published/unpublished subtlety

**Why:** This is the most interesting logic in the whole project, and it's easy to get subtly wrong in a way that leaks your drafts to the public.

`GET /posts` must return different data depending on the caller:
- Anonymous reader → published posts only.
- Author → everything, with the published status visible.

**Do:** Think about the mechanism before implementing. Some options:

- Two separate endpoints (`/posts` and `/admin/posts`) — explicit, more routes.
- One endpoint that branches on whether `req.user` exists and is an author — fewer routes, logic inside the controller.
- A query param like `?includeUnpublished=true` — ⚠️ **think hard about this one.** What stops a stranger from adding that param?

⚠️ Whichever you pick, there's a trap: `passport.authenticate("jwt")` **rejects the request with a 401 if there's no token.** But `GET /posts` must work for anonymous readers. So you need *optional* authentication — populate `req.user` if a valid token is present, continue anyway if not. Look up how to do this with a custom callback on `passport.authenticate`. Working that out yourself is worth more than being handed it.

Also: don't forget `GET /posts/:id`. If a stranger guesses the ID of an unpublished post, what happens? Check this explicitly — it's the hole people leave open.

🛑 **Checkpoint:** In Postman, create an unpublished post as an author. Then remove the Authorization header and try to fetch it both via the list and by direct ID. If you can see it, you have a bug.

**Code policy:** 🚫 No code. This is the best thinking exercise in the project.

---

## Step 3.6 — Validation

**Why:** Same skill you have, one new output format.

**Do:** Recycle your express-validator chains from clubhouse. The only change: on failure, return `res.status(400).json({ errors: result.array() })` rather than re-rendering a form with error messages.

💡 Design decision worth making consciously: what shape do your errors take? Your frontend has to parse them. Pick one shape — `{ errors: [...] }` — and use it for *every* error your API can produce. Inconsistent error shapes are the thing that makes consuming an API miserable, and you're about to be your own consumer.

**Code policy:** 🚫 Recycle.

---

# Phase 4 — The frontends

## Step 4.1 — CORS

**Why:** Your frontend is about to make its first request and get blocked by an error message that mentions nothing you wrote. Understanding this *before* it happens saves an afternoon.

The browser enforces the same-origin policy: JavaScript on `localhost:5173` may not read a response from `localhost:3000` unless that server explicitly says it's allowed. Note two things — this is a **browser** rule (Postman ignores it entirely, which is why everything worked so far), and the permission is granted by the **server**, in response headers.

**Do:** `npm i cors`

📋 **Copy-paste OK:**
```js
const cors = require("cors");

app.use(cors({
  origin: [
    "http://localhost:5173",       // reader, dev
    "http://localhost:5174",       // admin, dev
  ],
}));
```

Place it **before** your routes. Add your deployed frontend URLs to that array at deploy time — and never ship `cors()` with no options, which allows every origin on the internet.

💡 You don't need `credentials: true`. That's for cookies. You're sending a header — this is one of the concrete ways JWT made your life easier.

**Code policy:** 📋 Copy-paste OK. Understanding it matters; typing it doesn't.

---

## Step 4.2 — The reader frontend

**Why:** This is where an API stops being abstract. You'll immediately discover every awkward thing about your own design — a missing field, comments you have to fetch separately, an error shape you can't parse.

**Do:** Vite + React (you know it, and it matches where you're heading). Build:
- A post list — title, date, excerpt.
- A single post page with its comments.
- A comment form.

Keep it plain. Two screens is enough.

💡 Keep a note file of every "ugh, I wish the API did X" moment. That list is the actual output of this step. Then go fix the API — that round trip, API → client → improved API, is the professional skill this whole project exists to teach.

**Code policy:** 🚫 No code. `fetch` + `useState` + `useEffect` is ground you've covered.

---

## Step 4.3 — The admin frontend

**Why:** Everything new lands here: sending tokens, storing them, handling 401s, and building UI whose shape depends on auth state.

**Do:** A second Vite app. Features:
- Login form → store the returned token.
- Post list showing published status, with a toggle button.
- New/edit post form.
- Comment moderation (delete).

The mechanics:
- Store the token in `localStorage` (the assignment says so; see the warning below).
- Send it as `Authorization: Bearer <token>` on every protected request.
- Write **one** `apiFetch` wrapper that attaches the header automatically. Do this on request #2, not request #12 — otherwise you'll paste the header in fifteen places and have to unpick it.
- Logout = delete the token from localStorage. That's the whole logout. Sit with how unsatisfying that is; it's the tradeoff from Step 3.1 made concrete.
- Handle 401 globally in that wrapper: clear the token, bounce to login. Otherwise expired tokens produce weird half-broken screens.

⚠️ **On localStorage:** the assignment tells you to use it, and for learning that's fine. But know why it's a compromise — any XSS on your page can read localStorage and steal the token. `httpOnly` cookies can't be read by JavaScript at all, which is strictly safer, but they bring the cross-site cookie headaches this project is deliberately avoiding. Do it the simple way here; know what you traded.

**Code policy:** 🚫 No code. If you get stuck, it'll be on token attachment — and the debugging (open Network tab, look at the request headers, is the token there and well-formed?) is a skill worth acquiring on a small problem.

---

# Phase 5 — Deploy

## Step 5.1 — Ship all three

**Why:** Deployment surfaces every assumption you hardcoded.

**Do:**
- API → Render. You know this. Set `JWT_SECRET` and `DATABASE_URL` as environment variables; ensure migrations run on deploy.
- Frontends → wherever you deployed the CV Application.
- Add the deployed frontend URLs to your CORS `origin` array. **This is the step everyone forgets**, and the symptom — everything works locally, nothing works in production, with a CORS error — is now something you'll recognise instantly.
- Replace hardcoded `localhost:3000` in both frontends with an env var (`VITE_API_URL`).
- Re-run your whole Postman collection against production by flipping `{{baseUrl}}`. Told you.

🛑 **Final checkpoint:** From a phone, on mobile data, read a published post. Then log into the admin site and publish a draft. If both work, you've built and deployed a decoupled application. That's the actual achievement here — not the blog.

**Code policy:** 🚫 No code.

---

# Traps worth knowing in advance

| Symptom | Cause |
|---|---|
| `req.body` is `undefined` | Missing `express.json()` |
| `Unknown authentication strategy "jwt"` | Forgot `require("./config/passport")` in app.js |
| Valid token still 401s, silently | Payload key mismatch — signed `id`, read `sub` (or vice versa) |
| `Failed to serialize user into session` | Missing `{ session: false }` |
| CORS error in browser, fine in Postman | Origin not in the allow-list. Postman doesn't enforce CORS |
| Prisma "expected Int, got String" | `req.params` are strings — wrap in `Number()` |
| `response.json()` throws "Unexpected token <" | Server sent an HTML error page. Your error handler isn't JSON |
| Deleting a post errors with a foreign key violation | No `onDelete` rule on the comments relation |

---

# Scope control

You could spend a month here. Don't. The learning is concentrated in Phases 2 and 3.

**Do:** the full API, JWT auth, both frontends in plain form, deployed.

**Skip:** rich text editors (TinyMCE), nested comments, pagination, image uploads, refresh tokens, password reset, dark mode. Every one of these is a legitimate feature and none of them teaches you what this project is for.

If you finish early and want more, the highest-value additions in order:
1. **Refresh tokens** — directly extends what you learned in 3.1.
2. **Rate limiting on login** (`express-rate-limit`) — one line, real security value.
3. **Automated tests** with Supertest — an API is *far* easier to test than a rendering app, which is one of its underrated advantages.
