// Acme Dashboard — Main entry point
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function analyzeMetrics(data: Record<string, number>[]) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Analyze these metrics for anomalies: ${JSON.stringify(data)}`,
    }],
  });
  return response;
}
