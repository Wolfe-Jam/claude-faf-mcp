# MCP Display Protocol Enhancement v1.1

## Executive Summary
MCP tool outputs are being hidden in collapsed UI sections when they contain the actual user-requested data. This proposal adds display hints to the MCP protocol to ensure tool outputs render appropriately.

## The Problem

### Current Behavior
```
User: "Show me my project score"
Tool: Returns detailed scorecard
UI: Hides scorecard in collapsed "Response" section
User: Has to click to see their own data
```

### Expected Behavior
```
User: "Show me my project score"
Tool: Returns detailed scorecard
UI: Shows scorecard directly in conversation
User: Sees their data immediately
```

## Proposed Solution

### 1. MCP Protocol Extension

Add optional display hints to tool responses:

```typescript
interface MCPToolResponse {
  content: Array<{
    type: 'text' | 'markdown' | 'code';
    text: string;
    // NEW: Display hints
    displayMode?: 'inline' | 'collapsed' | 'modal';
    renderPriority?: 'primary' | 'secondary';
    preserveFormatting?: boolean;
    isUserData?: boolean;
  }>;

  // NEW: Response-level metadata
  metadata?: {
    display?: 'required' | 'optional';
    render?: 'inline' | 'collapsed';
    format?: 'preserve' | 'reformat';
    priority?: 'primary' | 'secondary';
  };

  isError: boolean;
}
```

### 2. Display Markers Standard

Establish standard markers that UIs should respect:

```
[DISPLAY:REQUIRED]    - Content must be shown inline
[DISPLAY:OPTIONAL]    - Content can be collapsed
[USER:DATA]          - This is user's data, not debug info
[FORMAT:PRESERVE]    - Keep ASCII art, tables, etc intact
```

### 3. Tool Declaration Enhancement

Tools declare their output characteristics:

```json
{
  "name": "faf_score",
  "description": "Calculate project AI-readiness score",
  "output": {
    "type": "scorecard",
    "format": "markdown",
    "rendering": {
      "mode": "inline",
      "collapsible": false,
      "priority": "primary",
      "preserveFormatting": true
    }
  }
}
```

## Implementation Guide

### For Tool Developers

```javascript
// Return enhanced responses
function formatToolResponse(content) {
  return {
    content: [{
      type: 'text',
      text: `[DISPLAY:REQUIRED]\n${content}\n[/DISPLAY:REQUIRED]`,
      displayMode: 'inline',
      renderPriority: 'primary',
      preserveFormatting: true,
      isUserData: true
    }],
    metadata: {
      display: 'required',
      render: 'inline',
      format: 'preserve',
      priority: 'primary'
    },
    isError: false
  };
}
```

### For UI Implementers (Claude.ai, etc)

```typescript
function renderToolResponse(response: MCPToolResponse) {
  // Check display requirements
  const requiresInline =
    response.metadata?.display === 'required' ||
    response.content.some(c =>
      c.displayMode === 'inline' ||
      c.text?.includes('[DISPLAY:REQUIRED]')
    );

  if (requiresInline) {
    // Render directly in conversation
    return <InlineContent response={response} />;
  }

  // Default collapsible for non-critical outputs
  return <CollapsibleContent response={response} />;
}
```

## Backwards Compatibility

- All new fields are optional
- Existing tools continue to work
- UIs that don't support hints show default behavior
- Graceful enhancement for UIs that do support hints

## Use Cases

### 1. Scorecards & Reports
- FAF scores, test results, analytics dashboards
- Should display inline as primary content

### 2. Debug/Trace Information
- Verbose logs, stack traces, internal state
- Can remain collapsed as secondary content

### 3. User-Generated Content
- Files created, data exported, reports generated
- Must display inline - it's what user asked for

## Benefits

1. **User Experience**: See results immediately
2. **Transparency**: Tool outputs visible by default
3. **Tool Developer Control**: Specify how output should render
4. **Flexibility**: Different display modes for different content
5. **Trust**: Users see what tools actually produce

## Migration Path

### Phase 1: Documentation
- Document display markers
- Encourage tool developers to add hints

### Phase 2: UI Support
- Claude.ai respects display hints
- Other MCP clients follow

### Phase 3: Protocol Standard
- Include in MCP v1.1 specification
- Make display hints official

## Example: FAF Score Output

### Tool Returns:
```javascript
{
  content: [{
    type: 'text',
    text: `[DISPLAY:REQUIRED]
# 🏎️ FAF Championship Score Card
## Project Score: 99/100 🏆
████████████████████ 99%
[... scorecard content ...]
[/DISPLAY:REQUIRED]`,
    displayMode: 'inline',
    isUserData: true
  }],
  metadata: {
    display: 'required',
    priority: 'primary'
  }
}
```

### UI Shows (Inline):
```
🏎️ FAF Championship Score Card
Project Score: 99/100 🏆
████████████████████ 99%
[... scorecard content ...]
```

NOT hidden in a collapsed section!

## Call to Action

1. **Tool Developers**: Start adding display hints today
2. **Anthropic**: Implement hint support in Claude.ai
3. **MCP Community**: Adopt these standards
4. **Users**: Expect to see your data!

---

*The principle is simple: Tool outputs are conversation content, not metadata.*

🏎️⚡ Let's make MCP tools display properly!