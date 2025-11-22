#!/usr/bin/env node

/**
 * Discord Documentation Sync Tool (Curated Content)
 * Posts hand-crafted summaries of FAF documentation to Discord
 *
 * Usage: node scripts/discord-sync-curated.js <webhook-url>
 */

const https = require('https');

// Curated messages for Discord
const MESSAGES = [
  {
    title: '📚 FAF MCP Server Documentation',
    content: `Welcome to **claude-faf-mcp** - the Model Context Protocol server that brings FAF (Foundational AI-context Format) to Claude Desktop!

**What is FAF?**
🧡 IANA-registered AI context format (\`application/vnd.faf+yaml\`)
📦 Universal project DNA that works with any AI tool
🏆 F1-inspired scoring system for project quality

**Two Tools Available:**
• **MCP Server** (1,231/week downloads) - For Claude Desktop integration
• **CLI Tool** (235/week downloads) - Command-line standalone tool

Choose MCP for Claude Desktop, CLI for terminal workflows, or both!

Full documentation below...`,
    order: 1
  },
  {
    title: '🚀 Quick Start - Claude Desktop Setup',
    content: `**Install the MCP server:**
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

**Config location:**
• macOS: \`~/Library/Application Support/Claude/claude_desktop_config.json\`
• Windows: \`%APPDATA%\\Claude\\claude_desktop_config.json\`

**Restart Claude Desktop**, then test with: \`faf_score()\`

[Full Quick Start Guide](https://github.com/Wolfe-Jam/claude-faf-mcp/blob/main/docs/QUICK_START.md)`,
    order: 2
  },
  {
    title: '🏆 The PODIUM Scoring System',
    content: `**Gamifying Software Excellence**

\`\`\`
🥉 85/100 = BRONZE PODIUM (3rd Place)
🥈 95/100 = SILVER PODIUM (2nd Place)
🥇 99/100 = GOLD PODIUM (1st Place)
🏆 105/100 = TROPHY (Beyond Podium)
\`\`\`

**The Psychology:**
When you see your project is BRONZE (85%), you can't help it...
**YOU'RE GONNA WANNA WIN.**

**How scores work:**
• .faf file: 40 points
• CLAUDE.md: 30 points
• README.md: 15 points
• Project file (package.json, etc): 14 points

Nobody wants to ship BRONZE when GOLD is 14 points away.

[Read PODIUM System](https://github.com/Wolfe-Jam/claude-faf-mcp/blob/main/docs/PODIUM-SYSTEM.md)`,
    order: 3
  },
  {
    title: '❓ Common Questions',
    content: `**Do I need the FAF CLI installed?**
No. The MCP server works standalone. Some advanced features currently require CLI but are being migrated.

**What's the difference between MCP and CLI?**
• **MCP Server**: Claude Desktop integration, native tools
• **CLI Tool**: Terminal-based, standalone commands

**How is the score calculated?**
40 (.faf) + 30 (CLAUDE.md) + 15 (README.md) + 14 (project file) = 99% max
The final 1% represents perfect human-AI collaboration.

**Is my code safe?**
Yes. Everything runs locally. No data sent externally. No network capabilities.

**Which commands work without CLI?**
\`faf_score\`, \`faf_detect\`, \`faf_list\`, \`faf_read\`, \`faf_write\`, \`faf_debug\`

[Full FAQ](https://github.com/Wolfe-Jam/claude-faf-mcp/blob/main/docs/FAQ.md)`,
    order: 4
  },
  {
    title: '📚 User Guide Overview',
    content: `**Core Features:**

**Project Scoring** - \`faf_score()\`
Evaluates your project's AI-readiness (0-99%, with Claude able to grant 100%)

**Project Detection** - \`faf_detect()\`
Automatically identifies your stack and frameworks

**Directory Exploration** - \`faf_list()\`
View project structure with smart file type detection

**File Operations** - \`faf_read()\` / \`faf_write()\`
Native file system operations

**Best Practices:**
1. Start with detection - let FAF understand your project
2. Check your score - see where you stand
3. Follow suggestions - each command guides next steps
4. Build gradually - improve incrementally

[Complete User Guide](https://github.com/Wolfe-Jam/claude-faf-mcp/blob/main/docs/USER_GUIDE.md)`,
    order: 5
  },
  {
    title: '🔗 Links & Resources',
    content: `**Main Sites:**
• [faf.one](https://faf.one) - FAF Format homepage
• [GitHub - MCP Server](https://github.com/Wolfe-Jam/claude-faf-mcp)
• [GitHub - CLI Tool](https://github.com/Wolfe-Jam/faf-cli)

**npm Packages:**
• [claude-faf-mcp](https://www.npmjs.com/package/claude-faf-mcp) - 6.1k downloads
• [faf-cli](https://www.npmjs.com/package/faf-cli) - 6.2k downloads

**Getting Help:**
• Discord: This server! Ask in #help
• GitHub Issues: Report bugs & request features
• Documentation: All docs linked above

**IANA Registration:** \`application/vnd.faf+yaml\`
🧡 Official AI context format standard`,
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
  console.log('🔄 Starting Discord documentation sync (curated)...\n');

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
    console.error('Usage: node scripts/discord-sync-curated.js <webhook-url>');
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
