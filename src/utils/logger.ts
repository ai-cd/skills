export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function shouldLog(level: LogLevel): boolean {
  if (level !== 'debug') {
    return true;
  }

  return process.env.DEBUG === '1' || process.env.DEBUG === 'true';
}

function emit(level: LogLevel, scope: string, message: string, meta?: unknown): void {
  if (!shouldLog(level)) {
    return;
  }

  const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${scope}]`;
  if (meta === undefined) {
    console[level === 'debug' ? 'log' : level](`${prefix} ${message}`);
    return;
  }

  console[level === 'debug' ? 'log' : level](`${prefix} ${message}`, meta);
}

export const logger = {
  debug: (scope: string, message: string, meta?: unknown) => emit('debug', scope, message, meta),
  info: (scope: string, message: string, meta?: unknown) => emit('info', scope, message, meta),
  warn: (scope: string, message: string, meta?: unknown) => emit('warn', scope, message, meta),
  error: (scope: string, message: string, meta?: unknown) => emit('error', scope, message, meta),
};