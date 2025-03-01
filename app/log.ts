import bunyan from 'bunyan';
import config from './config.js';
import { mkdirSync, existsSync } from 'fs';

if (!existsSync('./logs')) {
  mkdirSync('./logs');
}

export const logger = bunyan.createLogger({
  name: 'app',
  level: bunyan.resolveLevel(config.get('log.level').toUpperCase()),
  streams: [{
    type: 'rotating-file',
    path: './logs/app.log',
    period: '1d',
    count: 7
  }, {
    stream: process.stdout,
}],
  serializers: {
    err: bunyan.stdSerializers.err
  }
});

export class AdapterLog {
  name: string;
  constructor(name: string){
    this.name = name;
  }
  info(message: string){
    return logger.info(`[Adapter ${this.name}] ${message}`);
  }
  error(message: string, err: Error){
    return logger.error(`[Adapter ${this.name}] ${message}`, err);
  }
  warn(message: string){
    return logger.warn(`[Adapter ${this.name}] ${message}`);
  }
  debug(message: string){
    return logger.debug(`[Adapter ${this.name}] ${message}`);
  }
}
export const adapterLog = new AdapterLog(config.get('adapter.use'));
export default logger;
