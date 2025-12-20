/**
 * Global TTS Manager
 * Tracks all active TTS instances and provides a way to stop them all at once
 */

type TTSInstance = {
	id: string;
	stop: () => void;
};

class TTSManager {
	private instances = $state<Map<string, TTSInstance>>(new Map());

	/**
	 * Register a TTS instance
	 */
	register(id: string, stop: () => void) {
		this.instances.set(id, { id, stop });
	}

	/**
	 * Unregister a TTS instance
	 */
	unregister(id: string) {
		this.instances.delete(id);
	}

	/**
	 * Stop all active TTS instances
	 */
	stopAll() {
		console.log('[TTSManager] Stopping all TTS instances:', this.instances.size);
		for (const instance of this.instances.values()) {
			try {
				instance.stop();
			} catch (error) {
				console.error('[TTSManager] Error stopping TTS instance:', error);
			}
		}
	}

	/**
	 * Check if any TTS is currently playing
	 */
	get hasActiveTTS() {
		return this.instances.size > 0;
	}

	/**
	 * Get number of active TTS instances
	 */
	get activeCount() {
		return this.instances.size;
	}
}

// Export singleton instance
export const ttsManager = new TTSManager();
