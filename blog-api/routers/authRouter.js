// /blog-api/routers/authRouter.js

const express = require("express");
const router = express.Router();
const jwt = require('jsonwebtoken')
const bcrypt = require("bcryptjs")
const { verifyToken } = require("../middleware/auth");


const prisma = require("../prisma/client.js")


router.post("/", verifyToken, async (req,res,next) => {
    res.json({message:"post OK"})
});

router.post('/signup', async (req,res, next)=>{
    // mock user
    try{
        console.log("signing up")
        console.log(req.body)
        const {email,password,name} = req.body
        console.log(email + password)
        const hash = await bcrypt.hash(password,10)
        const user = await prisma.user.create({
            data : {email, password:hash, name},
            omit: { password: true } 
        })
        res.status(201).json(user) // https://httpstatuses.io/
    }catch(err){
        next(err)
    }

})
/* test with this
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"me@test.com","password":"secret123"}' */



router.post("/login", async (req,res, next)=>{
    try{

        const {email,password} = req.body
        const user = await prisma.user.findUnique({
            where: {email: email
            }
        })


        if (!user)  {return res.status(401).json({error: "invalid credentials"});}       // Forbidden
        else {
            const match = await bcrypt.compare(password, user.password)
            if(!match) {return res.status(401).json({error: "invalid credentials"});}
            const token = jwt.sign({sub : user.id},process.env.JWT_SECRET_KEY, {expiresIn: '3h'})
            console.log("login success")
            res.json({token})

        }
    }catch(err){
        next(err)
    }
})



module.exports = router