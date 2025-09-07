import { readFile } from 'node:fs/promises';
import { setTimeout as wait } from 'node:timers/promises';

// Simple concurrency limiter
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
	const ret: R[] = [];
	const executing: Promise<void>[] = [];
	for (const item of items) {
		const p = fn(item).then((v) => {
			ret.push(v);
		});
		executing.push(p);
		if (executing.length >= limit) {
			await Promise.race(executing);
			executing.splice(executing.findIndex((e) => e === p), 1);
		}
	}
	await Promise.all(executing);
	return ret;
}

interface ValidationIssue {
	url: string;
	message: string;
}

interface DuplicateIssue extends ValidationIssue {
	category: string;
}

async function checkUrl(url: string, timeoutMs = 15000): Promise<ValidationIssue | null> {
	try {
		const ctrl = new AbortController();
		const id = setTimeout(() => ctrl.abort(), timeoutMs);
		const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'kite-feed-validator/1.0 (+https://kagi.com)' } });
		clearTimeout(id);
		if (!res.ok) {
			return { url, message: `HTTP ${res.status}` };
		}
		const ct = res.headers.get('content-type') || '';
		if (!ct.includes('xml') && !ct.includes('rss') && !ct.includes('atom') && !ct.includes('+xml')) {
			return { url, message: `Unexpected content-type: ${ct}` };
		}
		// Optionally attempt to parse small sample to ensure XML structure
		const text = await res.text();
		if (!text.includes('<rss') && !text.includes('<feed')) {
			return { url, message: 'Response does not appear to be RSS/Atom XML' };
		}
		return null;
	} catch (err: any) {
		return { url, message: err.name === 'AbortError' ? 'Request timed out' : `Fetch error: ${err.message}` };
	}
}

async function main() {
	const dataRaw = await readFile('kite_feeds.json', 'utf-8');
	const data = JSON.parse(dataRaw);

	let duplicatesFound = false;

	// Gather feeds and check duplicates per category
	const allFeeds: string[] = [];
	const duplicateDiagnostics: DuplicateIssue[] = [];

	for (const [categoryName, category] of Object.entries<any>(data)) {
		if (!Array.isArray(category?.feeds)) continue;
		const seen = new Set<string>();
		for (const feed of category.feeds) {
			if (seen.has(feed)) {
				duplicatesFound = true;
				duplicateDiagnostics.push({ url: feed, message: 'Duplicate feed within category ' + categoryName, category: categoryName });
			} else {
				seen.add(feed);
			}
			allFeeds.push(feed);
		}
	}

	const issues = await mapLimit(allFeeds, 10, async (url) => (await checkUrl(url)));

	const diagnostics = [...duplicateDiagnostics, ...(issues.filter(Boolean) as ValidationIssue[])];
	// Build diff suggestions
	const fileLines = dataRaw.split('\n');
	let diff = '';

	for (const issue of diagnostics) {
		// Emit diagnostic to stderr for reviewdog efm parser
		console.error(`kite_feeds.json:1:${issue.url} -> ${issue.message}`);

		// Generate removal suggestion patch
		const idx = fileLines.findIndex((l) => l.includes(issue.url));
		if (idx !== -1) {
			const lineNum = idx + 1;
			const lineContent = fileLines[idx];
			diff += `@@ -${lineNum},1 +0,0 @@\n-${lineContent}\n`;
		}
	}

	if (diff) {
		// Output unified diff header
		process.stdout.write(`diff --git a/kite_feeds.json b/kite_feeds.json\n--- a/kite_feeds.json\n+++ b/kite_feeds.json\n${diff}`);
	}

	if (diagnostics.length > 0) {
		process.exitCode = 1;
	}
}

main().catch((e) => {
	console.error('Unexpected error', e);
}); 