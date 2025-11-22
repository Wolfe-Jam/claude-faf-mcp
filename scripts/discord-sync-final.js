#!/usr/bin/env node

/**
 * Discord Documentation Sync Tool (Final Version)
 * Posts clean summaries with links to GitHub (single source of truth)
 *
 * Usage: node scripts/discord-sync-final.js <webhook-url>
 */

const https = require('https');

// Clean messages that link to GitHub as source of truth
const MESSAGES = [
  {
    title: '📚 Welcome to FAF',
    content: `**FAF (Foundational AI-context Format)** - IANA-registered AI context standard

🧡 **IANA Format:** \`application/vnd.faf+yaml\`
📦 **MCP Server:** 6.1k downloads (1,231/week)
⚡ **CLI Tool:** 6.2k downloads (235/week)

**Two packages, one ecosystem:**
• \`claude-faf-mcp\` - For Claude Desktop (MCP integration)
• \`faf-cli\` - For terminal workflows

**⭐️ Help us grow:** <https://github.com/Wolfe-Jam/claude-faf-mcp>
Every star helps more devs discover FAF!

━━━━━━━━━━━━━━━━━━━━━`,
    order: 1
  },
  {
    title: '🚀 Quick Start',
    content: `**Get started in 2 minutes:**

\`\`\`bash
npm install -g claude-faf-mcp
\`\`\`

**Add to Claude Desktop config:**
\`\`\`json
{
  "mcpServers": {
    "faf": {
      "command": "npx",
      "args": ["claude-faf-mcp"]
    }
  }
}
\`\`\`

**Restart Claude Desktop** → Test with \`faf_score()\`

📖 **Full guide:** <https://github.com/Wolfe-Jam/claude-faf-mcp/blob/main/docs/QUICK_START.md>`,
    order: 2
  },
  {
    title: '🏆 PODIUM Scoring',
    content: `**Gamifying Software Excellence**

\`\`\`
🥉 85% = BRONZE PODIUM
🥈 95% = SILVER PODIUM
🥇 99% = GOLD PODIUM
🏆 105% = TROPHY
\`\`\`

When you see BRONZE (85%), you can't help it...
**YOU'RE GONNA WANNA WIN.**

**Score breakdown:**
• 40 points: .faf file (project context)
• 30 points: CLAUDE.md (AI instructions)
• 15 points: README.md (documentation)
• 14 points: Project file (package.json, etc)

📖 **Full system:** <https://github.com/Wolfe-Jam/claude-faf-mcp/blob/main/docs/PODIUM-SYSTEM.md>`,
    order: 3
  },
  {
    title: '❓ FAQ',
    content: `**Common Questions:**

**Do I need the CLI installed?**
No. v3.0.5 is 100% standalone (50/50 tools operational).

**What's MCP vs CLI?**
MCP = Claude Desktop integration
CLI = Terminal standalone tool

**How are scores calculated?**
.faf (40) + CLAUDE.md (30) + README (15) + project file (14) = 99%
Final 1% = perfect collaboration (only Claude can grant)

**Is my code safe?**
Yes. Everything runs locally. No external data transmission.

📖 **Full FAQ:** <https://github.com/Wolfe-Jam/claude-faf-mcp/blob/main/docs/FAQ.md>`,
    order: 4
  },
  {
    title: '📖 Documentation',
    content: `**All docs available on GitHub:**

• **Quick Start:** <https://github.com/Wolfe-Jam/claude-faf-mcp/blob/main/docs/QUICK_START.md>
• **User Guide:** <https://github.com/Wolfe-Jam/claude-faf-mcp/blob/main/docs/USER_GUIDE.md>
• **FAQ:** <https://github.com/Wolfe-Jam/claude-faf-mcp/blob/main/docs/FAQ.md>
• **PODIUM System:** <https://github.com/Wolfe-Jam/claude-faf-mcp/blob/main/docs/PODIUM-SYSTEM.md>
• **Main README:** <https://github.com/Wolfe-Jam/claude-faf-mcp>

**npm packages:**
• MCP: <https://www.npmjs.com/package/claude-faf-mcp>
• CLI: <https://www.npmjs.com/package/faf-cli>

**Website:** <https://faf.one>`,
    order: 5
  },
  {
    title: '⭐️ Support FAF',
    content: `**Help FAF grow:**

⭐️ **Star on GitHub:** <https://github.com/Wolfe-Jam/claude-faf-mcp>
Every star helps developers discover this tool!

💬 **Join the community:**
Already here? Introduce yourself in #introductions!

📣 **Share FAF:**
Know someone building with Claude? Share the npm link:
<https://www.npmjs.com/package/claude-faf-mcp>

🐛 **Report issues:** <https://github.com/Wolfe-Jam/claude-faf-mcp/issues>

━━━━━━━━━━━━━━━━━━━━━
Thanks for being part of the FAF community! 🧡`,
    order: 6
  }
];

function postToDiscord(webhookUrl, content) {
  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);
    const payload = JSON.stringify({
      content: content.substring(0, 2000)
    });

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 204 || res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`Discord returned status ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function syncDocs(webhookUrl) {
  console.log('🔄 Starting Discord documentation sync (final)...\n');

  const sortedMessages = MESSAGES.sort((a, b) => a.order - b.order);

  for (const msg of sortedMessages) {
    const message = `**${msg.title}**

${msg.content}`;

    try {
      await postToDiscord(webhookUrl, message);
      console.log(`✅ Posted ${msg.title}`);

      // Rate limit: Discord allows 5 requests per 2 seconds
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Failed to post ${msg.title}:`, error.message);
    }
  }

  console.log('\n✨ Sync complete!');
}

// Main execution
if (require.main === module) {
  const webhookUrl = process.argv[2];

  if (!webhookUrl) {
    console.error('Usage: node scripts/discord-sync-final.js <webhook-url>');
    console.error('\nGet your webhook URL from Discord:');
    console.error('1. Server Settings > Integrations > Webhooks');
    console.error('2. Create New Webhook or use existing');
    console.error('3. Copy Webhook URL');
    process.exit(1);
  }

  syncDocs(webhookUrl).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { syncDocs };
