import { browser } from '$app/environment';
import { settings } from '$lib/data/settings.svelte';

interface SettingsBackup {
	_comment: string;
	version: string;
	timestamp: string;
	device: string;
	settings: Record<string, unknown>;
}

/**
 * Create a JSON snapshot of all current settings (excluding sync-local settings).
 */
export function createSettingsBackup(): string {
	if (!browser) return '{}';

	const backup: SettingsBackup = {
		_comment: 'Settings backup from Kagi News (news.kagi.com)',
		version: '1.0',
		timestamp: new Date().toISOString(),
		device: navigator.userAgent,
		settings: {},
	};

	for (const [key, setting] of Object.entries(settings)) {
		if (setting.category === 'sync_local') continue;
		if (!setting.shouldStore()) continue;
		backup.settings[key] = setting.currentValue;
	}

	return JSON.stringify(backup, null, 2);
}

/**
 * Download a settings backup as a JSON file.
 * If backupData is not provided, creates a fresh backup.
 */
export function downloadSettingsBackup(backupData?: string): void {
	if (!browser) return;

	const data = backupData ?? createSettingsBackup();
	const blob = new Blob([data], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `kagi-news-settings-${new Date().toISOString().split('T')[0]}.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Import settings from a backup JSON string.
 */
export function importSettingsBackup(jsonString: string): { success: boolean; message: string } {
	try {
		const backup: SettingsBackup = JSON.parse(jsonString);

		if (!backup.version || !backup.settings) {
			return { success: false, message: 'Invalid backup format' };
		}

		let importedCount = 0;
		const settingsMap = settings as Record<string, (typeof settings)[keyof typeof settings]>;

		for (const [key, value] of Object.entries(backup.settings)) {
			const setting = settingsMap[key];
			if (!setting) continue;
			if (setting.category === 'sync_local') continue;

			// biome-ignore lint/suspicious/noExplicitAny: backup values are untyped JSON
			(setting as any).currentValue = value;
			// biome-ignore lint/suspicious/noExplicitAny: backup values are untyped JSON
			(setting as any).originalValue = value;
			setting.save();
			importedCount++;
		}

		return { success: true, message: `Successfully imported ${importedCount} settings` };
	} catch (error) {
		return {
			success: false,
			message: error instanceof Error ? error.message : 'Failed to parse backup file',
		};
	}
}

/**
 * Open a file picker and import settings from the selected JSON file.
 */
export function handleSettingsImport(): Promise<{ success: boolean; message: string }> {
	return new Promise((resolve) => {
		if (!browser) {
			resolve({ success: false, message: 'Not available in server context' });
			return;
		}

		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) {
				resolve({ success: false, message: 'No file selected' });
				return;
			}
			try {
				const text = await file.text();
				resolve(importSettingsBackup(text));
			} catch {
				resolve({ success: false, message: 'Failed to read file' });
			}
		};
		input.click();
	});
}
