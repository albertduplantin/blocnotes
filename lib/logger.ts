/**
 * Simple logger utility
 * In production, this could be replaced with a proper logging service
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDevelopment = process.env.NODE_ENV === 'development';

class Logger {
  private log(level: LogLevel, category: string, message: string, ...args: any[]) {
    // In production, only log warnings and errors
    if (!isDevelopment && (level === 'debug' || level === 'info')) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${category}]`;

    switch (level) {
      case 'debug':
        console.debug(prefix, message, ...args);
        break;
      case 'info':
        console.info(prefix, message, ...args);
        break;
      case 'warn':
        console.warn(prefix, message, ...args);
        break;
      case 'error':
        console.error(prefix, message, ...args);
        break;
    }
  }

  debug(category: string, message: string, ...args: any[]) {
    this.log('debug', category, message, ...args);
  }

  info(category: string, message: string, ...args: any[]) {
    this.log('info', category, message, ...args);
  }

  warn(category: string, message: string, ...args: any[]) {
    this.log('warn', category, message, ...args);
  }

  error(category: string, message: string, ...args: any[]) {
    this.log('error', category, message, ...args);
  }
}

export const logger = new Logger();

// Category-specific loggers for convenience
export const dbLogger = {
  debug: (message: string, ...args: any[]) => logger.debug('DB', message, ...args),
  info: (message: string, ...args: any[]) => logger.info('DB', message, ...args),
  warn: (message: string, ...args: any[]) => logger.warn('DB', message, ...args),
  error: (message: string, ...args: any[]) => logger.error('DB', message, ...args),
};

export const authLogger = {
  debug: (message: string, ...args: any[]) => logger.debug('AUTH', message, ...args),
  info: (message: string, ...args: any[]) => logger.info('AUTH', message, ...args),
  warn: (message: string, ...args: any[]) => logger.warn('AUTH', message, ...args),
  error: (message: string, ...args: any[]) => logger.error('AUTH', message, ...args),
};

export const apiLogger = {
  debug: (message: string, ...args: any[]) => logger.debug('API', message, ...args),
  info: (message: string, ...args: any[]) => logger.info('API', message, ...args),
  warn: (message: string, ...args: any[]) => logger.warn('API', message, ...args),
  error: (message: string, ...args: any[]) => logger.error('API', message, ...args),
};
