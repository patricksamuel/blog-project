// /blog-api/routers/postController.js

const prisma = require("../prisma/client.js")

exports.getPublishedPost = async (req,res,next) => {
    try{
        const where = {published : true}
        if (req.query.author) { where.owner_id = Number(req.query.author)}
        const posts = await prisma.blogPost.findMany({
            where,
            orderBy : {addedAt :'desc'}
        })

        res.status(200).json(posts)
    } catch(err){
        next(err)
    }
}

exports.getMyPost = async (req,res,next) => {
    try{
        const where = {owner_id : req.user.id}
        const posts = await prisma.blogPost.findMany({
            where,
            orderBy : {addedAt :'desc'}
        })

        res.status(200).json(posts)
    } catch(err){
        next(err)
    }
}

exports.newPost = async (req,res,next) => {
    try{
        const newpost = req.body.post
        const newposttitle = req.body.title
        const post = await prisma.blogPost.create({
            data: {
                title: newposttitle,
                content : newpost,
                owner_id : Number(req.user.id)

            }
        })
        res.status(201).json(post)
    } catch(err){
        next(err)

    }
}

exports.getPostById = async (req,res,next) => {
    try{
        
        const where = { id: Number(req.params.id)}
        
        const post = await prisma.blogPost.findUnique({
            where
            }
        )
        if (!post) {return res.status(404).json({error: "Post not found"})}
        if (!post.published) {
            return res.status(404).json({ error: "Post not found" });
        }
        res.status(200).json(post)
    } catch(err){
        next(err)
    }
}


exports.publishPost =  async (req,res,next) => {
    try{

        if (typeof req.body.published !== "boolean") {
            return res.status(400).json({error: "bad request"})
        }
        const postGet = await prisma.blogPost.findUnique({
            where: {
                id: Number(req.params.id)
            }
        })
        if (!postGet) {return res.status(404).json({error: "Post not found"})}

        if (postGet.owner_id !== req.user.id && req.user.role !== "admin") {return res.status(403).json({error: "forbidden"})}
        const post = await prisma.blogPost.update({
            where: {
                id: Number(req.params.id)
            },
            data: {
                published : req.body.published
            }
        })
        res.status(200).json(post)
 
    } catch(err){
        next(err)
    }
}

exports.updatePost  =  async (req,res,next) => {
    try{

        const postGet = await prisma.blogPost.findUnique({
            where: {
                id: Number(req.params.id)
            }
        })
        if (!postGet) {return res.status(404).json({error: "Post not found"})}
        if (postGet.owner_id !== req.user.id && req.user.role !== "admin") {return res.status(403).json({error: "forbidden"})}

        const {title, content} = req.body;
        console.log(req.body)
        const allowed = ["title", "content"]
        const data = {}
        for (const key of allowed){
            if (req.body[key]!==undefined){ data[key] = req.body[key]}
        }

        const post = await prisma.blogPost.update({
            where: {
                id: Number(req.params.id)
            },
            data
        })
        res.status(200).json(post)
 
    } catch(err){
        next(err)
    }
}


exports.deletePost  =  async (req,res,next) => {
    try{

        const postGet = await prisma.blogPost.findUnique({
            where: {
                id: Number(req.params.id)
            }
        })
        if (!postGet) {return res.status(404).json({error: "Post not found"})}
        if (postGet.owner_id !== req.user.id && req.user.role !== "admin") {return res.status(403).json({error: "forbidden"})}

        const post = await prisma.blogPost.delete({
            where: {
                id: Number(req.params.id)
            },
        })
        res.status(200).json({message: "Post deleted"})
 
    } catch(err){
        next(err)
    }
}

exports.getMyPosts = async (req, res, next) => {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { owner_id: req.user.id },       // mine — drafts included
      orderBy: { addedAt: "desc" },
    });
    res.json(posts);
  } catch (err) { next(err); }
};





