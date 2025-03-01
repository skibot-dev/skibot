import axios from 'axios';
import { BotEvent, BotMessageEvent, messageevent, metaevent, requestevent, noticeevent, RequestEvent,NoticeEvent,MetaEvent, GroupMessageEvent, } from "./events.js";
import { Message, MessageClass, MessageSegment } from "./messages.js";
import  config  from "./config.js";
import { PrivateMessageEvent } from './events.js';
import logger from './log.js';
import counter from './counter.js';
import async from 'async';
async function call_api(path: string, body: object) {
    const res = await axios.post(`${config.get('onebot.url')}${path}`, body);
    return res.data;
}

const BOTS: { [key: number]: Bot } = {};



export function get_bot(id: number): Bot {
    if (!(id in BOTS)) {
        BOTS[id] = new Bot(id);
    }
    return BOTS[id];
}
export class SendMessageClass {
    static async send_group_msg(group_id: number, message: MessageClass) {
        await call_api(`/send_group_msg`,{
            'group_id': group_id,
            'message': message.json()
        })
    }
    static async send_private_msg(user_id: number, message: MessageClass) {
        await call_api(`/send_private_msg`,{
            'user_id': user_id,
           'message': message.json()
        })
    }
    static async approve_group(flag: any, sub_type: any) {
    }

    static async reject_group(flag: any, sub_type: any, reason: any = "") {
    }

    static async approve_friend(flag: any, remark: any = "") {
    }

    static async reject_friend(flag: any) {
    }
}
export class Bot {
    public self_id: number;
    private messageevent: BotMessageEvent;
    private noticeevent: NoticeEvent;
    private requestevent: RequestEvent;
    private metaevent: MetaEvent;
    private eventHandlers: { [eventName: string]: Function[] } = {};
    private eventQueue = [];
    public commands: Array<any>;
    constructor(self_id: number) {
        this.messageevent = null;
        this.noticeevent = null;
        this.requestevent = null;
        this.metaevent = null;
        this.self_id = self_id;
        this.startEventLoop();
        this.commands = [];
        BOTS[self_id] = this;
    }

    resiger_command(command: string, description: string) {
        const data = {
            command: command,
            description: description,
        };
        if (this.commands.some(cmd => cmd.command === command)) {
            throw new Error("Command already registered");
        }
        this.commands.push(data);
    }


    on(event: string, callback: (event: BotEvent,handler:HandlerClass,reply_msg:MessageClass) => void) {
        const eventName = event.toLowerCase();
        if (!this.eventHandlers[eventName]) {
            this.eventHandlers[eventName] = [];
        }
        this.eventHandlers[eventName].push(callback);
        this.eventQueue.push(event);
    }

    command(command: string, description: string, callback: (arg: string,handler:HandlerClass,reply_msg:MessageClass,event: BotMessageEvent) => void) {
        this.resiger_command(command, description);

        const handler = async (event: any,handler:any,reply_msg:any) => {
            const prefix = config.get("prefix");
            const regex = new RegExp(`^${prefix}${command}`);
            if (regex.test(event.raw_message)) {
                const args = event.raw_message.split(" ").slice(1);
                setImmediate(async() => {
                    await counter.add_user(event.sender.user_id)
                  });
                try{
                await callback(args,handler,reply_msg,event);
                return
                }
                catch(e){
                    logger.error(`error when handling command ${command}, ${e}`)
                    await this.handleError(e, event);
                    return;                }
            }
        };

        this.on('message', handler);
    }
    private async handleError(error: Error,event: BotEvent){
        const message = new Message()
        const handler = new Handler(event)
        message.addMessage(MessageSegment.text(`在响应 ${event.constructor.name} 事件时出错: ${error}`))
        handler.finish(message)
    }
    private invokeCallbacks(eventName: string, event: BotEvent) {
        return new Promise<void>((resolve, reject) => {
            if (this.eventHandlers[eventName]) {
                const handlers = this.eventHandlers[eventName];
                async.parallel(
                    handlers.map(handler => {
                        return function(callback) {
                            handler(event, new Handler(event), new Message())
                            .then(() => callback(null))
                                .catch(error => {
                                    console.error(`Error in handler for event ${eventName}:`, error);
                                    this.handleError(error, event)
                                        .then(() => callback(null))
                                        .catch(err => callback(err));
                                });
                        };
                    }),
                    (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    }
                );
            } else {
                resolve();
            }
        });
    }
    
    private startEventLoop() {
        const eventHandlers = new Map<string, (event: any) => void>([
            ['message', async (event) => {
                if (messageevent != null && messageevent !== this.messageevent) {
                    this.messageevent = messageevent;
                    await this.invokeCallbacks(event, messageevent);
                    
                }
            }],
            ['notice', async (event) => {
                if (noticeevent != null && noticeevent !== this.noticeevent) {
                    await this.invokeCallbacks(event, noticeevent);
                    this.noticeevent = noticeevent;
                }
            }],
            ['request', async (event) => {
                if (requestevent != null && requestevent !== this.requestevent) {
                    await this.invokeCallbacks(event, requestevent);
                    this.requestevent = requestevent;
                }
            }],
            ['meta_event', async (event) => {
                if (metaevent != null && metaevent !== this.metaevent) {
                    await this.invokeCallbacks(event, metaevent);
                    this.metaevent = metaevent;
                }
            }],
        ]);

        setInterval(async () => {
            for (const event of this.eventQueue) {
                const handler = eventHandlers.get(event);
                if (handler) {
                    await handler(event);
                }
            }
        }, 0);
    }
    


}

export class HandlerClass{
    private _event: BotEvent;
    private _send: Function;
    constructor(event: BotEvent) {
        this._event = event;
        this._send = null
    }
    async finish(message: MessageClass){
        console.log(222)
        if (this._event instanceof GroupMessageEvent){
            this._send = SendMessage.send_group_msg;
            return this._send(this._event.group_id, message);
        }
        if (this._event instanceof PrivateMessageEvent){
            this._send = SendMessage.send_private_msg;
            return this._send(this._event.user_id, message);
        }
    }
}
let SendMessage = SendMessageClass;
let Handler = HandlerClass;
if (config.get('adapter.enable')) {
    (async () => {
        const adapter = await import(`../adapters/${config.get('adapter.use')}/index.js`);
        Handler = adapter.Handler;
        SendMessage = adapter.SendMessage;
    })();
}


export {
    SendMessage,
    Handler
}