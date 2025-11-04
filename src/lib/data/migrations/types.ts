/**
 * Migration System Types
 */

export interface Migration {
	/** Unique identifier for this migration (e.g., 'v1_language_preferences') */
	id: string;
	/** Human-readable description */
	description: string;
	/** Run the migration */
	run: () => void;
}
