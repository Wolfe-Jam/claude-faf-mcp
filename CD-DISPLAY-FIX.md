# 🏎️ Claude Desktop Display Fix Request

## The Problem
MCP tool outputs are being hidden in collapsed "Response" sections instead of displaying inline in the conversation.

## The Solution Needed (for Anthropic to implement)

### Option 1: Respect Display Markers
```javascript
// In Claude Desktop's message renderer
if (toolResponse.includes('[DISPLAY:REQUIRED]')) {
  // Render inline in conversation, not collapsed
  renderAsMainContent(toolResponse);
} else {
  // Current behavior
  renderAsCollapsedResponse(toolResponse);
}
```

### Option 2: Tool Metadata Flag
```javascript
// In MCP tool response handler
if (response.metadata?.displayMode === 'inline') {
  showInConversation(response.content);
} else {
  showInCollapsedSection(response.content);
}
```

### Option 3: Content Type Detection
```javascript
// Detect structured output that should be visible
if (isStructuredOutput(response)) {
  // Scorecards, tables, telemetry → show inline
  renderDirectly(response);
}
```

## What FAF Does Now (Workarounds)

### 1. Triple-Display Strategy
```typescript
return {
  content: [{
    type: 'text',
    text: `🟠 **FAF TELEMETRY OUTPUT** 🟠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`\`\`markdown
${fullOutput}
\`\`\`

[DISPLAY:REQUIRED]
${fullOutput}
[/DISPLAY:REQUIRED]`
  }],
  isError: false
};
```

### 2. Multiple Content Blocks
```typescript
return {
  content: [
    { type: 'text', text: '🟠 FAF OUTPUT:' },
    { type: 'text', text: markdownOutput },
    { type: 'text', text: rawOutput }
  ],
  isError: false
};
```

### 3. Force Markdown Rendering
```typescript
// Wrap in code blocks to preserve formatting
const output = `\`\`\`
${scorecard}
\`\`\``;
```

## The Ideal MCP Response Structure

```typescript
interface MCPToolResponse {
  content: Array<{
    type: 'text' | 'markdown' | 'code';
    text: string;
    displayMode?: 'inline' | 'collapsed' | 'hidden';
    priority?: 'primary' | 'secondary';
  }>;
  metadata?: {
    displayMode?: 'inline' | 'collapsed';
    preserveFormatting?: boolean;
    isUserData?: boolean;  // This is user's data, not debug info!
  };
  isError: boolean;
}
```

## What Users Want

1. **Tool output = Primary content** - It's what they asked for!
2. **No clicking required** - Data should be visible immediately
3. **Formatting preserved** - ASCII art, tables, and progress bars intact
4. **Transparency** - Show what tools actually return

## The Business Case

- Users pay for Claude + MCP tools
- They expect to see tool outputs
- Hiding outputs breaks trust
- Makes tools appear broken when they're not

## Quick Test

Run this and the output should appear INLINE:
```
faf_score --directory /path/to/project
```

Not hidden in a collapsed section!

---

🏎️⚡ This is a UI layer issue, not a tool issue. FAF works perfectly - the display layer just needs to show it!