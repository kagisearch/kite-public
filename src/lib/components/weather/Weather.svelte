<script lang="ts">
import { IconWind } from '@tabler/icons-svelte';
import { onMount } from 'svelte';
import { s } from '$lib/client/localization.svelte';

interface Props {
	location?: 'san-francisco' | 'new-york' | 'austin';
}

let { location = 'san-francisco' }: Props = $props();

interface WeatherData {
	temperature: number;
	temperatureMax: number;
	temperatureMin: number;
	weatherCode: number;
	humidity: number;
	windSpeed: number;
	precipitation: number;
}

interface WeatherResponse {
	locationKey: string;
	data: WeatherData | null;
	lastUpdated: string;
	error?: string;
}

let loading = $state(true);
let data: WeatherResponse | null = $state(null);

async function fetchWeather() {
	try {
		const response = await fetch(`/api/widgets/weather?location=${location}`);
		if (response.ok) {
			const result = await response.json();
			data = result;
		} else {
			console.error('Weather API error:', response.status);
		}
	} catch (error) {
		console.error('Failed to fetch weather:', error);
	} finally {
		loading = false;
	}
}

// Weather code to icon mapping (WMO Weather interpretation codes)
// Using Meteocons animated SVG icons
function getWeatherIcon(code: number): { icon: string; description: string } {
	if (code === 0) return { icon: 'clear-day.svg', description: s('weather.clear') };
	if (code <= 3) return { icon: 'partly-cloudy-day.svg', description: s('weather.cloudy') };
	if (code <= 48) return { icon: 'fog.svg', description: s('weather.foggy') };
	if (code <= 67) return { icon: 'rain.svg', description: s('weather.rainy') };
	if (code <= 77) return { icon: 'snow.svg', description: s('weather.snowy') };
	if (code <= 82) return { icon: 'rain.svg', description: s('weather.rainy') };
	if (code <= 86) return { icon: 'sleet.svg', description: s('weather.snowy') };
	if (code <= 99) return { icon: 'thunderstorms-rain.svg', description: s('weather.stormy') };
	return { icon: 'cloudy.svg', description: s('weather.cloudy') };
}

onMount(() => {
	fetchWeather();
	// Refresh every 30 minutes
	const interval = setInterval(fetchWeather, 1800000);
	return () => clearInterval(interval);
});
</script>

<div class="mb-4 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
	<div class="px-4 py-3 min-h-[92px]">
		{#if loading}
			<div class="flex items-start justify-between h-full">
				<div class="flex items-center gap-3">
					<img
						src="/weather-icons/cloudy.svg"
						alt="Loading"
						class="h-16 w-16"
					/>
					<div class="flex flex-col">
						<span class="text-sm text-gray-600 dark:text-gray-400">{s('weather.loading')}</span>
					</div>
				</div>
			</div>
		{:else if data?.error || !data?.data}
			<div class="flex items-start justify-between h-full">
				<div class="flex items-center gap-3">
					<img
						src="/weather-icons/cloudy.svg"
						alt="Error"
						class="h-16 w-16"
					/>
					<div class="flex flex-col">
						<span class="text-sm text-gray-600 dark:text-gray-400">{s('weather.error')}</span>
					</div>
				</div>
			</div>
		{:else}
			{@const weatherInfo = getWeatherIcon(data.data.weatherCode)}

			<div class="flex items-start justify-between">
				<!-- Location & Current Temp -->
				<div class="flex items-center gap-3">
					<img
						src="/weather-icons/{weatherInfo.icon}"
						alt={weatherInfo.description}
						class="h-16 w-16"
					/>
					<div class="flex flex-col">
						<span class="text-xs text-gray-600 dark:text-gray-400">{s(`weather.location.${data.locationKey}`)}</span>
						<span class="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.data.temperature}°{s('weather.fahrenheit')}</span>
						<span class="text-sm text-gray-600 dark:text-gray-400">{weatherInfo.description}</span>
					</div>
				</div>

				<!-- Weather Stats -->
				<div class="flex flex-col gap-1 text-right text-xs text-gray-600 dark:text-gray-400">
					<div class="flex items-center justify-end gap-2">
						<span>↑ {data.data.temperatureMax}°</span>
						<span>↓ {data.data.temperatureMin}°</span>
					</div>
					<div>{s('weather.humidity')}: {data.data.humidity}%</div>
					<div class="flex items-center justify-end gap-1">
						<IconWind class="h-3 w-3" />
						<span>{data.data.windSpeed} {s('weather.mph')}</span>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
