import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for conditionally joining class names together with Tailwind merge support.
 * Combines clsx for conditional classes and tailwind-merge to handle Tailwind conflicts.
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
