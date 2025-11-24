/**
 * Conditional Logger Utility
 *
 * Provides logging functions that respect the NODE_ENV environment variable.
 * In production, logs are suppressed to improve performance and reduce noise.
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Logger interface for consistent logging across the application
 */
export const logger = {
  /**
   * Log informational messages (only in development)
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log informational messages (only in development)
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * Log warning messages (in both development and production)
   */
  warn: (...args: any[]) => {
    console.warn(...args);
  },

  /**
   * Log error messages (always logged)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Log debug messages (only in development)
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Log with emoji prefix for better visual scanning (only in development)
   */
  emoji: (emoji: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(emoji, ...args);
    }
  },

  /**
   * Check if development mode is enabled
   */
  isDevelopment: () => isDevelopment,

  /**
   * Check if production mode is enabled
   */
  isProduction: () => isProduction,
};

export default logger;
