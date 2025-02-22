import express from 'express';
const ApiRoutes = express.Router();
import { database } from '../app/counter.js';
import plugin from '../app/plugin.js';
import * as fs from 'fs';
import config from '../app/config.js';
import { get_bot } from '../app/bot.js';
import jwtHelper from '../app/JwtHelper.js';
await import ('express-async-errors')

ApiRoutes.use((req,res,next)=>{
    if (!req.cookies){
      res.json({
        code: 403,
        msg: 'no cookie found'
      })
      return;
    }
    const token = req.cookies['token']
    if (!token){
      res.json({
        "code": 401,
        "message": "no token found"
      });
      return;
    }
    const tokenVerifyResult = jwtHelper.verifyToken(token)
    if (!tokenVerifyResult){
      res.json({
        "cord": 401,
        "message": "token invalid"
      });
      return;
    }
    next()
})


ApiRoutes.get('/status', async (req, res) => {
  const json_data = {
    "status": "ok",
    "version": "1.0.0",
    "plugins": plugin.get_load_plugins(),
    "today": {
      "messages": database.get('messages').length,
      "users": database.get('userList').length,
      "groups": database.get('groupList').length
    },
    "daily": {
      "messages": database.get('messagesLengthHistory'),
      "groups": database.get('groupListLengthHistory'),
      "users": database.get('userListLengthHistory')
    }
  }
  res.json(json_data);
});

ApiRoutes.get('/plugins/list',async (req,res)=> {
    const json_data = []
    const files = fs.readdirSync('./plugins');
    for (const f of files){
        const plugin_json = JSON.parse(fs.readFileSync('./plugins/'+f+'/plugin.json','utf-8'));
        json_data.push({
            "name": plugin_json.name,
            "description": plugin_json.description,
            "version": plugin_json.version,
            "author": plugin_json.author,
            "isEnabled": config.get(`plugin.${plugin_json.name}.enabled`)
        })
    }
    res.json(json_data)
})

ApiRoutes.post('/plugins/getConfig',async(req,res)=>{
    try{
        const plugin_name = req.body.name;
        const plugin_config = config.get(`plugin.${plugin_name}`)
        
        res.json(plugin_config).send()
    
      }
    catch(e){
        res.status(500).send(e)
    }
})

ApiRoutes.post('/plugins/setConfig',async(req,res)=>{
    try{
        const plugin_name = req.body.name;
        const plugin_config = req.body.config;
        config.set(`plugin.${plugin_name}`,plugin_config)
        res.send()
      }
    catch(e){
        res.status(500).send(e)
    }
})

ApiRoutes.get('/messages',async (req,res)=>{
    res.json(database.get('messages'))
})

ApiRoutes.get('/commands/list',async (req,res)=>{
    res.json(get_bot(config.get('self_id')).commands)
})

export default ApiRoutes;