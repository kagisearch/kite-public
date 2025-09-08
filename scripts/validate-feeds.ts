import { readFile } from 'node:fs/promises';

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

type IssueType =
	| 'duplicate'
	| 'network'
	| 'invalid-content-type'
	| 'not-rss'
	| 'banned-host'
	| 'thin-content'
	| 'no-items'
	| 'stale';

interface ValidationIssue {
	url: string;
	message: string;
	severity: 'error' | 'warning' | 'info';
	suggestRemoval?: boolean;
	type: IssueType;
}

interface DuplicateIssue extends ValidationIssue {
	category: string;
}

function stripHtml(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/<style[\s\S]*?<\/style>/gi, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/\s+/g, ' ')
		.trim();
}

function parseRssLikeItems(xml: string): { title: string; content: string; pubDate?: Date }[] {
	const items: { title: string; content: string; pubDate?: Date }[] = [];

	// RSS 2.0 items
	const rssItemRegex = /<item[\s\S]*?<\/item>/gi;
	const rssItems = xml.match(rssItemRegex) || [];
	for (const block of rssItems) {
		const title = (block.match(/<title[\s\S]*?>([\s\S]*?)<\/title>/i)?.[1] || '').trim();
		const contentEncoded = block.match(/<content:encoded[\s\S]*?>([\s\S]*?)<\/content:encoded>/i)?.[1] || '';
		const description = block.match(/<description[\s\S]*?>([\s\S]*?)<\/description>/i)?.[1] || '';
		const raw = contentEncoded || description;
		const content = stripHtml(raw);
		const pubStr = block.match(/<pubDate[\s\S]*?>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() ?? '';
		const pubDate = pubStr ? new Date(pubStr as string) : undefined;
		items.push({ title: stripHtml(title), content, pubDate });
	}

	// Atom entries
	if (items.length === 0) {
		const atomEntryRegex = /<entry[\s\S]*?<\/entry>/gi;
		const atomEntries = xml.match(atomEntryRegex) || [];
		for (const block of atomEntries) {
			const title = (block.match(/<title[\s\S]*?>([\s\S]*?)<\/title>/i)?.[1] || '').trim();
			const contentTag = block.match(/<content[\s\S]*?>([\s\S]*?)<\/content>/i)?.[1] || '';
			const summaryTag = block.match(/<summary[\s\S]*?>([\s\S]*?)<\/summary>/i)?.[1] || '';
			const raw = contentTag || summaryTag;
			const content = stripHtml(raw);
			const updated = block.match(/<updated[\s\S]*?>([\s\S]*?)<\/updated>/i)?.[1]?.trim() ?? '';
			const published = block.match(/<published[\s\S]*?>([\s\S]*?)<\/published>/i)?.[1]?.trim() ?? '';
			const dateStr = updated || published;
			const pubDate = dateStr ? new Date(dateStr as string) : undefined;
			items.push({ title: stripHtml(title), content, pubDate });
		}
	}

	return items;
}

function isThinContent(items: { title: string; content: string }[], sampleSize = 5): boolean {
	const sample = items.slice(0, sampleSize);
	if (sample.length === 0) return true;
	let thinCount = 0;
	for (const it of sample) {
		const content = (it.content || '').trim();
		const title = (it.title || '').trim();
		const contentNoUrl = content.replace(/https?:\/\/\S+/g, '').trim();
		const onlyUrl = content && !contentNoUrl;
		const veryShort = contentNoUrl.length < 40;
		const similarToTitle = contentNoUrl.length > 0 && title.length > 0 && Math.abs(contentNoUrl.length - title.length) < 10;
		if (onlyUrl || veryShort || similarToTitle) thinCount++;
	}
	return thinCount >= Math.ceil(sample.length * 0.8);
}

function maxItemDate(items: { pubDate?: Date }[]): Date | undefined {
	let max: Date | undefined;
	for (const it of items) {
		if (it.pubDate && !Number.isNaN(it.pubDate.getTime())) {
			if (!max || it.pubDate > max) max = it.pubDate;
		}
	}
	return max;
}

function isBannedHost(hostname: string): boolean {
	const h = hostname.toLowerCase();
	if (h === 'rsshub.app') return true;
	if (h === 'nitter.net') return true;
	return false;
}

async function checkUrl(url: string, timeoutMs = 15000): Promise<ValidationIssue[]> {
	const issues: ValidationIssue[] = [];
	try {
		const host = new URL(url).hostname;
		if (isBannedHost(host)) {
			issues.push({ url, message: `Banned/unsupported host: ${host}`, severity: 'warning', suggestRemoval: false, type: 'banned-host' });
		}
	} catch {
		// ignore URL parse errors here
	}

	try {
		const ctrl = new AbortController();
		const id = setTimeout(() => ctrl.abort(), timeoutMs);
		const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'kite-feed-validator/1.0 (+https://kagi.com)' } });
		clearTimeout(id);
		if (!res.ok) {
			issues.push({ url, message: `HTTP ${res.status}`, severity: 'error', suggestRemoval: true, type: 'network' });
			return issues;
		}
		const ct = res.headers.get('content-type') || '';
		if (!ct.includes('xml') && !ct.includes('rss') && !ct.includes('atom') && !ct.includes('+xml')) {
			issues.push({ url, message: `Unexpected content-type: ${ct}`, severity: 'error', suggestRemoval: true, type: 'invalid-content-type' });
			return issues;
		}
		const text = await res.text();
		if (!text.includes('<rss') && !text.includes('<feed') && !text.includes('<entry') && !text.includes('<item')) {
			issues.push({ url, message: 'Response does not appear to be RSS/Atom XML', severity: 'error', suggestRemoval: true, type: 'not-rss' });
			return issues;
		}

		const items = parseRssLikeItems(text);
		if (items.length === 0) {
			issues.push({ url, message: 'Feed has no items', severity: 'warning', suggestRemoval: false, type: 'no-items' });
			return issues;
		}

		if (isThinContent(items)) {
			issues.push({ url, message: 'Feed items appear to be headline/link-only (very thin content)', severity: 'warning', suggestRemoval: false, type: 'thin-content' });
		}

		const newest = maxItemDate(items);
		if (!newest) {
			issues.push({ url, message: 'Unable to determine item dates (may be stale)', severity: 'info', suggestRemoval: false, type: 'stale' });
		} else {
			const days = (Date.now() - newest.getTime()) / (1000 * 60 * 60 * 24);
			if (days > 90) {
				issues.push({ url, message: `Latest item is ${Math.floor(days)} days old (stale feed)`, severity: 'warning', suggestRemoval: false, type: 'stale' });
			}
		}

		return issues;
	} catch (err: unknown) {
		if (err && typeof err === 'object' && 'name' in err && (err as { name?: string }).name === 'AbortError') {
			return [{ url, message: 'Request timed out', severity: 'error', suggestRemoval: true, type: 'network' }];
		}
		const message = err instanceof Error ? err.message : String(err);
		return [{ url, message: `Fetch error: ${message}`, severity: 'error', suggestRemoval: true, type: 'network' }];
	}
}

async function main() {
	const dataRaw = await readFile('kite_feeds.json', 'utf-8');
	const data = JSON.parse(dataRaw) as Record<string, { feeds?: string[] }>;

	let duplicatesFound = false;

	// Gather feeds and check duplicates per category
	const allFeeds: string[] = [];
	const duplicateDiagnostics: DuplicateIssue[] = [];

	for (const [categoryName, category] of Object.entries(data)) {
		if (!Array.isArray(category?.feeds)) continue;
		const seen = new Set<string>();
		for (const feed of category.feeds) {
			if (seen.has(feed)) {
				duplicatesFound = true;
				duplicateDiagnostics.push({ url: feed, message: `Duplicate feed within category ${categoryName}`, category: categoryName, severity: 'warning', suggestRemoval: false, type: 'duplicate' });
			} else {
				seen.add(feed);
			}
			allFeeds.push(feed);
		}
	}

	const issues = await mapLimit(allFeeds, 10, async (url) => (await checkUrl(url)));

	const flattened = issues.flat();

	const diagnostics: ValidationIssue[] = [
		...duplicateDiagnostics,
		...flattened,
	];
	// Build diff suggestions
	const fileLines = dataRaw.split('\n');
	let diff = '';

	for (const issue of diagnostics) {
		// Emit diagnostic to stderr for reviewdog efm parser
		console.error(`kite_feeds.json:1:${issue.url} -> ${issue.message}`);

		// Generate removal suggestion patch
		if (issue.suggestRemoval) {
			const idx = fileLines.findIndex((l) => l.includes(issue.url));
			if (idx !== -1) {
				const lineNum = idx + 1;
				const lineContent = fileLines[idx];
				diff += `@@ -${lineNum},1 +0,0 @@\n-${lineContent}\n`;
			}
		}
	}

	if (diff) {
		// Output unified diff header
		process.stdout.write(`diff --git a/kite_feeds.json b/kite_feeds.json\n--- a/kite_feeds.json\n+++ b/kite_feeds.json\n${diff}`);
	}

	// Attempt to detect if all newly added feeds are problematic and inform the user
	try {
		let diffCmd = 'git diff -U0 --no-color ';
		if (process.env.GITHUB_EVENT_NAME === 'pull_request' && process.env.GITHUB_BASE_REF) {
			diffCmd += `${process.env.GITHUB_BASE_REF}...HEAD`;
		} else {
			diffCmd += 'HEAD~1';
		}
		diffCmd += ' -- kite_feeds.json';

		const { execSync } = await import('node:child_process');
		const out = execSync(diffCmd, { encoding: 'utf8' });
		const addedUrls = out
			.split('\n')
			.filter((l) => l.startsWith('+') && l.includes('http'))
			.map((l) => l.replace(/^\+\s*"?,?/, '').replace(/",?$/, '').trim())
			.filter(Boolean);

		if (addedUrls.length > 0) {
			const problematic = new Set(
				diagnostics
					.filter((d) => addedUrls.includes(d.url) && (d.severity === 'error' || d.type === 'thin-content' || d.type === 'stale' || d.type === 'no-items'))
					.map((d) => d.url)
			);
			if (problematic.size === addedUrls.length) {
				console.error('kite_feeds.json:1:All newly added feeds appear broken, thin (headline/link-only), or stale. Prefer feeds with full content and recent posts; avoid scraping services.');
			}
		}
	} catch {}

	if (diagnostics.some((d) => d.severity === 'error')) {
		process.exitCode = 1;
	}
}

main().catch((e) => {
	console.error('Unexpected error', e);
}); 