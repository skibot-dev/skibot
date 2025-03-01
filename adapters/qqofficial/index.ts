import logger, { adapterLog } from '../../app/log.js';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import * as events from '../../app/events.js';
import { BaseMessage,Data } from '../../app/messages.js';
const __dirname = process.cwd();
let heartbeat_interval = 45000;
const configFilePath = path.resolve(__dirname, './adapters/qqofficial/config.json');
const config = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
const endpoint = "wss://api.sgroup.qq.com/websocket"
let s = null

export class SendMessage {
    static async send_private_msg(openid: any, message: Message, msg_id: string) {
        const post_data = {}
        post_data['msg_type'] = message.json().data.msg_type;
        post_data['content'] = message.json().data.content;
        post_data['event_id'] = 'C2C_MESSAGE_CREATE';
        post_data['msg_id'] = msg_id;
        return await axios.post(`https://api.sgroup.qq.com/v2/users/${openid}/messages`, post_data,{
            headers:{
                "Authorization": `QQBot ${await getToken()}`,
            }
        });
    }
    static async send_group_msg(group_id: any, message: Message, msg_id: string) {
        const post_data = {}
        post_data['msg_type'] = message.json().data.msg_type;
        post_data['content'] = message.json().data.content;
        post_data['event_id'] = 'GROUP_MESSAGE_CREATE';
        post_data['msg_id'] = msg_id;
        return await axios.post(`https://api.sgroup.qq.com/v2/groups/${group_id}/messages`, post_data, {
    headers: {
        "Authorization": `QQBot ${await getToken()}`,
    } 
});

} 

}



export class Message extends Array<BaseMessage> {
    static build() {
        return new Message();
    }
    pushMessage(type: any, data: Data): this {
            return this.addMessage(new BaseMessage(type, data));
        }
    addMessage(object: any){
        if (object instanceof Message) {
            this.union(object);
            return this;
        }
        super.push(object);
        return this;
    }
    union(...s: Message[]): this {
        for (const msg of s) {
            for (const baseMessage of msg) {
                this.addMessage(baseMessage);
            }
        }
        return this;

    }
    json(){
        if (this.some(v => v.type === 0)) {
            const message = this.find(v => v.type === 0);
            return message
        }
    }
    
}

export class MessageSegment {
    static text(content: string){
        return Message.build().pushMessage(0,{
            msg_type: 0,
            content: content
        })
    }
}

export class Handler{
    _event: events.BotEvent
    _send: Function
    constructor(event: events.BotEvent){
        this._event = event,
        this._send = null

    }
    finish(message: Message){
        if (this._event instanceof events.PrivateMessageEvent){
            return SendMessage.send_private_msg(this._event.user_id, message, this._event.message_id.toString())
        }
        if (this._event instanceof events.GroupMessageEvent){
            return SendMessage.send_group_msg(this._event.group_id, message, this._event.message_id.toString())
        }
    }
}






function get_config(key: string, default_value: any = null) {
    if (config.hasOwnProperty(key)) {
        return config[key];
    } else {
        return default_value;
    }
}



async function getToken(){
    const res = await axios.post("https://bots.qq.com/app/getAppAccessToken",{
        "appId": get_config('appid'),
        "clientSecret": get_config('appsecret')
    })
    return res.data.access_token;
}


async function matchEvents(event: any){
    let _event = null
    switch (event.t){
        case "C2C_MESSAGE_CREATE":
            if (!event.d.attachments){
                _event = new events.PrivateMessageEvent(event.d.timestamp, 0, event.d.id, new Message(new BaseMessage(0, { text: event.d.content })), event.d.content, { user_id: event.d.author.id }, event.d.author.id)
            }
            break;
        case "GROUP_AT_MESSAGE_CREATE":
            if (!event.d.attachments){
                _event = new events.GroupMessageEvent(event.d.timestamp, 0, event.d.id, new Message(new BaseMessage(0, { text: event.d.content })), event.d.content.trimStart(), { user_id: event.d.author.id }, event.d.group_id, event.d.author.id)
            }
            break;
    }
    events.updateEvent(_event)
}





let socket = null
async function handleEvent(event: any) {
    const op = event.op;
    switch (op){
        case 10:
            adapterLog.debug(`Receive hello message ${JSON.stringify(event)}`)
            heartbeat_interval = event.d.heartbeat_interval;
            break;
        //case 9:
            //throw new Error(`receive invalid session`)
        case 0:
            s = event.s
            adapterLog.debug(`Receive Bot message ${JSON.stringify(event)}`)
            matchEvents(event)
            break;
        case 11:
            adapterLog.debug(`Receive heartbeat message ${JSON.stringify(event)}`)
            break;
    }
}
let heartbeatTimer = null;
export function init() {
    if (socket) {
        socket.close();
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
    }
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }

    socket = new WebSocket(endpoint);
    adapterLog.info('QQOfficial adapter started');

    socket.onopen = async () => {
        adapterLog.info('QQOfficial adapter connected');
        try {
            const data = {
                "op": 2,
                "d": {
                    "token": `QQBot ${await getToken()}`,
                    "intents": 33554432,
                    "shard": [0, 1],
                    "properties": {
                        "$os": "linux",
                        "$browser": "my_library",
                        "$device": "my_library"
                    }
                }
            };
            socket.send(JSON.stringify(data));
            
            // 设置新的心跳定时器
            heartbeatTimer = setInterval(() => {
                const data = {
                    "op": 1,
                    "d": s // 注意：这里需要确认s变量的有效性
                };
                adapterLog.debug(`Send heartbeat message ${JSON.stringify(data)}`);
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify(data));
                }
            }, heartbeat_interval);

        } catch (error) {
            adapterLog.error('Connection setup failed:', error);
            socket.close();
        }
    };

    socket.onmessage = (event) => {
        handleEvent(JSON.parse(event.data));
    };

    socket.onclose = () => {
        adapterLog.info('QQOfficial adapter connection closed, trying to reconnect');
        setTimeout(init, 3000);
    };

    socket.onerror = (error) => {
        adapterLog.error('WebSocket error:', error);
    };
}