import fs from 'node:fs';
import path from 'node:path';
import type { Issue } from './shared-types.js';
import { findLineNumber, findKeyRange } from './shared-types.js';

const LOCALES_DIR = 'src/lib/locales';
const BASE_LOCALE = 'en.json';

export interface LocaleEntry {
  text: string;
  translationContext?: string;
}

export interface LocaleData {
  [key: string]: LocaleEntry | string;
}

export interface TranslationIssues {
  unusedKeys: string[];
  missingTranslations: { [language: string]: string[] };
  orphanedTranslations: { [language: string]: string[] };
  duplicateKeys: { [language: string]: string[] };
}

export interface LocaleAnalysis {
  file: string;
  missing: string[];
  extra: string[];
  duplicates: string[];
}

/**
 * Comprehensive translation analysis that finds all types of translation issues
 */
export async function analyzeTranslations(): Promise<TranslationIssues> {
  console.log('🔍 Analyzing translation files...');
  
  const enLocalePath = path.join(LOCALES_DIR, BASE_LOCALE);
  if (!fs.existsSync(enLocalePath)) {
    console.log('⚠️  English locale file not found, skipping translation analysis');
    return { 
      unusedKeys: [], 
      missingTranslations: {}, 
      orphanedTranslations: {},
      duplicateKeys: {}
    };
  }
  
  const enLocale: LocaleData = JSON.parse(fs.readFileSync(enLocalePath, 'utf-8'));
  const enKeys = new Set(Object.keys(enLocale));
  
  // Find unused keys by checking source code
  const unusedKeys = await findUnusedKeys(enKeys);
  
  // Analyze all locale files
  const localeFiles = fs.readdirSync(LOCALES_DIR)
    .filter(file => file.endsWith('.json') && file !== 'index.ts');
  
  const missingTranslations: { [language: string]: string[] } = {};
  const orphanedTranslations: { [language: string]: string[] } = {};
  const duplicateKeys: { [language: string]: string[] } = {};
  
  for (const localeFile of localeFiles) {
    const language = localeFile.replace('.json', '');
    const localePath = path.join(LOCALES_DIR, localeFile);
    const rawContent = fs.readFileSync(localePath, 'utf-8');
    
    // Check for duplicate keys
    const duplicates = detectDuplicateKeys(rawContent);
    if (duplicates.length > 0) {
      duplicateKeys[language] = duplicates;
    }
    
    // Skip further analysis for files with duplicates (they can't be parsed reliably)
    if (duplicates.length > 0) continue;
    
    const localeData: LocaleData = JSON.parse(rawContent);
    const localeKeys = new Set(Object.keys(localeData));
    
    // Find missing translations (in English but not in this language)
    if (language !== 'en') {
      const missing = Array.from(enKeys).filter(key => !localeKeys.has(key));
      if (missing.length > 0) {
        missingTranslations[language] = missing;
      }
      
      // Find orphaned translations (in this language but not in English)
      const orphaned = Array.from(localeKeys).filter(key => !enKeys.has(key));
      if (orphaned.length > 0) {
        orphanedTranslations[language] = orphaned;
      }
    }
  }
  
  return { unusedKeys, missingTranslations, orphanedTranslations, duplicateKeys };
}

/**
 * Find translation keys that are not used in the source code
 */
async function findUnusedKeys(enKeys: Set<string>): Promise<string[]> {
  function collectSourceFiles(rootDir: string): string[] {
    const results: string[] = [];
    const stack: string[] = [rootDir];
    while (stack.length > 0) {
      const dir = stack.pop() as string;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
          stack.push(full);
        } else if (entry.isFile()) {
          if (/\.(svelte|ts|js)$/.test(entry.name)) results.push(full);
        }
      }
    }
    return results;
  }

  const sourceFiles = collectSourceFiles(path.join('src'));
  const sourceContents = sourceFiles.map((file) => fs.readFileSync(file, 'utf-8')).join('\n');
  
  const unusedKeys: string[] = [];
  for (const key of enKeys) {
    // Look for translation function calls: s('key'), s("key"), s(`key`)
    const keyRegex = new RegExp(`s\\s*\\(\\s*['"\`]${key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}['"\`]\\s*[,)]`, 'g');
    if (!keyRegex.test(sourceContents)) {
      unusedKeys.push(key);
    }
  }
  
  return unusedKeys;
}

/**
 * Detect duplicate keys in a JSON file by parsing the raw content
 */
export function detectDuplicateKeys(raw: string): string[] {
  const duplicates: string[] = [];
  const keyPattern = /"([^"]+)":\s*\{/g;
  const keys: string[] = [];
  let match: RegExpExecArray | null = keyPattern.exec(raw);
  
  while (match !== null) {
    const key = match[1];
    if (keys.includes(key)) {
      if (!duplicates.includes(key)) {
        duplicates.push(key);
      }
    } else {
      keys.push(key);
    }
    match = keyPattern.exec(raw);
  }
  
  return duplicates;
}

/**
 * Remove duplicate keys from JSON content, keeping only the last occurrence
 */
export function removeDuplicateKeys(raw: string): string {
  const duplicates = detectDuplicateKeys(raw);
  if (duplicates.length === 0) {
    return raw;
  }
  
  let result = raw;
  
  for (const duplicateKey of duplicates) {
    const escapedKey = duplicateKey.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&');
    const keyPattern = new RegExp(
      `"${escapedKey}":\\s*{(?:[^{}]*(?:{[^{}]*}[^{}]*)*)*}(?=\\s*[,}])`,
      'g'
    );
    
    const matches = [...result.matchAll(keyPattern)];
    
    if (matches.length > 1) {
      // Sort matches by position (reverse order to avoid index shifting)
      matches.sort((a, b) => ( (b.index ?? 0) - (a.index ?? 0) ));
      
      // Remove all but the last occurrence
      for (let i = 1; i < matches.length; i++) {
        const m = matches[i];
        if (m.index !== undefined) {
          let startIndex = m.index;
          let endIndex = m.index + m[0].length;
          
          // Handle comma removal
          const beforeComma = result.slice(Math.max(0, startIndex - 10), startIndex).match(/,\s*$/);
          const afterComma = result.slice(endIndex, endIndex + 10).match(/^\s*,/);
          
          if (beforeComma && !afterComma) {
            startIndex -= beforeComma[0].length;
          } else if (afterComma) {
            endIndex += afterComma[0].length;
          }
          
          result = result.slice(0, startIndex) + result.slice(endIndex);
        }
      }
    }
  }
  
  return result;
}

/**
 * Generate Issue objects for translation problems
 */
export function generateTranslationIssues(issues: TranslationIssues): Issue[] {
  const result: Issue[] = [];
  const enLocalePath = path.join(LOCALES_DIR, BASE_LOCALE);
  
  // Issues for unused keys
  if (fs.existsSync(enLocalePath)) {
    const enContent = fs.readFileSync(enLocalePath, 'utf-8');
    for (const key of issues.unusedKeys) {
      const range = findKeyRange(enContent, key);
      result.push({
        type: 'unused',
        file: 'src/lib/locales/en.json',
        line: range.start,
        endLine: range.end,
        message: `Translation key '${key}' appears to be unused in the codebase`,
        suggestion: '', // Remove the entire key block
        severity: 'info'
      });
    }
  }
  
  // Issues for missing translations
  for (const [language, missingKeys] of Object.entries(issues.missingTranslations)) {
    const localeFile = `src/lib/locales/${language}.json`;
    for (const key of missingKeys) {
      result.push({
        type: 'missing',
        file: localeFile,
        line: 1, // Add at the beginning
        message: `Missing translation for key '${key}'`,
        severity: 'warning'
      });
    }
  }
  
  // Issues for orphaned translations
  for (const [language, orphanedKeys] of Object.entries(issues.orphanedTranslations)) {
    const localeFile = `src/lib/locales/${language}.json`;
    const localeFilePath = path.join(LOCALES_DIR, `${language}.json`);
    
    if (fs.existsSync(localeFilePath)) {
      const localeContent = fs.readFileSync(localeFilePath, 'utf-8');
      for (const key of orphanedKeys) {
        const range = findKeyRange(localeContent, key);
        result.push({
          type: 'orphaned',
          file: localeFile,
          line: range.start,
          endLine: range.end,
          message: `Translation key '${key}' exists in ${language}.json but not in en.json (master)`,
          suggestion: '', // Remove the orphaned key
          severity: 'warning'
        });
      }
    }
  }
  
  // Issues for duplicate keys
  for (const [language, duplicateKeys] of Object.entries(issues.duplicateKeys)) {
    const localeFile = `src/lib/locales/${language}.json`;
    const localeFilePath = path.join(LOCALES_DIR, `${language}.json`);
    
    if (fs.existsSync(localeFilePath)) {
      const localeContent = fs.readFileSync(localeFilePath, 'utf-8');
      for (const key of duplicateKeys) {
        const lineNumber = findLineNumber(localeContent, key);
        result.push({
          type: 'duplicate',
          file: localeFile,
          line: lineNumber,
          message: `Duplicate translation key '${key}'`,
          severity: 'error'
        });
      }
    }
  }
  
  return result;
}

/**
 * Get locale analysis for individual files (used by sort-locales.ts)
 */
export function getLocaleAnalyses(): LocaleAnalysis[] {
  const basePath = path.join(LOCALES_DIR, BASE_LOCALE);
  if (!fs.existsSync(basePath)) {
    console.error('Base locale en.json not found');
    return [];
  }
  
  const baseKeys = Object.keys(JSON.parse(fs.readFileSync(basePath, 'utf-8')));
  const analyses: LocaleAnalysis[] = [];

  const files = fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const full = path.join(LOCALES_DIR, file);
    const raw = fs.readFileSync(full, 'utf-8');
    
    // Check for duplicate keys
    const duplicates = detectDuplicateKeys(raw);
    
    // Skip parsing if there are duplicates
    if (duplicates.length > 0) {
      analyses.push({ file, missing: [], extra: [], duplicates });
      continue;
    }
    
    const data = JSON.parse(raw);
    const keys = Object.keys(data);
    const missing = baseKeys.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !baseKeys.includes(k));
    
    analyses.push({ file, missing, extra, duplicates });
  }
  
  return analyses;
}