/**
 * 🏎️ MCP Tool Argument Types - Championship Type Safety
 * Generated from tool schemas for compile-time safety
 */

// Core Tool Args
export interface FafToolArgs {
  directory?: string;
}

export interface FafDisplayArgs {
  directory?: string;
  output?: string;
}

export interface FafAutoArgs {
  directory?: string;
}

export interface FafChooseArgs {
  scan_dir?: string;
  auto_open?: boolean;
}

export interface FafInitArgs {
  directory?: string;
  force?: boolean;
  template?: string;
  project_type?: string;
}

export interface FafShowArgs {
  command?: 'score' | 'status' | 'auto';
  directory?: string;
}

export interface FafScoreArgs {
  directory?: string;
  save?: boolean;
  format?: 'markdown' | 'html' | 'json' | 'ascii';
}

export interface FafSyncArgs {
  direction?: string;
}

export interface FafBiSyncArgs {
  watch?: boolean;
  force?: boolean;
}

// Trust Suite Args
export interface FafTrustArgs {
  mode?: 'confidence' | 'garage' | 'panic' | 'guarantee';
}

export interface FafCreditArgs {
  award?: boolean;
}

export interface FafTodoArgs {
  add?: string;
  complete?: number;
}

export interface FafChatArgs {
  prompt?: string;
}

export interface FafShareArgs {
  sanitize?: boolean;
}

export interface FafEnhanceArgs {
  model?: string;
  focus?: string;
}

export interface FafAnalyzeArgs {
  model?: string;
  depth?: string;
  models?: string[];
}

export interface FafVerifyArgs {
  checksum?: string;
  models?: string[];
}

export interface FafSearchArgs {
  query?: string;
  scope?: string;
}

export interface FafFaqArgs {
  topic?: string;
}

export interface FafStatusArgs {
  detailed?: boolean;
  json?: boolean;
  directory?: string;
}

export interface FafClearArgs {
  cache?: boolean;
  force?: boolean;
  all?: boolean;
}

export interface FafEditArgs {
  field?: string;
  value?: string;
  path?: string;
}

// File operation args
export interface FafListArgs {
  pattern?: string;
  path?: string;
  recursive?: boolean;
}

export interface FafExistsArgs {
  path?: string;
}

export interface FafDeleteArgs {
  path?: string;
  force?: boolean;
  recursive?: boolean;
}

export interface FafMoveArgs {
  source?: string;
  destination?: string;
  from?: string;
  to?: string;
}

export interface FafCopyArgs {
  source?: string;
  destination?: string;
  from?: string;
  to?: string;
}

export interface FafMkdirArgs {
  path?: string;
  recursive?: boolean;
}

// File read/write args
export interface FafReadArgs {
  path: string;
}

export interface FafWriteArgs {
  path: string;
  content: string;
}

// Empty args (tools that take no parameters)
export interface EmptyArgs {}
