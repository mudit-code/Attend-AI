import { createLogger, format, transports } from 'winston';
import { env } from '../config/env';

export const logger = createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    env.NODE_ENV === 'production'
      ? format.json()
      : format.combine(format.colorize(), format.simple())
  ),
  transports: [new transports.Console()],
});
