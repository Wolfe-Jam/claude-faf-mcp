/**
 * 🏎️ FAF Display Workaround for Claude Desktop
 * Until CD fixes inline display, use these strategies
 */

export class ChampionshipDisplay {
  /**
   * Strategy 1: Force Plain Text Mode
   * CD can't hide plain text as easily
   */
  static forcePlainText(content: string): string {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟠 FAF CHAMPIONSHIP TELEMETRY 🟠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${content}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THIS IS YOUR DATA - NOT HIDDEN!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  /**
   * Strategy 2: Use Emoji Borders
   * Makes it harder to collapse visually
   */
  static emojiFrame(content: string): string {
    return `
🏎️🏎️🏎️🏎️🏎️🏎️🏎️🏎️🏎️🏎️🏎️🏎️🏎️🏎️🏎️
🏆 FAF SCORE TELEMETRY
🏎️🏎️🏎️🏎️🏎️🏎️🏎️🏎️🏎️🏎️🏎️🏎️🏎️🏎️🏎️

${content}

⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡
NO FAFFING - SHOW THE DATA!
⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡`;
  }

  /**
   * Strategy 3: Critical Info First
   * Even if collapsed, title shows key data
   */
  static criticalFirst(score: number, status: string, content: string): string {
    return `
🏎️ SCORE: ${score}% | STATUS: ${status} | CHAMPIONSHIP: ${score >= 90 ? 'YES 🏆' : 'NO ⚠️'}

${content}`;
  }

  /**
   * Strategy 4: Markdown Table Abuse
   * Tables often render inline
   */
  static asTable(score: number): string {
    return `
| 🏎️ FAF TELEMETRY | VALUE |
|-------------------|-------|
| **AI-READINESS** | **${score}%** |
| **STATUS** | **${score >= 90 ? 'CHAMPIONSHIP 🏆' : 'QUALIFYING'}** |
| **DISPLAY** | **REQUIRED** |
| **VISIBILITY** | **FORCED** |`;
  }

  /**
   * Strategy 5: Multi-Block Response
   * Send multiple blocks, hope one displays
   */
  static multiBlock(content: string): Array<any> {
    return [
      { type: 'text', text: '🟠 FAF OUTPUT BEGINS 🟠' },
      { type: 'text', text: content },
      { type: 'text', text: '🟠 FAF OUTPUT ENDS 🟠' },
      { type: 'text', text: `CRITICAL: Above output should be visible inline!` }
    ];
  }

  /**
   * Strategy 6: Code Block with Language
   * Sometimes 'diff' or 'json' renders better
   */
  static asCodeBlock(content: string, language: string = 'diff'): string {
    return `
\`\`\`${language}
+ FAF CHAMPIONSHIP OUTPUT
+ AI-READINESS TELEMETRY
━━━━━━━━━━━━━━━━━━━━━━━
${content}
━━━━━━━━━━━━━━━━━━━━━━━
+ END FAF OUTPUT
\`\`\``;
  }

  /**
   * Strategy 7: The Nuclear Option
   * Repeat critical info multiple ways
   */
  static nuclear(score: number, content: string): string {
    const bar = '█'.repeat(Math.floor(score / 4)) + '░'.repeat(25 - Math.floor(score / 4));

    return `
ATTENTION: FAF SCORE IS ${score}%

${bar} ${score}%

[DISPLAY:REQUIRED]
Score: ${score}%
[/DISPLAY:REQUIRED]

\`\`\`
FAF AI-READINESS: ${score}%
\`\`\`

**FAF SCORE: ${score}%**

| Metric | Value |
|--------|-------|
| Score | ${score}% |

> "Your FAF score is ${score}%"

━━━━━━━━━━━━━━━━━━
🏎️ ${score}% 🏎️
━━━━━━━━━━━━━━━━━━

${content}`;
  }
}

// Usage in formatResult:
/*
private async formatResult(title: string, content: string): Promise<CallToolResult> {
  const display = ChampionshipDisplay.nuclear(99, content);
  return {
    content: [{ type: 'text', text: display }],
    isError: false
  };
}
*/