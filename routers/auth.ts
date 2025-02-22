import express from 'express';
import jwtHelper from '../app/JwtHelper.js';
import config from '../app/config.js';
const AuthRoutes = express.Router();
await import('express-async-errors')


AuthRoutes.post("/login",(req,res)=>{
    const {username,password} = req.body;
    if (username === config.get('web.username') && password === config.get('web.password')) {
        res.cookie('token',jwtHelper.issueToken({
            "username": username,
            "password": password
        },86400000),{
            path: "/",
            maxAge: 86400000
        })
    }
    else{
        res.json({
            "code": 401,
            "message": "username or password error"
        });
    }
    res.send()
})

export default AuthRoutes;