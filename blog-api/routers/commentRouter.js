
const express = require("express");
const router = express.Router();
const jwt = require('jsonwebtoken')
const bcrypt = require("bcryptjs")
const { verifyToken, isAdmin } = require("../middleware/auth");
const commentController = require("../controllers/commentController.js")


const prisma = require("../prisma/client.js")

router.get("/", commentController.getComments)
router.post("/:postid", commentController.newComment)
router.get("/:id",verifyToken, commentController.getCommentById)
router.put("/:id",verifyToken,isAdmin, commentController.updateComment)
router.delete("/:id",verifyToken,isAdmin,commentController.deleteComment)

module.exports = router