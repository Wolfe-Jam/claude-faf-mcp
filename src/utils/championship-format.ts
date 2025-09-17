/**
 * FAF Championship Output Formatter
 * The RAILS for proper FAF output! 🏎️⚡
 */

export interface AchievementStatus {
  speed: number;
  score: number;
  files: number;
  isDotFaffed: boolean;
}

export class ChampionshipFormatter {
  /**
   * Format FAF output with Championship wrapper
   * SHOW FIRST - ENHANCE AFTER!
   */
  static formatOutput(rawOutput: string, status?: AchievementStatus): string {
    let formatted = '';

    // ALWAYS RAW FIRST - This is SACRED!
    formatted += '=== FAF CHAMPIONSHIP OUTPUT ===\n';
    formatted += rawOutput;
    formatted += '\n=== END CHAMPIONSHIP OUTPUT ===\n';

    // Achievement Status (OPTIONAL enhancement)
    if (status) {
      formatted += '\n=== YOUR ACHIEVEMENT STATUS ===\n';

      // Speed Achievement
      const speedBadge = status.speed < 10 ? '⚡🏆' : status.speed < 50 ? '⚡' : '🏎️';
      formatted += `🏎️ Speed: ${status.speed}ms ${speedBadge}\n`;

      // Score Achievement
      const scoreBadge = status.score >= 99 ? '🍊' : status.score >= 90 ? '🏆' : status.score >= 70 ? '⭐' : '📊';
      formatted += `🏆 Score: ${status.score}/100 ${scoreBadge}\n`;

      // Files Ready
      formatted += `📊 Files: ${status.files} ready\n`;

      // DOT FAFFED Status
      const dotFaffedStatus = status.isDotFaffed
        ? '🏆 DOT FAFFED ACHIEVED! 🏆'
        : `⚡ Working toward DOT FAFFED (${status.score}/70 needed)`;
      formatted += `⚡ Status: ${dotFaffedStatus}\n`;

      formatted += '=== END STATUS ===\n';
    }

    return formatted;
  }

  /**
   * Check if user is DOT FAFFED
   */
  static isDotFaffed(score: number): boolean {
    return score >= 70;
  }

  /**
   * Get achievement level based on score
   */
  static getAchievementLevel(score: number): string {
    if (score >= 105) return '🍊 BIG ORANGE CHAMPIONSHIP!';
    if (score >= 99) return '🏆 CHAMPIONSHIP MODE!';
    if (score >= 90) return '⭐ PODIUM FINISH!';
    if (score >= 70) return '✅ DOT FAFFED!';
    if (score >= 50) return '🏎️ ON TRACK!';
    return '⚡ BUILDING MOMENTUM!';
  }

  /**
   * Get speed achievement
   */
  static getSpeedAchievement(ms: number): string {
    if (ms < 1) return '⚡🏆 INSTANT! WORLD RECORD!';
    if (ms < 10) return '⚡ SUB-10ms CHAMPIONSHIP!';
    if (ms < 50) return '🏎️ FAST TRACK!';
    if (ms < 100) return '✅ GOOD PACE!';
    return '📊 MEASURING...';
  }
}

// Export the RAILS!
export default ChampionshipFormatter;