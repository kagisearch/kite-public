import { type ReadingLevel } from '$lib/services/translateApi';

export interface SimplificationState {
	simplified: any | null;
	selectedLevel: ReadingLevel | null;
	isLoading: boolean;
}

/**
 * Composable for story simplification feature
 * Handles AI-powered text simplification at different reading levels
 */
export function useStorySimplification(story: any, languageCode: string) {
	let state = $state<SimplificationState>({
		simplified: null,
		selectedLevel: null,
		isLoading: false,
	});

	/**
	 * Select a reading level and simplify the story
	 * Clicking the same level again will reset to original
	 */
	async function selectLevel(level: ReadingLevel) {
		// If clicking the same level, reset to original
		if (state.selectedLevel === level) {
			reset();
			return;
		}

		// Mark this level as selected and start loading
		state.selectedLevel = level;
		state.isLoading = true;

		try {
			// Dynamic import to avoid loading simplify code unless needed
			const { simplifyStory } = await import('$lib/services/translateApi');

			const result = await simplifyStory(story, languageCode, level);

			if (result.success && result.simplifiedStory) {
				state.simplified = result.simplifiedStory;
			} else {
				console.error('Failed to simplify story:', result.error);
				state.selectedLevel = null;
			}
		} finally {
			state.isLoading = false;
		}
	}

	/**
	 * Reset to original story
	 */
	function reset() {
		state.simplified = null;
		state.selectedLevel = null;
		state.isLoading = false;
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
		selectLevel,
		reset,
	};
}
