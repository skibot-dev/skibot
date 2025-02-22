import express from 'express';
import { matchEvents } from '../app/events.js';
const msgrouter = express.Router();
await import ('express-async-errors')
msgrouter.post('/put', async(req, res) => {
    //console.time('matchEvents')
    matchEvents(req.body);
    //console.timeEnd('matchEvents')
    res.send('success'); 
});

export default msgrouter;
