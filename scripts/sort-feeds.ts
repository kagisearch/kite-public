import { logProcessing, logSuccess, logNoChange, logBullet } from './console-utils.js';
import { runScript } from './shared-runner.js';
import type { ScriptResult } from './shared-runner.js';
import { analyzeTranslations, generateTranslationIssues } from './translation-analyzer.js';
import fs from 'node:fs';

const FEEDS_FILE = 'kite_feeds.json';

type CategoryType = 'country' | 'region' | 'city' | 'topic' | string;

interface CategoryData {
	category_type?: CategoryType;
	source_language?: string;
	display_names?: Record<string, string>;
	feeds: string[];
	[k: string]: unknown;
}

interface FeedsJson {
	[categoryName: string]: CategoryData;
}

// Desired order of types
const CATEGORY_TYPE_ORDER: CategoryType[] = ['country', 'region', 'city', 'topic'];

function getCategoryType(cat: CategoryData): CategoryType {
	return cat.category_type ?? 'topic';
}

function typeRank(type: CategoryType): number {
	const idx = CATEGORY_TYPE_ORDER.indexOf(type);
	return idx === -1 ? CATEGORY_TYPE_ORDER.length : idx;
}

function sortCategories(data: FeedsJson): [string, CategoryData][] {
	return Object.entries(data).sort(([aName, aData], [bName, bData]) => {
		const rankDiff = typeRank(getCategoryType(aData)) - typeRank(getCategoryType(bData));
		if (rankDiff !== 0) return rankDiff;
		return aName.localeCompare(bName);
	});
}

// Feeds are ordered by site, not by raw URL: the scheme and a leading "www."
// are ignored, so http:// and https:// entries for the same site sit next to
// each other. URLs that only differ by scheme, "www." or a trailing slash are
// the same feed; the https one (then the shortest) is kept.
// Keep in sync with feedKey/dedupe_and_sort in sort-core-feeds.py.
const URL_PARTS = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)(.*)$/i;

function feedKey(url: string): [string, string] {
	const m = URL_PARTS.exec(url.trim());
	if (!m) return [url.trim().toLowerCase(), ''];
	const host = m[2].toLowerCase().replace(/^www\./, '');
	const q = m[3].indexOf('?');
	const path = (q === -1 ? m[3] : m[3].slice(0, q)).replace(/\/+$/, '');
	return [host, q === -1 ? path : path + m[3].slice(q)];
}

function cmp(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

function preferred(a: string, b: string): string {
	const aHttps = a.startsWith('https://');
	if (aHttps !== b.startsWith('https://')) return aHttps ? a : b;
	if (a.length !== b.length) return a.length < b.length ? a : b;
	return cmp(a, b) <= 0 ? a : b;
}

function dedupeAndSort(urls: string[]): string[] {
	const byKey = new Map<string, { key: [string, string]; url: string }>();
	for (const url of urls) {
		const key = feedKey(url);
		const id = `${key[0]} ${key[1]}`;
		const seen = byKey.get(id);
		byKey.set(id, { key, url: seen ? preferred(seen.url, url) : url });
	}
	return [...byKey.values()]
		.sort((a, b) => cmp(a.key[0], b.key[0]) || cmp(a.key[1], b.key[1]))
		.map((e) => e.url);
}

function main() {
	logProcessing(`Reading ${FEEDS_FILE}`);
	const raw = fs.readFileSync(FEEDS_FILE, 'utf-8');
	const json: FeedsJson = JSON.parse(raw);

	const out: FeedsJson = {};
	let totalDupes = 0;

	const sortedCats = sortCategories(json);
	for (const [name, cat] of sortedCats) {
		const original = cat.feeds.length;
		const feeds = dedupeAndSort(cat.feeds);
		const dupes = original - feeds.length;
		totalDupes += dupes;
		if (dupes) logBullet(`${name}: removed ${dupes} duplicate feed(s)`);
		out[name] = { ...cat, feeds };
	}

	const newRaw = `${JSON.stringify(out, null, 2)}\n`;
	if (newRaw !== raw) {
		fs.writeFileSync(FEEDS_FILE, newRaw, 'utf-8');
		logSuccess(`${FEEDS_FILE} sorted. Duplicates removed: ${totalDupes}`);
	} else {
		logNoChange('No changes – already sorted');
	}
}

// This function is now handled by generateTranslationIssues in translation-analyzer.ts

async function analyzeFeeds(): Promise<ScriptResult> {
	const translationIssues = await analyzeTranslations();
	const issues = generateTranslationIssues(translationIssues);

	const totalMissing = Object.values(translationIssues.missingTranslations).flat().length;
	const totalOrphaned = Object.values(translationIssues.orphanedTranslations).flat().length;
	const totalDuplicates = Object.values(translationIssues.duplicateKeys).flat().length;

	return {
		issues,
		summary: {
			totalIssues: issues.length,
			byType: {
				unused: translationIssues.unusedKeys.length,
				missing: totalMissing,
				orphaned: totalOrphaned,
				duplicate: totalDuplicates,
			},
		},
	};
}

// Script entry point
if (import.meta.url === `file://${process.argv[1]}`) {
	await runScript({ type: 'feeds', name: 'Translation' }, main, analyzeFeeds);
}
