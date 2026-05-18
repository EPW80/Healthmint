const isDev = process.env.NODE_ENV !== "production";

const logger = {
  log: (...args) => isDev && console.log(...args),
  info: (...args) => isDev && console.info(...args),
  warn: (...args) => isDev && console.warn(...args),
  // Errors always surface regardless of environment
  error: (...args) => console.error(...args),
  debug: (...args) => isDev && console.debug(...args),
};

export default logger;
