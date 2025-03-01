import config from "./config.js";

const CQ_TABLES: { [key: string]: string } = {
    "&": "&amp;",
    "[": "&#91;",
    "]": "&#93;",
    ",": "&#44;"
};

export interface Data {
    [key: string]: any;
}

export class BaseMessage {
    type: any;
    data: Data;

    constructor(type: any, data: Data) {
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

export class MessageClass extends Array<BaseMessage> {
    json(){
        return this.map(v => v.json());
    }

    cq(){
        return this.map(v => v.cq()).join('');
    }
    addMessage(object: any): this {
        if (object instanceof MessageClass) {
            this.union(object);
            return this;
        }
        super.push(object);
        return this;
    }

    pushMessage(type: any, data: Data): this {
        return this.addMessage(new BaseMessage(type, data));
    }

    union(...s: MessageClass[]): this {
        for (const msg of s) {
            for (const baseMessage of msg) {
                this.addMessage(baseMessage);
            }
        }
        return this;

    }

    static build(): MessageClass {
        return new Message();
    }
}

export class MessageSegmentClass {
    Message: MessageClass;

    constructor() {
        this.messages = Message.build();
    }

    [key: string]: any;

    static text(text: string): MessageClass {
        return Message.build().pushMessage("text", { text });
    }

    static at(qq: number): MessageClass {
        return Message.build().pushMessage("at", { qq: qq.toString() });
    }

    static reply(id: number): MessageClass {
        return Message.build().pushMessage("reply", { id: id.toString() });
    }

    static fromJson(msg: { type: string; data: Data }[]): MessageClass {
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
let MessageSegment = MessageSegmentClass;
let Message = MessageClass;


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
if (config.get('adapter.enable')) {
    import(`../adapters/${config.get('adapter.use')}/index.js`)
        .then(adapert => {
            Message = adapert.Message;
            MessageSegment = adapert.MessageSegment;
        })
        .catch(err => console.error('Failed to load adapter:', err));
}

export {
    Message,
    MessageSegment,
}