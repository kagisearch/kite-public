import fs from 'node:fs';
import path from 'node:path';
import { runScript } from './shared-runner.js';
import type { ScriptResult } from './shared-runner.js';
import { 
  detectDuplicateKeys, 
  removeDuplicateKeys,
  getLocaleAnalyses,
} from './translation-analyzer.js';
import type { LocaleAnalysis } from './translation-analyzer.js';
import type { Issue } from './shared-types.js';
import { findKeyRange, findLineNumber } from './shared-types.js';
import { logSuccess, logWarning } from './console-utils.js';

const LOCALE_DIR = 'src/lib/locales';
const BASE = 'en.json';

// Desired order of key categories (prefixes)
const KEY_CATEGORY_ORDER = [
  'auth',
  'user', 
  'profile',
  'settings',
  'nav',
  'menu',
  'button',
  'form',
  'error',
  'success',
  'warning',
  'info',
  'common',
  'misc'
];

function getKeyCategory(key: string): string {
  const parts = key.split('.');
  return parts[0] || 'misc';
}

function getCategoryRank(category: string): number {
  const idx = KEY_CATEGORY_ORDER.indexOf(category);
  return idx === -1 ? KEY_CATEGORY_ORDER.length : idx;
}

function sortObject<T extends Record<string, unknown>>(obj: T): T {
  return Object.keys(obj)
    .sort((a, b) => {
      const categoryA = getKeyCategory(a);
      const categoryB = getKeyCategory(b);
      
      // First sort by category rank
      const rankDiff = getCategoryRank(categoryA) - getCategoryRank(categoryB);
      if (rankDiff !== 0) return rankDiff;
      
      // Then sort alphabetically within category
      return a.localeCompare(b);
    })
    .reduce((acc, key) => {
      // @ts-expect-error index
      acc[key] = obj[key];
      return acc;
    }, {} as T);
}

// These functions are now in translation-analyzer.ts

function generateLocaleIssues(analyses: LocaleAnalysis[]): Issue[] {
  const issues: Issue[] = [];
  
  for (const analysis of analyses) {
    const filePath = path.join(LOCALE_DIR, analysis.file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Issues for missing keys
    for (const missingKey of analysis.missing) {
      issues.push({
        type: 'missing',
        file: `src/lib/locales/${analysis.file}`,
        line: 1, // Add at beginning
        message: `Missing translation key '${missingKey}' (exists in en.json)`,
        severity: 'warning'
      });
    }
    
    // Issues for extra/orphaned keys
    for (const extraKey of analysis.extra) {
      const range = findKeyRange(content, extraKey);
      issues.push({
        type: 'orphaned',
        file: `src/lib/locales/${analysis.file}`,
        line: range.start,
        endLine: range.end,
        message: `Orphaned translation key '${extraKey}' (not in en.json)`,
        suggestion: '', // Remove the key
        severity: 'warning'
      });
    }
    
    // Issues for duplicate keys
    for (const duplicateKey of analysis.duplicates) {
      const lineNumber = findLineNumber(content, duplicateKey);
      issues.push({
        type: 'duplicate',
        file: `src/lib/locales/${analysis.file}`,
        line: lineNumber,
        message: `Duplicate translation key '${duplicateKey}'`,
        severity: 'error'
      });
    }
  }
  
  return issues;
}

function main(): LocaleAnalysis[] {
  const basePath = path.join(LOCALE_DIR, BASE);
  if (!fs.existsSync(basePath)) {
    console.error('Base locale en.json not found');
    return [];
  }
  const baseKeys = Object.keys(JSON.parse(fs.readFileSync(basePath, 'utf-8')));
  const analyses: LocaleAnalysis[] = [];

  const files = fs.readdirSync(LOCALE_DIR).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const full = path.join(LOCALE_DIR, file);
    let raw = fs.readFileSync(full, 'utf-8');
    
    // Check for and remove duplicate keys
    const duplicates = detectDuplicateKeys(raw);
    if (duplicates.length > 0) {
      logWarning(`${file}: found duplicate keys -> ${duplicates.join(', ')}`);
      raw = removeDuplicateKeys(raw);
      console.log(`${file}: removed duplicate keys`);
    }
    
    const data = JSON.parse(raw);

    // collect diagnostics
    const keys = Object.keys(data);
    const missing = baseKeys.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !baseKeys.includes(k));
    
    analyses.push({ file, missing, extra, duplicates });
    
    if (missing.length) {
      logWarning(`${file}: missing keys -> ${missing.slice(0,5).join(', ')}${missing.length>5?'…':''}`);
    }
    if (extra.length) {
      logWarning(`${file}: extra keys -> ${extra.slice(0,5).join(', ')}${extra.length>5?'…':''}`);
    }

    const sorted = sortObject(data);
    const newRaw = `${JSON.stringify(sorted, null, 2)}\n`;
    if (newRaw !== raw) {
      fs.writeFileSync(full, newRaw, 'utf-8');
      logSuccess(`${file} sorted`);
    }
  }
  
  return analyses;
}

function analyzeLocales(): ScriptResult {
  // Get analyses without running main() again (it was already run)
  const analyses = getLocaleAnalyses();
  const issues = generateLocaleIssues(analyses);
  
  const totalMissing = analyses.reduce((sum, a) => sum + a.missing.length, 0);
  const totalExtra = analyses.reduce((sum, a) => sum + a.extra.length, 0);
  const totalDuplicates = analyses.reduce((sum, a) => sum + a.duplicates.length, 0);
  
  return {
    issues,
    summary: {
      totalIssues: issues.length,
      byType: {
        missing: totalMissing,
        orphaned: totalExtra,
        duplicate: totalDuplicates
      }
    }
  };
}

// Script entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  await runScript(
    { type: 'locales', name: 'Locale' },
    () => { main(); }, // Wrap main to match signature
    analyzeLocales
  );
} 