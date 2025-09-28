/**
 * Shared console utilities for consistent formatting across scripts
 */

let routeInfoLogsToStderr = false;

export function setInfoLogsToStderr(enable: boolean): void {
  routeInfoLogsToStderr = enable;
}

/**
 * Log a success message with checkmark
 */
export function logSuccess(message: string): void {
  const writer = routeInfoLogsToStderr ? console.error : console.log;
  writer(`✅ ${message}`);
}

/**
 * Log a warning message with warning icon
 */
export function logWarning(message: string): void {
  console.warn(`⚠️  ${message}`);
}

/**
 * Log an error message with X icon
 */
export function logError(message: string): void {
  console.error(`❌ ${message}`);
}

/**
 * Log an info message with info icon
 */
export function logInfo(message: string): void {
  const writer = routeInfoLogsToStderr ? console.error : console.log;
  writer(`ℹ️  ${message}`);
}

/**
 * Log a processing message with appropriate icon
 */
export function logProcessing(message: string): void {
  const writer = routeInfoLogsToStderr ? console.error : console.log;
  writer(`📄 ${message}`);
}

/**
 * Log a search/analysis message
 */
export function logAnalysis(message: string): void {
  const writer = routeInfoLogsToStderr ? console.error : console.log;
  writer(`🔍 ${message}`);
}

/**
 * Log a balance/no-change message
 */
export function logNoChange(message: string): void {
  const writer = routeInfoLogsToStderr ? console.error : console.log;
  writer(`⚖️  ${message}`);
}

/**
 * Log a bullet point with custom icon
 */
export function logBullet(message: string, icon = '🔹'): void {
  const writer = routeInfoLogsToStderr ? console.error : console.log;
  writer(`  ${icon} ${message}`);
}

/**
 * Format a count with appropriate pluralization
 */
export function formatCount(count: number, singular: string, plural?: string): string {
  const word = count === 1 ? singular : (plural || `${singular}s`);
  return `${count} ${word}`;
}

/**
 * Format a list of items with truncation
 */
export function formatList(items: string[], maxItems = 5): string {
  if (items.length <= maxItems) {
    return items.join(', ');
  }

  const shown = items.slice(0, maxItems);
  const remaining = items.length - maxItems;
  return `${shown.join(', ')}${remaining > 0 ? `… (+${remaining} more)` : ''}`;
}

/**
 * Create a section header with emoji
 */
export function logSectionHeader(title: string, emoji = '📊'): void {
  const writer = routeInfoLogsToStderr ? console.error : console.log;
  writer(`\n${emoji} ${title}:`);
}

/**
 * Log a summary line with count and description
 */
export function logSummaryLine(count: number, description: string, emoji: string): void {
  if (count > 0) {
    const writer = routeInfoLogsToStderr ? console.error : console.log;
    writer(`  ${emoji} ${formatCount(count, description)}`);
  }
}

/**
 * Log detailed items with truncation
 */
export function logDetailedItems(
  title: string,
  items: string[],
  emoji = '📝',
  maxItems = 10
): void {
  if (items.length === 0) return;

  console.log(`\n${emoji} ${title}:`);
  for (const item of items.slice(0, maxItems)) {
    const writer = routeInfoLogsToStderr ? console.error : console.log;
    writer(`  - ${item}`);
  }

  if (items.length > maxItems) {
    const writer = routeInfoLogsToStderr ? console.error : console.log;
    writer(`  ... and ${items.length - maxItems} more`);
  }
}