import { dev } from '$app/environment';
import pino from 'pino';

// Use SvelteKit's built-in development mode detection
const isProduction = !dev;

// Configure pino with appropriate settings for GCP Cloud Logging
const pinoConfig = {
	// In production, output structured JSON without colors or pretty formatting
	transport: isProduction
		? undefined
		: {
				target: 'pino-pretty',
				options: {
					colorize: true,
					translateTime: 'HH:MM:ss Z',
					ignore: 'pid,hostname',
				},
			},
	level: isProduction ? 'info' : 'debug',
	formatters: isProduction
		? {
				level: (label: string) => {
					return { severity: label.toUpperCase() };
				},
			}
		: undefined,
	// Remove hostname and pid in production for cleaner logs
	base: isProduction ? {} : undefined,
};

// Create the logger instance
export const logger = pino(pinoConfig);

/**
 * Log function that respects production settings for sensitive data
 *
 * @param level Log level: 'info', 'error', 'debug', 'warn', etc.
 * @param message The message to log
 * @param obj Additional data to include
 * @param sensitive Whether this contains sensitive data that shouldn't be logged in production
 */
export function log(
	level: 'info' | 'error' | 'debug' | 'warn' | 'trace',
	message: string,
	obj?: object,
	sensitive = false,
) {
	// Skip logging sensitive data in production
	if (isProduction && sensitive) {
		return;
	}

	if (obj) {
		logger[level]({ ...obj }, message);
	} else {
		logger[level](message);
	}
}

// Helper functions for common log levels
export const logInfo = (message: string, obj?: object, sensitive = false) =>
	log('info', message, obj, sensitive);

export const logError = (message: string, obj?: object, sensitive = false) =>
	log('error', message, obj, sensitive);

export const logDebug = (message: string, obj?: object, sensitive = false) =>
	log('debug', message, obj, sensitive);

export const logWarn = (message: string, obj?: object, sensitive = false) =>
	log('warn', message, obj, sensitive);
