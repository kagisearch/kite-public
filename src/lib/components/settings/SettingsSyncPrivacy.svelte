<script lang="ts">
import { IconArrowLeft, IconDownload, IconLoader2, IconTrash } from '@tabler/icons-svelte';
import { getContext } from 'svelte';
import { s } from '$lib/client/localization.svelte';
import { syncManager } from '$lib/client/sync-manager';
import { safeGetItem, safeSetItem } from '$lib/client/utils/safe-storage';

// Get session from context
const session = getContext<Session>('session');

// Sync toggle states
let syncSettings = $state(safeGetItem('syncSettings') !== 'false');
let syncReadHistory = $state(safeGetItem('syncReadHistory') !== 'false');
let isSyncingSettings = $state(false);
let isSyncingHistory = $state(false);

// Clear data states
let isClearing = $state(false);
let clearSuccess = $state(false);
let clearError = $state<string | null>(null);
let showClearConfirm = $state(false);

// Export data states
let isExporting = $state(false);
let exportError = $state<string | null>(null);

// Toggle sync settings
async function toggleSyncSettings() {
	syncSettings = !syncSettings;
	safeSetItem('syncSettings', syncSettings.toString());

	if (syncSettings && session?.loggedIn && session?.id) {
		// If turning on, force push ALL local settings to server
		isSyncingSettings = true;
		try {
			// Force push all local settings (forceAllSettings=true, forceSync=true)
			await syncManager.sync(true, true);
		} finally {
			isSyncingSettings = false;
		}
	}
}

// Toggle read history sync
async function toggleSyncReadHistory() {
	const wasEnabled = syncReadHistory;
	syncReadHistory = !syncReadHistory;
	safeSetItem('syncReadHistory', syncReadHistory.toString());

	if (syncReadHistory && !wasEnabled && session?.loggedIn && session?.id) {
		// If turning ON, sync both local and remote data
		isSyncingHistory = true;
		try {
			await syncManager.onReadHistorySyncEnabled();
		} finally {
			isSyncingHistory = false;
		}
	}
	// When turning OFF, don't reset sequence - just pause syncing
}

// Clear all synced data
async function clearAllData() {
	if (!session?.loggedIn || !session?.id) {
		clearError =
			s('settings.sync.clear.errorNotLoggedIn') || 'You must be logged in to clear synced data';
		showClearConfirm = false;
		return;
	}

	showClearConfirm = false;

	isClearing = true;
	clearError = null;
	clearSuccess = false;

	try {
		const response = await fetch('/api/sync/clear', {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			throw new Error(
				(s('settings.sync.clear.errorFailed') || 'Failed to clear data') +
					`: ${response.statusText}`,
			);
		}

		clearSuccess = true;

		// Reset sync states
		syncSettings = false;
		syncReadHistory = false;
		safeSetItem('syncSettings', 'false');
		safeSetItem('syncReadHistory', 'false');

		// Clear local sync metadata
		if (session?.id) {
			localStorage.removeItem(`lastSync_${session.id}`);
			localStorage.removeItem(`lastReadHistorySequence_${session.id}_${syncManager.deviceId}`);
			localStorage.removeItem(`kite_initial_sync_complete_${session.id}`);
		}
	} catch (error) {
		console.error('Failed to clear data:', error);
		clearError =
			error instanceof Error
				? error.message
				: s('settings.sync.clear.errorFailed') || 'Failed to clear data';
	} finally {
		isClearing = false;
	}
}

// Reset to default view
function resetView() {
	showClearConfirm = false;
	clearSuccess = false;
	clearError = null;
}

// Export synced data
async function exportData() {
	if (!session?.loggedIn || !session?.id) {
		exportError =
			s('settings.sync.export.errorNotLoggedIn') || 'You must be logged in to export synced data';
		return;
	}

	isExporting = true;
	exportError = null;

	try {
		const response = await fetch('/api/sync/export', {
			method: 'GET',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			throw new Error(s('settings.sync.export.errorFailed') || 'Failed to export data');
		}

		const data = await response.json();

		// Create a blob and download it
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `kagi-news-sync-data-${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	} catch (error) {
		console.error('Failed to export data:', error);
		exportError =
			error instanceof Error
				? error.message
				: s('settings.sync.export.errorFailed') || 'Failed to export data';
	} finally {
		isExporting = false;
	}
}
</script>

<div class="space-y-6">
  <!-- Tab Description -->
  <div class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
    {s("settings.sync.info.description") || 
    "Kagi News can sync your settings and read history across all your devices. This data is stored securely on Kagi servers and associated with your account.\n\nYour synced data is not used for any other purpose, not shared with anyone, and is solely stored to provide the sync service to you. You have full control over what gets synced and can delete your data at any time."}
  </div>

  {#if session?.loggedIn && session?.id}
    <!-- Sync Toggles -->
    <div>
      <h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
        {s("settings.sync.toggles.title") || "Sync Preferences"}
      </h3>
      
      <div class="space-y-4">
        <!-- Settings Sync -->
        <div>
          <label class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {s("settings.sync.settings.label") || "Sync Settings"}
                </span>
                {#if isSyncingSettings}
                  <IconLoader2 class="h-4 w-4 animate-spin text-yellow-600" />
                {/if}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {s("settings.sync.settings.description") || 
                "Font size, story count, and other preferences"}
              </div>
            </div>
            <button
            type="button"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {syncSettings ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'} {isSyncingSettings ? 'opacity-50' : ''}"
            role="switch"
            aria-checked={syncSettings}
            onclick={toggleSyncSettings}
            disabled={isSyncingSettings}
            title={!syncSettings ? (s("settings.sync.settings.enableInfo") || "When enabled, your current settings will be uploaded and shared across all your devices") : ""}
          >
            <span class="sr-only">
              {syncSettings ? (s("ui.disable") || "Disable") : (s("ui.enable") || "Enable")} {s("settings.sync.settings.label") || "Sync Settings"}
            </span>
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {syncSettings ? 'ltr:translate-x-6 rtl:-translate-x-6' : 'ltr:translate-x-1 rtl:-translate-x-1'}"
            ></span>
          </button>
        </label>
      </div>

        <!-- Read History Sync -->
        <div>
          <label class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {s("settings.sync.readHistory.label") || "Sync Read History"}
                </span>
                {#if isSyncingHistory}
                  <IconLoader2 class="h-4 w-4 animate-spin text-yellow-600" />
                {/if}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {s("settings.sync.readHistory.description") || 
                "Stories you've read across all categories"}
              </div>
            </div>
            <button
            type="button"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {syncReadHistory ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'} {isSyncingHistory ? 'opacity-50' : ''}"
            role="switch"
            aria-checked={syncReadHistory}
            onclick={toggleSyncReadHistory}
            disabled={isSyncingHistory}
            title={!syncReadHistory ? (s("settings.sync.readHistory.enableInfo") || "When enabled, your read history will be uploaded and synced across all your devices") : ""}
          >
            <span class="sr-only">
              {syncReadHistory ? (s("ui.disable") || "Disable") : (s("ui.enable") || "Enable")} {s("settings.sync.readHistory.label") || "Sync Read History"}
            </span>
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {syncReadHistory ? 'ltr:translate-x-6 rtl:-translate-x-6' : 'ltr:translate-x-1 rtl:-translate-x-1'}"
            ></span>
          </button>
        </label>
      </div>
      </div>
    </div>

    <!-- Clear Data Section -->
    <div class="border-t pt-6 dark:border-gray-700">
      <h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
        {s("settings.sync.clear.title") || "Data Management"}
      </h3>
      
      <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
        {#if isClearing}
          <!-- Loading state -->
          <div class="flex items-center justify-center py-8">
            <div class="flex flex-col items-center gap-3">
              <svg class="animate-spin h-8 w-8 text-gray-600 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {s("settings.sync.clear.deleting") || "Deleting your data..."}
              </p>
            </div>
          </div>
        {:else if showClearConfirm}
          <!-- Confirmation view -->
          <div class="space-y-3">
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
              {s("settings.sync.clear.confirmTitle") || "Delete All Synced Data?"}
            </p>
            <p class="text-sm text-gray-700 dark:text-gray-300">
              {s("settings.sync.clear.confirmMessage") ||
                "This will permanently delete all your synced settings and read history from Kagi servers. Your local data will remain intact."}
            </p>
            <p class="text-xs text-red-600 dark:text-red-400">
              {s("settings.sync.clear.confirmWarning") || "This action cannot be undone."}
            </p>
            <div class="flex gap-2">
              <button
                onclick={() => (showClearConfirm = false)}
                class="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-300 transition-colors"
              >
                {s("ui.cancel") || "Cancel"}
              </button>
              <button
                onclick={clearAllData}
                class="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                <IconTrash size={14} />
                {s("settings.sync.clear.confirmButton") || "Delete"}
              </button>
            </div>
          </div>
        {:else if clearSuccess}
          <!-- Success message -->
          <div class="space-y-3">
            <div class="flex items-center gap-2 text-green-600 dark:text-green-400">
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <p class="text-sm">
                {s("settings.sync.clear.success") || "All synced data has been deleted successfully."}
              </p>
            </div>
            <button
              onclick={resetView}
              class="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-300 transition-colors"
            >
              <IconArrowLeft size={14} />
              {s("ui.back") || "Back"}
            </button>
          </div>
        {:else if clearError}
          <!-- Error message -->
          <div class="space-y-3">
            <div class="flex items-start gap-2">
              <svg class="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <p class="text-sm text-red-600 dark:text-red-400">
                {clearError}
              </p>
            </div>
            <button
              onclick={resetView}
              class="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-300 transition-colors"
            >
              <IconArrowLeft size={14} />
              {s("ui.back") || "Back"}
            </button>
          </div>
        {:else}
          <!-- Default view -->
          <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {s("settings.sync.clear.description") || 
            "You are in control of your data. Export or delete your cloud data at any time. Deletion does not affect local data."}
          </p>
          
          <div class="flex gap-2">
            <button
              type="button"
              onclick={exportData}
              disabled={isExporting}
              class="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {#if isExporting}
                <IconLoader2 size={16} class="animate-spin" />
                {s("settings.sync.export.exporting") || "Exporting..."}
              {:else}
                <IconDownload size={16} />
                {s("settings.sync.export.button") || "Export Data"}
              {/if}
            </button>
            
            <button
              type="button"
              onclick={() => (showClearConfirm = true)}
              class="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <IconTrash size={16} />
              {s("settings.sync.clear.button") || "Clear All Synced Data"}
            </button>
          </div>
          
          {#if exportError}
            <div class="mt-3 text-sm text-red-600 dark:text-red-400">
              {exportError}
            </div>
          {/if}
        {/if}
      </div>
    </div>
  {:else}
    <!-- Not Logged In Message -->
    <div class="rounded-lg bg-gray-50 p-6 text-center dark:bg-gray-900/50">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
        {s("settings.sync.notLoggedIn.title") || "Sign In Required"}
      </h3>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {s("settings.sync.notLoggedIn.description") || 
        "Sign in to your Kagi account to sync your settings and read history across devices."}
      </p>
      <div class="mt-4">
        <a
          href="https://kagi.com/signin"
          class="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {s("settings.sync.notLoggedIn.signIn") || "Sign In"}
        </a>
      </div>
    </div>
  {/if}
</div>