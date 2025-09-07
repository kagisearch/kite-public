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
  if (process.argv.includes('--output-issues')) {
    console.log(JSON.stringify(output, null, 2));
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