import pcmProcessorString from './pcm-processor.ts?raw';
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Voice options for the dropdown
export const voiceOptions = [
	{ value: 'alloy', label: 'Alloy', gender: 'F' },
	{ value: 'ash', label: 'Ash', gender: 'M' },
	{ value: 'ballad', label: 'Ballad', gender: 'M' },
	{ value: 'coral', label: 'Coral', gender: 'F' },
	{ value: 'echo', label: 'Echo', gender: 'M' },
	{ value: 'sage', label: 'Sage', gender: 'F' },
	{ value: 'shimmer', label: 'Shimmer', gender: 'F' },
	{ value: 'verse', label: 'Verse', gender: 'M' }
];

// Create a persistent store for the selected voice
function createSelectedVoiceStore() {
	// Default voice
	const DEFAULT_VOICE = 'coral';

	// Get initial value from localStorage or use default
	const initialValue = DEFAULT_VOICE;

	// Create the writable store
	const { subscribe, set, update } = writable(initialValue);

	// Return the store with a custom set function that persists to localStorage
	return {
		subscribe,
		set: (value: string) => {
			if (browser) {
				// Validate the voice
				const validVoices = voiceOptions.map((option) => option.value);
				const voiceToSet = validVoices.includes(value) ? value : DEFAULT_VOICE;

				// Save to localStorage and update the store
				set(voiceToSet);
			} else {
				set(value);
			}
		},
		update
	};
}

// Export the store
export const selectedVoiceStore = createSelectedVoiceStore();

export type SpeechState = {
	status: 'idle' | 'loading' | 'playing';
	bufferPromise: Promise<Float32Array> | null;
	downloadLoading?: boolean;
	currentAudioInputContext: AudioContext | null;
};

export async function playSpeech(
	text: string,
	language: string,
	voice: string,
	state: SpeechState,
	updateState: (updates: Partial<SpeechState>) => void
): Promise<void> {
	console.log('[Speech] Starting playback process');
	updateState({ status: 'loading' });

	if (state.currentAudioInputContext) {
		console.log('[Speech] Closing existing audio context');
		try {
			state.currentAudioInputContext.suspend();
			state.currentAudioInputContext.close();
		} catch (e) {
			console.error('[Speech] Error closing existing audio context:', e);
		}
		updateState({ currentAudioInputContext: null });
	}

	const audioInputContext = new AudioContext({ sampleRate: 24000 });

	// Fix for iOS silent switch issue - set audio session to "playback" type
	// This ensures audio plays even when the iPhone's ringer is off
	try {
		// @ts-ignore - navigator.audioSession is only available in newer iOS versions
		if (typeof navigator !== 'undefined' && navigator.audioSession) {
			// @ts-ignore
			navigator.audioSession.type = 'playback';
			console.log('[Speech] Set audio session type to playback for iOS');
		}
	} catch (e) {
		console.log('[Speech] Audio session API not available, using fallback for iOS silent switch');
	}
	console.log('[Speech] Created new AudioContext, state:', audioInputContext.state);
	updateState({ currentAudioInputContext: audioInputContext });

	// Properly resume the AudioContext and wait for it
	if (audioInputContext.state === 'suspended') {
		try {
			await audioInputContext.resume();
			console.log('[Speech] Audio context resumed, state:', audioInputContext.state);
		} catch (e) {
			console.error('[Speech] Failed to resume audio context:', e);
			// If resume fails, clean up and return
			updateState({
				status: 'idle',
				currentAudioInputContext: null
			});
			return;
		}
	}

	// Create worklet module URL and clean it up after loading
	const workletBlob = new Blob([pcmProcessorString], { type: 'application/javascript' });
	const workletUrl = URL.createObjectURL(workletBlob);
	try {
		await audioInputContext.audioWorklet.addModule(workletUrl);
		console.log('[Speech] AudioWorklet module added');
	} catch (e) {
		console.error('[Speech] Failed to add AudioWorklet module:', e);
		URL.revokeObjectURL(workletUrl);
		try {
			audioInputContext.close();
		} catch (err) {
			console.error('[Speech] Error closing audio context after worklet failure:', err);
		}
		updateState({
			status: 'idle',
			currentAudioInputContext: null
		});
		return;
	} finally {
		// Clean up the object URL to prevent memory leak
		URL.revokeObjectURL(workletUrl);
	}

	const workletNode = new AudioWorkletNode(audioInputContext, 'pcm-processor');
	workletNode.connect(audioInputContext.destination);
	console.log('[Speech] Worklet node created and connected');

	// CACHING DISABLED - always fetch fresh audio
	// if (state.bufferPromise) {
	// 	console.log('[Speech] Using cached buffer');
	// 	let buffer: Float32Array;
	//
	// 	try {
	// 		buffer = await state.bufferPromise;
	// 	} catch (e) {
	// 		console.error('[Speech] Cached buffer promise was rejected:', e);
	// 		// Clear the rejected promise and clean up
	// 		updateState({ bufferPromise: null });
	// 		try {
	// 			workletNode.disconnect();
	// 			workletNode.port.close();
	// 		} catch (err) {
	// 			console.error('[Speech] Error disconnecting worklet:', err);
	// 		}
	// 		try {
	// 			audioInputContext.close();
	// 		} catch (err) {
	// 			console.error('[Speech] Error closing audio context:', err);
	// 		}
	// 		updateState({
	// 			status: 'idle',
	// 			currentAudioInputContext: null
	// 		});
	// 		return;
	// 	}
	//
	// 	console.log('[Speech] Buffer length:', buffer.length);
	//
	// 	// Debug: Check for corrupted samples in cached buffer
	// 	let corruptedCount = 0;
	// 	for (let i = 0; i < Math.min(1000, buffer.length); i++) {
	// 		if (Math.abs(buffer[i]) > 0.99) {
	// 			corruptedCount++;
	// 		}
	// 	}
	// 	if (corruptedCount > 100) {
	// 		console.error('[Speech] CACHED BUFFER CORRUPTED - ', corruptedCount, 'clipped samples in first 1000');
	// 		console.log('[Speech] First 20 cached samples:', Array.from(buffer.slice(0, 20)));
	// 	} else {
	// 		console.log('[Speech] Cached buffer looks clean, first 20 samples:', Array.from(buffer.slice(0, 20)));
	// 	}
	//
	// 	workletNode.port.postMessage({ samples: buffer });
	// 	console.log('[Speech] Sent buffer to worklet');
	//
	// 	// Create a new, simplified message handler that only handles essential events
	// 	workletNode.port.onmessage = (e) => {
	// 		console.log('[Speech] Received message from worklet:', e.data);
	//
	// 		if (e.data.command === 'playing') {
	// 			console.log('[Speech] Worklet playing - setting status to PLAYING');
	// 			updateState({ status: 'playing' });
	// 		} else if (e.data.command === 'complete') {
	// 			console.log('[Speech] Worklet completed - setting status to IDLE');
	//
	// 			// Disconnect and clean up worklet
	// 			try {
	// 				workletNode.disconnect();
	// 				workletNode.port.close();
	// 			} catch (e) {
	// 				console.error('[Speech] Error disconnecting worklet:', e);
	// 			}
	//
	// 			// Close the audio context
	// 			try {
	// 				audioInputContext.suspend();
	// 				audioInputContext.close();
	// 			} catch (e) {
	// 				console.error('[Speech] Error closing audio context:', e);
	// 			}
	//
	// 			// Directly set status to idle - IMPORTANT: This must be executed
	// 			updateState({
	// 				status: 'idle',
	// 				currentAudioInputContext: null
	// 			});
	//
	// 			console.log('[Speech] Status should now be IDLE');
	// 		}
	// 	};
	//
	// 	return;
	// }

	console.log('[Speech] Fetching fresh audio (caching disabled)');
	let bufferResolve: (buffer: Float32Array) => void;
	let bufferReject: (error: Error) => void;
	const bufferPromise = new Promise<Float32Array>((resolve, reject) => {
		bufferResolve = resolve;
		bufferReject = reject;
	});
	// Don't save to state - caching disabled
	// updateState({ bufferPromise });

	const chunks: Float32Array[] = [];
	let totalLength = 0;

	const url = new URL('/api/speech', window.location.origin);

	// Enable debug mode to log raw API data (set to false in production)
	const DEBUG_TTS = true; // Set to true to enable server-side logging

	console.log('[Speech] Fetching audio via POST, text length:', text.length);
	const res = await fetch(url.href, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			text,
			language,
			voice,
			raw: true,
			debug: DEBUG_TTS
		})
	});
	console.log('[Speech] Fetch response received');

	try {
		// Check for HTTP errors
		if (!res.ok) {
			throw new Error(`HTTP error! status: ${res.status}`);
		}

		if (!res.body) {
			throw new Error('Response body is null');
		}

		// Set up the message handler before starting to stream
		workletNode.port.onmessage = (e) => {
			console.log('[Speech] Received message from worklet in streaming mode:', e.data);

			if (e.data.command === 'playing') {
				console.log('[Speech] Worklet playing - setting status to PLAYING');
				updateState({ status: 'playing' });
			} else if (e.data.command === 'complete') {
				console.log('[Speech] Worklet completed - setting status to IDLE');

				// Disconnect and clean up worklet
				try {
					workletNode.disconnect();
					workletNode.port.close();
				} catch (e) {
					console.error('[Speech] Error disconnecting worklet:', e);
				}

				// Close the audio context
				try {
					audioInputContext.suspend();
					audioInputContext.close();
				} catch (e) {
					console.error('[Speech] Error closing audio context:', e);
				}

				// Directly set status to idle - IMPORTANT: This must be executed
				updateState({
					status: 'idle',
					currentAudioInputContext: null
				});

				console.log('[Speech] Status should now be IDLE');
			}
		};

		// Force worklet to respond when samples are received
		workletNode.port.postMessage({ command: 'ping' });

		const reader = res.body.getReader();
		console.log('[Speech] Got reader from response body');

		let leftoverByte = null;
		let length = 0;
		let chunkCount = 0;
		let hasStartedPlayback = false;

		let startTime = 0;

		while (true) {
			const { value, done } = await reader.read();
			if (done) {
				console.log('[Speech] Stream reading complete, processed', chunkCount, 'chunks');
				break;
			}

			if (!value || value.byteLength === 0) {
				console.warn('[Speech] Received empty chunk, skipping');
				continue;
			}

			chunkCount++;

			if (!startTime) {
				console.log(
					'[Speech] First audio chunk received (chunk size:',
					value?.byteLength || 0,
					'bytes)'
				);
				// Log first bytes to detect UTF-8 corruption
				console.log('[Speech] First 40 raw bytes from stream:', Array.from(value.slice(0, 40)));
				startTime = audioInputContext.currentTime;
			}

			// Only log occasionally to avoid console spam
			if (chunkCount % 10 === 0) {
				console.log(
					`[Speech] Processing chunk #${chunkCount}, size:`,
					value?.byteLength || 0,
					'bytes'
				);
			}

			let buffer;

			if (leftoverByte !== null) {
				// Prepend the leftover byte to the current chunk
				buffer = new Uint8Array(value.byteLength + 1);
				buffer[0] = leftoverByte;
				buffer.set(value, 1);
				leftoverByte = null;
			} else {
				buffer = value;
			}

			// Check if there's an odd number of bytes
			if (buffer.byteLength % 2 !== 0) {
				// Save the last byte for the next iteration
				leftoverByte = buffer[buffer.byteLength - 1];
				buffer = buffer.slice(0, -1); // Remove the last byte
			}

			length += buffer.byteLength;

			// Convert PCM16 to Float32 safely without alignment issues
			// Read bytes directly and combine them into 16-bit samples
			const floatSamples = new Float32Array(buffer.byteLength / 2);
			let hasClipping = false;
			let clipCount = 0;

			for (let i = 0; i < floatSamples.length; i++) {
				const byteIndex = i * 2;
				// Read two bytes and combine into signed 16-bit integer (little-endian)
				const int16 = buffer[byteIndex] | (buffer[byteIndex + 1] << 8);
				// Convert to signed value (-32768 to 32767)
				const signed = int16 > 32767 ? int16 - 65536 : int16;
				// Normalize to -1.0 to 1.0
				floatSamples[i] = signed / 32768;

				// Detect clipping/corruption
				if (Math.abs(floatSamples[i]) > 0.99) {
					clipCount++;
					if (clipCount > 100 && i < 1000) {
						hasClipping = true;
					}
				}
			}

			// Log if chunk looks corrupted (lots of clipping early on)
			if (hasClipping && chunkCount <= 5) {
				console.error(`[Speech] Chunk #${chunkCount} appears corrupted - ${clipCount} clipped samples`);
				console.log('[Speech] Raw bytes (first 40):', Array.from(buffer.slice(0, 40)));
				console.log('[Speech] Converted samples (first 20):', Array.from(floatSamples.slice(0, 20)));
			}

			// Collect chunks efficiently
			chunks.push(floatSamples);
			totalLength += floatSamples.length;

			// Send samples to worklet (use local audioInputContext reference to avoid reactivity issues)
			workletNode.port.postMessage({ samples: floatSamples });

			// Start playing immediately after first chunk with substantial data
			if (!hasStartedPlayback && floatSamples.length > 1000) {
				console.log(
					`[Speech] Starting streaming playback on chunk #${chunkCount} with ${floatSamples.length} samples`
				);
				updateState({ status: 'playing' });
				hasStartedPlayback = true;
			}

			// Only log occasionally to avoid console spam
			if (chunkCount % 20 === 0) {
				console.log(
					`[Speech] Streaming progress: chunk #${chunkCount}, total samples:`,
					totalLength
				);
			}
		}

		// Handle leftover byte at end of stream
		if (leftoverByte !== null) {
			console.warn('[Speech] Stream ended with leftover byte, audio may be truncated by 1 sample');
		}

		// Efficiently concatenate all chunks into final buffer
		const totalBuffer = new Float32Array(totalLength);
		let offset = 0;
		for (const chunk of chunks) {
			totalBuffer.set(chunk, offset);
			offset += chunk.length;
		}

		// @ts-ignore - bufferResolve is guaranteed to be defined at this point
		bufferResolve(totalBuffer);
		console.log('[Speech] All chunks processed. Total samples:', totalBuffer.length);

		const duration = length / 24000 / 2;
		console.log('[Speech] Calculated audio duration:', duration.toFixed(2), 'seconds');

		console.log('[Speech] Audio streaming completed');

		// Note: No need for a timeout - the worklet will signal when playback is complete
	} catch (e) {
		console.error('[Speech] Error during playback:', e);

		// Reject the buffer promise if it exists
		// @ts-ignore - bufferReject is guaranteed to be defined if we're in streaming mode
		if (bufferReject) {
			bufferReject(e instanceof Error ? e : new Error(String(e)));
		}

		// Clean up on error - disconnect worklet first
		try {
			workletNode.disconnect();
			workletNode.port.close();
		} catch (err) {
			console.error('[Speech] Error disconnecting worklet on error:', err);
		}

		try {
			audioInputContext.suspend();
			audioInputContext.close();
		} catch (err) {
			console.error('[Speech] Error closing audio context on error:', err);
		}

		updateState({
			bufferPromise: null,
			status: 'idle',
			currentAudioInputContext: null
		});
	}
}

export async function downloadAudio(
	text: string,
	language: string,
	voice: string,
	state: SpeechState,
	updateState: (updates: Partial<SpeechState>) => void
): Promise<void> {
	updateState({ downloadLoading: true });

	try {
		// CACHING DISABLED - always fetch fresh
		// if (state.bufferPromise) {
		// 	// If we already have the audio data, download it immediately
		// 	try {
		// 		const buffer = await state.bufferPromise;
		// 		await triggerDownload(buffer, language, voice);
		// 		return;
		// 	} catch (e) {
		// 		console.error('[Download] Cached buffer promise was rejected:', e);
		// 		// Clear the rejected promise and continue to fetch fresh
		// 		updateState({ bufferPromise: null });
		// 		// Fall through to fetch new audio
		// 	}
		// }

		// Fetch the audio data without playing it
		const url = new URL('/api/speech', window.location.origin);

		const res = await fetch(url.href, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				text,
				language,
				voice,
				raw: true
			})
		});

		if (!res.ok) {
			throw new Error(`HTTP error! status: ${res.status}`);
		}

		if (!res.body) {
			throw new Error('Response body is null');
		}

		const reader = res.body.getReader();
		const chunks: Float32Array[] = [];
		let totalLength = 0;
		let leftoverByte = null;

		while (true) {
			const { value, done } = await reader.read();
			if (done) break;

			if (!value || value.byteLength === 0) {
				console.warn('[Download] Received empty chunk, skipping');
				continue;
			}

			let buffer;

			if (leftoverByte !== null) {
				buffer = new Uint8Array(value.byteLength + 1);
				buffer[0] = leftoverByte;
				buffer.set(value, 1);
				leftoverByte = null;
			} else {
				buffer = value;
			}

			if (buffer.byteLength % 2 !== 0) {
				leftoverByte = buffer[buffer.byteLength - 1];
				buffer = buffer.slice(0, -1);
			}

			// Convert PCM16 to Float32 safely without alignment issues
			// Read bytes directly and combine them into 16-bit samples
			const floatSamples = new Float32Array(buffer.byteLength / 2);
			for (let i = 0; i < floatSamples.length; i++) {
				const byteIndex = i * 2;
				// Read two bytes and combine into signed 16-bit integer (little-endian)
				const int16 = buffer[byteIndex] | (buffer[byteIndex + 1] << 8);
				// Convert to signed value (-32768 to 32767)
				const signed = int16 > 32767 ? int16 - 65536 : int16;
				// Normalize to -1.0 to 1.0
				floatSamples[i] = signed / 32768;
			}

			chunks.push(floatSamples);
			totalLength += floatSamples.length;
		}

		// Handle leftover byte at end of stream
		if (leftoverByte !== null) {
			console.warn('[Download] Stream ended with leftover byte, audio may be truncated by 1 sample');
		}

		// Efficiently concatenate all chunks
		const totalBuffer = new Float32Array(totalLength);
		let offset = 0;
		for (const chunk of chunks) {
			totalBuffer.set(chunk, offset);
			offset += chunk.length;
		}

		// CACHING DISABLED - don't save buffer
		// const bufferPromise = Promise.resolve(totalBuffer);
		// updateState({ bufferPromise });

		// Trigger download
		await triggerDownload(totalBuffer, language, voice);
	} catch (error) {
		console.error('Error downloading audio:', error);
		throw error;
	} finally {
		updateState({ downloadLoading: false });
	}
}

export async function triggerDownload(
	buffer: Float32Array,
	language: string,
	voice: string
): Promise<void> {
	const audioContext = new AudioContext({ sampleRate: 24000 });

	try {
		const audioBuffer = audioContext.createBuffer(1, buffer.length, 24000);

		// Copy buffer to audio channel
		// Create a new Float32Array backed by a regular ArrayBuffer to satisfy TypeScript
		const channelData = new Float32Array(buffer.length);
		channelData.set(buffer);
		audioBuffer.copyToChannel(channelData, 0);

		// Convert to WAV
		const wavBuffer = bufferToWav(audioBuffer);

		// Create download link
		const blob = new Blob([wavBuffer], { type: 'audio/wav' });
		const url = URL.createObjectURL(blob);

		// Create and click download link
		const a = document.createElement('a');
		a.href = url;
		a.download = `speech-${language}-${voice}-${Date.now()}.wav`;
		document.body.appendChild(a);
		a.click();

		// Clean up
		setTimeout(() => {
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}, 100);
	} catch (error) {
		console.error('Error creating download:', error);
		throw error;
	} finally {
		// Always close the AudioContext to prevent memory leak
		try {
			audioContext.close();
		} catch (e) {
			console.error('Error closing AudioContext in triggerDownload:', e);
		}
	}
}

// Function to convert AudioBuffer to WAV
function bufferToWav(audioBuffer: AudioBuffer): ArrayBuffer {
	const numOfChan = audioBuffer.numberOfChannels;
	const length = audioBuffer.length * numOfChan * 2;
	const buffer = new ArrayBuffer(44 + length);
	const view = new DataView(buffer);
	const channels = [];
	let sample,
		pos = 0;

	// Write WAV header
	writeString(view, 0, 'RIFF');
	view.setUint32(4, 36 + length, true);
	writeString(view, 8, 'WAVE');
	writeString(view, 12, 'fmt ');
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, numOfChan, true);
	view.setUint32(24, audioBuffer.sampleRate, true);
	view.setUint32(28, audioBuffer.sampleRate * 2 * numOfChan, true);
	view.setUint16(32, numOfChan * 2, true);
	view.setUint16(34, 16, true);
	writeString(view, 36, 'data');
	view.setUint32(40, length, true);

	// Write interleaved data
	for (let i = 0; i < numOfChan; i++) {
		channels.push(audioBuffer.getChannelData(i));
	}

	pos = 44;
	while (pos < 44 + length) {
		for (let i = 0; i < numOfChan; i++) {
			sample = Math.max(-1, Math.min(1, channels[i][(pos - 44) / 2 / numOfChan]));
			sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
			view.setInt16(pos, sample, true);
			pos += 2;
		}
	}

	return buffer;
}

function writeString(view: DataView, offset: number, string: string): void {
	for (let i = 0; i < string.length; i++) {
		view.setUint8(offset + i, string.charCodeAt(i));
	}
}
