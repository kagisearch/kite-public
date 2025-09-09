import fs from 'node:fs';
import { runScript } from './shared-runner.js';
import type { ScriptResult } from './shared-runner.js';
import type { Issue } from './shared-types.js';
import { findLineNumber } from './shared-types.js';
import { logProcessing, logSuccess, logNoChange, logAnalysis } from './console-utils.js';

const FILE = 'media_data.json';

interface Entry {
  country: string;
  organization: string;
  domains: string[];
  description: string;
  owner: string;
  typology: string;
  [k: string]: unknown;
}

function sortAndUnique(arr: string[]) {
  return [...new Set(arr.map((d) => d.toLowerCase()))].sort();
}

async function findUnusedMediaDomains(data: Entry[]): Promise<string[]> {
  logAnalysis('Checking for unused media domains...');
  
  // Get all domains from media data
  const allDomains = new Set<string>();
  for (const entry of data) {
    for (const domain of entry.domains) {
      allDomains.add(domain.toLowerCase());
    }
  }
  
  // Read kite_feeds.json to check which domains are actually used in feeds
  const FEEDS_FILE = 'kite_feeds.json';
  if (!fs.existsSync(FEEDS_FILE)) {
    console.log('⚠️  kite_feeds.json not found, skipping unused domain check');
    return [];
  }
  
  const feedsContent = fs.readFileSync(FEEDS_FILE, 'utf-8');
  
  // Check which domains are not referenced in feeds
  const unusedDomains: string[] = [];
  for (const domain of allDomains) {
    // Look for domain references (with or without protocol) in feeds
    const domainRegex = new RegExp(`(https?://)?${domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
    if (!domainRegex.test(feedsContent)) {
      unusedDomains.push(domain);
    }
  }
  
  return unusedDomains;
}

function findDuplicateOrganizations(data: Entry[]): Entry[] {
  const seen = new Map<string, Entry>();
  const duplicates: Entry[] = [];
  
  for (const entry of data) {
    const key = `${entry.country}-${entry.organization}`;
    if (seen.has(key)) {
      duplicates.push(entry);
    } else {
      seen.set(key, entry);
    }
  }
  
  return duplicates;
}

async function generateMediaIssues(data: Entry[]): Promise<Issue[]> {
  const issues: Issue[] = [];
  const rawContent = fs.readFileSync(FILE, 'utf-8');
  
  // Find unused domains
  const unusedDomains = await findUnusedMediaDomains(data);
  for (const domain of unusedDomains) {
    const lineNumber = findLineNumber(rawContent, domain);
    issues.push({
      type: 'unused',
      file: FILE,
      line: lineNumber,
      message: `Media domain '${domain}' is not referenced in any feeds (kite_feeds.json)`,
      severity: 'info'
    });
  }
  
  // Find duplicate organizations
  const duplicates = findDuplicateOrganizations(data);
  for (const duplicate of duplicates) {
    const lineNumber = findLineNumber(rawContent, duplicate.organization);
    issues.push({
      type: 'duplicate',
      file: FILE,
      line: lineNumber,
      message: `Duplicate organization '${duplicate.organization}' in country '${duplicate.country}'`,
      severity: 'warning'
    });
  }
  
  return issues;
}

function main(): Entry[] {
  const raw = fs.readFileSync(FILE, 'utf8');
  const data: Entry[] = JSON.parse(raw);

  // process entries
  const processed = data.map((e) => ({
    ...e,
    domains: sortAndUnique(e.domains || []),
  }));

  processed.sort((a, b) => {
    // First sort by typology (category)
    const t = a.typology.localeCompare(b.typology);
    if (t !== 0) return t;
    
    // Then by country
    const c = a.country.localeCompare(b.country);
    if (c !== 0) return c;
    
    // Finally by organization
    return a.organization.localeCompare(b.organization);
  });

  const newRaw = `${JSON.stringify(processed, null, 2)}\n`;
  if (newRaw !== raw) {
    fs.writeFileSync(FILE, newRaw, 'utf8');
    logSuccess('media_data.json sorted and deduplicated');
  } else {
    logNoChange('media_data.json already sorted');
  }
  
  return processed;
}

async function analyzeMedia(): Promise<ScriptResult> {
  const processedData = main();
  const issues = await generateMediaIssues(processedData);
  
  return {
    issues,
    summary: {
      totalIssues: issues.length,
      byType: {
        unused: issues.filter(i => i.type === 'unused').length,
        duplicate: issues.filter(i => i.type === 'duplicate').length
      }
    }
  };
}

// Script entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  await runScript(
    { type: 'media', name: 'Media' },
    () => { main(); }, // Wrap main to match signature
    analyzeMedia
  );
} 