// /blog-api/routers/postRouter.js

const express = require("express");
const router = express.Router();
const jwt = require('jsonwebtoken')
const bcrypt = require("bcryptjs")
const { verifyToken } = require("../middleware/auth");
const postController = require("../controllers/postController.js")


const prisma = require("../prisma/client.js")

router.get("/", postController.getPublishedPost)
router.delete("/mine",verifyToken,postController.getMyPost)
router.post("/",verifyToken, postController.newPost)
router.get("/mine", verifyToken, postController.getMyPosts);
router.get("/:id",postController.getPostById)
router.patch("/:id",verifyToken,postController.publishPost)
router.put("/:id",verifyToken,postController.updatePost)
router.delete("/:id",verifyToken,postController.deletePost)



module.exports = router