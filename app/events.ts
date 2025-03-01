interface BotStatus {
    good: boolean;
    online: boolean;
    app_initialized: boolean;
    app_enabled: boolean;
    app_good: boolean;
}

interface MessageSender {
    user_id: number;
    nickname?: string;
    sex?: string;
    age?: number;
    area?: string;
    level?: string;
    role?: string;
    title?: string;
    card?: string;
}

interface MessageAnonymous {
    id: number;
    name: string;
    flag: string;
}

interface GroupUploadFile {
    id: string;
    name: string;
    size: number;
    busid: number;
}

import { Message, MessageClass } from "./messages.js";
import { get_bot,SendMessage } from "./bot.js"
import logger from "./log.js";
export class BotEvent {
    time: number;
    self_id: number;

    constructor(time: number, self_id: number) {
        this.time = time;
        this.self_id = self_id;
    }

    get_bot(id:number) {
        return get_bot(this.self_id);
    }

    toString(): string {
        const keys = Object.keys(this);
        const params = keys.map(key => `${key}=${this[key]}`).join(", ");
        return `${this.constructor.name}(${params})`;
    }
}
export class BotMessageEvent extends BotEvent {
    message_id: number;
    message: any;
    raw_message: string;
    sender: MessageSender;

    constructor(time: number, self_id: number, message_id: number, message: any, raw_message: string, sender: MessageSender) {
        super(time, self_id);
        this.message_id = message_id;
        this.message = message;
        this.raw_message = raw_message;
        this.sender = sender;
    }
}

export class NoticeEvent extends BotEvent {}

export class RequestEvent extends BotEvent {}

export class MetaEvent extends BotEvent {}

export class BotLifeCycleMetaEvent extends MetaEvent {
    meta_event_type: string = "lifecycle";

    constructor(time: number, self_id: number) {
        super(time, self_id);
    }
}

export class BotConnectLifeCycleMetaEvent extends BotLifeCycleMetaEvent {
    sub_type: string = "connect";

    constructor(time: number, self_id: number) {
        super(time, self_id);
    }
}

export class BotDisconnectLifeCycleMetaEvent extends BotLifeCycleMetaEvent {
    sub_type: string = "disconnect";

    constructor(time: number, self_id: number) {
        super(time, self_id);
    }
}

export class BotHeartBeatMetaEvent extends MetaEvent {
    meta_event_type: string = "heartbeat";
    status: BotStatus;

    constructor(time: number, self_id: number, status: BotStatus) {
        super(time, self_id);
        this.status = status;
    }
}

export class FriendRequestEvent extends RequestEvent {
    request_type: string = "friend";
    user_id: number;
    comment: string;
    flag: string;

    constructor(time: number, self_id: number, user_id: number, comment: string, flag: string) {
        super(time, self_id);
        this.user_id = user_id;
        this.comment = comment;
        this.flag = flag;
    }

    async approve(remark: string = "") {
        await SendMessage.approve_friend(this.flag, remark);
    }

    async reject() {
        await SendMessage.reject_friend(this.flag);
    }
}

export class GroupRequestEvent extends RequestEvent {
    request_type: string = "group";
    group_id: number;
    user_id: number;
    flag: string;

    constructor(time: number, self_id: number, group_id: number, user_id: number, flag: string) {
        super(time, self_id);
        this.group_id = group_id;
        this.user_id = user_id;
        this.flag = flag;
    }

    async approve() {
        const sub_type = (this.constructor as any).sub_type;
        if (!sub_type) return;
        await SendMessage.approve_group(this.flag, sub_type);
    }

    async reject(reason: string = "") {
        const sub_type = (this.constructor as any).sub_type;
        if (!sub_type) return;
        await SendMessage.reject_group(this.flag, sub_type, reason);
    }
}

export class GroupAddRequestEvent extends GroupRequestEvent {
    sub_type: string = "add";
    comment: string;

    constructor(time: number, self_id: number, group_id: number, user_id: number, flag: string, comment: string) {
        super(time, self_id, group_id, user_id, flag);
        this.comment = comment;
    }
}

export class GroupInviteRequestEvent extends GroupRequestEvent {
    sub_type: string = "invite";
}

export class PrivateMessageEvent extends BotMessageEvent {
    message_type: string = "private";
    user_id: number;

    constructor(time: number, self_id: number, message_id: number, message: any, raw_message: string, sender: MessageSender, user_id: number) {
        super(time, self_id, message_id, message, raw_message, sender);
        this.user_id = user_id;
    }
}

export class PrivateFriendMessageEvent extends PrivateMessageEvent {
    sub_type: string = "friend";
}

export class PrivateGroupMessageEvent extends PrivateMessageEvent {
    sub_type: string = "group";
}

export class PrivateOtherMessageEvent extends PrivateMessageEvent {
    sub_type: string = "other";
}

export class GroupMessageEvent extends BotMessageEvent {
    message_type: string = "group";
    sub_type: string = "normal";
    group_id: number;
    user_id: number;

    constructor(time: number, self_id: number, message_id: number, message: any, raw_message: string, sender: MessageSender, group_id: number, user_id: number) {
        super(time, self_id, message_id, message, raw_message, sender);
        this.group_id = group_id;
        this.user_id = user_id;
    }
}

export class GroupNoticeMessageEvent extends GroupMessageEvent {
    sub_type: string = "notice";
}

export class GroupAnonymousMessageEvent extends GroupMessageEvent {
    sub_type: string = "anonymous";
    anonymous: MessageAnonymous;

    constructor(time: number, self_id: number, message_id: number, message: any, raw_message: string, sender: MessageSender, group_id: number, user_id: number, anonymous: MessageAnonymous) {
        super(time, self_id, message_id, message, raw_message, sender, group_id, user_id);
        this.anonymous = anonymous;
    }
}

export class GroupNoticeEvent extends NoticeEvent {
    group_id: number;
    user_id: number;

    constructor(time: number, self_id: number, group_id: number, user_id: number) {
        super(time, self_id);
        this.group_id = group_id;
        this.user_id = user_id;
    }
}

export class GroupUploadNoticeEvent extends GroupNoticeEvent {
    notice_type: string = "group_upload";
    file: GroupUploadFile;

    constructor(time: number, self_id: number, group_id: number, user_id: number, file: GroupUploadFile) {
        super(time, self_id, group_id, user_id);
        this.file = file;
    }
}

export class GroupAdminNoticeEvent extends GroupNoticeEvent {
    notice_type: string = "group_admin";
}

export class GroupAdminSetNoticeEvent extends GroupAdminNoticeEvent {
    sub_type: string = "set";
}

export class GroupAdminUnsetNoticeEvent extends GroupAdminNoticeEvent {
    sub_type: string = "unset";
}

export class GroupMemberNoticeEvent extends GroupNoticeEvent {
    operator_id: number;

    constructor(time: number, self_id: number, group_id: number, user_id: number, operator_id: number) {
        super(time, self_id, group_id, user_id);
        this.operator_id = operator_id;
    }
}

export class GroupDecreaseNoticeEvent extends GroupMemberNoticeEvent {
    notice_type: string = "group_decrease";
}

export class GroupDecreaseLeaveNoticeEvent extends GroupDecreaseNoticeEvent {
    sub_type: string = "leave";
}

export class GroupDecreaseKickNoticeEvent extends GroupDecreaseNoticeEvent {
    sub_type: string = "kick";
}

export class GroupDecreaseKickMeNoticeEvent extends GroupDecreaseNoticeEvent {
    sub_type: string = "kick_me";
}

export class GroupIncreaseNoticeEvent extends GroupMemberNoticeEvent {
    notice_type: string = "group_increase";
}

export class GroupIncreaseApproveNoticeEvent extends GroupIncreaseNoticeEvent {
    sub_type: string = "approve";
}

export class GroupIncreaseInviteNoticeEvent extends GroupIncreaseNoticeEvent {
    sub_type: string = "invite";
}

export class GroupBanNoticeEvent extends GroupMemberNoticeEvent {
    notice_type: string = "group_ban";
    duration: number;

    constructor(time: number, self_id: number, group_id: number, user_id: number, operator_id: number, duration: number) {
        super(time, self_id, group_id, user_id, operator_id);
        this.duration = duration;
    }
}

export class GroupBanMemberNoticeEvent extends GroupBanNoticeEvent {
    sub_type: string = "ban";
}

export class GroupiftBanLiftMemberNoticeEvent extends GroupBanNoticeEvent {
    sub_type: string = "lift_ban";
}

export class MessageRecallNoticeEvent extends NoticeEvent {
    user_id: number;
    message_id: number;

    constructor(time: number, self_id: number, user_id: number, message_id: number) {
        super(time, self_id);
        this.user_id = user_id;
        this.message_id = message_id;
    }
}

export class GroupMessageRecallNoticeEvent extends MessageRecallNoticeEvent {
    notice_type: string = "group_recall";
    operator_id: number;
    group_id: number;

    constructor(time: number, self_id: number, user_id: number, message_id: number, group_id: number, operator_id: number) {
        super(time, self_id, user_id, message_id);
        this.operator_id = operator_id;
        this.group_id = group_id;
    }
}

export class FriendMessageRecallNoticeEvent extends MessageRecallNoticeEvent {
    notice_type: string = "friend-recall";
    target_id: number;

    constructor(time: number, self_id: number, user_id: number, message_id: number, target_id: number) {
        super(time, self_id, user_id, message_id);
        this.target_id = target_id;
    }
}
export let botevent: BotEvent = new BotEvent(0, 0);
export let messageevent: BotMessageEvent = null
export let noticeevent: NoticeEvent = null
export let requestevent: RequestEvent = null
export let metaevent: MetaEvent = null
function updateEvent(newEvent: BotEvent): void {
    botevent = newEvent;
    switch (true) {
        case newEvent instanceof BotMessageEvent:
            messageevent = newEvent;
            break;
        case newEvent instanceof NoticeEvent:
            noticeevent = newEvent;
            break;
        case newEvent instanceof RequestEvent:
            requestevent = newEvent;
            break;
        case newEvent instanceof MetaEvent:
            metaevent = newEvent;
            break;
    }

}
const eventConstructors: { [key: string]: any } = {
    "message.private.friend": PrivateFriendMessageEvent,
    "message.private.group": PrivateGroupMessageEvent,
    "message.private.other": PrivateOtherMessageEvent,
    "message.group.normal": GroupMessageEvent,
    "message.group.notice": GroupNoticeMessageEvent,
    "message.group.anonymous": GroupAnonymousMessageEvent,
    "notice.group_upload": GroupUploadNoticeEvent,
    "notice.group_admin.set": GroupAdminSetNoticeEvent,
    "notice.group_admin.unset": GroupAdminUnsetNoticeEvent,
    "notice.group_decrease.leave": GroupDecreaseLeaveNoticeEvent,
    "notice.group_decrease.kick": GroupDecreaseKickNoticeEvent,
    "notice.group_decrease.kick_me": GroupDecreaseKickMeNoticeEvent,
    "notice.group_increase.approve": GroupIncreaseApproveNoticeEvent,
    "notice.group_increase.invite": GroupIncreaseInviteNoticeEvent,
    "notice.group_ban.ban": GroupBanMemberNoticeEvent,
    "notice.group_ban.lift_ban": GroupiftBanLiftMemberNoticeEvent,
    "notice.friend-recall": FriendMessageRecallNoticeEvent,
    "notice.group_recall": GroupMessageRecallNoticeEvent,
    "request.friend": FriendRequestEvent,
    "request.group.add": GroupAddRequestEvent,
    "request.group.invite": GroupInviteRequestEvent,
    "meta_event.lifecycle.connect": BotConnectLifeCycleMetaEvent,
    "meta_event.lifecycle.disconnect": BotDisconnectLifeCycleMetaEvent,
    "meta_event.heartbeat": BotHeartBeatMetaEvent,
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
    logger.info(key)

    const EventConstructor = eventConstructors[key];
    if (!EventConstructor) return;
    const message = eventData.message;
    const sender = eventData.sender;

    const baseArgs = [eventData.time, eventData.self_id];
    const eventSpecificArgs: any[] = [];

    switch (key) {
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


        case "meta_event.lifecycle.connect":
        case "meta_event.lifecycle.disconnect":
            break;
        case "meta_event.heartbeat":
            eventSpecificArgs.push(eventData.status);
            break;
    }

    const constructorArgs = [...baseArgs, ...eventSpecificArgs];
    const newEvent = new EventConstructor(...constructorArgs);
    updateEvent(newEvent);
}

export {
    updateEvent,
    MessageSender,
    MessageAnonymous,
    GroupUploadFile,
}

