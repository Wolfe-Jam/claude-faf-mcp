# Screenshot Automation Plan 📸

## Current Capability
**Can't capture directly** - Claude Code doesn't have screenshot capability

## But We Can Automate It!

### Option 1: Puppeteer Script (Recommended)
```javascript
// screenshot-capture.js
const puppeteer = require('puppeteer');

async function captureDevServer() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Set viewport for consistent shots
  await page.setViewport({ width: 1920, height: 1080 });

  // Capture MCP Inspector
  await page.goto('http://localhost:6274');
  await page.screenshot({ path: 'screenshots/mcp-inspector.png' });

  // Capture terminal output (if running web terminal)
  await page.goto('http://localhost:3000/terminal');
  await page.screenshot({ path: 'screenshots/terminal-output.png' });

  await browser.close();
}
```

### Option 2: Terminal Screenshots with `terminalizer`
```bash
# Install
npm install -g terminalizer

# Record terminal session
terminalizer record faf-demo

# Run your commands
faf init
faf score
faf enhance

# Stop recording (Ctrl+D)

# Generate GIF
terminalizer render faf-demo -o faf-demo.gif
```

### Option 3: macOS Automation Script
```bash
#!/bin/bash
# screenshot-flow.sh

# Function to take screenshot
screenshot() {
  screencapture -x "screenshots/$1.png"
  sleep 1
}

echo "Starting in 3 seconds..."
sleep 3

# Empty directory
ls -la
screenshot "01-empty"

# Run faf init
faf init
sleep 2
screenshot "02-after-init"

# Run faf score
faf score
sleep 2
screenshot "03-score-40"

# Continue...
```

### Option 4: Using `asciinema` for Terminal Recording
```bash
# Install
brew install asciinema

# Record
asciinema rec faf-demo.cast

# Do your demo
faf init
faf enhance
faf score

# Stop (Ctrl+D)

# Convert to GIF
docker run --rm -v $PWD:/data asciinema/asciicast2gif faf-demo.cast faf-demo.gif
```

## Why Tools Are Slow (300ms vs 50ms target)

### Current Architecture (SLOW)
```
MCP Tool Call
  └─> engine-adapter.ts
      └─> exec('faf score')  // Shell spawn: +100ms
          └─> Node.js loads  // Node startup: +100ms
              └─> CLI loads   // CLI parsing: +100ms
                  └─> Result
```
**Total: ~300ms** ❌

### Optimized Architecture (FAST)
```
MCP Tool Call
  └─> Direct import { FafEngine }  // No shell: 0ms
      └─> engine.score()           // Direct call: <50ms
          └─> Result
```
**Total: <50ms** ✅

### Quick Fix for Speed
```typescript
// Instead of:
await execAsync('faf score');

// Do this:
import { FafEngine } from 'faf-cli/dist/engine';
const engine = new FafEngine();
await engine.score();
```

## Automated Screenshot Script

```javascript
#!/usr/bin/env node
// auto-screenshots.js

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const screenshots = [
  { cmd: 'ls -la', name: '01-empty', wait: 1000 },
  { cmd: 'faf init', name: '02-init', wait: 2000 },
  { cmd: 'faf score', name: '03-score-initial', wait: 1000 },
  { cmd: 'faf enhance', name: '04-enhance', wait: 3000 },
  { cmd: 'faf score', name: '05-score-enhanced', wait: 1000 },
  { cmd: 'echo "# Project" > README.md', name: '06-readme', wait: 500 },
  { cmd: 'faf score', name: '07-score-final', wait: 1000 }
];

async function capture() {
  console.log('📸 Starting screenshot capture...');
  console.log('Position your terminal and press Enter');

  // Wait for user
  await new Promise(r => process.stdin.once('data', r));

  for (const shot of screenshots) {
    console.log(`Running: ${shot.cmd}`);
    exec(shot.cmd);

    await new Promise(r => setTimeout(r, shot.wait));

    // macOS screenshot
    exec(`screencapture -x screenshots/${shot.name}.png`);
    console.log(`✅ Captured: ${shot.name}`);

    await new Promise(r => setTimeout(r, 500));
  }

  console.log('🎉 All screenshots captured!');
}

capture();
```

## Best Approach for You

Since you asked about dev server screenshots, I recommend:

1. **For MCP Inspector**: Use Puppeteer (can automate browser)
2. **For Terminal**: Use `asciinema` or `terminalizer`
3. **For Quick Shots**: macOS screenshot script

The script above will:
- Run each command
- Wait for it to complete
- Take a screenshot
- Name it properly
- Move to next

Just position your terminal, run the script, and it captures everything automatically!

---

wolfejam: We can automate the entire screenshot flow! 📸🏁