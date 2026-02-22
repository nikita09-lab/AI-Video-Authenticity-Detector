import pino from 'pino';
import config from '../config/index.js';

const logger = pino({
    level: config.env === 'production' ? 'warn' : 'debug',
    transport: config.env !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
        : undefined,
});

export default logger;
