#!/usr/bin/env node

/**
 * Discord Documentation Sync Tool
 * Posts FAF documentation to Discord using webhooks
 *
 * Usage: node scripts/discord-sync.js <webhook-url>
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DOCS_DIR = path.join(__dirname, '../docs');
const MAX_EMBED_LENGTH = 4096;
const CYAN_COLOR = 0x00D4D4; // FAF cyan

// Documentation files to sync
const DOCS_TO_SYNC = [
  {
    file: 'QUICK_START.md',
    title: '🚀 Quick Start Guide',
    description: '5-minute setup for claude-faf-mcp',
    order: 1
  },
  {
    file: 'FAQ.md',
    title: '❓ Frequently Asked Questions',
    description: 'Common questions and answers',
    order: 2
  },
  {
    file: 'USER_GUIDE.md',
    title: '📚 User Guide',
    description: 'Complete guide to MCP features',
    order: 3
  },
  {
    file: 'PODIUM-SYSTEM.md',
    title: '🏆 Podium Scoring System',
    description: 'F1-inspired scoring tiers',
    order: 4
  }
];

function postToDiscord(webhookUrl, embed) {
  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);
    const payload = JSON.stringify({
      embeds: [embed]
    });

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 204) {
        resolve();
      } else {
        reject(new Error(`Discord returned status ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function truncateContent(content, maxLength) {
  if (content.length <= maxLength) {
    return content;
  }

  const truncated = content.substring(0, maxLength - 50);
  const lastNewline = truncated.lastIndexOf('\n');

  return truncated.substring(0, lastNewline > 0 ? lastNewline : maxLength - 50) +
         '\n\n...(view full docs at faf.one)';
}

function extractSummary(content) {
  // Extract first few sections only (intro + first topic)
  const lines = content.split('\n');
  let summary = '';
  let sectionCount = 0;

  for (const line of lines) {
    if (line.startsWith('# ')) {
      // Skip title
      continue;
    }

    if (line.startsWith('## ')) {
      sectionCount++;
      if (sectionCount > 2) break; // Stop after 2 sections
    }

    summary += line + '\n';

    if (summary.length > 1500) {
      break;
    }
  }

  return summary.trim() + '\n\n**[View full documentation →](https://faf.one)**';
}

function formatMarkdownForDiscord(content) {
  // Extract just a summary instead of full content
  return extractSummary(content);
}

async function syncDocs(webhookUrl) {
  console.log('🔄 Starting Discord documentation sync...\n');

  // Sort docs by order
  const sortedDocs = DOCS_TO_SYNC.sort((a, b) => a.order - b.order);

  for (const doc of sortedDocs) {
    const filePath = path.join(DOCS_DIR, doc.file);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${doc.file} (not found)`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const formattedContent = formatMarkdownForDiscord(content);

    const embed = {
      title: doc.title,
      description: formattedContent,
      color: CYAN_COLOR,
      footer: {
        text: '🧡 faf.one • IANA-registered AI Context format'
      },
      timestamp: new Date().toISOString()
    };

    try {
      await postToDiscord(webhookUrl, embed);
      console.log(`✅ Posted ${doc.title}`);

      // Rate limit: Discord allows 5 requests per 2 seconds
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Failed to post ${doc.title}:`, error.message);
    }
  }

  console.log('\n✨ Sync complete!');
}

// Main execution
if (require.main === module) {
  const webhookUrl = process.argv[2];

  if (!webhookUrl) {
    console.error('Usage: node scripts/discord-sync.js <webhook-url>');
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

module.exports = { syncDocs, formatMarkdownForDiscord };
