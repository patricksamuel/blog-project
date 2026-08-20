# Blog UI — Frontend Build Guide

Vite + React + Tailwind + shadcn/ui, one app, built against your actual API.

## How this guide works

**Everything is given in full** — no "build it yourself" gaps, because guessing your gaps wastes your time. Each block is tagged so *you* decide what to internalize:

- ✍️ **Type by hand** — worth the reps; the pattern sticks by writing it (hooks, fetch logic, forms).
- 📋 **Copy-paste** — pure boilerplate; nothing learned by typing (config, provider nesting, imports).

The staged pages (Steps 7–12) still build up in passes (static → state → data → refine) so you see each layer — but every pass is complete code, tagged, not a description to fill in.

## What you're building

One app. Public pages need no token; authoring pages sit behind a guard.

| Page | Route | API call | Auth |
|---|---|---|---|
| Post list | `/` | `GET /api/post` | public |
| Single post + comments | `/post/:id` | `GET /api/post/:id`, `GET /api/comment?postid=` | public |
| Login | `/login` | `POST /api/auth/login` | public |
| My posts (dashboard) | `/dashboard` | `GET /api/post/mine` * | 🔒 guard |
| Write / edit | `/write`, `/write/:id` | `POST` / `PUT /api/post` | 🔒 guard |

\* `GET /api/post/mine` is the one backend route you still need to add — see Step 0.

---

## Step 0 — Add the one missing backend route

**Why:** the editor's dashboard needs *your posts including drafts*. `GET /api/post` is published-only by design, so drafts would never appear. You need a protected route scoped to the logged-in author.

Add to `postController.js`:

```js
exports.getMyPosts = async (req, res, next) => {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { owner_id: req.user.id },       // mine — drafts included
      orderBy: { addedAt: "desc" },
    });
    res.json(posts);
  } catch (err) { next(err); }
};
```

Add to `postRouter.js` — **above** `/:id`:

```js
router.get("/mine", verifyToken, postController.getMyPosts);
```

⚠️ Order matters. If `/:id` comes first, Express reads "mine" as an id, `Number("mine")` is `NaN`, breaks. Specific routes before wildcards — the rule from your post routes.

Test in Bruno (with token) before moving on. 🚫 No more code — you've written five of these.

---

## Step 1 — Scaffold

📚 **Official source:** Vite — https://vite.dev/guide/ (project scaffolding)

📋 Copy-paste. From your monorepo root (`blog/`):

```bash
npm create vite@latest blog-ui -- --template react
cd blog-ui
npm install
```

The scaffolder may prompt for a **linter** (pick ESLint — the ecosystem default; Oxlint is faster but thinner) and other options depending on your Vite version. Defaults are fine.

Test it runs: `npm run dev` → open the localhost URL → kill it with Ctrl-C.

💡 Vite picks a port (usually 5173). Whatever it is, that's the origin your API's CORS must allow. You set `http://localhost:5173` in the API's cors config earlier — if Vite lands on a different port, update the API.

---

## Step 2 — Tailwind v4 + shadcn/ui

This is the part that's changed most since you last did React, so it's in full. Every step below traces to an official page — **when a doc and this guide disagree, the doc wins** (all three tools move fast):

📚 **Official sources:**
- Tailwind + Vite — https://tailwindcss.com/docs/installation/using-vite
- shadcn + Vite — https://ui.shadcn.com/docs/installation/vite

⚠️ **JS vs TS translation.** The official shadcn page assumes **TypeScript** — it has you edit `tsconfig.json` and `tsconfig.app.json` and install `@types/node`. You're on **JavaScript**, so the equivalent is a single `jsconfig.json` (below) and no `@types/node` (plain JS resolves `path` and `__dirname` without it). Wherever the official page says `tsconfig`, you do the one `jsconfig.json` instead. That's the only substitution — everything else on the page applies as-is.

💡 **Shortcut for next time:** the official page now leads with `npx shadcn@latest init -t vite`, a scaffolder that generates Tailwind + alias + config in one command. This guide walks the manual "Existing Project" path so you see each piece — but on a future project, the one-command version exists.

### 2a — Tailwind

📋 Copy-paste. (Source: Tailwind's *Using Vite* page.)

```bash
npm install tailwindcss @tailwindcss/vite
```

`@tailwindcss/vite` is the **v4 change** worth knowing: v4 replaced the old `postcss.config.js` + `tailwind.config.js` setup with a single Vite plugin. Any tutorial showing those two config files is v3 — ignore it.

Replace `src/index.css` with just:

```css
@import "tailwindcss";
```

### 2b — The Vite config + alias

📋 Replace `vite.config.js` entirely. (Source: shadcn's Vite page, `vite.config.ts` step — translated to JS.)

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";                    // ← Node built-in; ES modules need this explicitly

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },   // lets you import "@/components/..."
  },
});
```

Line by line: `react()` (Vite's React plugin) enables JSX; `tailwindcss()` wires in Tailwind v4; the `alias` block is **required by shadcn** — its components import each other as `@/components/ui/...`, and without this Vite can't resolve `@`.

🔥 **`import path from "path"` is mandatory and easy to lose.** `path` is a Node built-in but ES modules don't provide it as a global — you must import it. If it's missing (a `shadcn` command can rewrite your config and drop it), `npm run dev` throws `ReferenceError: path is not defined`. If that happens, re-add this one line.

### 2c — The alias for shadcn (jsconfig)

📋 shadcn needs the alias declared for tooling too. On JS, create `jsconfig.json` at the **app root** — `blog-ui/`, next to `package.json` and `vite.config.js`, **not** the monorepo root (the `./src` path is relative to this file, so it must sit beside the real `src`):

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### 2d — shadcn init

📋 (Source: shadcn Vite page, *Run the CLI* step.)

```bash
npx shadcn@latest init
```

Prompts you'll hit — these are newer than most tutorials show:
- **Component library / foundation** → **Base UI (Recommended)**. It's the headless layer under shadcn (accessibility, keyboard, focus). Blocks are generated against the default, so staying on it avoids import mismatches. Radix/React Aria are alternatives you don't need here.
- **Preset** → **Nova (Lucide / Geist)**. Bundles a base color, font, and the Lucide icon set. Neutral and clean; your Step 3 display-font override layers on top of it. (You get `lucide-react` for icons either way — you'll use it in the navbar.)
- **Base color** (if asked separately) → Slate or Zinc.

This creates `components.json` and `lib/utils.js`.

### 2e — Pull the components you'll use

📋

```bash
npx shadcn@latest add button input textarea card label sonner
```

That writes real files into `src/components/ui/*`. Each is code *you own and edit* — the shadcn philosophy: not an installed black box. (Source: shadcn's *Add Components* step.)

💡 What each is for: `button`/`input`/`textarea`/`label` (forms), `card` (post previews), `sonner` (toasts — "Published", "Comment added").

🛑 **Checkpoint:** put `<h1 className="text-3xl font-bold text-blue-600">test</h1>` in `App.jsx`, run `npm run dev`. Blue and bold → Tailwind + the whole chain works. Plain black → the vite config or the `@import "tailwindcss"` is wrong; fix before continuing. `ReferenceError: path is not defined` → the missing import in 2b.

---

## Step 3 — The design direction (spend 5 minutes here)

**Why:** a blog is *typography*. If you skip this you'll get the default shadcn look, which is fine but anonymous — and for a SaaS founder, developing an eye for "this looks intentional vs templated" is a real skill. One deliberate choice now teaches more than ten components later.

Pick **one** display typeface with personality for headings and post titles, pair it with a clean readable body face. Don't use the same font for both — that's the tell of an unstyled page. Two concrete, widely-used pairings that aren't overused:

- **Fraunces** (display, has character) + **Inter** (body). Warm, editorial.
- **Instrument Serif** (display) + **Geist** (body). Modern, quiet.

Add via Google Fonts `<link>` in `index.html`, then set them in `index.css`:

```css
@import "tailwindcss";
@theme {
  --font-display: "Fraunces", serif;
  --font-body: "Inter", sans-serif;
}
body { font-family: var(--font-body); }
```

Then `font-display` becomes a Tailwind class you put on headings. One good font pairing does more for "neat" than any component.

💡 Design principle (the pages ahead give full layout code — this is the taste to apply): pick one thing to be memorable (your post-title treatment — big, characterful) and keep everything else quiet around it.

---

## Step 4 — The API wrapper (the single most important file)

**Why:** this is the token-plumbing you worried about. Write it once, on request #2 not #12, and every call attaches the token automatically — public calls simply have nothing to attach.

✍️ Type this by hand — it's small and you should know every line:

```js
// src/lib/api.js
const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (res.status === 401) {                 // token dead or missing
    localStorage.removeItem("token");
    // let callers/route-guard handle the redirect
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.status === 204 ? null : res.json();
}
```

What each part does, since you'll rely on it everywhere:

- **`BASE` from an env var** → at deploy you flip `VITE_API_URL`, no code change. Create `.env` with `VITE_API_URL=http://localhost:3000` (and remember: `VITE_`-prefixed vars ship to the browser — fine for a public API URL, never for secrets).
- **reads the token from localStorage every call** → the header is per-request, the token is persistent. This is the thing you asked about made concrete.
- **spreads `token &&`** → public calls have no token, so nothing attaches, and they just work.
- **401 → clear the token** → an expired token cleans itself up.
- **throws on non-ok** → your components use one `try/catch` instead of checking `res.ok` everywhere. Your API's consistent `{ error }` shape is why this works.

💡 This file is why one app has no token headaches: there's exactly one place that knows about tokens.

---

## Step 5 — Auth state (Context)

**Why:** multiple pages need to know "is someone logged in?" — the navbar (show Login vs Logout), the route guard, the editor. Prop-drilling that is misery. Context is the standard answer, and it's worth re-learning since you're rusty.

✍️ Type by hand — Context is a pattern to have in your fingers:

```jsx
// src/lib/auth.jsx
import { createContext, useContext, useState } from "react";
import { apiFetch } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  async function login(email, password) {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("token", data.token);
    setToken(data.token);
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ token, isAuthed: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

The pattern: `AuthProvider` wraps the app, any component calls `useAuth()` to get `{ isAuthed, login, logout }`. Note logout is just "delete the token" — the whole logout story from the backend, made real.

### Wiring it into `main.jsx`

`main.jsx` is your app's entry point — it mounts React into the page. Every provider and the router must wrap `<App/>` here, because a provider only serves components *inside* it. Order matters: outermost wraps everything within.

📋 Copy-paste — the nesting is boilerplate:

```jsx
// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./lib/auth.jsx";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
```

Each layer, and **why this order**:

- **`createRoot(...).render(...)`** — React's mount point; finds `<div id="root">` in `index.html` and renders into it. Standard, don't touch.
- **`<StrictMode>`** — dev-only helper that surfaces bugs (double-invokes some functions in dev to catch impure code). No production effect. Leave it.
- **`<BrowserRouter>`** — must be **outside** anything using routing. It provides URL/navigation context. `AuthProvider` and `App` both use routing (`Navigate`, `Link`, `useNavigate`), so the router wraps them. Inside instead, and those hooks throw "useNavigate must be used within a Router."
- **`<AuthProvider>`** — inside the router (so `login()` could navigate), outside `<App/>` (so every page reads auth). This is what makes `useAuth()` work anywhere.
- **`<App/>`** — your routes and pages.

The rule in one line: **wrap broadly-needed things at the top, in dependency order** — router before auth (auth may navigate), auth before App (App reads auth).

⚠️ Import the **provider**: `import { AuthProvider } from "./lib/auth.jsx"` — not `useAuth`, not `AuthContext`. If you get "AuthProvider is not defined," check `auth.jsx` exports `export function AuthProvider`.

🛑 **Checkpoint:** save, `npm run dev`, app loads with no console errors. "useX must be used within a Provider/Router" means the nesting order is wrong — something using a context sits outside its provider.

---

## Step 6 — Routing + the guard

📋 Install: `npm install react-router-dom`

The route structure — ✍️ type this, the guard is the one genuinely new pattern:

```jsx
// src/App.jsx
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./lib/auth";

function RequireAuth() {
  const { isAuthed } = useAuth();
  return isAuthed ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PostList />} />
      <Route path="/post/:id" element={<PostPage />} />
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth />}>          {/* everything inside needs a token */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/write" element={<Editor />} />
        <Route path="/write/:id" element={<Editor />} />
      </Route>
    </Routes>
  );
}
```

How the guard works: `RequireAuth` renders an `<Outlet/>` (the matched child route) if authed, else redirects to `/login`. Wrapping several routes in one `<Route element={<RequireAuth/>}>` protects them all.

⚠️ Reminder from our discussion: this guards **rendering, not shipping**. The editor code still lands in the browser bundle; the guard just won't display it. Real protection is your API's `verifyToken`. At this scale that's completely fine.

💡 The page components are built in full in Steps 7–12 below; here you're just wiring the route table.

---

## How the page steps work (read once)

Steps 7–12 each build a page in **four stages**. You never write a whole component at once — you get something on screen, then make it real one layer at a time. That's how experienced people actually build, and it's how you debug: each stage either works or it doesn't, so a bug has one place to hide.

1. **Static** — hardcoded markup, no data, no state. Get the layout and Tailwind right.
2. **State** — add `useState`, feed it fake data by hand.
3. **Data** — replace fake data with a real `apiFetch` in `useEffect`.
4. **Refine** — loading, empty, and error states; polish.

Tailwind classes, React hooks, and how to *customize* (not just install) a shadcn block are explained inline the first time each appears. Later pages only explain what's new, so it compounds.

## Step 7 — Post list (`/`)

The home page: a list of published posts, each a card linking to the full post. Your first data fetch, so we go slowly.

## 7.1 — Static first (compose from shadcn components)

The method here is the one you'll reuse for every page: **assemble the layout from shadcn components, not hand-written Tailwind.** A blog post card is a `Card` — you don't style a `<div>`, you compose the pieces shadcn gives you.

**Step 1 — get the component.** The Card component covers "content cards: articles, news, posts."

```bash
npx shadcn@latest add card
```

**Step 2 — see what pieces you have.** Open `src/components/ui/card.jsx` and look at the exports at the bottom: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `CardAction`. Those are your Lego bricks — pre-styled and themed to your Nova colors. You compose them; you don't style them.

**Step 3 — assemble one card.** Create the file:

```jsx
// src/pages/PostList.jsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export default function PostList() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>A hardcoded post title</CardTitle>
          <CardDescription>Jan 1, 2026</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Some preview text that will eventually be the start of the post body.</p>
        </CardContent>
        <CardFooter>
          <p className="flex items-center gap-1">Read more <ArrowRight className="size-4" /></p>
        </CardFooter>
      </Card>
    </div>
  );
}
```

Wire it into your router (swap the `PostList` stub in `App.jsx` for `import PostList from "./pages/PostList"`) and load `/`. One card, fully styled — border, padding, radius, colors — with **zero hand-styling**, because `<Card>` *is* the styled container.

**What came from where — the split to internalize:**

| Element | Source |
|---|---|
| `<Card>`, `<CardHeader>`, `<CardTitle>`, etc. | shadcn components — all the card's own styling (border, radius, padding, colors) is free |
| The outer `<div className="max-w-3xl mx-auto px-4 py-8 space-y-4">` | **Tailwind, and it's yours** — page layout, which no component owns |
| `<ArrowRight />` | a **lucide-react** icon (Nova installed it); `size-4` sizes it to match the text |
| `className="flex items-center gap-1"` on the `<p>` | Tailwind — puts text + icon on one centered row |

The only Tailwind you write is **coarse layout**: the outer wrapper (how wide/centered the column is) and the one `flex` line (two things on a row). Everything structural is a component. That's the whole method — components do the styling, you do the arrangement.

**The two mistakes this teaches:**

🔥 **Import every component you use.** If you write `<CardAction>` or `<CardFooter>` in the JSX but leave it out of the `import { ... }` line, you get `X is not defined` and a blank page. Docs examples often show *every* card part to demonstrate them — paste the JSX without the matching import and it crashes. Rule: used in JSX → must be in the import.

💡 **Don't use parts you don't need.** A blog preview doesn't need `CardAction` (that's for buttons). Delete parts freely — a card with just Header + Content + Footer is fine. Composing means picking the pieces that fit, not using all of them.

**The Tailwind you did write, decoded** (learn these once — they recur on every page):
- `max-w-3xl` — cap width at 48rem so text lines stay readable.
- `mx-auto` — auto side-margins = centers the column. `max-w-3xl mx-auto` is *the* centered-column combo.
- `px-4` / `py-8` — horizontal / vertical padding.
- `space-y-4` — vertical gap *between* the cards.
- `flex items-center gap-1` — lay children in a centered row with a small gap (the text-plus-icon pattern).

💡 **The numbers are a scale, not pixels:** `2`=8px, `4`=16px, `8`=32px (×4 for px). Picking from a fixed scale is *why* Tailwind pages look harmonious.

💡 **Learn Tailwind by mutating, not memorizing.** Change `max-w-3xl` → `max-w-md` (narrower) → delete `mx-auto` (jumps left) → `py-8` → `py-20` (huge gap). Save each time, watch it. Five minutes of that teaches more than any list.

🛑 **Stage checkpoint:** one styled card renders, centered. Bordered, rounded, padded — all from `<Card>`, none from you. If you get `X is not defined`, a component is used but not imported.

## 7.2 — Add state (fake data)

Now make it a *list* driven by data — but fake data first, so we're not debugging fetch and render at the same time.

```jsx
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export default function PostList() {
  const [posts, setPosts] = useState([
    { id: 1, title: "First post", content: "Preview one…", addedAt: "2026-01-01" },
    { id: 2, title: "Second post", content: "Preview two…", addedAt: "2026-01-02" },
  ]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      {posts.map((post) => (
        <Card key={post.id}>
          <CardHeader>
            <CardTitle>{post.title}</CardTitle>
            <CardDescription>{post.addedAt}</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{post.content}</p>
          </CardContent>
          <CardFooter>
            <p className="flex items-center gap-1">Read more <ArrowRight className="size-4" /></p>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
```

Same `<Card>` from 7.1 — now the *content* is `{post.title}` etc. instead of hardcoded, and the whole thing is wrapped in `posts.map(...)`. The component didn't change; you moved from one static card to a list of data-driven ones.

🛑 **Stage checkpoint:** two cards now render from the array. Add a third object to the `useState` array — a third card should appear. That confirms the `.map` is truly data-driven.

## 7.3 — Add real data

Replace the fake array with a fetch from your API. This is where `useEffect` comes in.

```jsx
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function PostList() {
  const [posts, setPosts] = useState([]);        // start EMPTY now, not fake

  useEffect(() => {
    apiFetch("/api/post").then(setPosts);
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      {posts.map((post) => (
        <Card key={post.id}>
          <CardHeader>
            <CardTitle>{post.title}</CardTitle>
            <CardDescription>{new Date(post.addedAt).toLocaleDateString()}</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{post.content}</p>
          </CardContent>
          <CardFooter>
            <p className="flex items-center gap-1">Read more <ArrowRight className="size-4" /></p>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
```

Only two lines changed from 7.2: `useState([])` starts empty instead of with fake data, and `useEffect` fills it from the API. The whole `<Card>` render is identical — that's the payoff of building in stages, the UI was done before the data arrived.

**`useEffect` — the refresher, because this is the hook people forget most:**

- `useEffect(fn, [])` runs `fn` **after** the component first renders. It's for "side effects" — things outside pure rendering, like fetching data, timers, subscriptions.
- The **`[]` second argument is the dependency array**, and it's critical. `[]` means "run once, after the first render, never again." Omit it entirely and the effect runs after *every* render — your fetch fires in an infinite loop (fetch → setState → re-render → fetch → …). The empty array is what makes "fetch on mount" work.
- Inside, `apiFetch("/api/post")` returns a promise; `.then(setPosts)` puts the result into state, triggering a re-render that shows the posts.

Why start `posts` at `[]` now: on first render the fetch hasn't returned, so `posts` is empty and `.map` renders nothing — fine, empty list. When the fetch resolves, `setPosts` fills it and it re-renders with cards. **The empty initial state must match the data type** (`[]` for an array you'll `.map`), or the first render crashes trying to map `undefined`.

💡 **Linking to the full post (add when you build Step 8):** wrap each `<Card>` in `<Link to={`/post/${post.id}`}>` (from `react-router-dom`). `Link` navigates without a page reload — the SPA behavior — where a raw `<a>` would reload everything. Left out here to keep the fetch stage focused.

🛑 **Stage checkpoint:** start your API (`npm run dev` in `blog-api/`), make sure a published post exists, load `/`. Real posts appear. **This is the moment the whole stack works** — CORS, `apiFetch`, render, all proven at once.

🔥 **If the page is blank and the console shows a CORS error** (`No 'Access-Control-Allow-Origin' header`) — the API isn't allowing your Vite origin. This is the #1 "works in Bruno, blank in browser" cause, because Bruno isn't a browser and ignores CORS. Fix is on the **API**: `app.use(cors({ origin: "http://localhost:5173" }))` before the routes (see the API cheatsheet's CORS section for the env-driven version). Restart the API after adding it.

## 7.4 — Refine (the states that make it feel finished)

Right now a slow API shows a blank screen, and a failed fetch shows nothing with a silent console error. Handle all three states: loading, error, empty.

```jsx
export default function PostList() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);    // NEW
  const [error, setError] = useState(null);        // NEW

  useEffect(() => {
    apiFetch("/api/post")
      .then(setPosts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-8 text-muted-foreground">Loading posts…</p>;
  if (error)   return <p className="p-8 text-red-600">Couldn't load posts. {error}</p>;
  if (posts.length === 0) return <p className="p-8">No posts yet.</p>;

  return ( /* the same list as 7.3 */ );
}
```

**The pattern — three state variables for one fetch:** `data`, `loading`, `error`. This trio repeats on *every* data-loading page in the app, so internalize it:

- `loading` starts `true`, set `false` in `.finally` (runs whether the fetch succeeded or failed).
- `error` starts `null`, set in `.catch`. Your `apiFetch` throws on non-ok responses, which is exactly why one `.catch` handles it.
- The three `if` guards return **early** — React renders the first matching one and stops. Order matters: loading, then error, then empty, then the real content.

💡 **Empty and error states are not optional polish** — they're where an app feels either finished or broken. The design skill's rule: an error explains what happened in the interface's voice ("Couldn't load posts"), an empty screen invites action ("No posts yet"), never a blank void. This is a real quality signal for a portfolio piece.

💡 **This skeleton repeats on every page.** The remaining pages are variations of these four stages — the code is given in full each time, but once you've seen the three-state fetch (`data`/`loading`/`error`) and the four-stage rhythm here, the later pages will feel familiar rather than new.

---

## Step 8 — Single post + comments (`/post/:id`)

The densest page: reads a URL param, does two fetches, and has your first form (writing, not just reading). Built with shadcn `Card`, `Separator`, and `Avatar`. Same staged approach.

**Install the components this page adds:**
```bash
npx shadcn@latest add separator avatar input textarea button
```

## 8.1 — Read the URL param + create the file

Create `src/pages/PostPage.jsx`. `useParams` reads the dynamic segment from the route.

```jsx
import { useParams } from "react-router-dom";

export default function PostPage() {
  const { id } = useParams();
  return <div className="p-8">Post id: {id}</div>;
}
```

**`useParams`** returns `{ id: "5" }` on `/post/5`. Note `id` is a **string**. Swap the `PostPage` stub in `App.jsx` for `import PostPage from "./pages/PostPage"`, click a card → "Post id: 5". Routing + param proven before any data.

## 8.2 — Hooks first — the rule that will crash you if broken

🔥 **All `useState`/`useEffect` calls must come at the top of the component, before any `if (...) return`.** React requires hooks to run in the same order every render. If you declare state *below* an early return like `if (loading) return ...`, then on a loading render those hooks never run → React throws *"rendered fewer hooks than expected"* and the page crashes.

So the order inside every component is always: **hooks → effect → handlers → guards → return.** Never a `useState` after a `return`.

```jsx
const { id } = useParams();
const [post, setPost] = useState(null);       // one object → null
const [comments, setComments] = useState([]); // a list → [] (NOT null — you call .length on it)
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [author, setAuthor] = useState("");     // form fields — still at the top
const [text, setText] = useState("");
```

⚠️ `comments` starts `[]`, not `null` — you call `comments.length` and `comments.map` in render; `null.length` throws on first paint.

## 8.3 — Two fetches in one effect

```jsx
useEffect(() => {
  apiFetch(`/api/post/${id}`)
    .then(setPost)
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
  apiFetch(`/api/comment?postid=${id}`)     // ⚠️ postid, matches your API's filter
    .then(setComments)
    .catch(() => {});                        // comments failing shouldn't blank the post
}, [id]);                                     // ⚠️ [id], not [] — re-fetch if the id changes
```

Three things that bite here:

- 🔥 **`?postid=`** — your comment list route filters by `postid`. Send `?comment=` or `?postId=` and you get wrong or no comments, silently.
- **`[id]` dependency, not `[]`** — navigating post 5 → post 6 without a reload changes `id`; the effect must re-run. `[]` would fetch post 5 once and never update.
- **Comments' `.catch(() => {})`** is intentionally empty — if comments fail, the post should still render. Don't let a comment error blank the whole page.

⚠️ Your API returns **404 for drafts** on `GET /api/post/:id` → an anonymous visitor on a draft id lands in `.catch` → "Post not found." Correct.

## 8.4 — Guards, then the comment form (controlled inputs + writing)

After the hooks and effect, the guards:

```jsx
if (loading) return <p className="p-8 text-muted-foreground">Loading…</p>;
if (error)   return <p className="p-8 text-red-600">Couldn't load post. {error}</p>;
if (!post)   return <p className="p-8">Post not found.</p>;
```

🔥 **Do NOT add `if (comments.length === 0) return ...`** — that would blank the whole page (post *and* form) just because there are no comments. The empty state belongs *inside* the render (`{comments.length === 0 && <p>…</p>}`), not as a page-level return.

The form is your first **write** from the frontend. Controlled inputs — value in state, not the DOM:

```jsx
<Input value={author} onChange={(e) => setAuthor(e.target.value)} />
```

`value={author}` displays the state; `onChange` pushes each keystroke back into state. State is the source of truth — which is what lets you clear the form after submit.

The submit handler:

```jsx
async function submitComment(e) {
  e.preventDefault();                          // stop the browser's form-reload
  try {
    await apiFetch(`/api/comment/${id}`, {     // ⚠️ ${id} with the $ — a literal {id} 404s
      method: "POST",
      body: JSON.stringify({ author, comment: text }),  // ⚠️ field names — see below
    });
    setAuthor("");
    setText("");
    setComments(await apiFetch(`/api/comment?postid=${id}`));  // refetch so it shows
  } catch (err) {
    setError(err.message);
  }
}
```

And the form must wire `onSubmit`, or the button just reloads the page:

```jsx
<form onSubmit={submitComment} className="space-y-3"> … </form>
```

🔥 **The three silent killers on this form:**
1. **`${id}` not `{id}`** — missing the `$` posts to the literal path `/api/comment/{id}` → 404.
2. **`{ author, comment: text }`** — your `newComment` controller reads `req.body.comment`. Send `content` and the comment saves **empty, no error**. The API dictates the key; the form obeys.
3. **`onSubmit={submitComment}` on the `<form>`** — without it, `type="submit"` does the browser default (reload) and your handler never runs.

💡 **Refetch after submit** rather than manually appending — simpler and always correct.

## 8.5 — The full file

Everything assembled, with the shadcn layout (Card for post + form, Separator, Avatar with initials fallback for anonymous commenters):

```jsx
// src/pages/PostPage.jsx
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CalendarDays, MessageCircle, Send } from "lucide-react";

export default function PostPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");

  useEffect(() => {
    apiFetch(`/api/post/${id}`)
      .then(setPost)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    apiFetch(`/api/comment?postid=${id}`)
      .then(setComments)
      .catch(() => {});
  }, [id]);

  async function submitComment(e) {
    e.preventDefault();
    try {
      await apiFetch(`/api/comment/${id}`, {
        method: "POST",
        body: JSON.stringify({ author, comment: text }),
      });
      setAuthor("");
      setText("");
      setComments(await apiFetch(`/api/comment?postid=${id}`));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="p-8 text-muted-foreground">Loading…</p>;
  if (error)   return <p className="p-8 text-red-600">Couldn't load post. {error}</p>;
  if (!post)   return <p className="p-8">Post not found.</p>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-10">
      {/* The post */}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-display leading-tight">{post.title}</CardTitle>
          <CardDescription className="flex items-center gap-1.5">
            <CalendarDays className="size-4" />
            {new Date(post.addedAt).toLocaleDateString("en-US", {
              year: "numeric", month: "long", day: "numeric",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
            {post.content}
          </p>
          {/* NOTE: once you add the TinyMCE editor (Step 11), post.content is HTML,
              not plain text. Swap this <p> for:
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
              and drop whitespace-pre-wrap. See Step 11.4. */}
        </CardContent>
      </Card>

      {/* Comment form — boxed as its own compose area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leave a comment</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitComment} className="space-y-3">
            <Input placeholder="Your name" value={author} onChange={(e) => setAuthor(e.target.value)} />
            <Textarea placeholder="Write a comment…" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
            <div className="flex justify-end">
              <Button type="submit" className="flex items-center gap-2">
                <Send className="size-4" />
                Post comment
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Comments thread */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="size-5" />
          <h2 className="text-xl font-semibold">
            Comments
            {comments.length > 0 && (
              <span className="text-muted-foreground font-normal"> ({comments.length})</span>
            )}
          </h2>
        </div>

        <Separator className="mb-6" />

        <div className="space-y-6">
          {comments.length === 0 && (
            <p className="text-muted-foreground text-sm">No comments yet. Be the first.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar className="size-9">
                <AvatarFallback className="text-xs">
                  {c.author?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-sm">{c.author}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

🛑 **Checkpoint:** post renders with title/date/body; comments show with initial-avatars; type a name + comment, submit → it clears and appears below. If the comment posts but shows blank, it's the field-name trap (#2 above). If it 404s, it's the missing `$` (#1).

---

## Step 9 — Login (`/login`)

Minimal — email, password, button. No signup (authors are seeded, not registered on the public site). This is where a shadcn **block** earns its place, so the lesson here is *how to take a block and make it yours*.

## 9.1 — Install and read the block

```bash
npx shadcn@latest add login-01
```

This drops **two things**: a page wrapper *and* `src/components/login-form.jsx` (the actual form). **The form file is where you work** — the page wrapper just centers `<LoginForm />` and needs no changes.

**Open `login-form.jsx` and read it.** This is the shadcn philosophy: a block isn't an npm import you configure from outside — it's generated source code you own and edit. It comes static (inputs with no state, a button that does nothing). Your job is to wire it, exactly like the comment form.

## 9.2 — Strip what you don't need

The block ships with extras your app doesn't use. **Delete:**
- the "Login with Google" button (no OAuth)
- the "Forgot your password?" link (not built)
- the "Don't have an account? Sign up" line (no public signup)

Keep the valuable part — the `Card`, the `Field`/`Input` structure, the accessible labels, the spacing. Cutting the features you didn't build is the real skill: **a block is a starting draft, not a fixed component.**

## 9.3 — Controlled vs uncontrolled — a real choice here

The comment form used **controlled** inputs (`value` + `onChange` + `useState`) because it clears itself after submit. Login has no such need — you only want the values *at submit*. So login is a good place for **uncontrolled** inputs: no state per field, read the values when the form submits.

| | Controlled | Uncontrolled |
|---|---|---|
| Value lives in | a `useState` variable | the DOM element, tagged by `name` |
| Read it | directly (`email`) | at submit via `FormData` |
| Need it when? | UI reacts *while typing* (clear, validate, pre-fill) | only at submit |
| Your forms | comment form, editor | login |

⚠️ `name="email"` does **not** create a variable — it's a *retrieval key*. There's no `email` in your JS until you pull it out of the form at submit. (A common trip-up coming from `useState` examples where the variable is declared.)

## 9.4 — Wire it

Inside `LoginForm` (not the page wrapper), add the hooks and handler:

```jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

// inside the component:
const [error, setError] = useState(null);
const navigate = useNavigate();
const { login } = useAuth();          // ⚠️ CALL it — useAuth(), not useAuth

async function handleSubmit(e) {
  e.preventDefault();
  const data = new FormData(e.target);          // read the uncontrolled inputs
  try {
    await login(data.get("email"), data.get("password"));  // context login — stores token + updates state
    navigate("/");
  } catch (err) {
    setError("Invalid email or password.");
  }
}
```

Then on the JSX: `<form onSubmit={handleSubmit}>`, and show the error above the button:
```jsx
{error && <p className="text-sm text-red-600">{error}</p>}
```

The three things that matter:

🔥 **`useAuth()` with the parens.** `const { login } = useAuth` (no `()`) destructures off the function itself → `login` is `undefined` → "login is not a function." Call the hook.

🔥 **Use the context's `login`, not `apiFetch` directly.** This is the whole reason `AuthProvider` exists. The context's `login` does the fetch, `localStorage.setItem`, *and* `setToken` — that last one is what makes the navbar and route guard react. Call `apiFetch` yourself and you'd get a token but store nothing, "logging in" while staying logged out everywhere.

⚠️ **`navigate` inside the `try`, after the await.** After the catch, and a failed login still redirects. Inside the try, only success navigates.

💡 **Name clash:** if you name your handler `login` too, alias the context's — `const { login: authLogin } = useAuth()` — or the name refers to itself. Naming the handler `handleSubmit` avoids it entirely.

💡 The generic "Invalid email or password" is correct — your API returns the same error for bad-email and bad-password by design, so the UI can't reveal which, and shouldn't.

## 9.5 — The full file

`login-01`'s form, stripped and wired (your block may use `Field`/`FieldGroup` or `Label` depending on version — the wiring is identical):

```jsx
// src/components/login-form.jsx
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function LoginForm({ className, ...props }) {
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    const data = new FormData(e.target);
    try {
      await login(data.get("email"), data.get("password"));
      navigate("/");
    } catch (err) {
      setError("Invalid email or password.");
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" name="email" placeholder="m@example.com" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input id="password" type="password" name="password" required />
              </Field>
              <Field>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit">Login</Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

The page wrapper stays untouched — it only centers the form:
```jsx
// src/pages/Login.jsx (or whatever your block named it)
import { LoginForm } from "@/components/login-form";

export default function Login() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
```

Swap the `Login` stub in `App.jsx` for the real import.

🛑 **Checkpoint:** log in with your seeded admin creds → lands on `/`. Check DevTools → Application → Local Storage: the token is stored. Wrong password → "Invalid email or password," stays put. If login "works" but you're still logged out (navbar unchanged), you called `apiFetch` directly instead of the context `login` — the token got dropped.

---

## Step 10 — Dashboard (`/dashboard`) — protected

Your posts, including drafts, with publish/edit/delete. First page behind the auth guard, so you're logged in when it renders.

## 10.1 — Static → data

Same stages. Static: a heading, a "New post" button, and a hardcoded row with a title, a status badge, and three buttons. Then wire the fetch:

```jsx
async function load() {
  setPosts(await apiFetch("/api/post/mine"));   // the route you added in Step 0
  setLoading(false);
}
useEffect(() => { load(); }, []);
```

Note `load` is a **named function** called both in `useEffect` and after every mutation — because publish/delete need to refresh the list. Defining it once and calling it in multiple places is cleaner than duplicating the fetch.

The token attaches automatically (`apiFetch` reads localStorage), which is why this "just works" now that you're logged in. If you hit `/dashboard` without logging in, the Step 6 route guard already redirected you to `/login` — this component never even renders unauthenticated.

## 10.2 — The mutations

```jsx
async function togglePublish(post) {
  await apiFetch(`/api/post/${post.id}`, {
    method: "PATCH",
    body: JSON.stringify({ published: !post.published }),
  });
  toast.success(post.published ? "Unpublished" : "Published");
  load();                              // refresh so the badge updates
}

async function remove(post) {
  if (!confirm("Delete this post?")) return;
  await apiFetch(`/api/post/${post.id}`, { method: "DELETE" });
  toast.success("Deleted");
  load();
}
```

- **`PATCH` with `{ published: !post.published }`** — flips the current value. Matches your `publishPost` controller (which is why it's PATCH, not PUT).
- **`confirm()`** — browser-native confirmation dialog. Crude but fine; a real app uses a shadcn `<AlertDialog>`, which you can swap in later.
- **`load()` after each** — refetch so the UI reflects the change. Simple and always correct.

The status badge — a conditional class:

```jsx
<span className={`text-xs ${post.published ? "text-green-600" : "text-muted-foreground"}`}>
  {post.published ? "Published" : "Draft"}
</span>
```

**Template literal in `className`** — you build the class string with JS, conditionally adding `text-green-600` when published. This `${condition ? "a" : "b"}` inside a backtick-string is *the* way to do conditional styling in Tailwind. Both the class and the label branch on `post.published`.

💡 All the code is above — assemble it into `Dashboard.jsx`. ✍️ The `load()` function and the two mutation handlers are worth typing (they're the pattern you'll reuse); the row layout is 📋. The only new ideas are the named `load()` reused across mutations and the conditional `className` — the rest is Step 7's list pattern.

---

## Step 11 — Editor (`/write`, `/write/:id`) — protected

One component, two jobs: new post (no `:id`) and edit (has `:id`). Recognizing when one component can serve both is a real judgment skill. This page uses **TinyMCE** (self-hosted) as a rich-text editor — the "get fancy" option from the assignment.

## 11.0 — Install TinyMCE self-hosted (no API key)

📚 **Source:** https://www.tiny.cloud/docs/tinymce/latest/react-pm-host/ (the "package manager with hosting" path). Self-hosted means the editor loads from *your own files*, so **no API key, no account** — you use `licenseKey="gpl"` (the open-source license) instead.

From `blog-ui/`:
```bash
npm install @tinymce/tinymce-react   # the React wrapper
npm install tinymce                   # TinyMCE itself — this is what makes it self-hosted
```

⚠️ **Paste commands without the trailing `# comment`** — some shells read the `#` as a package name and error (`EINVALIDTAGNAME`).

TinyMCE's files must live in `public/` so the browser can load them as static assets. The docs use a `postinstall.js` copy script, but `import.meta.dirname` (which that script relies on) is empty on some Node versions and silently copies nothing. The reliable one-liner:
```bash
cp -r node_modules/tinymce public/tinymce
```
Confirm it worked: `ls public/tinymce` should show `icons`, `models`, `plugins`, `skins`, `themes`, `tinymce.min.js`. 🔥 If `public/tinymce` is missing, the editor renders blank — this copy is the step that's easy to miss.

## 11.1 — The editor component (staged: shell → editor)

Build the plain shadcn shell first (Input + Textarea + Button in a Card), confirm it renders at `/write`, *then* swap the `Textarea` for TinyMCE. That way a failure is isolated to the editor swap, not your layout.

The self-hosted `<Editor>` needs two props that differ from the cloud version:
- **`tinymceScriptSrc="/tinymce/tinymce.min.js"`** — load from your `public/` copy.
- **`licenseKey="gpl"`** — declares the open-source license; **replaces the API key**.

```jsx
import { useRef } from "react";
import { Editor as TinyEditor } from "@tinymce/tinymce-react";

const editorRef = useRef(null);   // holds the editor instance

<TinyEditor
  tinymceScriptSrc="/tinymce/tinymce.min.js"
  licenseKey="gpl"
  onInit={(_evt, editor) => (editorRef.current = editor)}
  initialValue="<p>Write your post…</p>"
  init={{
    height: 500,
    menubar: false,
    plugins: ["advlist","autolink","lists","link","image","charmap","anchor",
      "searchreplace","visualblocks","code","fullscreen","insertdatetime",
      "media","table","preview","help","wordcount"],
    toolbar: "undo redo | blocks | bold italic | bullist numlist | link image | code",
  }}
/>
```

🔥 **TinyMCE is uncontrolled — read it via a ref, not `value`/state.** Unlike your controlled inputs, TinyMCE recommends against controlled mode (slow on large docs). Instead: `onInit` stashes the editor instance in `editorRef.current`, and at save time you call `editorRef.current.getContent()` to pull the HTML. This is the **`useRef` pattern** — a ref holds a mutable value (here a library instance) that persists across renders without causing re-renders. You reach for a ref when you need to *reach into* something (a DOM node, a library) rather than render its value.

The **title** stays a normal controlled input (`useState`), because edit mode pre-fills it — and only state can push a value into an input.

## 11.2 — Detect the mode

```jsx
const { id } = useParams();      // undefined on /write, "5" on /write/5
```

`if (id)` distinguishes edit from create. In edit mode, fetch the post to pre-fill: set the title state, and pass the post's HTML as the editor's `initialValue`. ⚠️ `initialValue` only applies when the editor mounts — so in edit mode, fetch the post *before* rendering the editor (e.g. don't render until loaded), or the pre-fill won't take.

## 11.3 — Save (branch on mode, read the editor via the ref)

```jsx
async function handleSave(e) {
  e.preventDefault();
  const content = editorRef.current.getContent();   // ← HTML string from TinyMCE
  try {
    if (id) {
      await apiFetch(`/api/post/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title, content }),
      });
    } else {
      await apiFetch("/api/post", {
        method: "POST",
        body: JSON.stringify({ title, content }),
      });
    }
    navigate("/dashboard");
  } catch (err) {
    setError(err.message);
  }
}
```

🔥 **The contract trap — fix the backend, don't work around it.** Your `newPost` originally read `req.body.post` while `updatePost` reads `content`. Same form, two different keys = one of them silently saves empty. **Fix:** change `newPost` to read `req.body.content`:

```js
// blog-api — newPost, the one-line fix
const post = await prisma.blogPost.create({
  data: {
    title: req.body.title,
    content: req.body.content,        // ← was req.body.post
    owner_id: Number(req.user.id),    // owner from the TOKEN, never the body
  },
});
```

Now create, update, and the frontend all use `content`. This is the "standardize field names" lesson biting for real.

⚠️ Two backend must-haves: the POST route needs `verifyToken` (so `req.user` exists), and `owner_id` comes from `req.user.id` (the token), never from the request body — otherwise anyone could post as someone else.

🔥 **`navigate`, not `Navigate`.** Lowercase `navigate` is the function from `useNavigate()`; capital `Navigate` is the redirect *component*. Calling `Navigate(...)` crashes.

## 11.4 — Rendering the rich text on the post page

TinyMCE stores **HTML** (`<p>bold <strong>word</strong></p>`), not plain text. On the post page, `{post.content}` would show the literal tags. To render it as formatting, use `dangerouslySetInnerHTML`:

```jsx
<div
  className="prose max-w-none"
  dangerouslySetInnerHTML={{ __html: post.content }}
/>
```

- **`dangerouslySetInnerHTML={{ __html: post.content }}`** — inserts the string as real HTML. The scary name is a deliberate XSS warning: raw HTML can carry `<script>`. Here the content comes from *your own authenticated authoring*, so the risk is low — but if you ever accept HTML from untrusted users, sanitize first (e.g. DOMPurify). Drop the old `whitespace-pre-wrap` — that was for plain text; HTML carries its own structure.
- **`prose`** — from Tailwind's typography plugin, which styles raw HTML into a readable article (headings sized, lists bulleted, paragraphs spaced). Without it, TinyMCE's tags render with cramped browser defaults.

Install the typography plugin:
```bash
npm install -D @tailwindcss/typography
```
Then in `src/index.css` (Tailwind **v4** syntax — a CSS line, NOT a `tailwind.config.js` entry):
```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```
🔥 **Restart the dev server after adding the plugin** — Vite won't pick it up on hot-reload. This is the #1 reason "I installed it but nothing changed." `max-w-none` overrides prose's default width cap since your Card already constrains width.

🛑 **Checkpoint:** from the dashboard, "New post" → write with formatting → save → back on dashboard as a draft. Open the post → formatting renders (bold, lists, headings), not raw tags. Then "Edit" → title pre-filled, editor pre-filled → change → save → persists. Raw `<p>` tags showing = the `dangerouslySetInnerHTML` swap didn't take; flat/cramped text = the typography plugin isn't loaded (restart the server, check the `@plugin` line).

---

## Step 12 — Navbar + the toaster

## 12.1 — Navbar that knows auth state

If you start from a navbar **block** (e.g. openshadcnblocks), you'll notice it's dense — dozens of raw Tailwind classes (`rounded-full bg-primary px-4 py-2 text-sm font-medium`) because it hand-styles every element instead of using shadcn components. That density is the tell: **rebuild it with `Button` and it collapses to something readable.** Same lesson as the cards and forms — when a block hand-writes Tailwind, swap in components.

Here's the clean version — five layout classes, everything else is `<Button>`:

```jsx
// src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const { isAuthed, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="border-b">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold">My Blog</Link>

        <div className="flex items-center gap-2">
          {isAuthed ? (
            <>
              <Button variant="ghost" asChild><Link to="/dashboard">Dashboard</Link></Button>
              <Button asChild><Link to="/write">Write</Link></Button>
              <Button variant="ghost" onClick={handleLogout}>Log out</Button>
            </>
          ) : (
            <Button asChild><Link to="/login">Log in</Link></Button>
          )}
        </div>
      </div>
    </header>
  );
}
```

- **`{isAuthed ? (...) : (...)}`** — conditional rendering from the auth context. Logged in → Dashboard / Write / Log out; logged out → Log in. This is *why* auth lives in context (Step 5): navbar, guard, and editor all read the same `isAuthed` with no prop-drilling. And because it's context state, the navbar **flips the instant you log in** — no refresh — which is the visible proof your auth reactivity works.
- **`asChild`** — the one new idea. A `<Button>` normally renders a `<button>`. But these need to be *links* (navigate to a page) that *look* like buttons. `asChild` tells Button "don't render your own element — apply your styling to my child," and the child is `<Link>`. So you get Button's look + Link's navigation. This is the shadcn way to make a link-styled-as-a-button.
- **Log out is a plain `onClick`, not `asChild`** — it's an *action* (clear token + navigate), not a destination. Buttons for actions, links for destinations.
- **`variant="ghost"` vs default** — `ghost` is subtle (secondary items: Dashboard, Log out); the default solid fill marks the primary action (Write, Log in). Reading a component's variants is part of using shadcn well.
- **The only Tailwind:** `flex items-center justify-between` (logo left, actions right, vertically centered), `h-14` (bar height), `gap-2` (space between buttons), `border-b` (bottom line), and your standard `max-w-5xl mx-auto px-4` container. Everything else is components.

💡 Dropped the block's hamburger/mobile menu — for three links, the buttons fit fine on mobile. If they ever crowd, shadcn's `Sheet` does a proper drawer, but that's premature for a blog.

## 12.1b — Mount it globally (outside `<Routes>`)

The navbar goes in `App.jsx`, **above and outside** `<Routes>`, so it renders on every page and stays mounted while pages swap beneath it:

```jsx
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <>                          {/* fragment — a component returns ONE element */}
      <Navbar />
      <Routes>
        {/* ...all your routes... */}
      </Routes>
    </>
  );
}
```

🔥 **The `<>...</>` fragment is required** — you're returning two siblings (Navbar + Routes), but a component must return one element. The fragment groups them without adding a `<div>`. Forget the opening `<>` and you get a syntax error (a stray closing `</>`).

Anything **outside** `<Routes>` is persistent app chrome (navbar, footer); anything **inside** swaps with the URL. That's the whole pattern for a global navbar.

💡 This block isn't sticky (no `sticky`/`fixed`), so content flows naturally beneath it — no offset padding needed. If you use a sticky navbar, add top padding (e.g. `pt-16`) to page containers so content isn't hidden under it.

## 12.2 — The toaster (one-time, easy to forget)

`sonner`'s `toast()` calls do nothing until `<Toaster/>` is mounted once at the root:

```jsx
// main.jsx
import { Toaster } from "@/components/ui/sonner";

<AuthProvider>
  <BrowserRouter>
    <App />
    <Toaster />
  </BrowserRouter>
</AuthProvider>
```

🔥 If toasts silently don't appear, this is why — the single most common `sonner` mistake.

---

## Step 13 — Deploy

📋 When the whole thing works locally:

- **Netlify or Vercel**, pointed at the `blog-ui` folder (Root Directory = `blog-ui` if it's in the monorepo).
- Build command `npm run build`, publish directory `dist`.
- Set `VITE_API_URL` to your deployed API's URL in the host's env settings.
- ⚠️ Add the deployed frontend URL to your API's CORS `origin` array. **This is the step everyone forgets** — works locally, breaks in production with a CORS error. You'll recognize it instantly now.
- SPA routing needs a redirect rule so `/post/5` doesn't 404 on refresh: Netlify → a `_redirects` file with `/* /index.html 200`. Vercel handles it automatically.

---

## Build order (don't jump around)

1. Step 0 — add `/api/post/mine`, test in Bruno
2. Steps 1–2 — scaffold, Tailwind + shadcn, see blue bold text
3. Step 4 — `api.js` wrapper (before any page)
4. Step 7 — post list (proves the data path end to end)
5. Step 8 — post + comments
6. Steps 5, 6, 9 — auth context, routing, login (the protected half)
7. Steps 10–11 — dashboard, editor
8. Steps 3, 12 — design pass + navbar + polish
9. Step 13 — deploy

Rationale: get *one public page rendering real data* as fast as possible (through Step 7) — that's the moment it's real and CORS/apiFetch are proven. Auth comes after, because debugging auth on top of a data path you haven't proven is two unknowns at once. Design polish last, over a working app.

---

## The contract traps, collected

Your API's field names aren't uniform, so the frontend has to match each exactly. Get these wrong and data saves *empty with no error* — the nastiest kind of bug:

| Endpoint | Sends | NOT |
|---|---|---|
| Create post | `{ title, post }` | ~~content~~ |
| Create comment | `{ author, comment }` | ~~content~~ |
| Filter comments | `?postid=` | ~~postId~~ |
| Publish | `PATCH` `{ published: bool }` | ~~PUT~~ |

When something saves blank, it's almost always here. (And yes — for the SaaS, standardize your API field names. Here, obey them.)

---

## What to skip (scope discipline)

Rich text editor, image uploads, signup on the reader, pagination, infinite scroll, dark mode, optimistic updates, react-query. Every one is legitimate; none teaches what this project is for. Ship the twelve steps, deploy, then add at most one if you're curious. The goal is a working decoupled app you built end to end — not a feature-complete blog.

---

