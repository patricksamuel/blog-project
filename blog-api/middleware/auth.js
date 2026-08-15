// /blog-api/middleware/auth.js

const jwt = require('jsonwebtoken')
const prisma = require("../prisma/client")


async function verifyToken(req, res, next) {
    // get aut header value

    const authHeaders = req.headers.authorization;

    if(!authHeaders){return res.status(401).json({error: "no token"})}
    try{
        const decoded = jwt.verify(authHeaders.split(" ")[1], process.env.JWT_SECRET_KEY)
        const user = await prisma.user.findUnique({
            where: {id:decoded.sub},
            omit : {password : true}
        })
        if (!user) return res.status(401).json({ error: "invalid token" });
        req.user =user
        next()

    }catch(err){
        return  res.status(401).json({error: "invalid credentials"})
    }
}


async function isAdmin(req, res, next) {
    // should work only after verifytoken

    try{
        if (req.user.role !== "admin") return res.status(403).json({ error: "forbidden" });

        next()

    }catch(err){
        return  res.status(404).json({error: "error"})
    }
}

module.exports = {verifyToken, isAdmin}