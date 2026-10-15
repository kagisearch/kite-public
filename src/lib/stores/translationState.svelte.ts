/**
 * Reactive store for tracking on-demand translation state.
 *
 * Manages SSE connections for streaming translations and provides
 * reactive access to translated fields as they arrive.
 *
 * Uses Svelte 5's SvelteMap so set/delete/clear are reactive — a plain Map
 * inside $state is not deep-proxied and mutations don't notify consumers,
 * which would freeze the UI mid-stream.
 */
import { SvelteMap } from 'svelte/reactivity';

interface TranslationEntry {
	languageCode: string;
	status: 'connecting' | 'translating' | 'complete' | 'error';
	/** Translated fields received so far (snake_case keys matching API response) */
	fields: Record<string, unknown>;
	eventSource: EventSource | null;
	errorMessage?: string;
}

interface TranslationState {
	/** Active translations keyed by clusterId */
	activeTranslations: SvelteMap<string, TranslationEntry>;
}

const state: TranslationState = {
	activeTranslations: new SvelteMap(),
};

/**
 * Start an on-demand translation for a story.
 * Opens an SSE connection and populates fields reactively as they arrive.
 *
 * @param onSettled - Optional callback fired exactly once when the translation
 *   reaches a terminal state (complete or error). Used by prefetch to chain
 *   translations without polling.
 */
function startTranslation(clusterId: string, languageCode: string, onSettled?: () => void): void {
	// Don't reopen an SSE connection for a translation that is in flight or already
	// finished — re-expanding a completed story would otherwise drop the cached
	// fields and re-fetch them (now hitting the SSE fast path, but still wasteful
	// and visually disruptive while the new EventSource handshakes).
	const existing = state.activeTranslations.get(clusterId);
	if (existing && existing.languageCode === languageCode) {
		if (
			existing.status === 'translating' ||
			existing.status === 'connecting' ||
			existing.status === 'complete'
		) {
			return;
		}
	}

	const entry: TranslationEntry = {
		languageCode,
		status: 'connecting',
		fields: {},
		eventSource: null,
	};

	state.activeTranslations.set(clusterId, entry);

	const url = `/api/sse/translate/${clusterId}?lang=${encodeURIComponent(languageCode)}`;
	const eventSource = new EventSource(url);
	entry.eventSource = eventSource;

	let settled = false;
	const fireSettled = () => {
		if (settled) return;
		settled = true;
		onSettled?.();
	};

	eventSource.addEventListener('connected', () => {
		entry.status = 'translating';
	});

	eventSource.addEventListener('field', (event: MessageEvent) => {
		try {
			const data = JSON.parse(event.data) as { field: string; value: unknown };
			// New `fields` object reference per event. A plain mutation
			// (`entry.fields[k] = v`) keeps the reference identical, so
			// `$derived(translationState.getFields(...))` re-runs but returns
			// the same object reference — Svelte 5 treats that as unchanged
			// and downstream consumers like `displayStory` never re-render
			// during the stream. Spread forces a new reference per event.
			entry.fields = { ...entry.fields, [data.field]: data.value };
			state.activeTranslations.set(clusterId, { ...entry });
		} catch {
			// Ignore parse errors
		}
	});

	eventSource.addEventListener('complete', () => {
		entry.status = 'complete';
		// Same reasoning as the field handler: fresh `fields` reference so
		// the final displayStory derive sees the change.
		entry.fields = { ...entry.fields };
		state.activeTranslations.set(clusterId, { ...entry });
		eventSource.close();
		entry.eventSource = null;
		fireSettled();
	});

	eventSource.addEventListener('error', (event: Event) => {
		// Check if it's a server-sent error event or a connection error
		if (event instanceof MessageEvent) {
			try {
				const data = JSON.parse(event.data) as { error: string };
				entry.errorMessage = data.error;
			} catch {
				entry.errorMessage = 'Translation failed';
			}
		}

		// EventSource will auto-reconnect on connection errors,
		// but if readyState is CLOSED, it won't
		if (eventSource.readyState === EventSource.CLOSED) {
			entry.status = 'error';
			entry.errorMessage = entry.errorMessage || 'Connection lost';
			state.activeTranslations.set(clusterId, { ...entry });
			entry.eventSource = null;
			fireSettled();
		}
	});
}

/**
 * Get the current translation status for a cluster.
 */
function getStatus(clusterId: string): TranslationEntry['status'] | null {
	return state.activeTranslations.get(clusterId)?.status ?? null;
}

/**
 * Get all translated fields received so far for a cluster.
 * Returns empty object if no translation is active.
 */
function getFields(clusterId: string): Record<string, unknown> {
	return state.activeTranslations.get(clusterId)?.fields ?? {};
}

/**
 * Check if a translation is actively in progress.
 */
function isTranslating(clusterId: string): boolean {
	const entry = state.activeTranslations.get(clusterId);
	return entry?.status === 'translating' || entry?.status === 'connecting';
}

/**
 * Check if a translation has completed.
 */
function isComplete(clusterId: string): boolean {
	return state.activeTranslations.get(clusterId)?.status === 'complete';
}

/**
 * Close an active translation SSE connection and remove it from state.
 */
function cleanup(clusterId: string): void {
	const entry = state.activeTranslations.get(clusterId);
	if (entry?.eventSource) {
		entry.eventSource.close();
	}
	state.activeTranslations.delete(clusterId);
}

/**
 * Close all active translations.
 */
function cleanupAll(): void {
	for (const [_id, entry] of state.activeTranslations) {
		if (entry.eventSource) {
			entry.eventSource.close();
		}
	}
	state.activeTranslations.clear();
}

/**
 * Queue background translations for a list of cluster IDs.
 * Translates one at a time to avoid overwhelming the server.
 */
async function prefetchTranslations(clusterIds: string[], languageCode: string): Promise<void> {
	for (const clusterId of clusterIds) {
		// Skip if already translated or in progress
		if (state.activeTranslations.has(clusterId)) continue;

		// Wait for the SSE complete/error event before moving to the next story,
		// with a 2-minute fallback in case the connection silently stalls.
		await new Promise<void>((resolve) => {
			let resolved = false;
			const finish = () => {
				if (resolved) return;
				resolved = true;
				clearTimeout(timeoutId);
				resolve();
			};

			const timeoutId = setTimeout(finish, 120_000);
			startTranslation(clusterId, languageCode, finish);
		});
	}
}

export const translationState = {
	get activeTranslations() {
		return state.activeTranslations;
	},
	startTranslation,
	getStatus,
	getFields,
	isTranslating,
	isComplete,
	cleanup,
	cleanupAll,
	prefetchTranslations,
};
