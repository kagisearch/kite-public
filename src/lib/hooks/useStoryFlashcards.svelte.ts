import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type { Story } from '$lib/types';
import { generateAnkiCSV } from '$lib/utils/csv';
import { downloadCSV } from '$lib/utils/download';

export interface FlashcardState {
	enabled: boolean;
	selectedWords: SvelteSet<string>;
	selectedPhrases: SvelteMap<string, { phrase: string; sections: Set<string> }>;
	wordContext: Map<string, Set<string>>; // word -> sections it appears in
	shouldJiggle: boolean;
	isExporting: boolean;
	exportedCSV: { content: string; filename: string } | null;
}

/**
 * Composable for vocabulary flashcard generation
 * Allows selecting words/phrases and exporting to Anki CSV format
 */
export function useStoryFlashcards(story: Story, languageCode: string) {
	const state = $state<FlashcardState>({
		enabled: false,
		selectedWords: new SvelteSet<string>(),
		selectedPhrases: new SvelteMap<string, { phrase: string; sections: Set<string> }>(),
		wordContext: new Map(),
		shouldJiggle: false,
		isExporting: false,
		exportedCSV: null,
	});

	/**
	 * Toggle flashcard mode on/off
	 */
	function toggle() {
		// If we have exported CSV, reset everything
		if (state.exportedCSV) {
			reset();
			return;
		}

		state.enabled = !state.enabled;

		if (state.enabled) {
			// Trigger jiggle animation to draw attention
			state.shouldJiggle = true;
			setTimeout(() => {
				state.shouldJiggle = false;
			}, 200);
		} else {
			// Reset selection when exiting mode
			clearSelection();
		}
	}

	/**
	 * Handle word/phrase selection
	 */
	function selectWord(word: string, section?: string) {
		if (!state.enabled) return;

		const isPhrase = word.includes(' ');

		if (isPhrase) {
			// Handle phrase selection
			if (state.selectedPhrases.has(word)) {
				state.selectedPhrases.delete(word);
			} else {
				const sections = section ? new Set([section]) : new Set<string>();
				state.selectedPhrases.set(word, { phrase: word, sections });
			}
		} else {
			// Handle single word selection
			if (state.selectedWords.has(word)) {
				state.selectedWords.delete(word);
				state.wordContext.delete(word);
			} else {
				state.selectedWords.add(word);

				// Track which section this word came from
				if (section) {
					if (!state.wordContext.has(word)) {
						state.wordContext.set(word, new Set());
					}
					state.wordContext.get(word)!.add(section);
				}
			}
		}
	}

	/**
	 * Export selected words as flashcards
	 */
	async function exportFlashcards() {
		if ((state.selectedWords.size === 0 && state.selectedPhrases.size === 0) || state.isExporting) {
			return;
		}

		state.isExporting = true;

		try {
			// Collect all words and phrases
			const words = [
				...Array.from(state.selectedWords),
				...Array.from(state.selectedPhrases.values()).map((p) => p.phrase),
			];

			// Extract section context for selected words and phrases
			const contextSections: Record<string, unknown> = {};

			// Add context from single words
			const storyRecord = story as unknown as Record<string, unknown>;
			for (const [_word, sections] of state.wordContext.entries()) {
				for (const sectionName of sections) {
					if (storyRecord[sectionName]) {
						contextSections[sectionName] = storyRecord[sectionName];
					}
				}
			}

			// Add context from phrases
			for (const [_phraseKey, phraseData] of state.selectedPhrases.entries()) {
				for (const sectionName of phraseData.sections) {
					if (storyRecord[sectionName]) {
						contextSections[sectionName] = storyRecord[sectionName];
					}
				}
			}

			// Call API to get definitions
			const response = await fetch('/api/vocabulary', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					words,
					language: languageCode,
					context: contextSections,
				}),
			});

			if (!response.ok) {
				console.error('Failed to fetch vocabulary definitions');
				return;
			}

			const data = await response.json();

			// Generate CSV content
			const csvContent = generateAnkiCSV(data.vocabulary);
			const filename = `flashcards-${story.title.substring(0, 30)}.csv`;

			// Store CSV for download
			state.exportedCSV = { content: csvContent, filename };
		} catch (error) {
			console.error('Error exporting flashcards:', error);
		} finally {
			state.isExporting = false;
		}
	}

	/**
	 * Download the exported CSV file
	 */
	function download() {
		if (!state.exportedCSV) return;

		downloadCSV(state.exportedCSV.content, state.exportedCSV.filename);

		// Reset everything after download
		reset();
	}

	/**
	 * Clear selected words/phrases
	 */
	function clearSelection() {
		state.selectedWords.clear();
		state.selectedPhrases.clear();
		state.wordContext.clear();
		state.exportedCSV = null;
	}

	/**
	 * Reset all flashcard state
	 */
	function reset() {
		state.enabled = false;
		clearSelection();
		state.isExporting = false;
	}

	return {
		get enabled() {
			return state.enabled;
		},
		get selectedWords() {
			return state.selectedWords;
		},
		get selectedPhrases() {
			return state.selectedPhrases;
		},
		get shouldJiggle() {
			return state.shouldJiggle;
		},
		get isExporting() {
			return state.isExporting;
		},
		get exportedCSV() {
			return state.exportedCSV;
		},
		get selectedCount() {
			return state.selectedWords.size + state.selectedPhrases.size;
		},
		toggle,
		selectWord,
		exportFlashcards,
		download,
		reset,
	};
}
