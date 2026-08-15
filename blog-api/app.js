// /blog-api/app.js
// ---------- 1. Requires ----------

require("dotenv").config();
const express = require("express")
const app = express()
const prisma = require("./prisma/client")
app.use(express.json());


// ---------- 2. View engine ----------


// ---------- 3. Middleware (ORDER IS MANDATORY) ----------


// ---------- 4. Passport/auth config (registers functions; not per-request) ----------

// ---------- 5. Routes ----------
const authRouter = require("./routers/authRouter")
app.use("/api/auth", authRouter)
const postRouter = require("./routers/postRouter")
app.use("/api/post", postRouter)
const commentRouter = require("./routers/commentRouter")
app.use("/api/comment", commentRouter)

// ---------- 6. 404 + error handler ----------
app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});



// ---------- 7. Start ----------
const PORT = process.env.PORT || 3000 ;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`))