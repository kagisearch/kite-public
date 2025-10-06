<script lang="ts">
import { IconAlertTriangle, IconLoader2, IconPlus, IconX } from '@tabler/icons-svelte';
import { browser } from '$app/environment';
import { s } from '$lib/client/localization.svelte';
import BaseModal from './BaseModal.svelte';

interface Props {
	clusterId: string;
	title: string;
	class?: string;
}

let { clusterId, title, class: className = '' }: Props = $props();

let showModal = $state(false);
let issueType = $state('');
let description = $state('');
let sourceUrls = $state<string[]>(['']);
let isSubmitting = $state(false);
let isSuccess = $state(false);
let errorMessage = $state('');
let successMessage = $state('');
let reportId = $state('');

const MAX_DESCRIPTION_LENGTH = 1000;

function openModal() {
	showModal = true;
	issueType = '';
	description = '';
	sourceUrls = [''];
	isSuccess = false;
	errorMessage = '';
	successMessage = '';
	reportId = '';
}

function closeModal() {
	showModal = false;
	issueType = '';
	description = '';
	sourceUrls = [''];
	isSuccess = false;
	errorMessage = '';
	successMessage = '';
	reportId = '';
	isSubmitting = false;
}

function addSourceField() {
	sourceUrls = [...sourceUrls, ''];
}

function removeSourceField(index: number) {
	sourceUrls = sourceUrls.filter((_, i) => i !== index);
}

function updateSourceUrl(index: number, value: string) {
	sourceUrls[index] = value;
}

async function handleSubmit() {
	if (!browser || isSubmitting || !description.trim() || !issueType) return;

	if (description.length > MAX_DESCRIPTION_LENGTH) {
		errorMessage = s('article.reportModal.characterCount', {
			count: description.length.toString(),
			max: MAX_DESCRIPTION_LENGTH.toString(),
		});
		return;
	}

	// Validate source URLs
	const validSourceUrls: string[] = [];
	for (const url of sourceUrls) {
		const trimmedUrl = url.trim();
		if (trimmedUrl) {
			try {
				new URL(trimmedUrl);
				validSourceUrls.push(trimmedUrl);
			} catch {
				errorMessage = `Invalid URL: ${trimmedUrl}`;
				return;
			}
		}
	}

	isSubmitting = true;
	errorMessage = '';

	try {
		const response = await fetch('/api/reports', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				clusterId,
				issueType,
				description: description.trim(),
				sourceUrls: validSourceUrls,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.message || s('article.reportModal.error'));
		}

		const result = await response.json();
		reportId = result.id;
		successMessage = s('article.reportModal.success');
		isSuccess = true;

		// Don't close modal - keep it open to show success message
	} catch (error) {
		console.error('Failed to submit report:', error);
		errorMessage = error instanceof Error ? error.message : s('article.reportModal.error');
	} finally {
		isSubmitting = false;
	}
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape' && !isSubmitting) {
		closeModal();
	}
}
</script>

<!-- Report Button (icon only) -->
<button
  onclick={openModal}
  class="group relative flex h-10 w-10 items-center justify-center rounded-lg {className}"
  aria-label={s("article.reportInaccuracy")}
  title={s("article.reportInaccuracy")}
>
  <IconAlertTriangle
    size={20}
    stroke={2}
    class="transition-colors text-gray-600 group-hover:text-amber-600 dark:text-gray-400 dark:group-hover:text-amber-500"
  />
</button>

<!-- Report Modal -->
<BaseModal
  isOpen={showModal}
  onClose={closeModal}
  title={s("article.reportModal.title")}
  size="md"
  closeOnEscape={!isSubmitting && !isSuccess}
  closeOnBackdrop={!isSubmitting && !isSuccess}
>
  <div class="p-4 sm:p-6 space-y-4">
    <!-- Subtitle -->
    <p class="text-sm text-gray-600 dark:text-gray-400 -mt-2">
      {s("article.reportModal.subtitle")}
    </p>

    <!-- Story Title -->
    <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <p class="text-sm text-gray-600 dark:text-gray-400">
        {s("article.reportModal.reportingFor")}
      </p>
      <p class="font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
        {title}
      </p>
    </div>

    <!-- Issue Type Selection -->
    <div>
      <fieldset>
        <legend
          class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {s("article.reportModal.issueType")}
        </legend>
        <div class="space-y-2">
          <label class="flex items-center">
            <input
              type="radio"
              name="issueType"
              value="factualError"
              bind:group={issueType}
              disabled={isSubmitting || isSuccess}
              class="me-2 text-amber-600 focus:ring-amber-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300"
              >{s("article.reportModal.issueType.factualError")}</span
            >
          </label>
          <label class="flex items-center">
            <input
              type="radio"
              name="issueType"
              value="misleading"
              bind:group={issueType}
              disabled={isSubmitting || isSuccess}
              class="me-2 text-amber-600 focus:ring-amber-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300"
              >{s("article.reportModal.issueType.misleading")}</span
            >
          </label>
          <label class="flex items-center">
            <input
              type="radio"
              name="issueType"
              value="outdated"
              bind:group={issueType}
              disabled={isSubmitting || isSuccess}
              class="me-2 text-amber-600 focus:ring-amber-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300"
              >{s("article.reportModal.issueType.outdated")}</span
            >
          </label>
          <label class="flex items-center">
            <input
              type="radio"
              name="issueType"
              value="other"
              bind:group={issueType}
              disabled={isSubmitting || isSuccess}
              class="me-2 text-amber-600 focus:ring-amber-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300"
              >{s("article.reportModal.issueType.other")}</span
            >
          </label>
        </div>
      </fieldset>
    </div>

    <!-- Description Input -->
    <div>
      <label
        for="report-description"
        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        {s("article.reportModal.description")}
      </label>
      <textarea
        id="report-description"
        bind:value={description}
        onkeydown={handleKeydown}
        disabled={isSubmitting || isSuccess}
        placeholder={s("article.reportModal.descriptionPlaceholder")}
        class="w-full h-[180px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none overflow-y-auto"
        maxlength={MAX_DESCRIPTION_LENGTH}
      ></textarea>
      <div
        class="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400"
      >
        <span
          >{s("article.reportModal.characterCount", {
            count: description.length.toString(),
            max: MAX_DESCRIPTION_LENGTH.toString(),
          })}</span
        >
      </div>
    </div>

    <!-- Source URLs Input -->
    <fieldset>
      <div class="mb-2">
        <legend
          class="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {s("article.reportModal.source")}
        </legend>
        <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {s("article.reportModal.sourceHelper")}
        </p>
      </div>
      <div class="space-y-2">
        {#each sourceUrls as sourceUrl, index}
          <div class="flex gap-2">
            <input
              type="url"
              value={sourceUrl}
              oninput={(e) => updateSourceUrl(index, e.currentTarget.value)}
              onkeydown={handleKeydown}
              disabled={isSubmitting || isSuccess}
              placeholder={s("article.reportModal.sourcePlaceholder")}
              class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {#if sourceUrls.length > 1}
              <button
                type="button"
                onclick={() => removeSourceField(index)}
                disabled={isSubmitting || isSuccess}
                class="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Remove source"
              >
                <IconX size={20} stroke={2} />
              </button>
            {/if}
          </div>
        {/each}
        {#if sourceUrls.length < 5}
          <button
            type="button"
            onclick={addSourceField}
            disabled={isSubmitting || isSuccess}
            class="flex items-center gap-2 px-3 py-1.5 text-sm text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IconPlus size={16} stroke={2} />
            {s("article.reportModal.addSource")}
          </button>
        {/if}
      </div>
    </fieldset>

    <!-- Error/Success Messages -->
    {#if errorMessage}
      <div
        class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
      >
        <p class="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      </div>
    {/if}

    {#if successMessage}
      <div
        class="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
      >
        <p class="text-sm text-green-600 dark:text-green-400">
          {successMessage}
        </p>
        {#if reportId}
          <p class="text-xs text-green-600 dark:text-green-400 mt-1">
            {s("article.reportModal.reportId", { id: reportId })}
          </p>
        {/if}
      </div>
    {/if}

    <!-- Submit Buttons -->
    <div class="flex justify-end gap-3 pt-2">
      <button
        onclick={closeModal}
        disabled={isSubmitting || isSuccess}
        class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {s("article.reportModal.cancel")}
      </button>
      <button
        onclick={handleSubmit}
        disabled={isSubmitting ||
          !description.trim() ||
          !issueType ||
          isSuccess}
        class="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {#if isSubmitting}
          <IconLoader2 size={16} stroke={2} class="animate-spin" />
          {s("article.reportModal.submitting")}
        {:else}
          {s("article.reportModal.submit")}
        {/if}
      </button>
    </div>
  </div>
</BaseModal>

<style>
  button {
    -webkit-tap-highlight-color: transparent;
  }
</style>
