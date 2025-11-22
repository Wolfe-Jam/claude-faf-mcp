#!/usr/bin/env node

/**
 * Discord Documentation Sync Tool (Simplified)
 * Posts FAF documentation to Discord as messages
 *
 * Usage: node scripts/discord-sync-simple.js <webhook-url>
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DOCS_DIR = path.join(__dirname, '../docs');

// Documentation files to sync
const DOCS_TO_SYNC = [
  {
    file: 'QUICK_START.md',
    title: '🚀 **Quick Start Guide**',
    url: 'https://faf.one',
    order: 1
  },
  {
    file: 'FAQ.md',
    title: '❓ **Frequently Asked Questions**',
    url: 'https://faf.one',
    order: 2
  },
  {
    file: 'USER_GUIDE.md',
    title: '📚 **User Guide**',
    url: 'https://faf.one',
    order: 3
  },
  {
    file: 'PODIUM-SYSTEM.md',
    title: '🏆 **Podium Scoring System**',
    url: 'https://faf.one',
    order: 4
  }
];

function postToDiscord(webhookUrl, content) {
  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);
    const payload = JSON.stringify({ content });

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
      if (res.statusCode === 204 || res.statusCode === 200) {
        resolve();
      } else {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          reject(new Error(`Discord returned status ${res.statusCode}: ${body}`));
        });
      }
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function createSummary(content, maxLength = 1500) {
  const lines = content.split('\n');
  let summary = '';
  let lineCount = 0;

  for (const line of lines) {
    // Skip title lines
    if (line.startsWith('# ')) continue;

    summary += line + '\n';
    lineCount++;

    // Stop at reasonable length or after good amount of content
    if (summary.length > maxLength || lineCount > 30) {
      break;
    }
  }

  return summary.trim();
}

async function syncDocs(webhookUrl) {
  console.log('🔄 Starting Discord documentation sync...\n');

  // Post intro message
  const introMessage = `## 📚 FAF Documentation

Welcome to the FAF (Foundational AI-context Format) documentation!

**🧡 IANA-registered format** · \`application/vnd.faf+yaml\`
**📦 MCP:** 6.1k downloads, 1,231/week
**⚡ CLI:** 6.2k downloads, 235/week

Full docs available at **https://faf.one**

---`;

  try {
    await postToDiscord(webhookUrl, introMessage);
    console.log('✅ Posted intro message');
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    console.error('❌ Failed to post intro:', error.message);
  }

  // Sort docs by order
  const sortedDocs = DOCS_TO_SYNC.sort((a, b) => a.order - b.order);

  for (const doc of sortedDocs) {
    const filePath = path.join(DOCS_DIR, doc.file);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${doc.file} (not found)`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const summary = createSummary(content);

    const message = `${doc.title}

${summary}

**[Read full guide →](${doc.url})**`;

    try {
      await postToDiscord(webhookUrl, message);
      console.log(`✅ Posted ${doc.title}`);

      // Rate limit: Discord allows 5 requests per 2 seconds
      await new Promise(resolve => setTimeout(resolve, 1000));
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
    console.error('Usage: node scripts/discord-sync-simple.js <webhook-url>');
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
