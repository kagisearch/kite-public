import { browser } from '$app/environment';
import { syncManager } from '$lib/client/sync-manager';
import { DEFAULT_SECTIONS, type SectionConfig } from '$lib/constants/sections';

const STORAGE_KEY = 'kite-sections';

// Initialize sections state
const sectionsState = $state<SectionConfig[]>([]);

// Helper functions
function getInitialSections(): SectionConfig[] {
	if (!browser) return [...DEFAULT_SECTIONS];

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed: unknown = JSON.parse(stored);
			// Validate structure and merge with defaults
			if (Array.isArray(parsed)) {
				// Use the STORED order, not the default order!
				const result = parsed.map((storedSection: unknown) => {
					const section = storedSection as Partial<SectionConfig>;
					const defaultSection = DEFAULT_SECTIONS.find((d) => d.id === section.id);

					// Migration: Always enable sources section
					if (section.id === 'sources') {
						return defaultSection
							? { ...defaultSection, ...section, enabled: true }
							: { ...section, enabled: true };
					}

					// Merge default values with stored values (stored takes precedence)
					return defaultSection ? { ...defaultSection, ...section } : section;
				}) as SectionConfig[];

				// Add any new sections from defaults that aren't in stored
				const storedIds = new Set(parsed.map((s: unknown) => (s as Partial<SectionConfig>).id));
				DEFAULT_SECTIONS.forEach((defaultSection) => {
					if (!storedIds.has(defaultSection.id)) {
						result.push(defaultSection);
					}
				});

				return result;
			}
		}
	} catch (error) {
		console.warn('Failed to read sections from localStorage:', error);
	}

	return [...DEFAULT_SECTIONS];
}

function saveSections(sections: SectionConfig[]) {
	if (!browser) return;
	try {
		const sectionsJson = JSON.stringify(sections);
		console.log(
			'[Sections Store] Saving sections to localStorage:',
			sections.map((s) => ({
				id: s.id,
				order: s.order,
				enabled: s.enabled,
			})),
		);
		localStorage.setItem(STORAGE_KEY, sectionsJson);

		// Track changes for sync - save the full sections configuration
		// This includes both visibility (enabled) and order information
		if (syncManager) {
			console.log('[Sections Store] Tracking setting change for sync');
			syncManager.trackSettingChange('kite-sections', sectionsJson);
		}
	} catch (error) {
		console.warn('Failed to save sections to localStorage:', error);
	}
}

function loadSections() {
	console.log('[Sections Store] Loading sections from localStorage');
	const initial = getInitialSections();
	console.log(
		'[Sections Store] Loaded sections:',
		initial.map((s) => ({
			id: s.id,
			order: s.order,
			enabled: s.enabled,
		})),
	);
	sectionsState.splice(0, sectionsState.length, ...initial);
}

// Auto-initialize when browser is available
if (browser) {
	loadSections();
}

// Sections store API
export const sections = {
	get list() {
		return sectionsState;
	},

	get order() {
		return sectionsState.map((s) => s.id);
	},

	get settings() {
		return sectionsState.reduce(
			(acc, section) => {
				acc[section.id] = section.enabled;
				return acc;
			},
			{} as Record<string, boolean>,
		);
	},

	toggleSection(sectionId: string) {
		// Sources section cannot be disabled
		if (sectionId === 'sources') return;

		const section = sectionsState.find((s) => s.id === sectionId);
		if (section) {
			section.enabled = !section.enabled;
			saveSections(sectionsState);
		}
	},

	setOrder(sectionId: string, newOrder: number) {
		const section = sectionsState.find((s) => s.id === sectionId);
		if (section) {
			section.order = newOrder;
			saveSections(sectionsState);
		}
	},

	moveSectionUp(sectionId: string) {
		const index = sectionsState.findIndex((s) => s.id === sectionId);
		if (index > 0) {
			const temp = sectionsState[index];
			sectionsState[index] = sectionsState[index - 1];
			sectionsState[index - 1] = temp;
			saveSections(sectionsState);
		}
	},

	moveSectionDown(sectionId: string) {
		const index = sectionsState.findIndex((s) => s.id === sectionId);
		if (index < sectionsState.length - 1) {
			const temp = sectionsState[index];
			sectionsState[index] = sectionsState[index + 1];
			sectionsState[index + 1] = temp;
			saveSections(sectionsState);
		}
	},

	reorderSections(newOrder: SectionConfig[]) {
		sectionsState.splice(0, sectionsState.length, ...newOrder);
		saveSections(sectionsState);
	},

	reset() {
		sectionsState.splice(0, sectionsState.length, ...DEFAULT_SECTIONS);
		saveSections(sectionsState);
	},

	init() {
		if (browser) {
			console.log('[Sections Store] init() called - about to reload sections');
			const before = localStorage.getItem(STORAGE_KEY);
			console.log(
				'[Sections Store] Current localStorage value before init:',
				before ? JSON.parse(before).slice(0, 3) : 'null',
			);

			loadSections();

			const after = localStorage.getItem(STORAGE_KEY);
			console.log(
				'[Sections Store] localStorage value after init:',
				after ? JSON.parse(after).slice(0, 3) : 'null',
			);
		}
	},
};
