/**
 * 🧡🩵 BIG ORANGE + CYAN Visual Style for FAF MCP
 * 3 Lines, 3 Words, 1 Emoji with Bar
 * Orange emojis with cyan text for championship look!
 */

// ANSI color codes for terminal output
const CYAN = '\x1b[36m';
const BRIGHT_CYAN = '\x1b[96m';
const ORANGE = '\x1b[38;5;208m';  // Terminal orange approximation
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

export interface DisplayStyle {
  line1: string;  // Icon + Metric + Value (CYAN text)
  line2: string;  // Progress bar
  line3: string;  // Status emoji + Label + Assessment (CYAN text)
}

/**
 * Create an orange-themed progress bar
 * Uses orange blocks for filled, gray for empty
 */
export function createProgressBar(percentage: number, width: number = 24): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  // Orange blocks for progress (using standard blocks since terminal orange is limited)
  // In Claude Desktop, we use the emoji for orange feel
  const bar = '🟧'.repeat(filled) + '⬜'.repeat(empty);

  return `${bar} ${percentage}%`;
}

/**
 * Alternative ASCII bar when emojis aren't suitable
 */
export function createASCIIBar(percentage: number, width: number = 24): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  return `${bar} ${percentage}%`;
}

/**
 * Get championship medal emoji and status based on score
 */
export function getScoreMedal(score: number): { medal: string; status: string } {
  if (score >= 100) return { medal: '🏆', status: 'Trophy - Championship' };
  if (score >= 99) return { medal: '🥇', status: 'Gold' };
  if (score >= 95) return { medal: '🥈', status: 'Target 2 - Silver' };
  if (score >= 85) return { medal: '🥉', status: 'Target 1 - Bronze' };
  if (score >= 70) return { medal: '🟢', status: 'GO! - Ready for Target 1' };
  if (score >= 55) return { medal: '🟡', status: 'Caution - Getting ready' };
  return { medal: '🔴', status: 'Stop - Needs work' };
}

/**
 * Format score display with Championship Medal System
 */
export function formatScore(score: number): DisplayStyle {
  const { medal, status } = getScoreMedal(score);

  return {
    line1: `${medal} ${BRIGHT_CYAN}Score: ${score}/100${RESET}`,
    line2: createASCIIBar(score),
    line3: `🏎️ ${CYAN}Status: ${status}${RESET}`
  };
}

/**
 * Format file operations with style
 */
export function formatFileOp(operation: string, count: number, total?: number): DisplayStyle {
  const percentage = total ? Math.round((count / total) * 100) : 100;

  return {
    line1: `📁 ${BRIGHT_CYAN}${operation}: ${count}${total ? `/${total}` : ' files'}${RESET}`,
    line2: createASCIIBar(percentage),
    line3: `🧡 ${CYAN}Speed: Fast${RESET}`
  };
}

/**
 * Format sync operations
 */
export function formatSync(synced: number, total: number): DisplayStyle {
  const percentage = Math.round((synced / total) * 100);

  let status = '';
  if (percentage === 100) {
    status = 'Complete!';
  } else if (percentage >= 50) {
    status = 'In Progress';
  } else {
    status = 'Starting';
  }

  return {
    line1: `🔄 ${BRIGHT_CYAN}Synced: ${synced}/${total}${RESET}`,
    line2: createASCIIBar(percentage),
    line3: `🧡 ${CYAN}Status: ${status}${RESET}`
  };
}

/**
 * Format directory tree with orange accents
 */
export function formatTree(tree: string): string {
  // Add orange folder emojis
  return tree
    .replace(/├──/g, '├── 🧡')
    .replace(/└──/g, '└── 🧡')
    .replace(/│/g, '│');
}

/**
 * Format project detection
 */
export function formatDetection(projectType: string, confidence: number): DisplayStyle {
  return {
    line1: `🏗️ ${BRIGHT_CYAN}Type: ${projectType}${RESET}`,
    line2: createASCIIBar(confidence),
    line3: `🧡 ${CYAN}Confidence: ${confidence}%${RESET}`
  };
}

/**
 * Format generic success message
 */
export function formatSuccess(action: string, detail?: string): DisplayStyle {
  return {
    line1: `✅ ${BRIGHT_CYAN}${action}: Success${RESET}`,
    line2: `████████████████████████ 100%`,
    line3: `🧡 ${CYAN}${detail || 'Complete!'}${RESET}`
  };
}

/**
 * Format error message (still styled but clear)
 */
export function formatError(action: string, error: string): DisplayStyle {
  return {
    line1: `❌ ${action}: Failed`,
    line2: `░░░░░░░░░░░░░░░░░░░░░░░░ 0%`,
    line3: `💡 Fix: ${error}`
  };
}

/**
 * The main formatter - always returns 3 lines
 */
export function format3Lines(style: DisplayStyle): string {
  return `${style.line1}\n${style.line2}\n${style.line3}`;
}

/**
 * Special Big Orange celebration for perfect scores
 */
export function formatBigOrange(): DisplayStyle {
  return {
    line1: `🧡 ${BRIGHT_CYAN}${BOLD}BIG ORANGE: 100/100${RESET}`,
    line2: `🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧 ${ORANGE}MAX!${RESET}`,
    line3: `🏆 ${BRIGHT_CYAN}${BOLD}Status: CHAMPION!${RESET}`
  };
}