// Shared types for all sorting scripts
export interface Issue {
  type: 'unused' | 'missing' | 'orphaned' | 'duplicate' | 'invalid';
  file: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  suggestion?: string; // For reviewdog suggested edits
  severity: 'error' | 'warning' | 'info';
}

export interface ScriptOutput {
  type: 'feeds' | 'media' | 'locales';
  issues: Issue[];
  summary: {
    totalIssues: number;
    byType: Record<string, number>;
  };
  timestamp: string;
}

export function outputIssues(output: ScriptOutput) {
  if (!process.argv.includes('--output-issues')) return;

  const outFlagIndex = process.argv.indexOf('--output-file');
  const outPath = outFlagIndex !== -1 ? process.argv[outFlagIndex + 1] : undefined;

  const json = JSON.stringify(output, null, 2);

  if (!outPath) {
    // Fallback to stdout JSON
    console.log(json);
    return;
  }

  // Atomic write: write to temp then rename
  const path = require('node:path');
  const fs = require('node:fs');
  const dir = path.dirname(outPath);
  const base = path.basename(outPath);
  const temp = path.join(dir, `.${base}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(temp, json, 'utf-8');
    fs.renameSync(temp, outPath);
  } catch (e) {
    try { fs.unlinkSync(temp); } catch {}
    // If atomic write fails, fallback to stdout to not break pipeline
    console.log(json);
  }
}

export function findLineNumber(content: string, searchKey: string): number {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`"${searchKey}"`)) {
      return i + 1; // 1-based line numbers
    }
  }
  return 1;
}

export function findKeyRange(content: string, searchKey: string): { start: number; end: number } {
  const lines = content.split('\n');
  let startLine = -1;
  let endLine = -1;
  let braceCount = 0;
  let inTargetKey = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes(`"${searchKey}"`)) {
      startLine = i + 1;
      inTargetKey = true;
      braceCount = 0;
    }
    
    if (inTargetKey) {
      // Count braces to find the end of this key's object
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      braceCount += openBraces - closeBraces;
      
      // If we're back to 0 braces and we've seen the key, this is the end
      if (braceCount <= 0 && line.includes('}')) {
        endLine = i + 1;
        break;
      }
    }
  }
  
  return { start: startLine, end: endLine > 0 ? endLine : startLine };
}