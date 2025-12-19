// @ts-nocheck
/*
 * This file is used as a raw string that gets passed to AudioWorklet.
 * It must be valid JavaScript that runs in the AudioWorklet context.
 * TypeScript checking is disabled for this file.
 */

class PCMProcessor extends AudioWorkletProcessor {
	constructor(options) {
		super(options);
		this.queue = [];
		this.hasSignaledPlaying = false;
		this.hasSignaledComplete = false;
		this.emptyFrameCount = 0;

		// Listen for incoming samples
		this.port.onmessage = (event) => {
			const { samples, command } = event.data;

			if (command === 'clear') {
				this.queue = [];
				this.currentBuffer = null;
				this.readIndex = 0;
				this.hasSignaledPlaying = false;
				this.hasSignaledComplete = false;
				this.emptyFrameCount = 0;
				console.log('[PCM Processor] Cleared queue');
				return;
			}

			if (command === 'ping') {
				console.log('[PCM Processor] Received ping');
				this.port.postMessage({ command: 'pong' });
				return;
			}

			if (command === 'force_play') {
				console.log('[PCM Processor] Force play requested');
				if (!this.hasSignaledPlaying && this.queue.length > 0) {
					console.log('[PCM Processor] Signaling play state');
					this.port.postMessage({ command: 'playing' });
					this.hasSignaledPlaying = true;
				}
				return;
			}

			this.hasSignaledComplete = false;

			if (samples && samples.length > 0) {
				console.log('[PCM Processor] Received samples:', samples.length);
				this.queue.push(samples);

				// Reset empty frame count when new samples arrive
				this.emptyFrameCount = 0;

				// Signal if we have data but haven't signaled yet
				if (!this.hasSignaledPlaying && this.queue.length > 0) {
					console.log('[PCM Processor] Auto-signaling play state after receiving data');
					this.port.postMessage({ command: 'playing' });
					this.hasSignaledPlaying = true;
				}
			}
		};
		this.currentBuffer = null;
		this.readIndex = 0;
		console.log('[PCM Processor] Initialized');
	}

	process(inputs, outputs, parameters) {
		const output = outputs[0];
		const channelData = output[0];

		if (!channelData) {
			return true; // Skip if no output channel available
		}

		let i = 0;
		let playing = false;

		while (i < channelData.length) {
			// If we don't have currentBuffer or we've exhausted it, get the next one
			if (!this.currentBuffer || this.readIndex >= this.currentBuffer.length) {
				this.currentBuffer = this.queue.shift();
				this.readIndex = 0;
				if (!this.currentBuffer) {
					// No data available: fill with silence
					while (i < channelData.length) {
						channelData[i++] = 0;
					}

					// If we've signaled playing, have no more data, and haven't signaled completion,
					// wait a few frames to make sure we're really done before signaling
					if (this.hasSignaledPlaying && !this.hasSignaledComplete && this.queue.length === 0) {
						this.emptyFrameCount++;

						// After 20 empty frames (about 400ms at standard buffer size),
						// we're confident playback is complete
						if (this.emptyFrameCount > 20) {
							console.log('[PCM Processor] Playback complete, signaling');
							this.port.postMessage({ command: 'complete' });
							this.hasSignaledComplete = true;
							this.emptyFrameCount = 0;
						}
					}

					return true; // Keep running
				}

				if (!playing && !this.hasSignaledPlaying) {
					console.log('[PCM Processor] Started playback, signaling');
					this.port.postMessage({ command: 'playing' });
					this.hasSignaledPlaying = true;
					playing = true;
				}

				// Reset empty frame count when we get more data
				this.emptyFrameCount = 0;
			}

			// Copy samples from currentBuffer into output
			channelData[i++] = this.currentBuffer[this.readIndex++];
		}

		return true; // Keep alive
	}
}

registerProcessor('pcm-processor', PCMProcessor);
