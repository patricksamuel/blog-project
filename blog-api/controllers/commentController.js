const prisma = require("../prisma/client.js")


exports.getComments = async (req,res,next) => {
    try{

        const where = {}
        if (req.query.postid) { where.blogpost_id  = Number(req.query.postid)}
        const comments = await prisma.comment.findMany({
            where,
            orderBy : {addedAt :'desc'}
        })

        res.status(200).json(comments)
    } catch(err){
        next(err)
    }
}
exports.newComment = async (req,res,next) => {
    try{
        const newComment = req.body.comment
        const author = req.body.author
        const comment = await prisma.comment.create({
            data: {
                
                content : newComment,
                author : author,
                blogpost_id : Number(req.params.postid)

            }
        })
        res.status(201).json(comment)
    } catch(err){
        next(err)

    }
}

exports.getCommentById = async (req,res,next) => {
    try{
        
        const where = { id: Number(req.params.id)}
        
        const comment = await prisma.comment.findUnique({
            where
        }
        )

        if (!comment) {return res.status(404).json({error: "comment not found"})}

        res.status(200).json(comment)
    } catch(err){
        next(err)
    }
}

exports.updateComment  =  async (req,res,next) => {
    try{

        const commentGet = await prisma.comment.findUnique({
            where: {
                id: Number(req.params.id)
            }
        })
        if (!commentGet) {return res.status(404).json({error: "comment not found"})}


        const {content} = req.body;
        console.log(req.body)
        const allowed = ["content"]
        const data = {}
        for (const key of allowed){
            if (req.body[key]!==undefined){ data[key] = req.body[key]}
        }

        const comment = await prisma.comment.update({
            where: {
                id: Number(req.params.id)
            },
            data
        })
        res.status(200).json(comment)
 
    } catch(err){
        next(err)
    }
}

exports.deleteComment  =  async (req,res,next) => {
    try{

        const CommentGet = await prisma.comment.findUnique({
            where: {
                id: Number(req.params.id)
            }
        })
        if (!CommentGet) {return res.status(404).json({error: "Comment not found"})}


        const Comment = await prisma.comment.delete({
            where: {
                id: Number(req.params.id)
            },
        })
        res.status(200).json({message: "Comment deleted"})
 
    } catch(err){
        next(err)
    }
}