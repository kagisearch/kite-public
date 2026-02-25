import type { ReadingLevel, SimplifiedStory } from '$lib/services/translateApi';

export interface SimplificationState {
	simplified: SimplifiedStory | null;
	selectedLevel: ReadingLevel | null;
	isLoading: boolean;
	isAutoSimplified: boolean; // Whether the current simplification was auto-triggered
}

export interface SimplificationOptions {
	/** Default reading level for auto-simplification when story expands */
	defaultLevel?: ReadingLevel;
	/** Whether auto-simplification should be triggered */
	autoSimplify?: boolean;
}

/**
 * Composable for story simplification feature
 * Handles AI-powered text simplification at different reading levels
 */
export function useStorySimplification(
	story: { headline: string; summary: string; tldr: string },
	languageCode: string,
	options: SimplificationOptions = {},
) {
	const { defaultLevel, autoSimplify = false } = options;

	const state = $state<SimplificationState>({
		simplified: null,
		selectedLevel: null,
		isLoading: false,
		isAutoSimplified: false,
	});

	// Track if auto-simplification has been triggered
	let hasAutoSimplified = $state(false);

	/**
	 * Select a reading level and simplify the story
	 * Clicking the same level again will reset to original
	 */
	async function selectLevel(level: ReadingLevel, isAuto = false) {
		// If clicking the same level, reset to original (but only for manual clicks)
		if (state.selectedLevel === level && !isAuto) {
			reset();
			return;
		}

		// Mark this level as selected and start loading
		state.selectedLevel = level;
		state.isLoading = true;
		state.isAutoSimplified = isAuto;

		try {
			// Dynamic import to avoid loading simplify code unless needed
			const { simplifyStory } = await import('$lib/services/translateApi');

			const result = await simplifyStory(story, languageCode, level);

			if (result.success && result.simplifiedStory) {
				state.simplified = result.simplifiedStory;
			} else {
				console.error('Failed to simplify story:', result.error);
				state.selectedLevel = null;
				state.isAutoSimplified = false;
			}
		} finally {
			state.isLoading = false;
		}
	}

	/**
	 * Trigger auto-simplification if configured
	 * Should be called when the story expands
	 */
	function triggerAutoSimplify() {
		if (
			autoSimplify &&
			defaultLevel &&
			defaultLevel !== 'normal' &&
			!hasAutoSimplified &&
			!state.simplified
		) {
			hasAutoSimplified = true;
			selectLevel(defaultLevel, true);
		}
	}

	/**
	 * Reset to original story
	 */
	function reset() {
		state.simplified = null;
		state.selectedLevel = null;
		state.isLoading = false;
		state.isAutoSimplified = false;
	}

	/**
	 * Get the current story to display (simplified or original)
	 */
	const current = $derived(state.simplified || story);

	return {
		get current() {
			return current;
		},
		get selectedLevel() {
			return state.selectedLevel;
		},
		get isLoading() {
			return state.isLoading;
		},
		get isAutoSimplified() {
			return state.isAutoSimplified;
		},
		get defaultLevel() {
			return defaultLevel;
		},
		selectLevel: (level: ReadingLevel) => selectLevel(level, false),
		triggerAutoSimplify,
		reset,
	};
}
