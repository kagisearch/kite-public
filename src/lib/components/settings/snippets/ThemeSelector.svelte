<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import Select from '$lib/components/Select.svelte';
import { settings, themeSettings } from '$lib/data/settings.svelte.js';

// Theme options
const themeOptions = $derived([
	{ value: 'system', label: s('settings.theme.system') || 'System' },
	{ value: 'light', label: s('settings.theme.light') || 'Light' },
	{ value: 'dark', label: s('settings.theme.dark') || 'Dark' },
]);

function handleChange(value: string) {
	themeSettings.theme = value as 'system' | 'light' | 'dark';
	settings.theme.save();
}
</script>

<Select
  value={themeSettings.theme as string}
  options={themeOptions}
  label={s("settings.theme.label") || "Theme"}
  onChange={handleChange}
/>
