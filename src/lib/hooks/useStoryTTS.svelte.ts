import { playSpeech, downloadAudio, selectedVoiceStore, type SpeechState } from '$lib/client/speech-utils';
import { sections } from '$lib/stores/sections.svelte.js';
import { extractStoryText } from '$lib/utils/storyTextExtractor';
import { ttsManager } from '$lib/stores/ttsManager.svelte';

// Generate unique ID for each TTS instance
let instanceCounter = 0;
function generateInstanceId(): string {
	return `tts-${++instanceCounter}-${Date.now()}`;
}

/**
 * Composable for text-to-speech functionality
 * Handles playing and downloading audio for stories
 */
export function useStoryTTS(getStory: () => any) {
	const instanceId = generateInstanceId();

	let state = $state<SpeechState>({
		status: 'idle',
		bufferPromise: null,
		currentAudioInputContext: null,
	});

	function updateState(updates: Partial<SpeechState>) {
		state = { ...state, ...updates };
	}

	/**
	 * Get enabled sections in user's preferred order
	 */
	function getEnabledSections() {
		return sections.list.filter((section) => section.enabled).sort((a, b) => a.order - b.order);
	}

	/**
	 * Get current voice from store
	 */
	function getVoice(): string {
		let voice = 'coral';
		selectedVoiceStore.subscribe((v) => (voice = v))();
		return voice;
	}

	/**
	 * Play story as speech
	 */
	async function play() {
		// If already playing, stop
		if (state.status === 'playing' || state.status === 'loading') {
			stop();
			return;
		}

		// Register this instance with the global manager
		ttsManager.register(instanceId, stop);

		const story = getStory();
		const enabledSections = getEnabledSections();
		const text = extractStoryText(story, enabledSections);
		const language = story.sourceLanguage || 'en';
		const voice = getVoice();

		try {
			await playSpeech(text, language, voice, state, updateState);
		} catch (error) {
			console.error('TTS error:', error);
			updateState({ status: 'idle', currentAudioInputContext: null });
		} finally {
			// Unregister when playback completes or errors
			ttsManager.unregister(instanceId);
		}
	}

	/**
	 * Download story as audio file
	 */
	async function download() {
		const story = getStory();
		const enabledSections = getEnabledSections();
		const text = extractStoryText(story, enabledSections);
		const language = story.sourceLanguage || 'en';
		const voice = getVoice();

		try {
			await downloadAudio(text, language, voice, state, updateState);
		} catch (error) {
			console.error('TTS download error:', error);
		}
	}

	/**
	 * Stop playback
	 */
	function stop() {
		if (state.currentAudioInputContext) {
			state.currentAudioInputContext.close();
		}
		updateState({ status: 'idle', currentAudioInputContext: null });
		// Unregister from global manager when stopped manually
		ttsManager.unregister(instanceId);
	}

	return {
		get status() {
			return state.status;
		},
		get isPlaying() {
			return state.status === 'playing' || state.status === 'loading';
		},
		play,
		download,
		stop,
	};
}
