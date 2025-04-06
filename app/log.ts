import config from "./config.js";

class Logger {
  private readonly RESET = "\x1b[0m";
  private readonly GREEN = "\x1b[32m";
  private readonly YELLOW = "\x1b[33m";
  private readonly LEVEL_COLORS: Record<string, string> = {
      "INFO": "\x1b[37m",
      "WARN": "\x1b[33m",
      "ERROR": "\x1b[31m",
      "SUCCESS": "\x1b[92m",
      "DEBUG": "\x1b[36m"
  };

  private getCallerInfo() {
      try {
          const err = new Error();
          const stack = err.stack?.split('\n') || [];
          const callerLine = stack[4] || '';
          const match = callerLine.match(/at (?:(.+?)\s)?.*?\(?(.+?):(\d+):(\d+)\)?$/);
          if (match) {
              const func = match[1] || 'anonymous';
              const filename = match[2].split('/').pop() || 'unknown';
              const line = parseInt(match[3], 10) || 0;
              return { filename, func, line };
          }
      } catch (e) {}
      return { filename: 'unknown', func: 'unknown', line: 0 };
  }

  private log(level: string, message: string) {
      const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
      const caller = this.getCallerInfo();
      const levelColor = this.LEVEL_COLORS[level] || this.RESET;
      console.log(
          `${this.GREEN}[${now}]${this.RESET} ` +
          `${levelColor}[${level}]${this.RESET} ` +
          `${this.YELLOW}[${caller.filename}:${caller.func}:${caller.line}]${this.RESET}: ` +
          `${levelColor}${message}${this.RESET}`
      );
  }

  public info(message: string) {
      this.log("INFO", message);
  }

  public warn(message: string) {
      this.log("WARN", message);
  }

  public error(message: string) {
      this.log("ERROR", message);
  }

  public success(message: string) {
      this.log("SUCCESS", message);
  }

  public debug(message: string) {
      this.log("DEBUG", message);
  }
}

const logger = new Logger();

export class AdapterLog {
  name: string;
  constructor(name: string){
    this.name = name;
  }
  info(message: string){
    return logger.info(`[Adapter ${this.name}] ${message}`);
  }
  error(message: string, err: Error){
    return logger.error(`[Adapter ${this.name}] ${message} ${err.stack}`);
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
