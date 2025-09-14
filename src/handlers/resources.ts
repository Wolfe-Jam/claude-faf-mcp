import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { FafEngineAdapter } from './engine-adapter';

export class FafResourceHandler {
  constructor(private engineAdapter: FafEngineAdapter) {}

  async listResources() {
    return {
      resources: [
        {
          uri: 'claude-faf://context',
          name: 'Current FAF Context',
          description: 'Current project FAF context and metadata',
          mimeType: 'application/json'
        },
        {
          uri: 'claude-faf://status',
          name: 'FAF Status Summary', 
          description: 'Project health and AI readiness status',
          mimeType: 'text/plain'
        }
      ] as Resource[]
    };
  }

  async readResource(uri: string) {
    switch (uri) {
      case 'claude-faf://context':
        return await this.getFafContext();
      case 'claude-faf://status':
        return await this.getFafStatus();
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  }

  private async getFafContext() {
    const result = await this.engineAdapter.callEngine('status', ['--json']);
    
    return {
      contents: [{
        uri: 'claude-faf://context',
        mimeType: 'application/json',
        text: JSON.stringify(result.success ? result.data : { error: result.error }, null, 2)
      }]
    };
  }

  private async getFafStatus() {
    const result = await this.engineAdapter.callEngine('status');
    
    return {
      contents: [{
        uri: 'claude-faf://status',
        mimeType: 'text/plain',
        text: result.success ? (result.data?.output || result.data) : `Error: ${result.error}`
      }]
    };
  }
}
