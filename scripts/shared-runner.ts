import type { Issue, ScriptOutput } from './shared-types.js';
import { outputIssues } from './shared-types.js';
import { setInfoLogsToStderr } from './console-utils.js';

export interface ScriptConfig {
  type: 'feeds' | 'media' | 'locales';
  name: string;
}

export interface ScriptResult {
  issues: Issue[];
  summary: {
    totalIssues: number;
    byType: Record<string, number>;
  };
}

/**
 * Common script execution wrapper that handles:
 * - --output-issues flag detection
 * - ScriptOutput creation and outputIssues() calling
 * - Error handling
 */
export async function runScript(
  config: ScriptConfig,
  mainFunction: () => Promise<void> | void,
  analysisFunction: () => Promise<ScriptResult> | ScriptResult
): Promise<void> {
  try {
    // Always run the main function first (sorting/processing)
    await mainFunction();
    
    // If --output-issues flag is present, generate issues for reviewdog
    if (process.argv.includes('--output-issues')) {
      // Route non-JSON logs to stderr to keep stdout clean when redirecting
      setInfoLogsToStderr(true);
      const result = await analysisFunction();
      const output: ScriptOutput = {
        type: config.type,
        issues: result.issues,
        summary: result.summary,
        timestamp: new Date().toISOString()
      };
      outputIssues(output);
      return;
    }
    
    // Otherwise, run analysis and show console output
    const result = await analysisFunction();
    showConsoleSummary(config.name, result);
    
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('❌ Error:', message);
    process.exit(1);
  }
}

/**
 * Display a formatted console summary of analysis results
 */
function showConsoleSummary(scriptName: string, result: ScriptResult): void {
  if (result.summary.totalIssues > 0) {
    console.log(`\n🔍 ${scriptName} Analysis Results:`);
    
    // Display counts by type
    for (const [type, count] of Object.entries(result.summary.byType)) {
      if (count > 0) {
        const emoji = getEmojiForType(type);
        console.log(`  ${emoji} ${count} ${type} ${count === 1 ? 'issue' : 'issues'}`);
      }
    }
    
    console.log(`  📊 ${result.summary.totalIssues} total issues`);
  } else {
    console.log(`\n✅ No ${scriptName.toLowerCase()} issues found`);
  }
}

/**
 * Get appropriate emoji for issue type
 */
function getEmojiForType(type: string): string {
  const emojiMap: Record<string, string> = {
    unused: '🔑',
    missing: '🌍',
    orphaned: '👻',
    duplicate: '🔄',
    invalid: '❌',
    unreachable: '🔗'
  };
  return emojiMap[type] || '📝';
}

/**
 * Wrapper for script entry point
 */
// Note: createScriptEntry cannot work because import.meta.url refers to this file, not the caller
// Each script needs to handle its own entry point detection