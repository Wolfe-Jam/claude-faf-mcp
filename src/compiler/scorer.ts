/**
 * Compiler Engine Scorer - FAF Compiler Engine MK3
 * Championship-grade scoring with context-aware metrics
 */

export interface ScoringResult {
  score: number; // 0-100
  medal: 'trophy' | 'gold' | 'silver' | 'bronze' | 'red' | 'white';
  emoji: string;
  message: string;
  breakdown: {
    totalSlots: 21;
    relevantSlots: number;
    filledSlots: number;
    ignoredSlots: number;
  };
  nextMilestone: {
    targetScore: number;
    medal: string;
    emoji: string;
    slotsNeeded: number;
    message: string;
  } | null;
}

export class CompilerEngineScorer {
  /**
   * Calculate score with slotignore support
   */
  calculateScore(
    filledSlots: number,
    relevantSlots: number,
    slotignore: string[]
  ): ScoringResult {
    // Calculate score: (filled / relevant) * 100
    const score = Math.round((filledSlots / relevantSlots) * 100);

    // Determine medal
    const medal = this.getMedal(score);
    const emoji = this.getMedalEmoji(medal);

    // Generate message
    const message = this.getMessage(score, filledSlots, relevantSlots, medal);

    // Calculate next milestone
    const nextMilestone = this.getNextMilestone(score, filledSlots, relevantSlots);

    return {
      score,
      medal,
      emoji,
      message,
      breakdown: {
        totalSlots: 21,
        relevantSlots,
        filledSlots,
        ignoredSlots: slotignore.length,
      },
      nextMilestone,
    };
  }

  /**
   * Determine medal from score
   */
  private getMedal(score: number): 'trophy' | 'gold' | 'silver' | 'bronze' | 'red' | 'white' {
    if (score >= 85) return 'trophy'; // Championship grade
    if (score >= 70) return 'gold';   // Podium grade
    if (score >= 55) return 'silver'; // Strong
    if (score >= 40) return 'bronze'; // Decent
    if (score >= 20) return 'red';    // Needs work
    return 'white';                   // Just started
  }

  /**
   * Get medal emoji
   */
  private getMedalEmoji(medal: string): string {
    switch (medal) {
      case 'trophy': return '🏆';
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      case 'bronze': return '🥉';
      case 'red': return '🔴';
      case 'white': return '🤍';
      default: return '⚪';
    }
  }

  /**
   * Generate contextual message
   */
  private getMessage(score: number, filled: number, relevant: number, medal: string): string {
    if (score === 100) {
      return `Perfect ${medal === 'trophy' ? 'Championship' : 'Project'} DNA! All ${filled}/${relevant} relevant slots filled.`;
    }

    if (score >= 85) {
      return `Championship grade! ${filled}/${relevant} slots filled. Podium performance!`;
    }

    if (score >= 70) {
      return `Podium grade! ${filled}/${relevant} slots filled. Strong AI context.`;
    }

    if (score >= 55) {
      return `Solid foundation. ${filled}/${relevant} slots filled. Keep going!`;
    }

    if (score >= 40) {
      return `Decent start. ${filled}/${relevant} slots filled. Room for improvement.`;
    }

    if (score >= 20) {
      return `Getting started. ${filled}/${relevant} slots filled. Focus on core context.`;
    }

    return `Just beginning. ${filled}/${relevant} slots filled. Add project basics first.`;
  }

  /**
   * Calculate next milestone
   */
  private getNextMilestone(score: number, filled: number, relevant: number): {
    targetScore: number;
    medal: string;
    emoji: string;
    slotsNeeded: number;
    message: string;
  } | null {
    // Already at 100%
    if (score === 100) {
      return null;
    }

    // Define milestones
    const milestones = [
      { threshold: 85, name: 'trophy', emoji: '🏆', label: 'Championship Grade' },
      { threshold: 70, name: 'gold', emoji: '🥇', label: 'Podium Grade' },
      { threshold: 55, name: 'silver', emoji: '🥈', label: 'Solid Foundation' },
      { threshold: 40, name: 'bronze', emoji: '🥉', label: 'Decent Start' },
      { threshold: 20, name: 'red', emoji: '🔴', label: 'Getting Started' },
    ];

    // Find next milestone
    const nextMilestone = milestones.find(m => score < m.threshold);

    if (!nextMilestone) {
      // Already above all milestones, aim for 100%
      const slotsNeeded = relevant - filled;
      return {
        targetScore: 100,
        medal: 'trophy',
        emoji: '🏆',
        slotsNeeded,
        message: `Fill ${slotsNeeded} more slot${slotsNeeded === 1 ? '' : 's'} to reach 100% (Perfect!)`,
      };
    }

    // Calculate slots needed
    const targetFilled = Math.ceil((nextMilestone.threshold / 100) * relevant);
    const slotsNeeded = Math.max(1, targetFilled - filled);

    return {
      targetScore: nextMilestone.threshold,
      medal: nextMilestone.name,
      emoji: nextMilestone.emoji,
      slotsNeeded,
      message: `Fill ${slotsNeeded} more slot${slotsNeeded === 1 ? '' : 's'} to reach ${nextMilestone.threshold}% (${nextMilestone.label})`,
    };
  }

  /**
   * Format scoring result as human-readable text
   */
  formatResult(result: ScoringResult, projectType?: string): string {
    const lines: string[] = [];

    // Header
    lines.push(`${result.emoji} Score: ${result.score}%`);
    lines.push('');

    // Message
    lines.push(result.message);
    lines.push('');

    // Breakdown
    lines.push('Breakdown:');
    lines.push(`  Total Slots: ${result.breakdown.totalSlots}`);
    if (projectType) {
      lines.push(`  Project Type: ${projectType}`);
    }
    lines.push(`  Relevant Slots: ${result.breakdown.relevantSlots}`);
    lines.push(`  Filled Slots: ${result.breakdown.filledSlots}`);
    if (result.breakdown.ignoredSlots > 0) {
      lines.push(`  Ignored Slots: ${result.breakdown.ignoredSlots} (not applicable to this project type)`);
    }

    // Next milestone
    if (result.nextMilestone) {
      lines.push('');
      lines.push('Next Milestone:');
      lines.push(`  ${result.nextMilestone.emoji} ${result.nextMilestone.message}`);
    }

    return lines.join('\n');
  }

  /**
   * Generate actionable suggestions based on score
   */
  generateSuggestions(score: number, _medal: string, _missingSlots: string[]): string[] {
    const suggestions: string[] = [];

    if (score < 40) {
      suggestions.push('Start with core slots: project_identity, language, human_context');
      suggestions.push('Add basic documentation: README.md, CLAUDE.md');
    }

    if (score >= 40 && score < 70) {
      suggestions.push('Fill in your tech stack details (frontend, backend, database)');
      suggestions.push('Add build and deployment information');
    }

    if (score >= 70 && score < 85) {
      suggestions.push('Complete architecture details (auth, storage, caching)');
      suggestions.push('Add team workflow and CI/CD information');
    }

    if (score >= 85 && score < 100) {
      suggestions.push('Polish remaining slots for championship grade');
      suggestions.push('Ensure all documentation is up to date');
    }

    if (score === 100) {
      suggestions.push('Perfect! Consider sharing your .faf with the community');
      suggestions.push('Keep it updated as your project evolves');
    }

    return suggestions;
  }
}
