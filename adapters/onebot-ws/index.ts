import { waitForDebugger } from 'inspector';
import * as events from '../../app/events.js';
import { GroupMessageEvent } from '../../app/events.js';
import {adapterLog} from '../../app/log.js';

const ws = new WebSocket('ws://127.0.0.1:3001');


const CQ_TABLES: { [key: string]: string } = {
    "&": "&amp;",
    "[": "&#91;",
    "]": "&#93;",
    ",": "&#44;"
};

interface Data {
    [key: string]: any;
}

class BaseMessage {
    type: string;
    data: Data;

    constructor(type: string, data: Data) {
        this.type = type;
        this.data = data;
    }

    cq(): string {
        if (this.type === "text") {
            return escapeMessage(this.data["text"]);
        } else {
            const parts = Object.entries(this.data).map(([k, v]) => `${k}=${escapeMessage(v)}`);
            return `[CQ:${this.type},${parts.join(",")}]`;
        }
    }

    json(){
        return {
            type: this.type,
            data: this.data
        };
    }
}

export class Message extends Array<BaseMessage> {
    json(): { type: string; data: Data }[] {
        return this.map(v => v.json());
    }

    cq(): string {
        return this.map(v => v.cq()).join('');
    }
    addMessage(object: any): this {
        if (object instanceof Message) {
            this.union(object);
            return this;
        }
        super.push(object);
        return this;
    }

    pushMessage(type: string, data: Data): this {
        return this.addMessage(new BaseMessage(type, data));
    }

    union(...s: Message[]): this {
        for (const msg of s) {
            for (const baseMessage of msg) {
                this.addMessage(baseMessage);
            }
        }
        return this;

    }

    static build(): Message {
        return new Message();
    }
}

export class MessageSegment {
    messages: Message;

    constructor() {
        this.messages = Message.build();
    }

    [key: string]: any;

    static text(text: string): Message {
        return Message.build().pushMessage("text", { text });
    }

    static at(qq: number): Message {
        return Message.build().pushMessage("at", { qq: qq.toString() });
    }

    static reply(id: number): Message {
        return Message.build().pushMessage("reply", { id: id.toString() });
    }

    static fromJson(msg: { type: string; data: Data }[]): Message {
        const array = Message.build();
        for (const message of msg) {
            array.pushMessage(message.type, message.data);
        }
        return array;
    }

    static get METHODS(): string[] {
        return Object.getOwnPropertyNames(MessageSegment)
            .filter(name => typeof (MessageSegment as any)[name] === 'function' && name !== 'fromJson');
    }
}

function escapeMessage(value: any): string {
    if (typeof value === 'object') {
        value = JSON.stringify(value);  // 将对象转化为JSON字符串
    }
    for (const [k, v] of Object.entries(CQ_TABLES)) {
        value = value.replace(k, v);
    }
    return value;
}

function unescapeMessage(value: string): string {
    for (const [k, v] of Object.entries(CQ_TABLES)) {
        value = value.replace(v, k);
    }
    return value;
}

const eventConstructors: { [key: string]: any } = {
    // 消息事件
    "message.private.friend": events.PrivateFriendMessageEvent,
    "message.private.group": events.PrivateGroupMessageEvent,
    "message.private.other": events.PrivateOtherMessageEvent,
    "message.group.normal": events.GroupMessageEvent,
    "message.group.notice": events.GroupNoticeMessageEvent,
    "message.group.anonymous": events.GroupAnonymousMessageEvent,

    // 通知事件
    "notice.group_upload": events.GroupUploadNoticeEvent,
    "notice.group_admin.set": events.GroupAdminSetNoticeEvent,
    "notice.group_admin.unset": events.GroupAdminUnsetNoticeEvent,
    "notice.group_decrease.leave": events.GroupDecreaseLeaveNoticeEvent,
    "notice.group_decrease.kick": events.GroupDecreaseKickNoticeEvent,
    "notice.group_decrease.kick_me": events.GroupDecreaseKickMeNoticeEvent,
    "notice.group_increase.approve": events.GroupIncreaseApproveNoticeEvent,
    "notice.group_increase.invite": events.GroupIncreaseInviteNoticeEvent,
    "notice.group_ban.ban": events.GroupBanMemberNoticeEvent,
    "notice.group_ban.lift_ban": events.GroupBanMemberNoticeEvent,
    "notice.friend-recall": events.FriendMessageRecallNoticeEvent,
    "notice.group_recall": events.GroupMessageRecallNoticeEvent,

    // 请求事件
    "request.friend": events.FriendRequestEvent,
    "request.group.add": events.GroupAddRequestEvent,
    "request.group.invite": events.GroupInviteRequestEvent,

    // 元事件
    "meta_event.lifecycle.connect": events.BotConnectLifeCycleMetaEvent,
    "meta_event.lifecycle.disconnect": events.BotDisconnectLifeCycleMetaEvent,
    "meta_event.heartbeat": events.BotHeartBeatMetaEvent,
};

export function matchEvents(eventData: any): void {
    const postType = eventData.post_type;
    const messageType = eventData.message_type;
    const subType = eventData.sub_type || '';
    const noticeType = eventData.notice_type || '';
    const requestType = eventData.request_type || '';
    const metaEventType = eventData.meta_event_type || '';
    let key: string;
    switch (postType) {
        case "message":
            key = `${postType}.${messageType}.${subType}`;
            break;
        case "notice":
            key = `${postType}.${noticeType}${subType ? `.${subType}` : ''}`;
            break;
        case "request":
            key = `${postType}.${requestType}${subType ? `.${subType}` : ''}`;
            break;
        case "meta_event":
            key = `${postType}.${metaEventType}${subType ? `.${subType}` : ''}`;
            break;
        default:
            return;
    }

    const EventConstructor = eventConstructors[key];
    if (!EventConstructor) return;

    const message = eventData.message;
    const sender = eventData.sender;

    const baseArgs = [eventData.time, eventData.self_id];
    const eventSpecificArgs: any[] = [];
    switch (key) {
        // 消息事件
        case "message.private.friend":
        case "message.private.group":
        case "message.private.other":
            eventSpecificArgs.push(
                eventData.message_id,
                message,
                eventData.raw_message,
                sender,
                eventData.user_id
            );
            break;
        case "message.group.normal":
        case "message.group.notice":
            eventSpecificArgs.push(
                eventData.message_id,
                message,
                eventData.raw_message,
                sender,
                eventData.group_id,
                eventData.user_id
            );
            break;
        case "message.group.anonymous":
            eventSpecificArgs.push(
                eventData.message_id,
                message,
                eventData.raw_message,
                sender,
                eventData.group_id,
                eventData.user_id,
                eventData.anonymous
            );
            break;

        // 通知事件
        case "notice.group_upload":
            eventSpecificArgs.push(
                eventData.group_id,
                eventData.user_id,
                eventData.file
            );
            break;
        case "notice.group_admin.set":
        case "notice.group_admin.unset":
            eventSpecificArgs.push(
                eventData.group_id,
                eventData.user_id
            );
            break;
        case "notice.group_decrease.leave":
        case "notice.group_decrease.kick":
        case "notice.group_decrease.kick_me":
        case "notice.group_increase.approve":
        case "notice.group_increase.invite":
            eventSpecificArgs.push(
                eventData.group_id,
                eventData.user_id,
                eventData.operator_id
            );
            break;
        case "notice.group_ban.ban":
        case "notice.group_ban.lift_ban":
            eventSpecificArgs.push(
                eventData.group_id,
                eventData.user_id,
                eventData.operator_id,
                eventData.duration
            );
            break;
        case "notice.friend-recall":
            eventSpecificArgs.push(
                eventData.user_id,
                eventData.message_id,
                eventData.target_id
            );
            break;
        case "notice.group_recall":
            eventSpecificArgs.push(
                eventData.user_id,
                eventData.message_id,
                eventData.group_id,
                eventData.operator_id
            );
            break;

        // 请求事件
        case "request.friend":
            eventSpecificArgs.push(
                eventData.user_id,
                eventData.comment,
                eventData.flag
            );
            break;
        case "request.group.add":
            eventSpecificArgs.push(
                eventData.group_id,
                eventData.user_id,
                eventData.flag,
                eventData.comment
            );
            break;
        case "request.group.invite":
            eventSpecificArgs.push(
                eventData.group_id,
                eventData.user_id,
                eventData.flag
            );
            break;

        // 元事件
        case "meta_event.lifecycle.connect":
        case "meta_event.lifecycle.disconnect":
            break;
        case "meta_event.heartbeat":
            eventSpecificArgs.push(eventData.status);
            break;
    }

    const constructorArgs = [...baseArgs, ...eventSpecificArgs];
    const newEvent = new EventConstructor(...constructorArgs);
    events.updateEvent(newEvent);
}


export class SendMessage{
    constructor(){}
    static send_group_msg(group_id: number, message: Message){
        ws.send(JSON.stringify({
            "action": "send_group_msg",
            "params": {
                "group_id": group_id,
                "message": message.json()
            },
            "echo": "0"
        }))
    }
}

export class Handler{
    private _event: events.BotEvent;
    private _send: Function;
    constructor(event: events.BotEvent) {
        this._event = event;
        this._send = null
    }
    async finish(message: Message){
        if (this._event instanceof GroupMessageEvent){

            this._send = SendMessage.send_group_msg;
            return this._send(this._event.group_id, message);
        }
    }
}

ws.onmessage = (event) => {
    //console.log(event.data)
    matchEvents(JSON.parse(event.data))
}

function init(){
    if (ws.OPEN === 1){
        adapterLog.info("Websocket Connection Established")
    }
}

export {
    init
}