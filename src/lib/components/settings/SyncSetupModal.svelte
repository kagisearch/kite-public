<script lang="ts">
import { IconArrowUp, IconArrowDown, IconArrowsExchange, IconLoader2 } from '@tabler/icons-svelte';
import BaseModal from '$lib/components/BaseModal.svelte';
import { s } from '$lib/client/localization.svelte';
import { downloadSettingsBackup } from '$lib/client/settings-backup';
import { syncManager } from '$lib/client/sync-manager';
import { settings } from '$lib/data/settings.svelte';
import { safeSetItem, safeRemoveItem } from '$lib/client/utils/safe-storage';

interface Props {
	isOpen: boolean;
	onClose: () => void;
	onComplete: () => void;
	remoteSettings: Array<{ settingKey: string; settingValue: unknown }>;
}

let { isOpen, onClose, onComplete, remoteSettings }: Props = $props();

type Step = 'choose' | 'syncing' | 'done' | 'error';
let step = $state<Step>('choose');
let syncingLabel = $state('');
let errorMessage = $state('');

async function pushLocal() {
	step = 'syncing';
	syncingLabel = s('syncSetup.syncing.pushing') || 'Uploading your settings...';
	try {
		// Backup before overwriting remote
		downloadSettingsBackup();

		// Clear remote, then push all local
		await fetch('/api/sync/clear', { method: 'POST', credentials: 'include' });
		await syncManager.sync(true, true);

		step = 'done';
		setTimeout(() => {
			onComplete();
		}, 1200);
	} catch (e) {
		errorMessage = e instanceof Error ? e.message : 'Sync failed';
		step = 'error';
	}
}

async function pullRemote() {
	step = 'syncing';
	syncingLabel = s('syncSetup.syncing.pulling') || 'Downloading cloud settings...';
	try {
		// Backup local before overwriting
		downloadSettingsBackup();

		// Apply remote settings to local
		const settingsMap = settings as Record<string, (typeof settings)[keyof typeof settings]>;
		for (const remote of remoteSettings) {
			const key = remote.settingKey;
			const value = remote.settingValue;

			if (value === null) {
				safeRemoveItem(key);
			} else if (typeof value === 'string') {
				safeSetItem(key, value);
			} else {
				safeSetItem(key, JSON.stringify(value));
			}

			// Also update Setting objects so UI reflects changes
			for (const setting of Object.values(settingsMap)) {
				if (setting.key === key) {
					(setting as any).currentValue = typeof value === 'string' ? tryParse(value) : value;
					(setting as any).originalValue = (setting as any).currentValue;
					break;
				}
			}
		}

		// Now push the merged state to server so it's in sync
		await syncManager.sync(true, true);

		step = 'done';
		setTimeout(() => {
			onComplete();
		}, 1200);
	} catch (e) {
		errorMessage = e instanceof Error ? e.message : 'Sync failed';
		step = 'error';
	}
}

async function merge() {
	step = 'syncing';
	syncingLabel = s('syncSetup.syncing.merging') || 'Merging settings...';
	try {
		// Just push local — server merges via LWW, local wins ties,
		// remote-only settings are preserved
		await syncManager.sync(true, true);

		step = 'done';
		setTimeout(() => {
			onComplete();
		}, 1200);
	} catch (e) {
		errorMessage = e instanceof Error ? e.message : 'Sync failed';
		step = 'error';
	}
}

function tryParse(value: string): unknown {
	try {
		if (value.startsWith('{') || value.startsWith('[') || value === 'true' || value === 'false') {
			return JSON.parse(value);
		}
	} catch {
		// ignore
	}
	return value;
}
</script>

<BaseModal
	{isOpen}
	onClose={() => {
		if (step === 'choose' || step === 'error') onClose();
	}}
	title={s('syncSetup.title') || 'Set Up Sync'}
	size="sm"
	position="center"
	closeOnBackdrop={step === 'choose' || step === 'error'}
	closeOnEscape={step === 'choose' || step === 'error'}
	showCloseButton={step === 'choose' || step === 'error'}
>
	<div class="p-5">
		{#if step === 'choose'}
			<p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
				{s('syncSetup.description') ||
					'We found existing settings on your account from another device. How would you like to proceed?'}
			</p>

			<div class="space-y-3">
				<button
					onclick={pushLocal}
					class="w-full text-left p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
				>
					<div class="flex items-start gap-3">
						<div
							class="mt-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 p-2 text-blue-600 dark:text-blue-400"
						>
							<IconArrowUp size={18} />
						</div>
						<div>
							<div class="text-sm font-medium text-gray-900 dark:text-gray-100">
								{s('syncSetup.pushLocal.title') || 'Use this device'}
							</div>
							<div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
								{s('syncSetup.pushLocal.description') ||
									'Replace cloud settings with your current settings'}
							</div>
						</div>
					</div>
				</button>

				<button
					onclick={pullRemote}
					class="w-full text-left p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
				>
					<div class="flex items-start gap-3">
						<div
							class="mt-0.5 rounded-lg bg-green-100 dark:bg-green-900/40 p-2 text-green-600 dark:text-green-400"
						>
							<IconArrowDown size={18} />
						</div>
						<div>
							<div class="text-sm font-medium text-gray-900 dark:text-gray-100">
								{s('syncSetup.pullRemote.title') || 'Use cloud settings'}
							</div>
							<div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
								{s('syncSetup.pullRemote.description') ||
									'Replace your current settings with cloud settings'}
							</div>
						</div>
					</div>
				</button>

				<button
					onclick={merge}
					class="w-full text-left p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
				>
					<div class="flex items-start gap-3">
						<div
							class="mt-0.5 rounded-lg bg-purple-100 dark:bg-purple-900/40 p-2 text-purple-600 dark:text-purple-400"
						>
							<IconArrowsExchange size={18} />
						</div>
						<div>
							<div class="text-sm font-medium text-gray-900 dark:text-gray-100">
								{s('syncSetup.merge.title') || 'Merge'}
							</div>
							<div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
								{s('syncSetup.merge.description') ||
									'Keep your settings and add any missing cloud settings'}
							</div>
						</div>
					</div>
				</button>
			</div>
		{:else if step === 'syncing'}
			<div class="flex flex-col items-center justify-center py-8 gap-3">
				<IconLoader2 size={28} class="animate-spin text-blue-600 dark:text-blue-400" />
				<p class="text-sm text-gray-600 dark:text-gray-400">{syncingLabel}</p>
			</div>
		{:else if step === 'done'}
			<div class="flex flex-col items-center justify-center py-8 gap-3">
				<svg class="h-8 w-8 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					{s('syncSetup.done') || 'Settings synced successfully!'}
				</p>
			</div>
		{:else if step === 'error'}
			<div class="flex flex-col items-center justify-center py-8 gap-3">
				<svg
					class="h-8 w-8 text-red-600 dark:text-red-400"
					fill="currentColor"
					viewBox="0 0 20 20"
				>
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
						clip-rule="evenodd"
					/>
				</svg>
				<p class="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
				<button
					onclick={() => {
						step = 'choose';
					}}
					class="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
				>
					{s('syncSetup.tryAgain') || 'Try again'}
				</button>
			</div>
		{/if}
	</div>
</BaseModal>
