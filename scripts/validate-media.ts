import { readFile } from 'node:fs/promises';
import { readFile as read } from 'node:fs/promises';
import { URL } from 'node:url';

interface MediaEntry {
  country?: string;
  organization?: string;
  domains?: string[];
  description?: string;
  owner?: string;
  typology?: string;
  [k: string]: unknown;
}

interface Issue {
  message: string;
  line: number;
}

async function main() {
  const raw = await readFile('media_data.json', 'utf-8');
  const entries: MediaEntry[] = JSON.parse(raw);

  const issues: Issue[] = [];
  const domainSet = new Map<string, number>();

  const currentLine = 1;
  const lineMap: number[] = [];
  for (const [idx] of raw.split(/\n/).entries()) {
    lineMap.push(idx + 1);
  }

  for (const [idx, entry] of entries.entries()) {
    const baseLine = lineMap[idx];
    const required: (keyof MediaEntry)[] = [
      'country',
      'organization',
      'domains',
      'description',
      'owner',
      'typology',
    ];
    for (const key of required) {
      if (entry[key] === undefined || entry[key] === null || (key === 'domains' && !(entry.domains?.length))) {
        issues.push({
          message: `Missing ${String(key)} for record #${idx + 1}`,
          line: baseLine,
        });
      }
    }

    for (const d of entry.domains || []) {
      const lower = d.toLowerCase();
      if (domainSet.has(lower)) {
        issues.push({ message: `Duplicate domain ${d} (record #${idx + 1})`, line: baseLine });
      } else {
        domainSet.set(lower, idx);
      }
    }
  }

  for (const issue of issues) {
    console.error(`media_data.json:${issue.line}:${issue.message}`);
  }

  // ---- compare with kite_feeds.json -----
  const mediaDomains = new Set<string>();
  for (const e of entries) {
    for (const d of e.domains || []) {
      mediaDomains.add(d.toLowerCase());
    }
  }

  // collect only feeds added in this commit/PR
  let diffCmd = 'git diff -U0 --no-color ';
  if (process.env.GITHUB_EVENT_NAME === 'pull_request' && process.env.GITHUB_BASE_REF) {
    diffCmd += `${process.env.GITHUB_BASE_REF}...HEAD`;
  } else {
    diffCmd += 'HEAD~1';
  }
  diffCmd += ' -- kite_feeds.json';

  const diff = await import('node:child_process').then((m) => m.execSync(diffCmd, { encoding: 'utf8' }));
  const addedUrls: string[] = diff
    .split('\n')
    .filter((l) => l.startsWith('+') && l.includes('http'))
    .map((l) => l.replace(/^\+\s*",?/, '').replace(/",?$/, '').trim())
    .filter(Boolean);

  const unknownDomains = new Set<string>();
  for (const url of addedUrls) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (!mediaDomains.has(host)) unknownDomains.add(host);
    } catch {}
  }

  for (const d of unknownDomains) {
    console.error(`kite_feeds.json:1: Domain ${d} missing in media_data.json`);
  }

  // exit code 0 (advisory)
}

main().catch((e) => {
  console.error('validator crashed', e);
}); 