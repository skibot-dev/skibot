import express from 'express';
import msgrouters from './routers/message.js'; 
import { Bot, HandlerClass } from './app/bot.js';
import { BotEvent, BotMessageEvent, GroupMessageEvent } from './app/events.js';
import config from './app/config.js';
import logger from './app/log.js';
import plugin, { Plugin } from './app/plugin.js';
import { Message, MessageClass, MessageSegment } from './app/messages.js';
import schedule from 'node-schedule';
import * as fs from 'fs';
import counter from './app/counter.js';
import { database } from './app/counter.js';
import ApiRoutes from './routers/api.js';
import cookieParser from 'cookie-parser';
import AuthRoutes from './routers/auth.js';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const port = config.get('web.port');
const bot = new Bot(config.get('self_id'));
const host = config.get('web.host');
const version = JSON.parse(fs.readFileSync('./package.json', 'utf-8')).version;

async function check_db() {
  const dirPath = './data';
  const filePath = path.join(dirPath, 'count.json');

  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    let shouldInitialize = false;
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      if (fileContent.trim() === '' || fileContent.trim() === '{}') {
        shouldInitialize = true;
      }
    } else {
      shouldInitialize = true;
    }

    if (shouldInitialize) {
      const data = {
        "groupList": [],
        "userList": [],
        "messages": [],
        "groupListLengthHistory": [],
        "userListLengthHistory": [],
        "messagesLengthHistory": []
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } 
  } catch (error) {
    console.error(error);
  }
}

async function initialize() {
  await check_db();
  database.load_data();
  plugin.load_plugins(); 
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api', ApiRoutes);
  app.use('/message', msgrouters); 
  app.use('/auth', AuthRoutes);
  if (config.get('dashboard.debug') === true) {
    logger.warn('dashboard debug mode enabled');
    app.use('/', createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
      pathRewrite: {
        '^/': '/'
      }
    }));
  }
  if (!config.get('dashboard.debug')){
    app.use(express.static('./frontend/dist'))
  }


  app.listen(port, host, () => {
    logger.info(`Server is running on http://${host}:${port}`);
  });

  bot.on('message', async (event: BotMessageEvent) => {
    logger.info(JSON.stringify(event));
    counter.add_messages(event);
    if (event instanceof GroupMessageEvent) {
      await counter.add_group(event.group_id);
    }
  });

  bot.on('meta_event', async(event: BotEvent) => {
    logger.info(JSON.stringify(event));
  });

  bot.on('request', async(event: BotEvent) => {
    logger.info(JSON.stringify(event));
  });

  bot.on('notice', async(event: BotEvent) => {
    logger.info(JSON.stringify(event));
  });

  bot.command('about', '获取关于信息', (args, Handler: HandlerClass, msg: MessageClass) => {
    msg.addMessage(MessageSegment.text(`SkiBot v${version} \nAuthor: @unify-z \nhttps://github.com/unify-z/skibot`));
    Handler.finish(msg);
  });

  bot.command('help', '获取帮助信息', (args, handler: HandlerClass, msg: MessageClass, event) => {
    let help_msg = '当前共有以下可用指令: \n';
    for (const _command of bot.commands) {
      const command = _command.command;
      const desc = _command.description;
      help_msg += `${config.get("prefix")}${command} - ${desc}\n`;
    }
    msg.addMessage(MessageSegment.reply(event.message_id));
    msg.addMessage(MessageSegment.text(help_msg));
    handler.finish(msg);
  });
}

function onStop(signal: string) {
  const files = fs.readdirSync('./plugins');
  for (const file of files) {
    try {
      fs.unlinkSync(`./plugins/${file}/index.js`);
    } catch (e) {}
  }
  console.log(`${signal} received. Shutting down...`);
  process.exit(0);
}

function updateCountHistory() {
  const groups = database.get('groupList').length;
  const users = database.get('userList').length;
  const messages = database.get('messages').length;
  const groupListLengthHistory = database.get('groupListLengthHistory');
  const userListLengthHistory = database.get('userListLengthHistory');
  const messagesLengthHistory = database.get('messagesLengthHistory');
  groupListLengthHistory.push(groups);
  userListLengthHistory.push(users);
  messagesLengthHistory.push(messages);
  database.updateOne('groupListLengthHistory', groupListLengthHistory);
  database.updateOne('userListLengthHistory', userListLengthHistory);
  database.updateOne('messagesLengthHistory', messagesLengthHistory);
}

function cleanCount() {
  database.updateOne('groupList', []);
  database.updateOne('userList', []);
  database.updateOne('messages', []);
  if (database.get('groupListLengthHistory').length >= 30) {
    database.updateOne('groupListLengthHistory', []);
  }
  if (database.get('userListLengthHistory').length >= 30) {
    database.updateOne('userListLengthHistory', []);
  }
  if (database.get('messagesLengthHistory').length >= 30) {
    database.updateOne('messagesLengthHistory', []);
  }
}
process.on("SIGINT", onStop);
process.on("SIGTERM", onStop);
schedule.scheduleJob('0 0 * * *', updateCountHistory);
schedule.scheduleJob('0 0 * * *', cleanCount);
initialize();
if (config.get('adapter.enable')) {
  import(`./adapters/${config.get('adapter.use')}.js`)
      .then(adapert => {
          adapert.init()
      })
      .catch(err => console.error('Failed to load adapter:', err));
}