import { iconService } from '$lib/services/iconService';

// Comprehensive Emoji to Iconify Mapping (moved from IconDisplay)
export const EMOJI_TO_ICONIFY: Record<string, string> = {
	// UI, Navigation & Controls
	'🏠': 'heroicons-outline:home',
	'🏡': 'heroicons-outline:home-modern',
	'⬆️': 'heroicons-outline:arrow-up',
	'⬇️': 'heroicons-outline:arrow-down',
	'⬅️': 'heroicons-outline:arrow-left',
	'➡️': 'heroicons-outline:arrow-right',
	'↗️': 'heroicons-outline:arrow-up-right',
	'↘️': 'heroicons-outline:arrow-down-right',
	'↙️': 'heroicons-outline:arrow-down-left',
	'↖️': 'heroicons-outline:arrow-up-left',
	'↕️': 'heroicons-outline:arrows-up-down',
	'↔️': 'heroicons-outline:arrows-right-left',
	'🔄': 'heroicons-outline:arrow-path',
	'↩️': 'heroicons-outline:arrow-uturn-left',
	'↪️': 'heroicons-outline:arrow-uturn-right',
	'⤴️': 'heroicons-outline:arrow-trending-up',
	'⤵️': 'heroicons-outline:arrow-trending-down',
	'🔝': 'heroicons-outline:arrow-up-circle',
	'🔙': 'heroicons-outline:arrow-left-circle',
	'🔜': 'heroicons-outline:arrow-right-circle',
	'✅': 'heroicons-outline:check-circle',
	'❌': 'heroicons-outline:x-circle',
	'➕': 'heroicons-outline:plus-circle',
	'➖': 'heroicons-outline:minus-circle',
	'✔️': 'heroicons-outline:check-circle',
	'❎': 'heroicons-outline:x-circle',
	'🔍': 'heroicons-outline:magnifying-glass',
	'🔎': 'heroicons-outline:magnifying-glass-plus',
	'🔒': 'heroicons-outline:lock-closed',
	'🔓': 'heroicons-outline:lock-open',
	'🔑': 'heroicons-outline:key',
	'⚙️': 'heroicons-outline:cog-6-tooth',
	'🛠️': 'heroicons-outline:wrench-screwdriver',
	'🔧': 'heroicons-outline:wrench',
	'✏️': 'heroicons-outline:pencil',
	'🗑️': 'heroicons-outline:trash',
	'🚪': 'heroicons-outline:arrow-right-on-rectangle',
	'🎛️': 'tabler:sliders',
	'📤': 'heroicons-outline:arrow-up-tray',
	'👤': 'heroicons-outline:user',
	'👥': 'heroicons-outline:users',
	'📎': 'heroicons-outline:paper-clip',
	'📥': 'heroicons-outline:arrow-down-tray',

	// User Roles & People
	'🧑‍💻': 'heroicons-outline:code-bracket',
	'🧑‍🏫': 'ri:graduation-cap-fill',
	'🧑‍🎓': 'heroicons-outline:user-circle',
	'🧑‍🎨': 'mdi:palette',

	// Communication
	'📧': 'heroicons-outline:envelope',
	'📨': 'heroicons-outline:envelope-open',
	'📞': 'heroicons-outline:phone',
	'📱': 'heroicons-outline:device-phone-mobile',
	'💬': 'heroicons-outline:chat-bubble-left',
	'💭': 'heroicons-outline:chat-bubble-oval-left',
	'🗨️': 'heroicons-outline:chat-bubble-left-ellipsis',
	'📢': 'heroicons-outline:megaphone',
	'📣': 'heroicons-outline:speaker-wave',
	'📠': 'mdi:fax',
	'🤝': 'mdi:handshake-outline',
	'🤝🏼': 'mdi:handshake-outline',

	// Files, Documents & Office
	'📁': 'heroicons-outline:folder',
	'📂': 'heroicons-outline:folder-open',
	'📄': 'heroicons-outline:document',
	'📃': 'heroicons-outline:document-text',
	'📋': 'heroicons-outline:clipboard',
	'📊': 'heroicons-outline:chart-bar',
	'📈': 'heroicons-outline:arrow-trending-up',
	'📉': 'heroicons-outline:presentation-chart-line',
	'🗂️': 'heroicons-outline:folder-plus',
	'🗃️': 'heroicons-outline:archive-box',
	'📑': 'heroicons-outline:document-duplicate',
	'📜': 'heroicons-outline:document-text',
	'📰': 'heroicons:newspaper',
	'🗞️': 'heroicons:newspaper',
	'📓': 'tabler:notebook',
	'📚': 'tabler:books',
	'💼': 'heroicons-outline:briefcase',
	'🏢': 'heroicons:building-office',
	'🏪': 'heroicons:building-storefront',
	'🏦': 'tabler:building-bank',
	'🖨️': 'heroicons-outline:printer',
	'💾': 'material-symbols:save',
	'🗳️': 'material-symbols:how-to-vote',
	'🔖': 'heroicons-outline:bookmark',
	'🗓️': 'heroicons-outline:calendar',
	'📅': 'heroicons-outline:calendar-days',
	'📝': 'heroicons-outline:pencil-square',
	'🗣️': 'heroicons-outline:megaphone',
	'🏛️': 'heroicons-outline:building-library',
	'🏭': 'tabler:building-factory',
	'🏫': 'tabler:school',
	'🏥': 'tabler:building-hospital',
	'🏺': 'tabler:building-museum',
	'🧳': 'tabler:suitcase',

	// Money & Finance
	'💳': 'heroicons:credit-card-16-solid',
	'💰': 'heroicons:banknotes',
	'💵': 'heroicons:currency-dollar',
	'💴': 'heroicons:currency-yen',
	'💶': 'heroicons:currency-euro',
	'💷': 'heroicons:currency-pound',
	'🪙': 'mdi:bitcoin',

	// Technology & Devices
	'💻': 'heroicons-outline:computer-desktop',
	'⌨️': 'material-symbols:keyboard',
	'🖱️': 'tabler:device-mouse',
	'💿': 'tabler:disc',
	'🔌': 'tabler:plug',
	'🔋': 'heroicons-outline:battery-100',
	'📡': 'tabler:antenna',
	'🖥️': 'heroicons-outline:computer-desktop',
	'📦': 'heroicons-outline:cube',

	// Space & Sci-Fi
	'🧑‍🚀': 'mdi:astronaut',
	'🤖': 'mdi:robot-outline',
	'🧠': 'mdi:brain',
	'🚀': 'mdi:rocket-launch-outline',
	'🛰️': 'tabler:satellite',
	'🪐': 'hugeicons:saturn',
	'🌌': 'mdi:galaxy',
	'🛸': 'mdi:ufo-outline',
	'🌐': 'tabler:world',

	// Media & Entertainment
	'▶️': 'heroicons-outline:play',
	'⏸️': 'heroicons-outline:pause',
	'⏹️': 'heroicons-outline:stop',
	'⏭️': 'heroicons-outline:forward',
	'⏮️': 'heroicons-outline:backward',
	'⏯️': 'heroicons-outline:play-pause',
	'🔊': 'heroicons-outline:speaker-wave',
	'🔇': 'heroicons-outline:speaker-x-mark',
	'📷': 'heroicons-outline:camera',
	'🎥': 'heroicons-outline:video-camera',
	'🎬': 'heroicons-outline:film',
	'🎵': 'heroicons-outline:musical-note',
	'📺': 'heroicons-outline:tv',
	'📻': 'tabler:radio',
	'🎧': 'tabler:headphones',
	'🎼': 'tabler:music',
	'🎹': 'mdi:piano',
	'🥁': 'mdi:drum',
	'🎷': 'mdi:saxophone',
	'🎺': 'mdi:trumpet',
	'🎸': 'mdi:guitar-electric',
	'🪕': 'mdi:banjo',
	'🎻': 'mdi:violin',
	'🎭': 'mdi:comedy',
	'🎪': 'material-symbols:festival',

	// Transportation
	'🚗': 'material-symbols:directions-car',
	'🚕': 'material-symbols:local-taxi',
	'🚙': 'material-symbols:time-to-leave',
	'🚌': 'material-symbols:directions-bus',
	'🚓': 'material-symbols:local-police',
	'🚑': 'material-symbols:ambulance',
	'🚒': 'material-symbols:fire-truck',
	'🚚': 'material-symbols:local-shipping',
	'🚜': 'material-symbols:tractor',
	'🚲': 'material-symbols:directions-bike',
	'🛵': 'material-symbols:two-wheeler',
	'🛴': 'tabler:scooter',
	'✈️': 'material-symbols:flight',
	'🛫': 'material-symbols:flight-takeoff',
	'🛬': 'material-symbols:flight-land',
	'🚁': 'material-symbols:helicopter',
	'🚂': 'material-symbols:train',
	'🚋': 'material-symbols:tram',
	'🚠': 'material-symbols:cable-car',
	'⛵': 'material-symbols:sailing',
	'🛶': 'material-symbols:kayaking',
	'🚤': 'fluent-emoji-high-contrast:speedboat',
	'🚢': 'material-symbols:directions-boat',
	'📍': 'heroicons-outline:map-pin',
	'🧑‍✈️': 'material-symbols:flight',
	'🚔': 'material-symbols:local-police',
	'🚆': 'material-symbols:train',
	'🚖': 'material-symbols:local-taxi',
	'🚇': 'material-symbols:subway',
	'🚊': 'material-symbols:tram',
	'🛩️': 'material-symbols:flight',
	'🏎️': 'mdi:racing-helmet',
	'🚧': 'material-symbols:construction',
	'⛽': 'tabler:gas-station',
	'🌉': 'mdi:bridge',
	'🚴': 'material-symbols:directions-bike',
	'🚴‍♂️': 'material-symbols:directions-bike',

	// Science & Health
	'🔬': 'material-symbols:science',
	'🧪': 'material-symbols:science',
	'🧬': 'tabler:dna-2',
	'💉': 'material-symbols:vaccines',
	'💊': 'material-symbols:medication',
	'🩺': 'material-symbols:stethoscope',
	'🔭': 'tabler:telescope',
	'🧲': 'tabler:magnet',
	'🧑‍🔬': 'material-symbols:science',
	'🧻': 'tabler:toilet-paper',
	'🧼': 'tabler:soap',
	'❤️': 'heroicons-outline:heart',

	// Nature & Weather
	'☀️': 'heroicons-outline:sun',
	'🌤️': 'mdi:weather-partly-cloudy',
	'⛅': 'mdi:wb-cloudy',
	'☁️': 'mdi:cloud',
	'🌦️': 'mdi:weather-partly-rainy',
	'🌧️': 'mdi:weather-rainy',
	'⛈️': 'mdi:weather-lightning-rainy',
	'🌨️': 'mdi:weather-snowy',
	'❄️': 'tabler:snowflake',
	'🌬️': 'tabler:wind',
	'🌪️': 'material-symbols:tornado',
	'🌫️': 'material-symbols:foggy',
	'🌊': 'tabler:waves',
	'💧': 'tabler:droplet',
	'🌡️': 'tabler:temperature',
	'🌍': 'heroicons-outline:globe-europe-africa',
	'🌎': 'heroicons-outline:globe-americas',
	'🌏': 'heroicons-outline:globe-asia-australia',
	'🕊️': 'fa7-solid:dove',
	'🌈': 'tabler:rainbow',
	'🗻': 'material-symbols:landscape',
	'🗿': 'material-symbols:landscape',
	'🦚': 'fluent-emoji-high-contrast:peacock',
	'🦒': 'mdi:giraffe',
	'🐓': 'mdi:rooster',

	// Sports & Activities
	'⚽': 'material-symbols:sports-soccer',
	'🏀': 'material-symbols:sports-basketball',
	'🏈': 'material-symbols:sports-football',
	'⚾': 'material-symbols:sports-baseball',
	'🎾': 'material-symbols:sports-tennis',
	'🏐': 'material-symbols:sports-volleyball',
	'🏉': 'material-symbols:sports-rugby',
	'🏓': 'material-symbols:sports-tennis',
	'🏸': 'material-symbols:sports-tennis',
	'🥅': 'material-symbols:sports-soccer',
	'🏑': 'material-symbols:sports-hockey',
	'🏏': 'material-symbols:sports-cricket',
	'🎱': 'mdi:billiards',
	'🤿': 'tabler:scuba-mask',
	'🏆': 'heroicons-outline:trophy',

	// Food & Drink
	'🥨': 'material-symbols:restaurant',
	'🧋': 'tabler:milkshake',
	'🍦': 'tabler:ice-cream',
	'🍧': 'tabler:ice-cream',
	'🍨': 'tabler:ice-cream',
	'🍩': 'tabler:donut',
	'🍪': 'tabler:cookie',
	'🍫': 'hugeicons:chocolate',
	'🍬': 'tabler:candy',
	'🍔': 'tabler:burger',
	'🍟': 'mdi:french-fries',
	'🍕': 'tabler:pizza',
	'🍗': 'mdi:chicken-leg',
	'🍖': 'tabler:meat',
	'🍤': 'mdi:chicken-leg',
	'🍢': 'mdi:chicken-leg',
	'🍣': 'hugeicons:sushi-01',

	// Shopping
	'🛒': 'heroicons-outline:shopping-cart',
	'🛍️': 'heroicons-outline:shopping-bag',
	'🏷️': 'heroicons-outline:tag',

	// Symbols & Miscellaneous
	'⭐': 'heroicons-outline:star',
	'⛔': 'heroicons-outline:no-symbol',
	'❗': 'heroicons-outline:exclamation-circle',
	'⚠️': 'tabler:alert-triangle',
	'ℹ️': 'heroicons-outline:information-circle',
	'❓': 'heroicons-outline:question-mark-circle',
	'⏰': 'tabler:alarm',
	'⏳': 'tabler:hourglass',
	'🎯': 'tabler:target',
	'🎲': 'material-symbols:casino',
	'🃏': 'material-symbols:casino',
	'🆘': 'tabler:sos',
	'💥': 'heroicons-outline:bolt',
	'🪖': 'mdi:tank',
	'🪄': 'mdi:auto-fix',
	'☮️': 'material-symbols:emoji-flags',
	'♻️': 'material-symbols:recycling',
	'🔗': 'heroicons-outline:link',
	'🛡️': 'tabler:shield-filled',
	'🚨': 'material-symbols:siren-outline',
	'💡': 'heroicons-outline:light-bulb',
	'✨': 'heroicons-outline:sparkles',
	'🌟': 'heroicons-outline:star',
	'🔥': 'heroicons-outline:fire',
	'⚡': 'heroicons-outline:bolt',
	'🌀': 'material-symbols:cyclone',
	'☄️': 'tabler:comet',
	'⚛️': 'tabler:atom',
	'🔮': 'mdi:crystal-ball',
	'🧩': 'tabler:puzzle',
	'🎗️': 'tabler:ribbon',
	'🎖️': 'heroicons-outline:trophy',
	'🏅': 'heroicons-outline:trophy',
	'🖤': 'heroicons-outline:heart',
	'🙏': 'material-symbols:volunteer-activism',
	'⌚': 'mdi:watch',
	'🧭': 'tabler:compass',
	'📵': 'tabler:phone-off',
	'📶': 'tabler:antenna-bars-5',
	'🕯️': 'tabler:candle',
	'⛑️': 'tabler:ambulance',
	'♿️': 'material-symbols:accessible',
	'🧯': 'material-symbols:fire-extinguisher',
	'🥈': 'heroicons-outline:trophy',
	'💱': 'heroicons-outline:currency-dollar',
	'☔': 'material-symbols:umbrella',
	'☔️': 'material-symbols:umbrella',
	'☕': 'tabler:coffee',
	'🍽️': 'tabler:restaurant',
	'🍺': 'tabler:beer',
	'🥃': 'tabler:glass-cocktail',
	'🍷': 'tabler:glass-wine',
	'🍸': 'tabler:glass-cocktail',
	'🍹': 'tabler:glass-cocktail',
	'🍻': 'tabler:beer',
	'🥂': 'tabler:glass-cocktail',
	'🪧': 'tabler:sign-right',

	// Additional mappings for previously unmapped emojis
	'⚖️': 'heroicons-outline:scale',
	'🛢️': 'tabler:barrel',
	'🎓': 'ri:graduation-cap-fill',
	'💍': 'mdi:ring',
	'💎': 'mdi:diamond',
	'🎨': 'mdi:palette',
	'🌱': 'tabler:plant',
	'🦈': 'tabler:fish',
	'🐛': 'tabler:bug',
	'🐦': 'mdi:bird',
	'⛳': 'tabler:golf',
	'🎮': 'heroicons-outline:device-tablet',
	'🛹': 'tabler:skateboard',
	'🧛': 'tabler:ghost',
	'🏁': 'tabler:flag',
	'🐧': 'mdi:penguin',
	'🐺': 'mdi:wolf',
	'🦎': 'mdi:lizard',
	'🏙️': 'heroicons:building-office',
	'🍁': 'tabler:leaf',
	'🏒': 'mdi:hockey-sticks',
	'🐖': 'tabler:pig',
	'🐞': 'tabler:bug',
	'🎡': 'mdi:ferris-wheel',
	'🏔️': 'tabler:mountain',
	'🎤': 'heroicons-outline:microphone',
	'🌿': 'tabler:leaf',
	'🐻': 'mdi:bear',
	'🎉': 'tabler:confetti',
	'👶': 'tabler:baby-carriage',
	'🎒': 'tabler:backpack',
	'🎢': 'mdi:roller-coaster',
	'🎈': 'tabler:balloon',
	'🐕': 'tabler:dog',
	'🏟️': 'tabler:building-stadium',
	'🥊': 'mdi:boxing-glove',
	'🐾': 'tabler:paw',
	'🎶': 'heroicons-outline:musical-note',
	'🛟': 'tabler:lifebuoy',
	'🐘': 'mdi:elephant',
	'🌾': 'tabler:wheat',
	'🦌': 'tabler:deer',
	'🌳': 'tabler:tree'
};

// Track unmapped emojis for debugging
const unmappedEmojis = new Set<string>();

/**
 * Validate icon name format
 */
function isValidIconName(iconName: string): boolean {
	if (!iconName || typeof iconName !== 'string') return false;
	const parts = iconName.split(':');
	if (parts.length !== 2) return false;
	const [prefix, name] = parts;
	return /^[a-z0-9-]+$/.test(prefix) && /^[a-z0-9-_]+$/.test(name);
}

/**
 * Schedule a task when the browser is idle; fallback to setTimeout
 */
function runWhenIdle(task: () => void): void {
	if (typeof window !== 'undefined' && (window as any).requestIdleCallback) {
		(window as any).requestIdleCallback(() => task());
	} else {
		setTimeout(task, 0);
	}
}

/**
 * Dedupe, validate, and chunk icon preloads with failure tolerance.
 * Filters out invalid names and icons already cached, then schedules
 * chunked preloads during idle time to minimize impact on the main thread.
 */
export function preloadIconsSafely(
	icons: string[],
	highPriority: boolean = false,
	chunkSize: number = 50
): void {
	if (!icons || icons.length === 0) return;

	// Dedupe
	const unique = Array.from(new Set(icons));

	// Filter invalid and already-cached icons
	const toLoad = unique.filter((name) => isValidIconName(name) && !iconService.isCached(name));
	if (toLoad.length === 0) return;

	if (highPriority) {
		// Let the service handle batching; run immediately
		iconService.preload(toLoad, true);
		return;
	}

	// Chunk and schedule during idle time
	for (let i = 0; i < toLoad.length; i += chunkSize) {
		const chunk = toLoad.slice(i, i + chunkSize);
		runWhenIdle(() => {
			try {
				iconService.preload(chunk, false);
			} catch {
				// Ignore chunk failures; service already tolerates errors
			}
		});
	}
}

/**
 * Convert emoji to Iconify icon name
 */
export function getIconName(emoji: string): string | null {
	if (!emoji) return null;

	// Normalize the input emoji
	const trimmed = emoji.trim();
	const normalized = trimmed.replace(/[\uFE0E\uFE0F]/g, ''); // Remove variation selectors

	// Check for direct mapping
	let mapped = EMOJI_TO_ICONIFY[trimmed] || EMOJI_TO_ICONIFY[normalized] || null;
	if (mapped) return mapped;

	// Programmatic mapping for flags
	if (/^[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]$/.test(normalized)) {
		const countryCode = [...normalized]
			.map((char) => String.fromCodePoint(char.codePointAt(0)! - 0x1f1e6 + 0x61))
			.join('');
		return `circle-flags:${countryCode}`;
	}

	// Track unmapped emojis in development
	if (import.meta.env.DEV && !unmappedEmojis.has(trimmed)) {
		unmappedEmojis.add(trimmed);
		console.log(`🚫 Unmapped emoji: "${trimmed}" (will show as raw emoji)`);
	}

	return null;
}

/**
 * Extract all emojis from story data and preload their icons
 */
export function preloadStoryIcons(stories: any[], highPriority: boolean = false): void {
	const iconsToPreload = new Set<string>();

	stories.forEach(story => {
		// Extract emojis from story
		if (story.emoji) {
			const iconName = getIconName(story.emoji);
			if (iconName) {
				iconsToPreload.add(iconName);
			}
		}

		// Extract emojis from articles if they have them
		if (story.articles) {
			story.articles.forEach((article: any) => {
				if (article.emoji) {
					const iconName = getIconName(article.emoji);
					if (iconName) {
						iconsToPreload.add(iconName);
					}
				}
			});
		}
	});

	// Preload all unique icons
	if (iconsToPreload.size > 0) {
		// Only log for significant batches
		if (import.meta.env.DEV && iconsToPreload.size > 5) {
			console.log(`📰 Preloading ${iconsToPreload.size} story icons${highPriority ? ' (high priority)' : ''}`);
		}
		preloadIconsSafely(Array.from(iconsToPreload), highPriority);
	}
}

// Known domain to icon mappings for major news sources
// Updated to use working icons only
const DOMAIN_TO_ICON: Record<string, string> = {
	'reddit.com': 'simple-icons:reddit',
	'bbc.com': 'simple-icons:bbc',
	'cnn.com': 'simple-icons:cnn',
	'nytimes.com': 'simple-icons:newyorktimes', // Fixed: was 'nytimes'
	'theguardian.com': 'simple-icons:theguardian',
	'washingtonpost.com': 'simple-icons:thewashingtonpost',
	'reuters.com': 'arcticons:reuters',
	'npr.org': 'arcticons:npr',
	'pbs.org': 'cbi:pbs',
	'foxnews.com': 'simple-icons:fox',

	'economist.com': 'arcticons:economist',
	'aljazeera.com': 'mdi:television', // Fixed: simple-icons version doesn't exist
	'france24.com': 'mdi:television', // Fixed: simple-icons version doesn't exist
	'rt.com': 'mdi:television', // Fixed: simple-icons version doesn't exist
	'lemonde.fr': 'arcticons:le-monde',
	'spiegel.de': 'arcticons:der-spiegel',
	'elpais.com': 'arcticons:el-pais',
	// Tech/Social
	'twitter.com': 'simple-icons:twitter',
	'x.com': 'simple-icons:x',
	'facebook.com': 'simple-icons:facebook',
	'instagram.com': 'simple-icons:instagram',
	'linkedin.com': 'simple-icons:linkedin',
	'youtube.com': 'simple-icons:youtube',
	'github.com': 'simple-icons:github',
	'medium.com': 'simple-icons:medium',
	// Other major sources that definitely have icons
	'wikipedia.org': 'simple-icons:wikipedia',
	'stackoverflow.com': 'simple-icons:stackoverflow',
	'hackernews.com': 'simple-icons:ycombinator'
};

/**
 * Preload domain-specific icons from story sources
 */
export function preloadSourceIcons(stories: any[]): void {
	const sourceIcons = new Set<string>();

	// Always add fallback icons
	sourceIcons.add('heroicons:newspaper');
	sourceIcons.add('heroicons-outline:globe-alt');

	stories.forEach(story => {
		if (story.articles) {
			story.articles.forEach((article: any) => {
				if (article.domain) {
					// Only add icons for domains we know exist
					const knownIcon = DOMAIN_TO_ICON[article.domain.toLowerCase()];
					if (knownIcon) {
						sourceIcons.add(knownIcon);
					}
				}
			});
		}
	});

	if (sourceIcons.size > 2) { // More than just the fallbacks
		preloadIconsSafely(Array.from(sourceIcons), false);
	}
}

/**
 * Preload citation icons and favicon data for a specific story (when story detail is opened)
 */
export async function preloadStoryCitations(story: any): Promise<void> {
	if (!story || !story.articles) return;

	const domains = new Set<string>();

	// Extract all unique domains from the story's articles
	story.articles.forEach((article: any) => {
		if (article.domain) {
			domains.add(article.domain);
		}
	});

	if (domains.size === 0) return;

	// Import the preload function from citationUtils
	const { preloadCommonFavicons } = await import('$lib/utils/citationUtils');

	// Create a fake category structure with just this story
	const fakeCategories = { story: [story] };

	// Preload all favicon data for these domains
	await preloadCommonFavicons(fakeCategories, ['story']);

	// Only preload icons for domains we know exist
	const knownIcons = new Set<string>();
	domains.forEach(domain => {
		const knownIcon = DOMAIN_TO_ICON[domain.toLowerCase()];
		if (knownIcon) {
			knownIcons.add(knownIcon);
		}
	});

	// Always add fallbacks
	knownIcons.add('heroicons:newspaper');
	knownIcons.add('heroicons-outline:globe-alt');

	if (knownIcons.size > 0) {
		preloadIconsSafely(Array.from(knownIcons), true); // High priority for story details
	}
}

/**
 * Get icon name for a domain with fallback logic
 */
export function getDomainIcon(domain: string): string {
	return getFixedDomainIcon(domain);
}

/**
 * Get a report of all missing icons and suggest fixes
 */
export function getMissingIconsReport(): {
	report: ReturnType<typeof iconService.exportMissingIconsReport>;
	suggestions: Array<{ original: string; suggested: string; reason: string }>;
} {
	const report = iconService.exportMissingIconsReport();
	const suggestions: Array<{ original: string; suggested: string; reason: string }> = [];

	// Known fixes for common missing icons
	const knownFixes: Record<string, { suggested: string; reason: string }> = {
		'simple-icons:nytimes': {
			suggested: 'simple-icons:newyorktimes',
			reason: 'The New York Times icon uses the full name'
		},
		'simple-icons:npr': {
			suggested: 'arcticons:npr',
			reason: 'Simple Icons NPR not available, use Arcticons NPR'
		},
		'simple-icons:theeconomist': {
			suggested: 'arcticons:economist',
			reason: 'Simple Icons Economist not available, use Arcticons Economist'
		},
		'simple-icons:washingtonpost': {
			suggested: 'simple-icons:thewashingtonpost',
			reason: 'Simple Icons uses full name: thewashingtonpost'
		},
		'simple-icons:aljazeera': {
			suggested: 'mdi:television',
			reason: 'Al Jazeera icon not available, use generic TV icon'
		},
		'simple-icons:france24': {
			suggested: 'mdi:television',
			reason: 'France 24 icon not available, use generic TV icon'
		},
		'simple-icons:rt': {
			suggested: 'mdi:television',
			reason: 'RT icon not available, use generic TV icon'
		},
		'simple-icons:lemonde': {
			suggested: 'arcticons:le-monde',
			reason: 'Simple Icons Le Monde not available, use Arcticons Le Monde'
		},
		'simple-icons:spiegel': {
			suggested: 'arcticons:der-spiegel',
			reason: 'Simple Icons Spiegel not available, use Arcticons Der Spiegel'
		},
		'simple-icons:elpais': {
			suggested: 'arcticons:el-pais',
			reason: 'Simple Icons El País not available, use Arcticons El País'
		},
		'heroicons-outline:exclamation-triangle': {
			suggested: 'tabler:alert-triangle',
			reason: 'Heroicons exclamation-triangle not available, use Tabler alert-triangle'
		},
		'material-symbols:telescope': {
			suggested: 'tabler:telescope',
			reason: 'Material Symbols telescope not available, use Tabler telescope'
		},
		'heroicons-outline:hourglass': {
			suggested: 'tabler:hourglass',
			reason: 'Heroicons hourglass not available, use Tabler hourglass'
		},
		'material-symbols:power': {
			suggested: 'tabler:battery-vertical-charging',
			reason: 'Material Symbols power not available, use Tabler battery charging icon'
		},
		'material-symbols:rainbow': {
			suggested: 'tabler:rainbow',
			reason: 'Material Symbols rainbow not available, use Tabler rainbow'
		},
		'mdi:satellite-outline': {
			suggested: 'tabler:satellite',
			reason: 'MDI satellite-outline not available, use Tabler satellite'
		},
		'simple-icons:reuters': {
			suggested: 'arcticons:reuters',
			reason: 'Simple Icons Reuters not available, use Arcticons Reuters'
		},
		'simple-icons:pbs': {
			suggested: 'cbi:pbs',
			reason: 'Simple Icons PBS not available, use CBI PBS (Public Broadcasting Service)'
		},
	};

	// Generate suggestions for missing icons
	report.missingIcons.forEach(iconName => {
		if (knownFixes[iconName]) {
			suggestions.push({
				original: iconName,
				...knownFixes[iconName]
			});
		} else {
			// Generic suggestions based on prefix
			const [prefix] = iconName.split(':');
			if (prefix === 'simple-icons') {
				suggestions.push({
					original: iconName,
					suggested: 'heroicons:newspaper',
					reason: 'Simple icon not found, use generic newspaper icon'
				});
			}
		}
	});

	return { report, suggestions };
}

/**
 * Apply automatic fixes for known missing icons
 */
export function getFixedDomainIcon(domain: string): string {
	const originalIcon = DOMAIN_TO_ICON[domain.toLowerCase()];
	
	// If the original icon is known to be missing, return the fixed version
	const fixes: Record<string, string> = {
		'simple-icons:nytimes': 'simple-icons:newyorktimes',
		'simple-icons:npr': 'arcticons:npr',
		'simple-icons:theeconomist': 'arcticons:economist',
		'simple-icons:washingtonpost': 'simple-icons:thewashingtonpost',
		'simple-icons:aljazeera': 'mdi:television',
		'simple-icons:france24': 'mdi:television',
		'simple-icons:rt': 'mdi:television',
		'simple-icons:lemonde': 'arcticons:le-monde',
		'simple-icons:spiegel': 'arcticons:der-spiegel',
		'simple-icons:elpais': 'arcticons:el-pais',
		'heroicons-outline:exclamation-triangle': 'tabler:alert-triangle',
		'material-symbols:telescope': 'tabler:telescope',
		'heroicons-outline:hourglass': 'tabler:hourglass',
		'material-symbols:power': 'tabler:battery-vertical-charging',
		'material-symbols:rainbow': 'tabler:rainbow',
		'mdi:satellite-outline': 'tabler:satellite',
		'simple-icons:reuters': 'arcticons:reuters',
		'simple-icons:pbs': 'cbi:pbs'
	};

	if (originalIcon && fixes[originalIcon]) {
		return fixes[originalIcon];
	}

	return originalIcon || 'heroicons:newspaper';
}

/**
 * Preload common UI icons that are frequently used
 */
export function preloadCommonIcons(): void {
	const commonIcons = [
		'heroicons-outline:home',
		'heroicons-outline:globe-europe-africa',
		'heroicons-outline:star',
		'heroicons-outline:heart',
		'heroicons-outline:check-circle',
		'heroicons-outline:x-circle',
		'tabler:alert-triangle',
		'heroicons-outline:information-circle',
		'heroicons-outline:magnifying-glass',
		'heroicons-outline:cog-6-tooth',
		// SourceOverlay icons
		'tabler:map-pin',
		'tabler:user',
		'tabler:building',
		'tabler:tag',
		'tabler:external-link',
		// SmartImage fallback icons
		'heroicons-outline:globe-alt',
		'heroicons:newspaper'
	];

	// Only log once at startup
	if (import.meta.env.DEV && typeof window !== 'undefined' && !window.__common_icons_logged) {
		console.log('🎨 Preloading common UI icons');
		window.__common_icons_logged = true;
	}
	preloadIconsSafely(commonIcons, true); // High priority for UI icons
}



/**
 * Get report of unmapped emojis
 */
export function getUnmappedEmojisReport(): {
	unmappedEmojis: string[];
	count: number;
} {
	const emojis = Array.from(unmappedEmojis);
	return {
		unmappedEmojis: emojis,
		count: emojis.length
	};
}

// Expose helper functions globally in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
	(window as any).__getMissingIconsReport = getMissingIconsReport;
	(window as any).__getUnmappedEmojisReport = getUnmappedEmojisReport;
	(window as any).__checkUnmappedEmojis = () => {
		const report = getUnmappedEmojisReport();
		console.group('🚫 Unmapped Emojis Report');
		console.log(`📊 Total unmapped emojis: ${report.count}`);
		if (report.count > 0) {
			console.log('🔍 Unmapped emojis:', report.unmappedEmojis);
		} else {
			console.log('✅ All emojis have icon mappings!');
		}
		console.groupEnd();
		return report;
	};
}

