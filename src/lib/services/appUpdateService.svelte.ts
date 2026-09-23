/**
 * Service for detecting app version updates (KNEWS-261)
 * Uses SvelteKit's built-in version polling to detect new deployments.
 * Mirrors the update banner pattern from Kagi Translate.
 */
import { browser } from '$app/environment';
import { updated } from '$app/state';

const UPDATE_DISMISS_KEY = 'update_banner_dismissed_at';
const UPDATE_COOLDOWN = 30 * 60 * 1000; // 30 minutes

class AppUpdateService {
	available = $state(false);
	dismissed = $state(false);

	private cleanup: (() => void) | null = null;

	get visible() {
		return this.available && !this.dismissed && !this.isUpdateCoolingDown();
	}

	start(): void {
		if (!browser) return;

		this.cleanup = $effect.root(() => {
			$effect(() => {
				if (updated.current) {
					this.available = true;
				}
			});
		});
	}

	dismiss(): void {
		this.dismissed = true;
		try {
			localStorage.setItem(UPDATE_DISMISS_KEY, String(Date.now()));
		} catch {}
	}

	private isUpdateCoolingDown(): boolean {
		try {
			const dismissedAt = localStorage.getItem(UPDATE_DISMISS_KEY);
			if (!dismissedAt) return false;
			return Date.now() - Number(dismissedAt) < UPDATE_COOLDOWN;
		} catch {
			return false;
		}
	}

	stop(): void {
		this.cleanup?.();
		this.cleanup = null;
		this.available = false;
		this.dismissed = false;
	}
}

export const appUpdateService = new AppUpdateService();
