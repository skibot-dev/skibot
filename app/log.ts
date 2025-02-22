import { pino } from 'pino';
import config from './config.js';
export const logger = pino({
  level: config.get('log.level'),
  transport: {
    target: 'pino-pretty',
    options: {
      translateTime: 'SYS:standard',
      singleLine: true,
    },
  },
});
export default logger;
